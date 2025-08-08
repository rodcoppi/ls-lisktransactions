'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  ComposedChart as RechartsComposedChart,
  Line,
  Bar,
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
import { ComposedChartProps, MultiMetricData } from '@/types';
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
 * Performance-optimized ComposedChart for multi-metric analysis
 * Supports mixed chart types (line, bar, area) with dual Y-axes
 */
export const ComposedChart: React.FC<ComposedChartProps> = ({
  data,
  components = [],
  width = '100%',
  height = 400,
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
  enableDualYAxis = false,
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
  const [visibleComponents, setVisibleComponents] = useState<Set<string>>(
    new Set(components.map(c => c.dataKey))
  );
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const chartRef = useRef<any>(null);

  // Debounced data for smooth interactions
  const debouncedData = useDebouncedValue(optimizedData, 100);

  // Chart dimensions
  const chartDimensions = responsive ? dimensions : { width, height };
  const margin = isMobile ? CHART_MARGINS.compact : CHART_MARGINS.detailed;

  // Process data for rendering
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];

    return debouncedData.map((item: any) => {
      const processedItem = {
        timestamp: typeof item.timestamp === 'number' 
          ? item.timestamp 
          : new Date(item.timestamp).getTime(),
      };

      // Process each component's data
      components.forEach(component => {
        processedItem[component.dataKey] = Number(item[component.dataKey]) || 0;
      });

      return processedItem;
    });
  }, [debouncedData, components]);

  // Organize components by Y-axis
  const { leftAxisComponents, rightAxisComponents } = useMemo(() => {
    const left: typeof components = [];
    const right: typeof components = [];

    components.forEach(component => {
      if (enableDualYAxis && component.yAxisId === 'right') {
        right.push(component);
      } else {
        left.push(component);
      }
    });

    return { leftAxisComponents: left, rightAxisComponents: right };
  }, [components, enableDualYAxis]);

  // Generate colors for components
  const componentColors = useMemo(() => {
    const colorMap: Record<string, string> = {};
    
    components.forEach((component, index) => {
      colorMap[component.dataKey] = component.color || 
        theme.colors.primary[index % theme.colors.primary.length];
    });

    return colorMap;
  }, [components, theme.colors.primary]);

  // Handle component visibility toggle
  const handleComponentToggle = useCallback((dataKey: string) => {
    setVisibleComponents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dataKey)) {
        newSet.delete(dataKey);
      } else {
        newSet.add(dataKey);
      }
      return newSet;
    });
    startAnimation();
  }, [startAnimation]);

  // Handle metric selection
  const handleMetricClick = useCallback((dataKey: string) => {
    setSelectedMetric(selectedMetric === dataKey ? null : dataKey);
    startAnimation();
  }, [selectedMetric, startAnimation]);

  // Handle brush change for zoom functionality
  const handleBrushChange = useCallback((brushSelection: any) => {
    if (brushSelection && onBrushChange) {
      const range: [number, number] = [
        brushSelection.startIndex || 0,
        brushSelection.endIndex || processedData.length - 1
      ];
      onBrushChange(range);
    }
    startAnimation();
  }, [processedData.length, onBrushChange, startAnimation]);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const date = new Date(label);
    const isValidDate = !isNaN(date.getTime());

    // Sort payload by value for better display
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-xs"
        style={theme.name === 'dark' ? TOOLTIP_CONFIG.dark.contentStyle : TOOLTIP_CONFIG.default.contentStyle}
      >
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {isValidDate ? format(date, 'MMM dd, yyyy HH:mm') : label}
        </p>
        
        <div className="space-y-2">
          {sortedPayload.map((entry: any, index: number) => {
            const component = components.find(c => c.dataKey === entry.dataKey);
            if (!component || !visibleComponents.has(entry.dataKey)) return null;

            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div
                    className={`w-3 h-3 mr-2 ${
                      component.type === 'line' ? 'rounded-full' :
                      component.type === 'bar' ? 'rounded-sm' :
                      'rounded'
                    }`}
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm font-medium" style={{ color: entry.color }}>
                    {entry.dataKey}:
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">
                    {typeof entry.value === 'number' 
                      ? entry.value.toLocaleString()
                      : entry.value
                    }
                  </span>
                  {component.yAxisId === 'right' && (
                    <span className="text-xs text-gray-500 ml-1">(R)</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isDecimated && (
          <p className="text-xs text-gray-500 mt-3 pt-2 border-t">
            Data optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
            {performanceMetrics.frameRate > 0 && (
              <span className="ml-1">• {Math.round(performanceMetrics.frameRate)} FPS</span>
            )}
          </p>
        )}
      </div>
    );
  }, [theme.name, components, visibleComponents, isDecimated, performanceMetrics]);

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
      return value.toLocaleString();
    }
    return value;
  }, []);

  // Render chart component based on type
  const renderChartComponent = useCallback((component: typeof components[0], index: number) => {
    const isVisible = visibleComponents.has(component.dataKey);
    const isSelected = selectedMetric === component.dataKey;
    const color = componentColors[component.dataKey];
    
    const commonProps = {
      dataKey: component.dataKey,
      yAxisId: component.yAxisId || 'left',
      stroke: color,
      fill: color,
      name: component.dataKey,
      animationDuration,
      animationBegin: index * 100,
      isAnimationActive: animate && !isAnimating,
      hide: !isVisible,
      strokeOpacity: isSelected || selectedMetric === null ? 1 : 0.3,
      fillOpacity: isSelected || selectedMetric === null ? (component.type === 'area' ? 0.6 : 1) : 0.1,
      ...component
    };

    switch (component.type) {
      case 'line':
        return (
          <Line
            key={component.dataKey}
            type="monotone"
            strokeWidth={isSelected ? 3 : 2}
            dot={processedData.length > 100 ? false : { 
              fill: color, 
              strokeWidth: 2, 
              r: isSelected ? 4 : 3 
            }}
            activeDot={{ 
              r: 6, 
              fill: color,
              stroke: theme.background.primary,
              strokeWidth: 2
            }}
            connectNulls={false}
            {...commonProps}
          />
        );
      
      case 'bar':
        return (
          <Bar
            key={component.dataKey}
            maxBarSize={40}
            radius={[2, 2, 0, 0]}
            fillOpacity={isSelected || selectedMetric === null ? 0.8 : 0.3}
            {...commonProps}
          />
        );
      
      case 'area':
        return (
          <Area
            key={component.dataKey}
            type="monotone"
            strokeWidth={2}
            fill={`url(#gradient-${component.dataKey})`}
            connectNulls={false}
            {...commonProps}
          />
        );
      
      default:
        return null;
    }
  }, [
    visibleComponents, 
    selectedMetric, 
    componentColors, 
    animationDuration, 
    animate, 
    isAnimating, 
    processedData.length, 
    theme.background.primary
  ]);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!exportEnabled) return;
    
    await exportChart(chartRef, {
      format,
      filename: title ? `${title.replace(/\s+/g, '-').toLowerCase()}-composed-chart` : 'composed-chart',
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
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading multi-metric data...</span>
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
        <p className="text-gray-600 dark:text-gray-400 text-sm">No multi-metric data available</p>
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

      {/* Component controls */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-2 mb-2">
          {components.map((component, index) => (
            <button
              key={component.dataKey}
              onClick={() => handleComponentToggle(component.dataKey)}
              onDoubleClick={() => handleMetricClick(component.dataKey)}
              className={`px-3 py-1 text-xs rounded-full transition-all flex items-center ${
                visibleComponents.has(component.dataKey)
                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800 shadow-sm'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              } ${
                selectedMetric === component.dataKey
                  ? 'ring-2 ring-blue-500 ring-offset-1'
                  : ''
              }`}
              style={visibleComponents.has(component.dataKey) 
                ? { backgroundColor: componentColors[component.dataKey], color: 'white' } 
                : {}
              }
              title={`${component.type.toUpperCase()} - Click to toggle, double-click to isolate`}
            >
              <div className="flex items-center">
                {component.type === 'line' && <span className="mr-1">📈</span>}
                {component.type === 'bar' && <span className="mr-1">📊</span>}
                {component.type === 'area' && <span className="mr-1">📉</span>}
                {component.dataKey}
                {component.yAxisId === 'right' && <span className="ml-1 text-xs">(R)</span>}
              </div>
            </button>
          ))}
        </div>
        
        <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
          {enableDualYAxis && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              Dual Y-Axis
            </span>
          )}
          {isDecimated && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
            </span>
          )}
          <span className="text-xs">
            Showing {visibleComponents.size} of {components.length} metrics
          </span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: chartDimensions.width, height: chartDimensions.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsComposedChart
            ref={chartRef}
            data={processedData}
            margin={margin}
            onMouseEnter={startAnimation}
            onClick={(event) => {
              if (event && event.activePayload && event.activePayload[0]) {
                onDataPointClick?.(event.activePayload[0].payload, event.activeTooltipIndex || 0);
              }
            }}
          >
            <defs>
              {/* Generate gradients for area components */}
              {components
                .filter(c => c.type === 'area')
                .map((component) => (
                  <linearGradient key={`gradient-${component.dataKey}`} id={`gradient-${component.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={componentColors[component.dataKey]} 
                      stopOpacity={0.8}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={componentColors[component.dataKey]} 
                      stopOpacity={0.1}
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
              tick={{ fill: theme.text.secondary, fontSize: 11 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
            />

            {/* Left Y Axis */}
            <YAxis
              yAxisId="left"
              orientation="left"
              tickFormatter={formatYAxisLabel}
              stroke={theme.stroke.axis}
              tick={{ fill: theme.text.secondary, fontSize: 11 }}
              tickLine={{ stroke: theme.stroke.primary }}
              axisLine={{ stroke: theme.stroke.primary }}
              label={leftAxisComponents.length > 0 ? { 
                value: leftAxisComponents.map(c => c.dataKey).join(', '), 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle', fontSize: '11px', fill: theme.text.secondary }
              } : undefined}
            />

            {/* Right Y Axis (if enabled) */}
            {enableDualYAxis && rightAxisComponents.length > 0 && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatYAxisLabel}
                stroke={theme.stroke.axis}
                tick={{ fill: theme.text.secondary, fontSize: 11 }}
                tickLine={{ stroke: theme.stroke.primary }}
                axisLine={{ stroke: theme.stroke.primary }}
                label={{ 
                  value: rightAxisComponents.map(c => c.dataKey).join(', '), 
                  angle: 90, 
                  position: 'insideRight',
                  style: { textAnchor: 'middle', fontSize: '11px', fill: theme.text.secondary }
                }}
              />
            )}

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
                onClick={(legendItem) => handleComponentToggle(legendItem.dataKey as string)}
              />
            )}

            {/* Render all chart components */}
            {components.map((component, index) => renderChartComponent(component, index))}

            {/* Reference lines */}
            {leftAxisComponents.some(c => processedData.some(d => d[c.dataKey] < 0)) && (
              <ReferenceLine
                yAxisId="left"
                y={0}
                stroke={theme.stroke.axis}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
            )}

            {enableDualYAxis && rightAxisComponents.some(c => processedData.some(d => d[c.dataKey] < 0)) && (
              <ReferenceLine
                yAxisId="right"
                y={0}
                stroke={theme.stroke.axis}
                strokeDasharray="2 2"
                strokeOpacity={0.5}
              />
            )}

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
          </RechartsComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Reset selection button */}
      {selectedMetric && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setSelectedMetric(null)}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
          >
            Show All Metrics
          </button>
        </div>
      )}
    </div>
  );
};