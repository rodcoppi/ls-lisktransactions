'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
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
import { AreaChartProps, VolumeAnalysisData } from '@/types';
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
 * Performance-optimized AreaChart with gradient fills for volume analysis
 * Supports stacked and normalized area charts with smooth gradients
 */
export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  areas,
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
  stacked = false,
  normalized = false,
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
  const [selectedAreaIndex, setSelectedAreaIndex] = useState<number | null>(null);
  const [brushData, setBrushData] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // Debounced data for smooth interactions
  const debouncedData = useDebouncedValue(optimizedData, 100);

  // Chart dimensions
  const chartDimensions = responsive ? dimensions : { width, height };
  const margin = isMobile ? CHART_MARGINS.compact : CHART_MARGINS.default;

  // Process data for rendering
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];

    return debouncedData.map((item: any) => {
      const processedItem = {
        timestamp: typeof item.timestamp === 'number' 
          ? item.timestamp 
          : new Date(item.timestamp).getTime(),
      };

      // Process each area's data
      areas.forEach(area => {
        processedItem[area.dataKey] = Number(item[area.dataKey]) || 0;
      });

      return processedItem;
    });
  }, [debouncedData, areas]);

  // Calculate normalized data if needed
  const finalData = useMemo(() => {
    if (!normalized || !processedData.length) return processedData;

    return processedData.map(item => {
      const total = areas.reduce((sum, area) => sum + (item[area.dataKey] || 0), 0);
      const normalizedItem = { ...item };

      if (total > 0) {
        areas.forEach(area => {
          normalizedItem[area.dataKey] = ((item[area.dataKey] || 0) / total) * 100;
        });
      }

      return normalizedItem;
    });
  }, [processedData, areas, normalized]);

  // Generate gradient IDs and colors
  const gradientData = useMemo(() => {
    return areas.map((area, index) => {
      const baseColor = area.color || theme.colors.primary[index % theme.colors.primary.length];
      return {
        ...area,
        color: baseColor,
        gradientId: `gradient-${area.dataKey}`,
        fillOpacity: selectedAreaIndex === null || selectedAreaIndex === index ? theme.opacity.area : theme.opacity.disabled
      };
    });
  }, [areas, theme, selectedAreaIndex]);

  // Handle area selection
  const handleAreaClick = useCallback((areaIndex: number) => {
    setSelectedAreaIndex(selectedAreaIndex === areaIndex ? null : areaIndex);
    startAnimation();
  }, [selectedAreaIndex, startAnimation]);

  // Handle brush change for zoom functionality
  const handleBrushChange = useCallback((brushSelection: any) => {
    setBrushData(brushSelection);
    
    if (brushSelection && onBrushChange) {
      const range: [number, number] = [
        brushSelection.startIndex || 0,
        brushSelection.endIndex || finalData.length - 1
      ];
      onBrushChange(range);
    }
    
    startAnimation();
  }, [finalData.length, onBrushChange, startAnimation]);

  // Handle data point click
  const handleDataPointClick = useCallback((data: any, index: number) => {
    onDataPointClick?.(data, index);
  }, [onDataPointClick]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const date = new Date(label);
    const isValidDate = !isNaN(date.getTime());
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-xs"
        style={theme.name === 'dark' ? TOOLTIP_CONFIG.dark.contentStyle : TOOLTIP_CONFIG.default.contentStyle}
      >
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          {isValidDate ? format(date, 'MMM dd, yyyy HH:mm') : label}
        </p>
        
        {normalized && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
            Total: {total.toLocaleString()} {normalized ? '%' : ''}
          </p>
        )}
        
        <div className="space-y-1">
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-sm mr-2"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.dataKey}:
                  </span>
                </div>
                <span className="text-sm font-semibold">
                  {typeof entry.value === 'number' 
                    ? entry.value.toLocaleString(undefined, { 
                        maximumFractionDigits: normalized ? 1 : 0 
                      }) + (normalized ? '%' : '')
                    : entry.value
                  }
                </span>
              </div>
            ))}
        </div>
        
        {isDecimated && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Data optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
          </p>
        )}
      </div>
    );
  }, [theme.name, normalized, isDecimated, performanceMetrics.dataPointCount]);

  // Format axis labels
  const formatXAxisLabel = useCallback((tickItem: any) => {
    const date = new Date(tickItem);
    if (!isNaN(date.getTime())) {
      return isMobile ? format(date, 'MM/dd') : format(date, 'MMM dd');
    }
    return tickItem;
  }, [isMobile]);

  const formatYAxisLabel = useCallback((value: any) => {
    if (typeof value === 'number') {
      return normalized 
        ? `${value}%`
        : value.toLocaleString();
    }
    return value;
  }, [normalized]);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!exportEnabled) return;
    
    await exportChart(chartRef, {
      format,
      filename: title ? `${title.replace(/\s+/g, '-').toLowerCase()}-area-chart` : 'area-chart',
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
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading volume data...</span>
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
  if (!finalData || finalData.length === 0) {
    return (
      <div 
        ref={containerRef}
        className={`flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg bg-gray-50 dark:bg-gray-800 ${className}`}
        style={{ width, height }}
      >
        <div className="text-gray-400 dark:text-gray-600 mb-2">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">No volume data available</p>
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

      {/* Chart type indicators */}
      <div className="flex items-center space-x-4 mb-2 text-xs">
        {stacked && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
            Stacked
          </span>
        )}
        {normalized && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Normalized
          </span>
        )}
        {isDecimated && (
          <span className="flex items-center text-gray-600 dark:text-gray-400">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
            {performanceMetrics.frameRate > 0 && (
              <span className="ml-1">• {Math.round(performanceMetrics.frameRate)} FPS</span>
            )}
          </span>
        )}
      </div>

      {/* Area selection controls */}
      {areas.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedAreaIndex(null)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              selectedAreaIndex === null 
                ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
          >
            All Areas
          </button>
          {gradientData.map((area, index) => (
            <button
              key={area.dataKey}
              onClick={() => handleAreaClick(index)}
              className={`px-2 py-1 text-xs rounded transition-colors flex items-center ${
                selectedAreaIndex === index 
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800' 
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
              }`}
              style={selectedAreaIndex === index ? {} : { color: area.color }}
            >
              <div
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: area.color }}
              />
              {area.dataKey}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div style={{ width: chartDimensions.width, height: chartDimensions.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            ref={chartRef}
            data={finalData}
            margin={margin}
            onMouseEnter={startAnimation}
            onClick={(event) => {
              if (event && event.activePayload && event.activePayload[0]) {
                handleDataPointClick(event.activePayload[0].payload, event.activeTooltipIndex || 0);
              }
            }}
          >
            <defs>
              {/* Generate gradients for each area */}
              {gradientData.map((area) => (
                <linearGradient key={area.gradientId} id={area.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop 
                    offset="5%" 
                    stopColor={area.color} 
                    stopOpacity={area.gradient !== false ? 0.8 : theme.opacity.area}
                  />
                  <stop 
                    offset="95%" 
                    stopColor={area.color} 
                    stopOpacity={area.gradient !== false ? 0.1 : theme.opacity.area * 0.5}
                  />
                </linearGradient>
              ))}
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
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
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
              domain={normalized ? [0, 100] : ['auto', 'auto']}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 12 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
            />

            {/* Tooltip */}
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: '5 5', stroke: theme.stroke.grid }}
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
                onClick={(legendItem) => {
                  const areaIndex = gradientData.findIndex(area => area.dataKey === legendItem.dataKey);
                  if (areaIndex !== -1) handleAreaClick(areaIndex);
                }}
              />
            )}

            {/* Area components */}
            {gradientData.map((area, index) => (
              <Area
                key={area.dataKey}
                type="monotone"
                dataKey={area.dataKey}
                stackId={stacked ? area.stackId || '1' : undefined}
                stroke={area.color}
                strokeWidth={2}
                fill={area.gradient !== false ? `url(#${area.gradientId})` : area.color}
                fillOpacity={area.fillOpacity}
                connectNulls={false}
                animationDuration={animationDuration}
                animationBegin={index * 100}
                isAnimationActive={animate && !isAnimating}
              />
            ))}

            {/* Brush for zoom functionality */}
            {onBrushChange && (
              <Brush
                dataKey="timestamp"
                height={30}
                stroke={theme.colors.primary[0]}
                fill={theme.background.secondary}
                onChange={handleBrushChange}
                tickFormatter={formatXAxisLabel}
              />
            )}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};