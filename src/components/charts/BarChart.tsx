'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList
} from 'recharts';
import { BarChartProps, ComparisonData } from '@/types';
import { 
  useResponsiveChart, 
  useOptimizedChartData, 
  useChartTheme,
  useChartAnimation,
  useChartExport,
  useDebouncedValue
} from './hooks';
import { CHART_MARGINS, TOOLTIP_CONFIG, LEGEND_CONFIG } from '@/lib/chart-config';

/**
 * Performance-optimized BarChart for weekly/monthly comparisons
 * Supports horizontal/vertical orientation, stacked and grouped bars
 */
export const BarChart: React.FC<BarChartProps> = ({
  data,
  xAxisKey = 'period',
  yAxisKey = 'current',
  width = '100%',
  height = 350,
  loading = false,
  error = null,
  responsive = true,
  animate = true,
  className = '',
  title,
  subtitle,
  showLegend = true,
  showGrid = true,
  showTooltip = true,
  orientation = 'vertical',
  stacked = false,
  grouped = false,
  maxBarSize = undefined,
  barRadius = 4,
  showComparison = true,
  exportEnabled = false,
  onDataPointClick,
  onZoom,
  onBrushChange,
  ...props
}) => {
  // Hooks
  const { containerRef, dimensions, isMobile } = useResponsiveChart();
  const { data: optimizedData, performanceMetrics, isDecimated } = useOptimizedChartData(data);
  const { theme } = useChartTheme(props.theme);
  const { isAnimating, startAnimation, animationDuration } = useChartAnimation(animate);
  const { exportChart, isExporting } = useChartExport();

  // State
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // Debounced data for smooth interactions
  const debouncedData = useDebouncedValue(optimizedData, 100);

  // Chart dimensions
  const chartDimensions = responsive ? dimensions : { width, height };
  const margin = isMobile ? CHART_MARGINS.compact : CHART_MARGINS.default;

  // Process data for rendering
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];

    return debouncedData.map((item: any, index: number) => ({
      ...item,
      [xAxisKey]: item[xAxisKey] || `Period ${index + 1}`,
      [yAxisKey]: Number(item[yAxisKey]) || 0,
      previous: Number(item.previous) || 0,
      change: Number(item.change) || 0,
      changePercent: Number(item.changePercent) || 0,
      index
    }));
  }, [debouncedData, xAxisKey, yAxisKey]);

  // Generate bar colors based on performance
  const getBarColor = useCallback((dataItem: any, index: number) => {
    if (selectedBarIndex !== null && selectedBarIndex !== index) {
      return theme.colors.neutral[2];
    }

    if (showComparison) {
      const change = dataItem.change || 0;
      if (change > 0) return theme.colors.semantic.success;
      if (change < 0) return theme.colors.semantic.error;
      return theme.colors.neutral[1];
    }

    return theme.colors.primary[index % theme.colors.primary.length];
  }, [selectedBarIndex, showComparison, theme]);

  // Handle bar click
  const handleBarClick = useCallback((data: any, index: number) => {
    setSelectedBarIndex(selectedBarIndex === index ? null : index);
    onDataPointClick?.(data, index);
    startAnimation();
  }, [selectedBarIndex, onDataPointClick, startAnimation]);

  // Handle bar hover
  const handleBarHover = useCallback((data: any, index: number) => {
    setHoveredBar(data);
  }, []);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 min-w-48"
        style={theme.name === 'dark' ? TOOLTIP_CONFIG.dark.contentStyle : TOOLTIP_CONFIG.default.contentStyle}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {label}
        </p>
        
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div
                  className="w-3 h-3 rounded-sm mr-2"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm" style={{ color: entry.color }}>
                  {entry.dataKey === yAxisKey ? 'Current' : 
                   entry.dataKey === 'previous' ? 'Previous' : 
                   entry.dataKey}:
                </span>
              </div>
              <span className="text-sm font-semibold">
                {typeof entry.value === 'number' 
                  ? entry.value.toLocaleString()
                  : entry.value
                }
              </span>
            </div>
          ))}
        </div>

        {showComparison && data.change !== undefined && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">Change:</span>
              <div className="flex items-center">
                <span className={`text-xs font-semibold ${
                  data.change > 0 
                    ? 'text-green-600 dark:text-green-400' 
                    : data.change < 0 
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {data.change > 0 && '+'}
                  {data.change.toLocaleString()}
                </span>
                {data.changePercent !== undefined && (
                  <span className={`text-xs ml-1 ${
                    data.change > 0 
                      ? 'text-green-600 dark:text-green-400' 
                      : data.change < 0 
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    ({data.changePercent > 0 && '+'}{data.changePercent.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {isDecimated && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Data optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
          </p>
        )}
      </div>
    );
  }, [theme.name, yAxisKey, showComparison, isDecimated, performanceMetrics.dataPointCount]);

  // Custom label component for showing values on bars
  const CustomLabel = useCallback((props: any) => {
    const { x, y, width, height, value } = props;
    
    if (orientation === 'vertical') {
      return (
        <text
          x={x + width / 2}
          y={y - 5}
          fill={theme.text.primary}
          textAnchor="middle"
          fontSize="11"
        >
          {value.toLocaleString()}
        </text>
      );
    } else {
      return (
        <text
          x={x + width + 5}
          y={y + height / 2}
          fill={theme.text.primary}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="11"
        >
          {value.toLocaleString()}
        </text>
      );
    }
  }, [orientation, theme.text.primary]);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!exportEnabled) return;
    
    await exportChart(chartRef, {
      format,
      filename: title ? `${title.replace(/\s+/g, '-').toLowerCase()}-bar-chart` : 'bar-chart',
      width: chartDimensions.width as number,
      height: chartDimensions.height as number
    });
  }, [exportEnabled, exportChart, title, chartDimensions]);

  // Chart layout based on orientation
  const ChartComponent = orientation === 'vertical' ? RechartsBarChart : RechartsBarChart;

  // Loading state
  if (loading) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading comparison data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div 
        ref={containerRef}
        className={`flex flex-col items-center justify-center p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 ${className}`}
        style={{ width, height }}
      >
        <div className="text-red-600 dark:text-red-400 mb-2">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-700 dark:text-red-300 text-sm font-medium">Chart Error</p>
        <p className="text-red-600 dark:text-red-400 text-xs">{error.message}</p>
      </div>
    );
  }

  // Empty state
  if (!processedData || processedData.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 ${className}`}
        style={{ width, height }}
      >
        <div className="text-gray-400 dark:text-gray-600 mb-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">No comparison data available</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Header */}
      {(title || subtitle || exportEnabled) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {subtitle}
              </p>
            )}
          </div>
          
          {exportEnabled && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleExport('png')}
                disabled={isExporting}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                title="Export as PNG"
              >
                PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                disabled={isExporting}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
                title="Export as SVG"
              >
                SVG
              </button>
            </div>
          )}
        </div>
      )}

      {/* Chart configuration indicators */}
      <div className="flex items-center space-x-4 mb-2 text-xs">
        <span className="flex items-center text-gray-600 dark:text-gray-400">
          <div className="w-2 h-2 bg-blue-500 rounded-sm mr-1"></div>
          {orientation === 'vertical' ? 'Vertical' : 'Horizontal'}
        </span>
        {stacked && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-purple-500 rounded-sm mr-1"></div>
            Stacked
          </span>
        )}
        {grouped && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-sm mr-1"></div>
            Grouped
          </span>
        )}
        {showComparison && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-orange-500 rounded-sm mr-1"></div>
            Comparison
          </span>
        )}
        {isDecimated && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
          </span>
        )}
      </div>

      {/* Chart */}
      <div style={{ width: chartDimensions.width, height: chartDimensions.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            ref={chartRef}
            layout={orientation === 'vertical' ? 'horizontal' : 'vertical'}
            data={processedData}
            margin={margin}
            onMouseEnter={startAnimation}
            onClick={(event) => {
              if (event && event.activePayload && event.activePayload[0]) {
                const data = event.activePayload[0].payload;
                handleBarClick(data, data.index);
              }
            }}
          >
            {/* Grid */}
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={theme.stroke.grid}
                strokeOpacity={theme.opacity.grid}
              />
            )}

            {/* X Axis */}
            <XAxis
              dataKey={orientation === 'vertical' ? xAxisKey : yAxisKey}
              type={orientation === 'vertical' ? 'category' : 'number'}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 12 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
              angle={isMobile && orientation === 'vertical' ? -45 : 0}
              textAnchor={isMobile && orientation === 'vertical' ? 'end' : 'middle'}
              height={isMobile && orientation === 'vertical' ? 60 : undefined}
            />

            {/* Y Axis */}
            <YAxis
              dataKey={orientation === 'vertical' ? yAxisKey : xAxisKey}
              type={orientation === 'vertical' ? 'number' : 'category'}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 12 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
              tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString() : value}
            />

            {/* Tooltip */}
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: theme.background.grid, fillOpacity: 0.3 }}
                animationDuration={animationDuration}
              />
            )}

            {/* Legend */}
            {showLegend && (showComparison || grouped) && (
              <Legend
                {...LEGEND_CONFIG.default}
                wrapperStyle={{
                  ...LEGEND_CONFIG.default.wrapperStyle,
                  color: theme.text.primary
                }}
              />
            )}

            {/* Main bars */}
            <Bar
              dataKey={yAxisKey}
              name="Current"
              maxBarSize={maxBarSize}
              radius={orientation === 'vertical' ? [barRadius, barRadius, 0, 0] : [0, barRadius, barRadius, 0]}
              animationDuration={animationDuration}
              animationBegin={0}
              isAnimationActive={animate && !isAnimating}
              onClick={(data, index) => handleBarClick(data, index)}
              onMouseEnter={(data, index) => handleBarHover(data, index)}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry, index)}
                />
              ))}
              
              {/* Add labels on bars */}
              {processedData.length <= 20 && (
                <LabelList content={<CustomLabel />} />
              )}
            </Bar>

            {/* Comparison bars */}
            {showComparison && (
              <Bar
                dataKey="previous"
                name="Previous"
                fill={theme.colors.secondary[0]}
                fillOpacity={0.6}
                maxBarSize={maxBarSize}
                radius={orientation === 'vertical' ? [barRadius, barRadius, 0, 0] : [0, barRadius, barRadius, 0]}
                animationDuration={animationDuration}
                animationBegin={200}
                isAnimationActive={animate && !isAnimating}
              />
            )}

            {/* Reference line for zero */}
            {showComparison && (
              <ReferenceLine
                y={0}
                stroke={theme.stroke.axis}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>

      {/* Selection info */}
      {selectedBarIndex !== null && hoveredBar && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
          <span className="font-medium">Selected: </span>
          {hoveredBar[xAxisKey]} - {hoveredBar[yAxisKey].toLocaleString()}
          {showComparison && hoveredBar.change !== undefined && (
            <span className={`ml-2 ${
              hoveredBar.change > 0 
                ? 'text-green-600 dark:text-green-400' 
                : hoveredBar.change < 0 
                ? 'text-red-600 dark:text-red-400'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              ({hoveredBar.change > 0 && '+'}{hoveredBar.change.toLocaleString()})
            </span>
          )}
        </div>
      )}
    </div>
  );
};