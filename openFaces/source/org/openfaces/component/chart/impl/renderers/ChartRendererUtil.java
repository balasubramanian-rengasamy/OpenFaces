/*
 * OpenFaces - JSF Component Library 2.0
 * Copyright (C) 2007-2010, TeamDev Ltd.
 * licensing@openfaces.org
 * Unless agreed in writing the contents of this file are subject to
 * the GNU Lesser General Public License Version 2.1 (the "LGPL" License).
 * This library is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * Please visit http://openfaces.org/licensing/ for more details.
 */
package org.openfaces.component.chart.impl.renderers;

import org.jfree.chart.renderer.AbstractRenderer;
import org.jfree.chart.renderer.category.LineAndShapeRenderer;
import org.jfree.chart.renderer.xy.XYLineAndShapeRenderer;
import org.jfree.data.category.CategoryDataset;
import org.jfree.data.xy.XYDataset;
import org.openfaces.component.chart.ChartModel;
import org.openfaces.component.chart.ChartView;
import org.openfaces.component.chart.LineChartView;
import org.openfaces.component.chart.LineProperties;
import org.openfaces.component.chart.Series;
import org.openfaces.component.chart.impl.PropertiesConverter;
import org.openfaces.component.chart.impl.generators.DynamicCategoryGenerator;
import org.openfaces.component.chart.impl.generators.DynamicXYGenerator;
import org.openfaces.renderkit.cssparser.StyleBorderModel;
import org.openfaces.renderkit.cssparser.StyleObjectModel;

import java.awt.*;
import java.util.*;

/**
 * @author Ekaterina Shliakhovetskaya
 */
class ChartRendererUtil {
    private ChartRendererUtil() {
    }

    public static void setupSeriesColors(ChartView view, AbstractRenderer renderer) {
        if (view == null || renderer == null)
            return;

        String viewColors = view.getColors();
        Color[] colors = PropertiesConverter.getColors(viewColors);
        if (colors != null) {
            for (int i = 0; i < colors.length; i++) {
                Color color = colors[i];
                renderer.setSeriesPaint(i, color);
            }
        }

    }

    static void processXYLineAndShapeRendererProperties(XYLineAndShapeRenderer renderer, XYDataset dataset, LineChartView view) {
        if (view.getLinePropertiesList() != null) {
            for (int i = 0; i < view.getLinePropertiesList().size(); i++) {
                LineProperties lineProperties = view.getLinePropertiesList().get(i);
                DynamicXYGenerator dcg = new DynamicXYGenerator(view, lineProperties.getDynamicCondition());

                ChartModel chartModel = view.getChart().getModel();
                if (chartModel == null)
                    continue;

                Series[] series = chartModel.getSeries();
                if (series == null)
                    continue;

                for (int j = 0; j < series.length; j++) {
                    if (!dcg.generateCondition(dataset, j, 0))
                        continue;

                    Boolean hideSeries = lineProperties.getHideSeries();
                    if (hideSeries != null) {
                        renderer.setSeriesVisible(j, !hideSeries);
                    }
                    Boolean shapesVisible = lineProperties.getShapesVisible();
                    if (shapesVisible != null)
                        renderer.setSeriesShapesVisible(j, shapesVisible);
                    //set style
                    Boolean showInLegend = lineProperties.getShowInLegend();
                    if (showInLegend != null)
                        renderer.setSeriesVisibleInLegend(j, showInLegend);

                    StyleObjectModel linePropertiesStyleModel = lineProperties.getStyleObjectModel();
                    if (linePropertiesStyleModel != null && lineProperties.getStyleObjectModel().getBorder() != null) {
                        StyleBorderModel model = lineProperties.getStyleObjectModel().getBorder();
                        Color color = model.getColor();
                        if (color != null)
                            renderer.setSeriesPaint(j, color);
                        renderer.setSeriesLinesVisible(j, Boolean.valueOf(!model.isNone()));
                        renderer.setSeriesStroke(j, PropertiesConverter.toStroke(model));
                    }

                }

            }
        }
    }

    static void processLineAndShapeRendererProperties(LineAndShapeRenderer renderer, CategoryDataset dataset, LineChartView view) {
        java.util.List<LineProperties> linePropertiesList = view.getLinePropertiesList();
        if (linePropertiesList == null)
            return;

        for (LineProperties lineProperties : linePropertiesList) {
            DynamicCategoryGenerator dcg = new DynamicCategoryGenerator(view, lineProperties.getDynamicCondition());

            ChartModel chartModel = view.getChart().getModel();
            if (chartModel == null)
                continue;

            Series[] series = chartModel.getSeries();
            if (series == null)
                continue;

            for (int j = 0; j < series.length; j++) {
                if (!dcg.generateCondition(dataset, j, 0))
                    continue;

                Boolean hideSeries = lineProperties.getHideSeries();
                if (hideSeries != null) {
                    boolean seriesVisible = !hideSeries;
                    renderer.setSeriesVisible(j, seriesVisible);
                }
                Boolean shapesVisible = lineProperties.getShapesVisible();
                if (shapesVisible != null)
                    renderer.setSeriesShapesVisible(j, shapesVisible);
                //set style
                Boolean showInLegend = lineProperties.getShowInLegend();
                if (showInLegend != null)
                    renderer.setSeriesVisibleInLegend(j, showInLegend);

                StyleObjectModel linePropertiesStyleModel = lineProperties.getStyleObjectModel();
                if (linePropertiesStyleModel != null && linePropertiesStyleModel.getBorder() != null) {
                    StyleBorderModel model = linePropertiesStyleModel.getBorder();
                    Color color = model.getColor();
                    if (color != null)
                        renderer.setSeriesPaint(j, color);
                    renderer.setSeriesLinesVisible(j, Boolean.valueOf(!model.isNone()));
                    renderer.setSeriesStroke(j, PropertiesConverter.toStroke(model));
                }

            }

        }
    }
}
