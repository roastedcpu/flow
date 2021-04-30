/*
 * Copyright 2000-2020 Vaadin Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.vaadin.flow.server.frontend;

import java.io.File;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;

import org.apache.commons.io.FileUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.vaadin.flow.internal.Pair;
import com.vaadin.flow.server.PwaConfiguration;

import static com.vaadin.flow.server.frontend.FrontendUtils.BOOTSTRAP_FILE_NAME;
import static com.vaadin.flow.server.frontend.FrontendUtils.GENERATED;
import static com.vaadin.flow.server.frontend.FrontendUtils.INDEX_HTML;
import static com.vaadin.flow.server.frontend.FrontendUtils.SERVICE_WORKER_SRC;
import static com.vaadin.flow.server.frontend.FrontendUtils.SERVICE_WORKER_SRC_JS;
import static com.vaadin.flow.server.frontend.FrontendUtils.WEBPACK_CONFIG;
import static com.vaadin.flow.server.frontend.FrontendUtils.WEBPACK_GENERATED;
import static com.vaadin.flow.shared.ApplicationConstants.VAADIN_STATIC_FILES_PATH;

/**
 * Updates the webpack config file according with current project settings.
 *
 * @since 2.0
 */
public class TaskUpdateWebpack implements FallibleCommand {

    /**
     * The name of the webpack config file.
     */
    private final String webpackTemplate;
    private final String webpackGeneratedTemplate;
    private final Path webpackOutputPath;
    private final Path resourceOutputPath;
    private final Path flowImportsFilePath;
    private final Path webpackConfigPath;
    private final Path frontendDirectory;
    private final boolean useV14Bootstrapping;
    private final Path flowResourcesFolder;
    private final PwaConfiguration pwaConfiguration;
    private final Path resourceFolder;
    private final Path frontendGeneratedFolder;
    private final String buildFolder;

    /**
     * Create an instance of the updater given all configurable parameters.
     *
     * @param frontendDirectory
     *            the directory used for {@code Frontend} alias
     * @param webpackConfigFolder
     *            folder with the `webpack.config.js` file.
     * @param webpackOutputDirectory
     *            the directory to set for webpack to output its build results.
     * @param resourceOutputDirectory
     *            the directory for generated non-served resources.
     * @param webpackTemplate
     *            name of the webpack resource to be used as template when
     *            creating the <code>webpack.config.js</code> file.
     * @param webpackGeneratedTemplate
     *            name of the webpack resource to be used as template when
     *            creating the <code>webpack.generated.js</code> file.
     * @param generatedFlowImports
     *            name of the JS file to update with the Flow project imports
     * @param useV14Bootstrapping
     *            whether the application running with deprecated V14
     *            bootstrapping
     * @param flowResourcesFolder
     *            relative path to `flow-frontend` package
     * @param frontendGeneratedFolder
     *            the folder with frontend auto-generated files
     * @param buildFolder
     *            build target forlder
     */
    @SuppressWarnings("squid:S00107")
    TaskUpdateWebpack(File frontendDirectory, File webpackConfigFolder,
            File webpackOutputDirectory, File resourceOutputDirectory,
            String webpackTemplate, String webpackGeneratedTemplate,
            File generatedFlowImports, boolean useV14Bootstrapping,
            File flowResourcesFolder, PwaConfiguration pwaConfiguration,
            File frontendGeneratedFolder, String buildFolder) {
        this.frontendDirectory = frontendDirectory.toPath();
        this.webpackTemplate = webpackTemplate;
        this.webpackGeneratedTemplate = webpackGeneratedTemplate;
        this.webpackOutputPath = webpackOutputDirectory.toPath();
        this.resourceOutputPath = resourceOutputDirectory.toPath();
        this.flowImportsFilePath = generatedFlowImports.toPath();
        this.webpackConfigPath = webpackConfigFolder.toPath();
        this.useV14Bootstrapping = useV14Bootstrapping;
        this.flowResourcesFolder = flowResourcesFolder.toPath();
        this.pwaConfiguration = pwaConfiguration;
        this.resourceFolder = new File(webpackOutputDirectory,
                VAADIN_STATIC_FILES_PATH).toPath();
        this.frontendGeneratedFolder = frontendGeneratedFolder.toPath();
        this.buildFolder = buildFolder;
    }

    @Override
    public void execute() {
        try {
            createWebpackConfig();
            createSnowpackConfig();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    private void createWebpackConfig() throws IOException {
        if (webpackTemplate == null || webpackTemplate.trim().isEmpty()) {
            return;
        }

        File configFile = new File(webpackConfigPath.toFile(), WEBPACK_CONFIG);

        // If we have an old config file we remove it and create the new one
        // using the webpack.generated.js
        if (configFile.exists()) {
            if (!FrontendUtils.isWebpackConfigFile(configFile)) {
                log().warn(
                        "Flow generated webpack configuration was not mentioned "
                                + "in the configuration file: {}."
                                + "Please verify that './webpack.generated.js' is used "
                                + "in the merge or remove the file to generate a new one.",
                        configFile);
            }
        } else {
            URL resource = this.getClass().getClassLoader()
                    .getResource(webpackTemplate);
            FileUtils.copyURLToFile(resource, configFile);
            log().debug("Created webpack configuration file: '{}'", configFile);
        }

        // Generated file is always re-written
        File generatedFile = new File(webpackConfigPath.toFile(),
                WEBPACK_GENERATED);

        URL resource = this.getClass().getClassLoader()
                .getResource(webpackGeneratedTemplate);
        FileUtils.copyURLToFile(resource, generatedFile);
        List<String> lines = modifyWebpackConfig(generatedFile);

        FileUtils.writeLines(generatedFile, lines);
    }

    private List<String> modifyWebpackConfig(File generatedFile)
            throws IOException {
        List<String> lines = FileUtils.readLines(generatedFile,
                StandardCharsets.UTF_8);
        List<Pair<String, String>> replacements = getReplacements();
        String declaration = "%s = %s;";

        for (int i = 0; i < lines.size(); i++) {
            for (int j = 0; j < replacements.size(); j++) {
                Pair<String, String> pair = replacements.get(j);
                if (lines.get(i).startsWith(pair.getFirst() + " ")) {
                    lines.set(i, String.format(declaration, pair.getFirst(),
                            pair.getSecond()));
                }
            }
        }
        return lines;
    }

    private List<Pair<String, String>> getReplacements() {
        return Arrays.asList(
                new Pair<>("const frontendFolder",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                frontendDirectory))),
                new Pair<>("const frontendGeneratedFolder",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                frontendGeneratedFolder))),
                new Pair<>("const mavenOutputFolderForFlowBundledFiles",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                webpackOutputPath))),
                new Pair<>("const mavenOutputFolderForResourceFiles",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                resourceOutputPath))),
                new Pair<>("const fileNameOfTheFlowGeneratedMainEntryPoint",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                flowImportsFilePath))),
                new Pair<>("const useClientSideIndexFileForBootstrapping",
                        Boolean.toString(!useV14Bootstrapping)),
                new Pair<>("const clientSideIndexHTML", getIndexHtmlPath()),
                new Pair<>("const clientSideIndexEntryPoint",
                        getClientEntryPoint()),
                new Pair<>("const devmodeGizmoJS",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                flowResourcesFolder
                                        .resolve("VaadinDevmodeGizmo.js")))),
                new Pair<>("const pwaEnabled",
                        Boolean.toString(pwaConfiguration.isEnabled())),
                new Pair<>("const offlinePathEnabled",
                        Boolean.toString(
                                pwaConfiguration.isOfflinePathEnabled())),
                new Pair<>("const offlinePath", getOfflinePath()),
                new Pair<>("const clientServiceWorkerEntryPoint",
                        getClientServiceWorker()),
                new Pair<>("const flowFrontendFolder",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                flowResourcesFolder))),
                new Pair<>("const projectStaticAssetsOutputFolder",
                        formatPathResolve(getEscapedRelativeWebpackPath(
                                resourceFolder))));
    }

    private String getIndexHtmlPath() {
        boolean exists = new File(frontendDirectory.toFile(), INDEX_HTML)
                .exists();
        if (!exists) {
            Path path = Paths.get(
                    getEscapedRelativeWebpackPath(webpackConfigPath),
                    buildFolder, INDEX_HTML);
            return formatPathResolve(getEscapedRelativeWebpackPath(path));
        } else {
            return "'./" + INDEX_HTML + "'";
        }
    }

    private String getClientEntryPoint() {
        return String.format("path.resolve(__dirname, '%s', '%s', '%s');",
                getEscapedRelativeWebpackPath(frontendDirectory), GENERATED,
                BOOTSTRAP_FILE_NAME);
    }

    private String getClientServiceWorker() {
        boolean exists = new File(frontendDirectory.toFile(),
                SERVICE_WORKER_SRC).exists()
                || new File(frontendDirectory.toFile(), SERVICE_WORKER_SRC_JS)
                        .exists();
        if (!exists) {
            Path path = Paths.get(
                    getEscapedRelativeWebpackPath(webpackConfigPath),
                    buildFolder, SERVICE_WORKER_SRC);
            return formatPathResolve(getEscapedRelativeWebpackPath(path)
                    .replaceFirst("\\.[tj]s$", ""));
        } else {
            return "'./sw'";
        }
    }

    private String getEscapedRelativeWebpackPath(Path path) {
        if (path.isAbsolute()) {
            return FrontendUtils.getUnixRelativePath(webpackConfigPath, path);
        } else {
            return FrontendUtils.getUnixPath(path);
        }
    }

    private String getOfflinePath() {
        return "'" + getEscapedRelativeWebpackPath(
                Paths.get(pwaConfiguration.getOfflinePath())) + "'";
    }

    private String formatPathResolve(String path) {
        return String.format("path.resolve(__dirname, '%s')", path);
    }

    private void createSnowpackConfig() throws IOException {
        File configFile = new File(webpackConfigPath.toFile(),
                "snowpack.config.js");

        if (!configFile.exists()) {
            URL resource = this.getClass().getClassLoader()
                    .getResource("snowpack.config.js");
            FileUtils.copyURLToFile(resource, configFile);
            log().info("Created Snowpack configuration file: '{}'", configFile);
        }

        File generatedFile = new File(webpackConfigPath.toFile(),
                "snowpack.generated.js");
        FileUtils.copyURLToFile(this.getClass().getClassLoader()
                .getResource("snowpack.generated.js"), generatedFile);

        File generatedPlugin = new File(webpackConfigPath.toFile(),
                "snowpack-plugin-css-string.js");
        FileUtils.copyURLToFile(this.getClass().getClassLoader()
                .getResource("snowpack-plugin-css-string.js"), generatedPlugin);
    }

    private Logger log() {
        return LoggerFactory.getLogger(this.getClass());
    }
}
