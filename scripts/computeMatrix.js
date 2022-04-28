#!/usr/bin/env node
const exec = require('util').promisify(require('child_process').exec);
const fs = require("fs");

/****************** START CONFIG */
// Do not run the following modules except 'flow-tests' that is handled separatelly in this script
const globalExclusions = ['flow-tests/servlet-containers/tomcat9', 'flow-tests/servlet-containers/tomcat85'];

// Set modules or tests weights and fixed slice position for better distribution
//  weight: it's time in half-minutes, default 1 = 30secs
//  pos:    certain modules need to be allocated manually. Use position for that.

// There are some modules that last more than usual
// This is generated by `./scripts/computeMatrix.js test-results` during the test-results phase

// Container 1:
//  When running `flow-tests/test-mixed/pom-npm.xml` together with the following modules they fail
//  - flow-tests/test-root-ui-context
//  - flow-tests/test-live-reload
//  - flow-tests/test-dev-mode
// Containers 2 & 3:
//  Tests that need shared modules, see validation.yml to see how they are generated before running ITs
// Containers 4, 5 & 6:
//  Spring tests, they need also spring shared modules to be generated in validation.yml
const moduleWeights = {
  'flow-client': { weight: 6 },
  'flow-server': { weight: 4 },
  'vaadin-dev-server': { weight: 3 },
  'fusion-endpoint': { weight: 2 },
  'flow-data': { weight: 2 },

  'flow-tests/test-embedding/test-embedding-application-theme': { pos: 1, weight: 4 },
  'flow-tests/test-application-theme/test-theme-live-reload': { pos: 1, weight: 3 },
  'flow-tests/test-npm-only-features/test-npm-performance-regression': { pos: 1, weight: 3 },
  'flow-tests/test-v14-bootstrap': { pos: 1, weight: 3 },
  'flow-tests/test-npm-only-features/test-npm-bytecode-scanning/pom-prod-fallback.xml': { pos: 1, weight: 2 },
  'flow-tests/test-custom-route-registry': { pos: 1, weight: 2 },
  'flow-tests/test-frontend/test-npm': { pos: 1, weight: 2 },
  'flow-tests/test-no-theme': { pos: 1, weight: 2 },
  'flow-tests/test-resources': { pos: 1 },
  'flow-tests/test-embedding/test-embedding-production-mode': { pos: 2, weight: 4 },
  'flow-tests/test-frontend/vite-basics': { pos: 2, weight: 3 },
  'flow-tests/test-fusion-csrf-context': { pos: 2, weight: 2 },
  'flow-tests/test-frontend/test-pnpm/pom-production.xml': { pos: 2, weight: 2 },
  'flow-tests/test-ccdm-flow-navigation/pom-production.xml': { pos: 2, weight: 2 },
  'flow-tests/test-application-theme/test-reusable-as-parent': { pos: 2, weight: 2 },
  'flow-tests/test-live-reload': { pos: 3, weight: 3 },
  'flow-tests/test-embedding/test-embedding-generic': { pos: 3, weight: 3 },
  'flow-tests/test-mixed/pom-npm-production.xml': { pos: 3, weight: 3 },
  'flow-tests/test-embedding/test-embedding-reusable-theme': { pos: 3, weight: 2 },
  'flow-tests/test-multi-war/deployment': { pos: 3, weight: 2 },
  'flow-tests/test-application-theme/test-theme-reusable': { pos: 3, weight: 2 },
  'flow-tests/test-application-theme/test-theme-reusable-vite': { pos: 3, weight: 2 },
  'flow-tests/test-frontend/vite-production': { pos: 3, weight: 2 },
  'flow-tests/test-frontend/vite-test-assets': { pos: 3 },
  'flow-tests/vaadin-spring-tests/test-spring-boot': { pos: 4, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-boot-only-prepare': { pos: 4, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-spring-boot-scan': { pos: 4, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-spring-war': { pos: 4, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-spring-boot-contextpath': { pos: 4, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-spring-white-list': { pos: 4, weight: 2 },
  'flow-tests/vaadin-spring-tests/test-spring-security-flow': { pos: 5, weight: 5 },
  'flow-tests/vaadin-spring-tests/test-spring-security-flow-contextpath': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-security-flow-urlmapping': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-security-fusion': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-security-fusion-contextpath': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-security-fusion-urlmapping': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring-security-fusion-jwt': { pos: 5, weight: 4 },
  'flow-tests/vaadin-spring-tests/test-spring': { pos: 6, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-ts-services': { pos: 6, weight: 3 },
  'flow-tests/vaadin-spring-tests/test-ts-services-custom-client': { pos: 6, weight: 2 },
  'flow-tests/vaadin-spring-tests/test-mvc-without-endpoints': { pos: 6, weight: 2 },
  'flow-tests/test-router-custom-context': { weight: 7 },
  'flow-tests/test-pwa-disabled-offline': { weight: 5 },
  'flow-tests/test-ccdm-flow-navigation': { weight: 5 },
  'flow-tests/test-pwa': { weight: 5 },
  'flow-tests/test-ccdm': { weight: 4 },
  'flow-tests/test-dev-mode': { weight: 4 },
  'flow-tests/test-pwa/pom-production.xml': { weight: 4 },
  'flow-tests/test-frontend/vite-pwa-disabled-offline': { weight: 3 },
  'flow-tests/test-servlet': { weight: 3 },
  'flow-tests/test-root-ui-context': { weight: 3 },
  'flow-tests/test-npm-only-features/test-npm-no-buildmojo': { weight: 3 },
  'flow-tests/test-ccdm/pom-production.xml': { weight: 3 },
  'flow-tests/test-themes': { weight: 3 },
  'flow-tests/test-redeployment': { weight: 3 },
  'flow-tests/test-application-theme/test-theme-component-live-reload': { weight: 3 },
  'flow-tests/test-pwa-disabled-offline/pom-production.xml': { weight: 3 },
  'flow-tests/test-v14-bootstrap/pom-production.xml': { weight: 2 },
  'flow-tests/test-fusion-csrf': { weight: 2 },
  'flow-tests/test-frontend/test-npm/pom-production.xml': { weight: 2 },
  'flow-tests/test-npm-only-features/test-npm-custom-frontend-directory': { weight: 2 },
  'flow-tests/test-npm-only-features/test-npm-bytecode-scanning/pom-production.xml': { weight: 2 },
  'flow-tests/test-npm-only-features/test-npm-bytecode-scanning/pom-devmode.xml': { weight: 2 },
  'flow-tests/test-frontend/vite-context-path/pom-production.xml': { weight: 2 },
  'flow-tests/test-embedding/test-embedding-theme-variant': { weight: 2 },
  'flow-tests/test-npm-only-features/test-npm-general': { weight: 2 },
  'flow-tests/test-misc': { weight: 2 },
  'flow-tests/test-multi-war/test-war2': { weight: 2 },
  'flow-tests/test-theme-no-polymer': { weight: 2 },
  'flow-tests/test-frontend/vite-pwa-production-custom-offline-path': { weight: 2 },
  'flow-tests/test-multi-war/test-war1': { weight: 2 },
  'flow-tests/test-frontend/vite-pwa-production': { weight: 2 },
  'flow-tests/test-frontend/vite-pwa-disabled-offline/pom-production.xml': { weight: 2 },

  'RemoveRoutersLayoutContentIT': {weight: 2},
  'BrowserWindowResizeIT': {weight: 2},
  'FragmentLinkIT': {weight: 2},
  'AttachListenerIT': {weight: 2},
  'template.ChildOrderIT': {weight: 2},
  'WaitForVaadinIT': {weight: 2},
  'ErrorPageIT': {weight: 2},
  'DomEventFilterIT': {weight: 2},
  'ShortcutsIT': {weight: 2},
  'JavaScriptReturnValueIT': {weight: 8},
}

// Set split number for modules with several tests
const moduleSplits = {
  'flow-tests/test-root-context': 2
}
/****************** END CONFIG */

// List of containers that are reserved, so that they are no selected for other tests
const reservedContainers = Object.keys(moduleWeights).filter(k => moduleWeights[k].pos).map(k => moduleWeights[k].pos);

// Using regex to avoid having to run `npm install` for xml libs.
const regexComment = /<!--[\s\S]+?-->/gm;
const regexModule = /([\s\S]*?)<module>\s*([\d\w\-\/]+)\s*<\/module>([\s\S]*)/;
const regexVersion = '(<version>)(VERSION)(</version>)';

/**
 * 10 seconds faster than `mvn help:evaluate -Dexpression=project.modules`
 */
function getModules(prefix) {
  prefix = prefix ? prefix + '/' : '';
  const modules = [];
  const pom = prefix + 'pom.xml';
  if (fs.existsSync(pom)) {
    const content = fs.readFileSync(pom).toString().replace(regexComment, '');
    let res = regexModule.exec(content);
    while(res) {
      modules.push(prefix + res[2]);
      res = regexModule.exec(res[3]);
    }
  }
  return modules;
}

/**
 * Like `mvn help:evaluate -Dexpression=project.modules` but report sub-modules
 */
function getModulesRecursive(prefix) {
  let ret = [];
  const modules = getModules(prefix);
  modules.forEach(module => {
    const subModules = getModulesRecursive(module);
    ret = [...ret, ...(subModules.length ? subModules : [module])];
  });
  return ret;
}

/**
 * Returns a list of files in a folder matching a pattern
 */
function getFiles(files, folder, pattern) {
  fs.readdirSync(folder).forEach(file => {
    file = folder + '/' + file;
    if (fs.lstatSync(file).isDirectory()) {
      files.concat(getFiles(files, file, pattern))
    } else if (pattern.test(file)) {
      files.push(file);
    }
  });
  return files;
}

/**
 * 30 seconds faster than `mvn versions:set -DnewVersion=...`
 */
function setVersion(newVersion) {
  const pomContent = fs.readFileSync('pom.xml').toString();
  const current = RegExp(regexVersion.replace('VERSION', '\\d+\\.\\d+\\-SNAPSHOT')).exec(pomContent)[2];
  if (current && current != newVersion) {
    const regexChangeVersion = RegExp(regexVersion.replace('VERSION', current), 'g');
    const files = getFiles([], '.', /.*\/pom.*\.xml$/);
    files.forEach(file => {
      console.log(`Replacing ${current} to ${newVersion} in ${file}`);
      const content = fs.readFileSync(file).toString();
      const newContent = content.replace(regexChangeVersion, '$1' + newVersion + '$3');
      fs.writeFileSync(file, newContent)
    });
  }
}

/**
 * return a list of file names removing path and extension
 */
function getTestFiles(folder, pattern) {
  return getFiles([], folder, pattern)
    .map(f => f.replace(/^.*\//, '').replace(/\..*?$/, '')).sort();
}

/**
 * remove excluded elements from array
 */
function grep(array, exclude) {
  return array.filter(item => !exclude.includes(item));
}

function sumWeights(items, slowMap) {
  return items.reduce((prev, curr) => prev + (slowMap[curr] && slowMap[curr].weight || 1), 0);
}

/**
 * return the slice with lower sum of weights, it does not visit parts containing modules
 * with fixed positions defined in the reserved array.
 */
function getFasterSlice(item, parts, slowMap, reserved) {
  return slowMap[item] && slowMap[item].pos && parts[slowMap[item].pos - 1]
    ? parts[slowMap[item].pos - 1]
    : parts.reduce((previous, current, idx) => {
      return !reserved.includes(idx + 1) && previous && sumWeights(previous, slowMap) < sumWeights(current, slowMap) ? previous : current;
    })
}
let a;

/**
 * splits an array of modules in the desired slices based on weights defined in a map
 * it considers an preconfigured map with weights and fixed positions
 */
function splitArray(array, slices, slowMap) {
  const items = [...array];
  const nItems = items.length;
  slices = Math.min(slices, nItems);

  const parts = [...new Array(slices)].map(_ => []);
  const reserved = Object.keys(slowMap)
    .filter(m => array.includes(m) && slowMap[m].pos)
    .map(m =>  slowMap[m].pos);

    const slows = Object.keys(slowMap)
    .sort((a,b) => slowMap[b].weight - slowMap[a].weight)
    .filter(e => items.includes(e));

  for (i = 0; i < slows.length; i++) {
    const item = slows[i];
    if (items.includes(item)) {
      getFasterSlice(item, parts, slowMap, reserved).push(item);
      items.splice(items.indexOf(item), 1)
    }
  }

  a = true;
  for (i = 0; i < items.length; i++) {
    const item = items[i];
    getFasterSlice(item, parts, slowMap, reserved).push(item);
  }
  return parts;
}

/**
 * convert the sliced data to a JS object
 */
function toObject(parts, suite, module, prevIdx) {
  const object = [];
  parts.forEach((items, idx, arr) => {
    const current = prevIdx + idx + 1;
    const total = arr.length;
    const weight = sumWeights(items, moduleWeights);
    const nitems = items.length;
    const name = `${suite} (${total}, ${current})`;
    const args = items.join(',');
    const matrix = [arr.length, prevIdx + idx + 1]
    object.push({total, current, weight, nitems, suite, module, name, args, items, matrix});
  });
  return object;
}

/**
 * The main function to visit pom files and tests based on configuration and produce
 * the object json for actions
 */
function getParts(suite, prefix, slices) {
  // All modules in the project
  let modules = getModulesRecursive(prefix);
  // Remove flow-tests because they are handled separately
  if (prefix !== 'flow-tests') {
    modules = modules.filter(module => !/^flow-tests/.test(module));
  }

  const exclusions = Object.keys(moduleSplits).filter(module => modules.includes(module));
  modules = grep(modules, [...globalExclusions, ...exclusions]);
  modules = modules.filter((value, index, array) => array.indexOf(value) === index);

  const excSlices = exclusions.reduce((prev, module) => prev + moduleSplits[module], 0);
  const parts = splitArray(modules, slices - excSlices, moduleWeights);

  let object = toObject(parts, suite, '', 0);

  const testRegex = RegExp(`.*${suite == 'it-tests' ? 'IT' : 'Test'}.java`);

  exclusions.forEach(module => {
    const tests = getTestFiles(module + '/src/test/java', testRegex);
    const parts = splitArray(tests, moduleSplits[module], moduleWeights);
    object = [...object, ...toObject(parts, suite, module, object.length)];
  });
  return object;
}

/**
 * Produces a JSON string that works with GH actions
 */
function objectToString(object, keys) {
  if (keys && keys.length) {
    object.forEach(o => {
      Object.keys(o).forEach(k => {
        if (!keys.includes(k)) {
          delete o[k];
        }
      });
    });
  }
  return JSON.stringify({
    include: object
  }, null, 0)
}

/**
 * Print the matrix strategy in GH-actions syntax
 */
function printStrategy(object) {
  const json = [];
  const o = object.map(o => {
    return {
      matrix: [o.suite, ...o.matrix, o.weight],
      module: o.module,
      items: o.module ? o.args : o.items
    }
  });
  console.error(o);
}

/**
 * Search for all java files in src/test of all modules and return an object
 * {class_name: {module_path, file_name}}
 */
function getTestClasses() {
  const files = getFiles([], '.', /src\/test\/java/);
  const classes = {};
  files.map(file => {
    const module = file.replace(/(\.\/)?(.*)\/src\/test\/java(.*)/, '$2');
    const name = file.replace(/(.*)\/src\/test\/java\/(.*)\.java/, '$2').replace(/\//g, '.');
    classes[name] = {module, file};
  });
  return classes;
}

/**
 * converts duration in seconds to weights
 */
function secs2Weight(secs) {
  return Math.round(secs / 30) + 1;
}

/**
 * Compute module weights by parsing mvn outputs
 */
function computeResultWeights(suite, prefix, weights) {
  let modules = prefix ? getModulesRecursive(prefix) : getModules();
  const exclusions = Object.keys(moduleSplits).filter(module => modules.includes(module));
  modules = grep(modules, [...globalExclusions, ...exclusions]);
  const poms = modules.map(m => /.*\.xml$/.test(m) ? m : `${m}/pom.xml`);

  const logs = getFiles([], '.', RegExp(`mvn-${suite}.*out$`));
  const regexStatus = /\[INFO\] (.*?) ([\. ]*)(SUCCESS|FAILURE) \[ *([\d:\.]+) (\w+)\]([\s\S]*)/;
  weights = weights || {};
  stats = {};

  logs.forEach(f => {
    const content = fs.readFileSync(f).toString();
    let res = regexStatus.exec(content);
    stats[f] = [];
    while(res) {
      let secs;
      if (res[5] == 'min') {
        const tmp = res[4].split(':');
        secs = parseInt(tmp[0]) * 60 + parseInt(tmp[1]);
      } else {
        secs = parseInt(res[4]);
      }
      const weight = secs2Weight(secs);
      const first = poms.find(p => {
        const regexName = RegExp(`>${res[1].replace(/([\(\)\\+\\-\\|])/g, '\\$1')}<`)
        return regexName.test(fs.readFileSync(p).toString());
      });
      let mod;
      if (first) {
        mod = first.replace(/\/pom.xml/, '');
      } else {
        mod = res[1];
        console.log(`Module with Description ${res[1]} not found in poms, change escaped regexp`);
      }
      if (weight > 1) {
        weights[mod] = {weight};
      }
      res = regexStatus.exec(res[6]);
      stats[f].push({mod, secs, weight});
  }
  });
  return [weights, stats];
}

/**
 * Report test statistics by parsing mvn outputs.
 * It returns a line per test class.
 */
function computeTestStats() {
  const logs = getFiles([], '.', RegExp(`mvn-.*out$`));
  const classes = getTestClasses();
  const regexTest = /Tests run: (\d+), Failures: (\d+), Errors: (\d+), Skipped: (\d+), Time elapsed: ([\d\.]+) s - in ([\w\d\.]+)([\s\S]*)/;
  const stats = {};
  logs.forEach(f => {
    const content = fs.readFileSync(f).toString();
    let res = regexTest.exec(content);
    while(res) {
      const name = res[6];
      const secs = parseFloat(res[5]);
      const tests = parseInt(res[1]);
      const fails = parseInt(res[2]);
      const errors = parseInt(res[3]);
      const failed = fails + errors;
      const skips = parseInt(res[4]);
      const module = classes[name].module;
      stats[name] = {secs, tests, fails, failed, errors, skips, module};
      res = regexTest.exec(res[7]);
    }
  });
  const sorted = Object.keys(stats).map(k => Object.assign(stats[k], {name: k}))
    .sort((a, b) => (b.failed - a.failed) || (b.secs - a.secs));
  const totalMin = sorted.reduce((prev, curr) => prev + curr.secs, 0) / 60;
  const totalTests = sorted.reduce((prev, curr) => prev + curr.tests, 0);
  const totalFailed = sorted.reduce((prev, curr) => prev + curr.failed, 0);
  const out = sorted.map(e => `${e.secs} ${e.tests} ${e.module} ${e.name}`).join('\n') +
    `\nTOTAL - classes: ${sorted.length} tests: ${totalTests} failed: ${totalFailed} time: ${totalMin} mins.\n`;
  return out;
}

/**
 * print test statistics and weights that can be copied and pasted above.
 */
async function printTestResults() {
  // A list with each single test class and their times
  const testStats = computeTestStats();
  // A list of stats per module, as well as the theorical weights
  const [unitWeights, unitStats] = computeResultWeights('unit-tests', '');
  const [itWeights, itStats] = computeResultWeights('it-tests', 'flow-tests');
  const weights = {...unitWeights, ...itWeights};
  const moduleStats = {...unitStats, ...itStats};
  const newWeights = {};
  Object.keys(moduleWeights).filter(m => /\-/.test(m)).forEach(m => {
    const currWeight = moduleWeights[m];
    const newWeight = weights[m];
    if (currWeight.pos) {
      currWeight.weight = (!newWeight || !newWeight.weight) ? currWeight.weight : newWeight.weight;
      !currWeight.weight && delete currWeight.weight;
      newWeights[m] = moduleWeights[m];
    } else if (newWeight && newWeight.weight) {
      newWeights[m] = newWeight;
    }
  });

  // Show what should be updated
  Object.keys(weights).forEach( m => {
    if (moduleWeights[m] && Math.abs(moduleWeights[m].weight - weights[m].weight) > 1) {
      console.log(`Update ${m} ${moduleWeights[m].weight || 1} -> ${weights[m].weight}`);
    } else if (!moduleWeights[m]) {
      console.log(`Add ${m} ${weights[m].weight} `);
      newWeights[m] = weights[m];
    }
  });
  Object.keys(moduleWeights).forEach(m => {
    if (/\-/.test(m) && !moduleWeights[m].pos && !weights[m] && moduleWeights[m].weight > 2) {
      console.log(`Remove ${m} ${moduleWeights[m].weight}`);
      delete newWeights[m];
    }
  });

  // Sort and Print weight objects
  const ordered = Object.keys(newWeights).sort((a, b) => {
    const [o1, o2] = [newWeights[a], newWeights[b]];
    const [p1, p2, w1, w2] = [o1.pos || 10, o2.pos || 10, o1.weight || 0, o2.weight ||0];
    return /\//.test(a) - /\//.test(b) || p1 - p2 || w2 - w1 || a - b;
  }).reduce((o, k) => {
    o[k] = newWeights[k];
    return o;
  }, {});
  console.log(ordered);

  // print module stats
  Object.keys(moduleStats).forEach(k => {
    if (moduleStats[k].length) {
      const totalSecs = moduleStats[k].reduce((p,o) => p + o.secs, 0);
      const totalWeight = secs2Weight(totalSecs);
      console.log(`${k} ${totalSecs} secs. ${totalWeight} weight\n  `
        + moduleStats[k].map(o => `'${o.mod}': {secs: ${o.secs}, weight: ${o.weight}},`).join('\n  '));
    }
  })

  // print stats of test classes
  console.log(testStats);
}

/*
 * The script entry-point
 */
async function main() {
  const versionRegx= /--version=(.*)/;
  const parallelRegx= /--parallel=(\d+)/;
  const program = process.argv[1].replace(/.*\//, '');
  const action = process.argv[2];
  const parameter = process.argv[3];
  const keys = process.argv.slice(4);

  if (action == 'set-version' && versionRegx.test(parameter)) {
    setVersion(parameter.replace(versionRegx, '$1'));
  } else if (action == 'unit-tests' && parallelRegx.test(parameter)) {
    const object = getParts(action, '', parameter.replace(parallelRegx, '$1'));
    printStrategy(object);
    const json = objectToString(object, keys);
    console.log(json);
  } else if (action == 'it-tests' && parallelRegx.test(parameter)) {
    const object = getParts(action, 'flow-tests', parameter.replace(parallelRegx, '$1'));
    printStrategy(object);
    const json = objectToString(object, keys);
    console.log(json);
  } else if (action == 'clean-success') {
    const xmlSucceed = getFiles([], '.', /(surefire|failsafe)-reports\//)
      .filter(f => !fs.readFileSync(f).toString().match(/<stackTrace>/));
    const txtTests = getFiles([], '.', /-reports\/.*txt$/);
    [...xmlSucceed, ...txtTests].forEach(f => fs.existsSync(f) && fs.unlinkSync(f));
  } else if (action == 'test-results') {
    await printTestResults();
  } else {
    console.log(`
Usage:
  ${program} action parameters [keys]

Actions
  set-version        replace versions in all pom files of the project
  unit-tests         outputs the JSON matrix for unit-tests
  it-tests           outputs the JSON matrix for it-tests
  test-results       process test-results and outputs a matrix with weights
  clean-success      remove success xml test files to reduce uploaded artifact

Parameters
  --version=xxx      the version to set
  --parallel=N       number of items for the matrix

Keys
  A comma separated list of keys for the matrix object.
  Valid keys are: current, suite, module, total, weight, name, args, items, matrix
   `);
    process.exit(1);
  }
}

main();



