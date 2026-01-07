'use client';

import React, { useLayoutEffect, useRef, useEffect, useState } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { Ailment, BubbleChartDataPoint } from '@/types';
import { formatDuration, getTopTreatment } from '@/utils';

interface BubbleChartProps {
  ailments: Ailment[];
}

export const BubbleChart: React.FC<BubbleChartProps> = ({ ailments }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<am5.Root | null>(null);

  // Transform ailments data for the chart
  const chartData: BubbleChartDataPoint[] = ailments.map((ailment) => {
    const topTreatment = getTopTreatment(ailment);
    return {
      id: ailment.id,
      ailmentName: ailment.ailment.name || 'Unnamed Ailment',
      duration: ailment.ailment.duration,
      intensity: ailment.ailment.intensity,
      ailmentSeverity: ailment.ailment.severity,
      topTreatment: topTreatment
        ? {
            name: topTreatment.name,
            efficacy: topTreatment.efficacy,
            intensity: topTreatment.intensity,
          }
        : null,
    };
  });

  // Calculate average intensity for the horizontal line
  const averageIntensity = chartData.length > 0
    ? chartData.reduce((sum, item) => sum + item.intensity, 0) / chartData.length
    : 0;

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    // Create root element
    const root = am5.Root.new(chartRef.current);
    rootRef.current = root;

    // Set themes
    root.setThemes([am5themes_Animated.new(root)]);

    // Create chart
    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: true,
        panY: true,
        wheelY: 'zoomXY',
        pinchZoomX: true,
        pinchZoomY: true,
      })
    );

    // Calculate data range for 10% zoom out
    const durations = chartData.map(d => d.duration);
    const intensities = chartData.map(d => d.intensity);
    const minDuration = Math.min(...durations, 0);
    const maxDuration = Math.max(...durations, 100);
    const minIntensity = Math.min(...intensities, 0);
    const maxIntensity = Math.max(...intensities, 100);
    const durationPadding = (maxDuration - minDuration) * 0.1;
    const intensityPadding = (maxIntensity - minIntensity) * 0.1;

    // Create axes
    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: Math.max(0, minDuration - durationPadding),
        max: maxDuration + durationPadding,
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: 50,
        }),
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    xAxis.children.push(
      am5.Label.new(root, {
        text: 'Duration (seconds)',
        x: am5.p50,
        centerX: am5.p50,
      })
    );

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: Math.max(0, minIntensity - intensityPadding),
        max: Math.min(100, maxIntensity + intensityPadding),
        renderer: am5xy.AxisRendererY.new(root, {
          minGridDistance: 50,
        }),
        tooltip: am5.Tooltip.new(root, {}),
      })
    );

    yAxis.children.push(
      am5.Label.new(root, {
        text: 'Intensity (0-100)',
        rotation: -90,
        y: am5.p50,
        centerX: am5.p50,
      })
    );

    // Create series for bubble chart with pie bullets
    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        xAxis: xAxis,
        yAxis: yAxis,
        valueYField: 'intensity',
        valueXField: 'duration',
        tooltip: am5.Tooltip.new(root, {
          pointerOrientation: 'horizontal',
          labelText:
            '[bold]{ailmentName}[/]\nDuration: {durationFormatted}\nIntensity: {intensity}%\nSeverity: {ailmentSeverity}%\n\n[bold]Top Treatment:[/]\n{treatmentName}\nEfficacy: {efficacy}%\nIntensity: {treatmentIntensity}%',
        }),
      })
    );

    series.strokes.template.set('visible', false);

    // Create pie bullet template
    series.bullets.push((root, series, dataItem) => {
      const data = dataItem.dataContext as any;
      
      // Container for the pie chart bullet
      const container = am5.Container.new(root, {
        width: 60 + (data.ailmentSeverity || 0) * 0.4,
        height: 60 + (data.ailmentSeverity || 0) * 0.4,
      });

      // Create a mini pie chart
      const pieChart = container.children.push(
        am5percent.PieChart.new(root, {
          width: am5.percent(100),
          height: am5.percent(100),
        })
      );

      const pieSeries = pieChart.series.push(
        am5percent.PieSeries.new(root, {
          valueField: 'value',
          categoryField: 'category',
        })
      );

      // Set pie data based on treatment efficacy and intensity
      const pieData = [];
      if (data.topTreatment) {
        pieData.push({
          category: 'Efficacy',
          value: data.topTreatment.efficacy,
          sliceSettings: { fill: am5.color(0x67b7dc) },
        });
        pieData.push({
          category: 'Treatment Intensity',
          value: data.topTreatment.intensity,
          sliceSettings: { fill: am5.color(0xfdd400) },
        });
        pieData.push({
          category: 'Remaining',
          value: Math.max(0, 100 - data.topTreatment.efficacy - data.topTreatment.intensity),
          sliceSettings: { fill: am5.color(0xeeeeee) },
        });
      } else {
        pieData.push({
          category: 'No Treatment',
          value: 100,
          sliceSettings: { fill: am5.color(0xcccccc) },
        });
      }

      pieSeries.slices.template.setAll({
        strokeWidth: 1,
        stroke: am5.color(0xffffff),
      });

      pieSeries.slices.template.adapters.add('fill', (fill, target) => {
        const dataContext = target.dataItem?.dataContext as any;
        if (dataContext?.sliceSettings?.fill) {
          return dataContext.sliceSettings.fill;
        }
        return fill;
      });

      // Hide labels and ticks for mini pies
      pieSeries.labels.template.set('visible', false);
      pieSeries.ticks.template.set('visible', false);

      pieSeries.data.setAll(pieData);

      // Add ailment name label below the pie
      container.children.push(
        am5.Label.new(root, {
          text: data.ailmentName,
          fontSize: 10,
          fontWeight: 'bold',
          centerX: am5.p50,
          centerY: am5.p0,
          y: am5.percent(100),
          paddingTop: 5,
        })
      );

      return am5.Bullet.new(root, {
        sprite: container,
      });
    });

    // Process data for series
    const processedData = chartData.map((item) => ({
      ...item,
      durationFormatted: formatDuration(item.duration),
      treatmentName: item.topTreatment?.name || 'None',
      efficacy: item.topTreatment?.efficacy || 0,
      treatmentIntensity: item.topTreatment?.intensity || 0,
    }));

    series.data.setAll(processedData);

    // Add horizontal line at average intensity
    if (chartData.length > 0) {
      const avgLineSeries = chart.series.push(
        am5xy.LineSeries.new(root, {
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: 'y',
          valueXField: 'x',
          stroke: am5.color(0xff6b6b),
          tooltip: am5.Tooltip.new(root, {
            labelText: `Average Intensity: ${averageIntensity.toFixed(1)}%`,
          }),
        })
      );

      avgLineSeries.strokes.template.setAll({
        strokeWidth: 3,
        strokeDasharray: [8, 4],
      });

      // Create line data spanning the x-axis range
      const avgLineData = [
        { x: Math.max(0, minDuration - durationPadding), y: averageIntensity },
        { x: maxDuration + durationPadding, y: averageIntensity },
      ];

      avgLineSeries.data.setAll(avgLineData);

      // Add a label for the average line
      chart.plotContainer.children.push(
        am5.Label.new(root, {
          text: `Avg: ${averageIntensity.toFixed(1)}%`,
          fontSize: 12,
          fontWeight: 'bold',
          fill: am5.color(0xff6b6b),
          x: am5.percent(98),
          centerX: am5.percent(100),
          y: yAxis.valueToPosition(averageIntensity),
          centerY: am5.percent(100),
          paddingRight: 5,
        })
      );
    }

    // Add cursor
    chart.set(
      'cursor',
      am5xy.XYCursor.new(root, {
        behavior: 'zoomXY',
        xAxis: xAxis,
        yAxis: yAxis,
      })
    );

    // Add scrollbars
    chart.set(
      'scrollbarX',
      am5.Scrollbar.new(root, {
        orientation: 'horizontal',
      })
    );

    chart.set(
      'scrollbarY',
      am5.Scrollbar.new(root, {
        orientation: 'vertical',
      })
    );

    // Add legend
    const legend = chart.children.push(
      am5.Legend.new(root, {
        centerX: am5.p50,
        x: am5.p50,
        y: am5.percent(100),
        centerY: am5.percent(100),
        paddingTop: 20,
      })
    );

    // Static legend items
    const legendData = [
      {
        name: 'Efficacy',
        color: am5.color(0x67b7dc),
      },
      {
        name: 'Treatment Intensity',
        color: am5.color(0xfdd400),
      },
      {
        name: 'Bubble Size = Severity',
        color: am5.color(0x999999),
      },
      {
        name: 'Avg Intensity Line',
        color: am5.color(0xff6b6b),
      },
    ];

    legend.data.setAll(
      legendData.map((item) => ({
        name: item.name,
        color: item.color,
      }))
    );

    legend.markers.template.setAll({
      width: 15,
      height: 15,
    });

    legend.markers.template.setup = (target) => {
      target.children.push(am5.RoundedRectangle.new(root, {
        width: am5.percent(100),
        height: am5.percent(100),
      }));
    };

    legend.markers.template.adapters.add('forceHidden', (hidden, target) => {
      return false;
    });

    // Animate on load
    series.appear(1000);
    chart.appear(1000, 100);

    return () => {
      root.dispose();
    };
  }, [chartData]);

  return (
    <div className="w-full h-full">
      <div ref={chartRef} className="w-full h-[600px]" />
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h4 className="font-semibold mb-2">Chart Legend:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <span className="inline-block w-4 h-4 bg-[#67b7dc] mr-2"></span>
            Blue: Treatment Efficacy (%)
          </li>
          <li>
            <span className="inline-block w-4 h-4 bg-[#fdd400] mr-2"></span>
            Yellow: Treatment Intensity (%)
          </li>
          <li>
            <strong>X-Axis:</strong> Ailment Duration (seconds)
          </li>
          <li>
            <strong>Y-Axis:</strong> Ailment Intensity (0-100%)
          </li>
          <li>
            <strong>Bubble Size:</strong> Based on Ailment Severity
          </li>
          <li>
            <strong>Pie Charts:</strong> Shows top treatment&apos;s efficacy and intensity
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BubbleChart;
