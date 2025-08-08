'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  defs,
  linearGradient,
  stop
} from 'recharts';
import { LineChartProps, TimeSeriesData } from '@/types';
import { 
  useResponsiveChart, 
  useOptimizedChartData, 
  useChartTheme,
  useChartAnimation,
  useChartExport,
  useDebouncedValue
} from './hooks';
import { CHART_MARGINS, TOOLTIP_CONFIG, LEGEND_CONFIG } from '@/lib/chart-config';
import { format } from 'date-fns';

/**
 * Performance-optimized LineChart with zoom/pan functionality
 * Supports 60 FPS with 10,000+ data points through intelligent decimation
 */
export const LineChart: React.FC<LineChartProps> = ({
  data,
  xAxisKey = 'timestamp',
  yAxisKey = 'value',
  additionalLines = [],
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
  enableZoom = true,
  enablePan = true,
  enableBrush = false,
  enableCrosshair = true,
  smoothCurve = true,
  connectNulls = false,
  domain,
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
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // Debounced data for smooth interactions
  const debouncedData = useDebouncedValue(optimizedData, 100);

  // Chart dimensions
  const chartDimensions = responsive ? dimensions : { width, height };
  const margin = isMobile ? CHART_MARGINS.compact : CHART_MARGINS.default;

  // Process data for rendering
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];

    return debouncedData.map((item: any) => ({
      ...item,
      [xAxisKey]: typeof item[xAxisKey] === 'number' 
        ? item[xAxisKey] 
        : new Date(item[xAxisKey]).getTime(),
      [yAxisKey]: Number(item[yAxisKey]) || 0,
      // Process additional line data
      ...additionalLines.reduce((acc, line) => {
        acc[line.key] = Number(item[line.key]) || 0;
        return acc;
      }, {} as Record<string, number>)
    }));
  }, [debouncedData, xAxisKey, yAxisKey, additionalLines]);

  // Handle zoom
  const handleZoom = useCallback((newDomain: any) => {
    if (!enableZoom) return;
    
    const domain: [number, number] = [newDomain.startIndex || 0, newDomain.endIndex || processedData.length - 1];
    setZoomDomain(domain);
    onZoom?.(domain);
    startAnimation();
  }, [enableZoom, processedData.length, onZoom, startAnimation]);

  // Handle brush selection
  const handleBrushChange = useCallback((brushData: any) => {
    if (!brushData || (!brushData.startIndex && !brushData.endIndex)) {
      setZoomDomain(null);
      return;
    }

    const range: [number, number] = [
      brushData.startIndex || 0,
      brushData.endIndex || processedData.length - 1
    ];
    
    onBrushChange?.(range);
    startAnimation();
  }, [processedData.length, onBrushChange, startAnimation]);

  // Handle data point click
  const handleDataPointClick = useCallback((data: any, index: number) => {
    setSelectedDataPoint(data);
    onDataPointClick?.(data, index);
  }, [onDataPointClick]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const date = new Date(label);
    const isValidDate = !isNaN(date.getTime());

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-xs"
        style={theme.name === 'dark' ? TOOLTIP_CONFIG.dark.contentStyle : TOOLTIP_CONFIG.default.contentStyle}
      >
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {isValidDate ? format(date, 'MMM dd, yyyy HH:mm') : label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm"
            style={{ color: entry.color }}
          >
            <span className="font-medium">{entry.dataKey}:</span>{' '}
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
        {isDecimated && (
          <p className="text-xs text-gray-500 mt-2 border-t pt-1">
            Data optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
          </p>
        )}
      </div>
    );
  }, [theme.name, isDecimated, performanceMetrics.dataPointCount]);

  // Format axis labels
  const formatXAxisLabel = useCallback((tickItem: any) => {
    if (typeof tickItem === 'number') {
      const date = new Date(tickItem);
      if (!isNaN(date.getTime())) {
        return isMobile ? format(date, 'MM/dd') : format(date, 'MMM dd');
      }
    }
    return tickItem;
  }, [isMobile]);

  const formatYAxisLabel = useCallback((value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }, []);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!exportEnabled) return;
    
    await exportChart(chartRef, {
      format,
      filename: title ? `${title.replace(/\s+/g, '-').toLowerCase()}-chart` : 'chart',
      width: chartDimensions.width as number,
      height: chartDimensions.height as number
    });
  }, [exportEnabled, exportChart, title, chartDimensions]);

  // Loading state
  if (loading) {
    return (
      <div 
        ref={containerRef}
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading chart data...</span>
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
        <p className="text-gray-600 dark:text-gray-400 text-sm">No data available</p>
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

      {/* Performance indicator */}
      {isDecimated && (
        <div className="mb-2 text-xs text-gray-500 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          Optimized for performance: {performanceMetrics.dataPointCount.toLocaleString()} data points
          {performanceMetrics.frameRate > 0 && (
            <span className="ml-2">• {Math.round(performanceMetrics.frameRate)} FPS</span>
          )}
        </div>
      )}

      {/* Chart */}
      <div style={{ width: chartDimensions.width, height: chartDimensions.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart
            ref={chartRef}
            data={processedData}
            margin={margin}
            onMouseEnter={startAnimation}
            onClick={(event) => {
              if (event && event.activePayload && event.activePayload[0]) {
                handleDataPointClick(event.activePayload[0].payload, event.activeTooltipIndex || 0);
              }
            }}
          >
            <defs>
              {/* Gradient definitions for smooth lines */}
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.colors.primary[0]} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={theme.colors.primary[0]} stopOpacity={0.2}/>
              </linearGradient>
            </defs>

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
              dataKey={xAxisKey}
              type="number"
              domain={domain || ['auto', 'auto']}
              scale="time"
              tickFormatter={formatXAxisLabel}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 12 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
            />

            {/* Y Axis */}
            <YAxis
              tickFormatter={formatYAxisLabel}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 12 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
            />

            {/* Tooltip */}
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={enableCrosshair ? { 
                  strokeDasharray: '5 5', 
                  stroke: theme.stroke.grid 
                } : false}
                animationDuration={animationDuration}
              />
            )}

            {/* Legend */}
            {showLegend && (
              <Legend
                {...LEGEND_CONFIG.default}
                wrapperStyle={{
                  ...LEGEND_CONFIG.default.wrapperStyle,
                  color: theme.text.primary
                }}
              />
            )}

            {/* Main line */}
            <Line
              type={smoothCurve ? 'monotone' : 'linear'}
              dataKey={yAxisKey}
              stroke={theme.colors.primary[0]}
              strokeWidth={2}
              fill="url(#lineGradient)"
              dot={processedData.length > 100 ? false : { fill: theme.colors.primary[0], strokeWidth: 2, r: 3 }}
              activeDot={{ 
                r: 5, 
                fill: theme.colors.primary[0],
                stroke: theme.background.primary,
                strokeWidth: 2
              }}
              connectNulls={connectNulls}
              animationDuration={animationDuration}
              animationBegin={0}
              isAnimationActive={animate && !isAnimating}
            />

            {/* Additional lines */}
            {additionalLines.map((line, index) => (
              <Line
                key={line.key}
                type={smoothCurve ? 'monotone' : 'linear'}
                dataKey={line.key}
                stroke={line.color || theme.colors.secondary[index % theme.colors.secondary.length]}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.strokeDashArray}
                dot={processedData.length > 100 ? false : { 
                  fill: line.color || theme.colors.secondary[index % theme.colors.secondary.length],
                  strokeWidth: 2,
                  r: 3
                }}
                activeDot={{ 
                  r: 5, 
                  fill: line.color || theme.colors.secondary[index % theme.colors.secondary.length],
                  stroke: theme.background.primary,
                  strokeWidth: 2
                }}
                connectNulls={connectNulls}
                animationDuration={animationDuration}
                animationBegin={index * 100}
                isAnimationActive={animate && !isAnimating}
              />
            ))}

            {/* Reference line for selected point */}
            {selectedDataPoint && (
              <ReferenceLine
                x={selectedDataPoint[xAxisKey]}
                stroke={theme.colors.accent[0]}
                strokeDasharray="2 2"
                strokeOpacity={0.7}
              />
            )}

            {/* Brush for zoom/pan */}
            {enableBrush && (
              <Brush
                dataKey={xAxisKey}
                height={30}
                stroke={theme.colors.primary[0]}
                fill={theme.background.secondary}
                onChange={handleBrushChange}
                tickFormatter={formatXAxisLabel}
              />
            )}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>

      {/* Zoom controls */}
      {enableZoom && zoomDomain && (
        <div className="flex items-center justify-center mt-2">
          <button
            onClick={() => setZoomDomain(null)}
            className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Reset Zoom
          </button>
        </div>
      )}
    </div>
  );
};