/* 
@ITMillApache2LicenseForJavaFiles@
 */

package com.itmill.toolkit.automatedtests.featurebrowser;

import java.util.Date;

import com.itmill.toolkit.data.Property.ValueChangeEvent;
import com.itmill.toolkit.ui.CustomComponent;
import com.itmill.toolkit.ui.DateField;
import com.itmill.toolkit.ui.Field;
import com.itmill.toolkit.ui.InlineDateField;
import com.itmill.toolkit.ui.OrderedLayout;
import com.itmill.toolkit.ui.Panel;
import com.itmill.toolkit.ui.Slider;
import com.itmill.toolkit.ui.TextField;
import com.itmill.toolkit.ui.Window.Notification;

/**
 * Shows some basic fields for value input; TextField, DateField, Slider...
 * 
 * @author IT Mill Ltd.
 */
public class ValueInputExample extends CustomComponent {

    public ValueInputExample() {
        final OrderedLayout main = new OrderedLayout();
        main.setMargin(true);
        setCompositionRoot(main);

        // listener that shows a value change notification
        final Field.ValueChangeListener listener = new Field.ValueChangeListener() {
            public void valueChange(ValueChangeEvent event) {
                getWindow().showNotification("Received",
                        "<pre>" + event.getProperty().getValue() + "</pre>",
                        Notification.TYPE_WARNING_MESSAGE);
            }
        };

        // TextField
        OrderedLayout horiz = new OrderedLayout(
                OrderedLayout.ORIENTATION_HORIZONTAL);
        main.addComponent(horiz);
        Panel left = new Panel("TextField");
        left.setStyleName(Panel.STYLE_LIGHT);
        horiz.addComponent(left);
        Panel right = new Panel("multiline");
        right.setStyleName(Panel.STYLE_LIGHT);
        horiz.addComponent(right);
        // basic TextField
        TextField tf = new TextField("Basic");
        tf.setDebugId("BasicTextField");
        tf.setColumns(15);
        tf.setImmediate(true);
        tf.addListener(listener);
        left.addComponent(tf);
        // multiline TextField a.k.a TextArea
        tf = new TextField("Area");
        tf.setDebugId("AreaTextField");
        tf.setColumns(15);
        tf.setRows(5);
        tf.setImmediate(true);
        tf.addListener(listener);
        right.addComponent(tf);

        // DateFields

        Date d = new Date(98, 1, 22, 13, 14, 15);

        horiz = new OrderedLayout(OrderedLayout.ORIENTATION_HORIZONTAL);
        main.addComponent(horiz);
        left = new Panel("DateField");
        left.setStyleName(Panel.STYLE_LIGHT);
        horiz.addComponent(left);
        right = new Panel("inline");
        right.setStyleName(Panel.STYLE_LIGHT);
        horiz.addComponent(right);
        // default
        DateField df = new DateField("Day resolution");
        df.setDebugId("DayResolutionDateField");
        df.setValue(d);
        df.addListener(listener);
        df.setImmediate(true);
        df.setResolution(DateField.RESOLUTION_DAY);
        left.addComponent(df);
        // minute
        df = new DateField("Minute resolution");
        df.setValue(d);
        df.setDebugId("MinuteResolutionDateField");
        df.addListener(listener);
        df.setImmediate(true);
        df.setResolution(DateField.RESOLUTION_MIN);
        left.addComponent(df);
        // year
        df = new DateField("Year resolution");
        df.setValue(d);
        df.setDebugId("YearResolutionDateField");
        df.addListener(listener);
        df.setImmediate(true);
        df.setResolution(DateField.RESOLUTION_YEAR);
        left.addComponent(df);
        // msec
        df = new DateField("Millisecond resolution");
        df.setValue(d);
        df.setDebugId("MillisecondResolutionDateField");
        df.addListener(listener);
        df.setImmediate(true);
        df.setResolution(DateField.RESOLUTION_MSEC);
        left.addComponent(df);
        // Inline
        df = new InlineDateField();
        df.setValue(d);
        df.setDebugId("InlineDateField");
        df.addListener(listener);
        df.setImmediate(true);
        right.addComponent(df);

        // Slider
        left = new Panel("Slider");
        left.setStyleName(Panel.STYLE_LIGHT);
        main.addComponent(left);
        // int slider
        Slider slider = new Slider(0, 100);
        slider.setDebugId("Slider1");
        slider.setSize(300);
        slider.setImmediate(true);
        slider.addListener(new Slider.ValueChangeListener() {
            public void valueChange(ValueChangeEvent event) {
                // update caption when value changes
                final Slider s = (Slider) event.getProperty();
                s.setCaption("Value: " + s.getValue());
            }
        });
        try {
            slider.setValue(20);
        } catch (final Exception e) {
            e.printStackTrace(System.err);
        }
        left.addComponent(slider);
        // double slider
        slider = new Slider(0.0, 1.0, 1);
        slider.setDebugId("Slider2");
        slider.setImmediate(true);
        slider.addListener(new Slider.ValueChangeListener() {
            public void valueChange(ValueChangeEvent event) {
                // update caption when value changes
                final Slider s = (Slider) event.getProperty();
                s.setCaption("Value: " + s.getValue());
            }
        });
        try {
            slider.setValue(0.5);
        } catch (final Exception e) {
            e.printStackTrace(System.err);
        }
        left.addComponent(slider);

    }

}
