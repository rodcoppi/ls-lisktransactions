'use client';

import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LabelList
} from 'recharts';
import { PieChartProps, TransactionTypeDistribution } from '@/types';
import { 
  useResponsiveChart, 
  useOptimizedChartData, 
  useChartTheme,
  useChartAnimation,
  useChartExport,
  useDebouncedValue
} from './hooks';
import { CHART_MARGINS, TOOLTIP_CONFIG, LEGEND_CONFIG } from '@/lib/chart-config';
import { generateColorPalette } from './utils';

/**
 * Performance-optimized PieChart for transaction type distribution
 * Supports donut charts, custom labels, and interactive segments
 */
export const PieChart: React.FC<PieChartProps> = ({
  data,
  valueKey = 'value',
  labelKey = 'type',
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
  showTooltip = true,
  showLabels = true,
  showValues = false,
  donut = false,
  innerRadius = 0,
  outerRadius = undefined,
  startAngle = 90,
  endAngle = 450,
  exportEnabled = false,
  onDataPointClick,
  ...props
}) => {
  // Hooks
  const { containerRef, dimensions, isMobile } = useResponsiveChart();
  const { data: optimizedData, performanceMetrics, isDecimated } = useOptimizedChartData(data);
  const { theme } = useChartTheme(props.theme);
  const { isAnimating, startAnimation, animationDuration } = useChartAnimation(animate);
  const { exportChart, isExporting } = useChartExport();

  // State
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);
  const chartRef = useRef<any>(null);

  // Debounced data for smooth interactions
  const debouncedData = useDebouncedValue(optimizedData, 100);

  // Chart dimensions
  const chartDimensions = responsive ? dimensions : { width, height };
  const calculatedOuterRadius = outerRadius || Math.min(chartDimensions.width as number, chartDimensions.height as number) / 2 - 80;
  const calculatedInnerRadius = donut ? (innerRadius || calculatedOuterRadius * 0.6) : innerRadius;

  // Process data for rendering
  const processedData = useMemo(() => {
    if (!debouncedData || debouncedData.length === 0) return [];

    const total = debouncedData.reduce((sum: number, item: any) => sum + (Number(item[valueKey]) || 0), 0);

    return debouncedData
      .map((item: any, index: number) => {
        const value = Number(item[valueKey]) || 0;
        return {
          ...item,
          [labelKey]: item[labelKey] || `Category ${index + 1}`,
          [valueKey]: value,
          percentage: total > 0 ? (value / total) * 100 : 0,
          index,
          color: item.color || undefined // Will be assigned later
        };
      })
      .filter(item => item[valueKey] > 0)
      .sort((a, b) => b[valueKey] - a[valueKey]);
  }, [debouncedData, valueKey, labelKey]);

  // Generate colors for segments
  const segmentColors = useMemo(() => {
    if (processedData.length === 0) return [];
    
    const baseColor = theme.colors.primary[0];
    return processedData.map((item, index) => 
      item.color || generateColorPalette(baseColor, processedData.length)[index]
    );
  }, [processedData, theme.colors.primary]);

  // Handle segment click
  const handleSegmentClick = useCallback((data: any, index: number, event: any) => {
    event.stopPropagation();
    setSelectedSegment(selectedSegment === index ? null : index);
    onDataPointClick?.(data, index);
    startAnimation();
  }, [selectedSegment, onDataPointClick, startAnimation]);

  // Handle segment hover
  const handleSegmentHover = useCallback((data: any, index: number) => {
    setHoveredSegment({ ...data, index });
  }, []);

  // Handle segment mouse leave
  const handleSegmentLeave = useCallback(() => {
    setHoveredSegment(null);
  }, []);

  // Custom tooltip component
  const CustomTooltip = useCallback(({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 max-w-xs"
        style={theme.name === 'dark' ? TOOLTIP_CONFIG.dark.contentStyle : TOOLTIP_CONFIG.default.contentStyle}
      >
        <div className="flex items-center mb-2">
          <div
            className="w-4 h-4 rounded-sm mr-2"
            style={{ backgroundColor: segmentColors[data.index] }}
          />
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {data[labelKey]}
          </p>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Value:</span>
            <span className="text-sm font-semibold">
              {data[valueKey].toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Percentage:</span>
            <span className="text-sm font-semibold">
              {data.percentage.toFixed(1)}%
            </span>
          </div>
          {data.count && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Count:</span>
              <span className="text-sm font-semibold">
                {data.count.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {isDecimated && (
          <p className="text-xs text-gray-500 mt-2 pt-2 border-t">
            Data optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
          </p>
        )}
      </div>
    );
  }, [theme.name, labelKey, valueKey, segmentColors, isDecimated, performanceMetrics.dataPointCount]);

  // Custom label component
  const renderCustomLabel = useCallback((props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, value, payload } = props;
    
    if (percent < 0.05) return null; // Don't show labels for segments < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill={theme.text.primary}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="11"
        fontWeight="500"
      >
        {showValues 
          ? `${value.toLocaleString()}`
          : showLabels 
          ? payload[labelKey].length > 12 ? `${payload[labelKey].substring(0, 12)}...` : payload[labelKey]
          : `${(percent * 100).toFixed(0)}%`
        }
      </text>
    );
  }, [theme.text.primary, showValues, showLabels, labelKey]);

  // Custom active shape for hover effect
  const renderActiveShape = useCallback((props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload } = props;
    
    const RADIAN = Math.PI / 180;
    const sin = Math.sin(-RADIAN * midAngle);
    const cos = Math.cos(-RADIAN * midAngle);
    const sx = cx + (outerRadius + 10) * cos;
    const sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos;
    const my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    return (
      <g>
        <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize="12" fontWeight="bold">
          {payload[labelKey]}
        </text>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 6}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none"/>
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none"/>
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          textAnchor={textAnchor} 
          fill={theme.text.primary}
          fontSize="12"
          fontWeight="bold"
        >
          {`${payload[valueKey].toLocaleString()}`}
        </text>
        <text 
          x={ex + (cos >= 0 ? 1 : -1) * 12} 
          y={ey} 
          dy={18} 
          textAnchor={textAnchor} 
          fill={theme.text.secondary}
          fontSize="10"
        >
          {`(${(payload.percentage).toFixed(1)}%)`}
        </text>
      </g>
    );
  }, [labelKey, valueKey, theme.text.primary, theme.text.secondary]);

  // Handle export
  const handleExport = useCallback(async (format: 'png' | 'svg' | 'pdf') => {
    if (!exportEnabled) return;
    
    await exportChart(chartRef, {
      format,
      filename: title ? `${title.replace(/\s+/g, '-').toLowerCase()}-pie-chart` : 'pie-chart',
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
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading distribution data...</span>
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">No distribution data available</p>
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

      {/* Chart info */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400">
          {donut && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-1"></div>
              Donut Chart
            </span>
          )}
          <span>{processedData.length} segments</span>
          {isDecimated && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              Optimized: {performanceMetrics.dataPointCount.toLocaleString()} points
            </span>
          )}
        </div>
        
        <div className="text-gray-600 dark:text-gray-400">
          Total: {processedData.reduce((sum, item) => sum + item[valueKey], 0).toLocaleString()}
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: chartDimensions.width, height: chartDimensions.height }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart
            ref={chartRef}
            margin={CHART_MARGINS.default}
            onMouseEnter={startAnimation}
          >
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showLabels || showValues ? renderCustomLabel : false}
              outerRadius={calculatedOuterRadius}
              innerRadius={calculatedInnerRadius}
              fill="#8884d8"
              dataKey={valueKey}
              startAngle={startAngle}
              endAngle={endAngle}
              animationDuration={animationDuration}
              animationBegin={0}
              isAnimationActive={animate && !isAnimating}
              onClick={(data, index, event) => handleSegmentClick(data, index, event)}
              onMouseEnter={(data, index) => handleSegmentHover(data, index)}
              onMouseLeave={handleSegmentLeave}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={segmentColors[index]}
                  stroke={selectedSegment === index ? theme.background.primary : 'none'}
                  strokeWidth={selectedSegment === index ? 3 : 0}
                  style={{
                    filter: selectedSegment === null || selectedSegment === index 
                      ? 'none' 
                      : 'opacity(0.6)',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </Pie>

            {/* Tooltip */}
            {showTooltip && (
              <Tooltip
                content={<CustomTooltip />}
                animationDuration={animationDuration}
              />
            )}

            {/* Legend */}
            {showLegend && !isMobile && (
              <Legend
                {...LEGEND_CONFIG.default}
                wrapperStyle={{
                  ...LEGEND_CONFIG.default.wrapperStyle,
                  color: theme.text.primary,
                  fontSize: '12px'
                }}
                onClick={(legendItem) => {
                  const index = processedData.findIndex(item => item[labelKey] === legendItem.value);
                  if (index !== -1) {
                    setSelectedSegment(selectedSegment === index ? null : index);
                  }
                }}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      {/* Mobile legend */}
      {showLegend && isMobile && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          {processedData.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedSegment(selectedSegment === index ? null : index)}
              className={`flex items-center p-2 rounded transition-colors ${
                selectedSegment === null || selectedSegment === index
                  ? 'bg-gray-50 dark:bg-gray-800'
                  : 'bg-gray-100 dark:bg-gray-700 opacity-60'
              }`}
            >
              <div
                className="w-3 h-3 rounded-sm mr-2 flex-shrink-0"
                style={{ backgroundColor: segmentColors[index] }}
              />
              <div className="text-left overflow-hidden">
                <div className="font-medium truncate">{item[labelKey]}</div>
                <div className="text-gray-500 dark:text-gray-400">
                  {item[valueKey].toLocaleString()} ({item.percentage.toFixed(1)}%)
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Hovered segment info */}
      {hoveredSegment && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm pointer-events-none">
          <div className="flex items-center mb-1">
            <div
              className="w-3 h-3 rounded-sm mr-2"
              style={{ backgroundColor: segmentColors[hoveredSegment.index] }}
            />
            <span className="font-medium">{hoveredSegment[labelKey]}</span>
          </div>
          <div className="text-gray-600 dark:text-gray-400">
            {hoveredSegment[valueKey].toLocaleString()} ({hoveredSegment.percentage.toFixed(1)}%)
          </div>
        </div>
      )}

      {/* Selection controls */}
      {selectedSegment !== null && (
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setSelectedSegment(null)}
            className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded transition-colors"
          >
            Show All Segments
          </button>
        </div>
      )}
    </div>
  );
};

// Helper component for active pie segment
const Sector = ({ cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill }: any) => {
  return (
    <g>
      <sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};