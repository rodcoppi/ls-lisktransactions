/**
 * Chart Utility Functions
 * High-performance data processing and optimization utilities for charts
 */

import { 
  ChartDataPoint, 
  TimeSeriesData, 
  ChartPerformanceMetrics,
  ChartOptimizationConfig 
} from '@/types';
import { CHART_PERFORMANCE_CONFIG, DATA_PROCESSING_CONFIG } from '@/lib/chart-config';

// Data Processing Utilities
export const processTimeSeriesData = (
  rawData: any[],
  timeKey: string = 'timestamp',
  valueKey: string = 'value'
): TimeSeriesData[] => {
  if (!Array.isArray(rawData) || rawData.length === 0) return [];

  return rawData
    .map(item => ({
      timestamp: typeof item[timeKey] === 'string' 
        ? new Date(item[timeKey]).getTime() 
        : item[timeKey],
      [valueKey]: Number(item[valueKey]) || 0,
      ...Object.keys(item).reduce((acc, key) => {
        if (key !== timeKey && key !== valueKey) {
          acc[key] = typeof item[key] === 'string' && !isNaN(Number(item[key]))
            ? Number(item[key])
            : item[key];
        }
        return acc;
      }, {} as Record<string, any>)
    }))
    .filter(item => !isNaN(item.timestamp) && isFinite(item.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp);
};

// Data Decimation for Large Datasets
export const decimateData = (
  data: ChartDataPoint[],
  maxPoints: number = CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD,
  algorithm: 'lttb' | 'nth' | 'min-max' = 'lttb'
): ChartDataPoint[] => {
  if (data.length <= maxPoints) return data;

  switch (algorithm) {
    case 'lttb':
      return lttbDecimation(data, maxPoints);
    case 'nth':
      return nthPointDecimation(data, maxPoints);
    case 'min-max':
      return minMaxDecimation(data, maxPoints);
    default:
      return data.slice(0, maxPoints);
  }
};

// Largest-Triangle-Three-Buckets (LTTB) Algorithm
const lttbDecimation = (data: ChartDataPoint[], targetPoints: number): ChartDataPoint[] => {
  if (targetPoints >= data.length || targetPoints <= 2) return data;

  const bucketSize = (data.length - 2) / (targetPoints - 2);
  const decimated: ChartDataPoint[] = [data[0]]; // Always include first point

  let a = 0; // Initially a is the first point in the triangle

  for (let i = 0; i < targetPoints - 2; i++) {
    // Calculate point average for next bucket (containing c)
    let avgX = 0, avgY = 0;
    let avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < data.length ? avgRangeEnd : data.length;

    const avgRangeLength = avgRangeEnd - avgRangeStart;

    for (; avgRangeStart < avgRangeEnd; avgRangeStart++) {
      avgX += data[avgRangeStart].timestamp;
      avgY += data[avgRangeStart].value;
    }
    avgX /= avgRangeLength;
    avgY /= avgRangeLength;

    // Get the range for this bucket
    let rangeOffs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;

    // Point a
    const pointAX = data[a].timestamp;
    const pointAY = data[a].value;

    let maxArea = -1;
    let nextA = rangeOffs;

    for (; rangeOffs < rangeTo; rangeOffs++) {
      // Calculate triangle area over three buckets
      const area = Math.abs(
        (pointAX - avgX) * (data[rangeOffs].value - pointAY) -
        (pointAX - data[rangeOffs].timestamp) * (avgY - pointAY)
      ) * 0.5;

      if (area > maxArea) {
        maxArea = area;
        nextA = rangeOffs; // Next a is this b
      }
    }

    decimated.push(data[nextA]); // Pick this point from the bucket
    a = nextA; // This a is the next a (chosen b)
  }

  decimated.push(data[data.length - 1]); // Always include last point
  return decimated;
};

// Nth Point Decimation (Simple but Fast)
const nthPointDecimation = (data: ChartDataPoint[], targetPoints: number): ChartDataPoint[] => {
  const step = Math.ceil(data.length / targetPoints);
  const decimated: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += step) {
    decimated.push(data[i]);
  }

  // Always include the last point
  if (decimated[decimated.length - 1] !== data[data.length - 1]) {
    decimated.push(data[data.length - 1]);
  }

  return decimated;
};

// Min-Max Decimation for High/Low Values
const minMaxDecimation = (data: ChartDataPoint[], targetPoints: number): ChartDataPoint[] => {
  if (targetPoints >= data.length) return data;

  const bucketSize = Math.ceil(data.length / targetPoints);
  const decimated: ChartDataPoint[] = [];

  for (let i = 0; i < data.length; i += bucketSize) {
    const bucket = data.slice(i, i + bucketSize);
    const min = bucket.reduce((min, curr) => curr.value < min.value ? curr : min);
    const max = bucket.reduce((max, curr) => curr.value > max.value ? curr : max);

    // Add both min and max points from each bucket
    if (min.timestamp < max.timestamp) {
      decimated.push(min, max);
    } else {
      decimated.push(max, min);
    }
  }

  return decimated.sort((a, b) => a.timestamp - b.timestamp);
};

// Data Aggregation for Time-Based Grouping
export const aggregateByTimeInterval = (
  data: TimeSeriesData[],
  intervalMs: number,
  aggregationMethod: 'sum' | 'avg' | 'min' | 'max' | 'count' = 'sum'
): TimeSeriesData[] => {
  if (data.length === 0) return [];

  const grouped = new Map<number, TimeSeriesData[]>();
  
  // Group data by time intervals
  data.forEach(point => {
    const intervalKey = Math.floor(point.timestamp / intervalMs) * intervalMs;
    if (!grouped.has(intervalKey)) {
      grouped.set(intervalKey, []);
    }
    grouped.get(intervalKey)!.push(point);
  });

  // Aggregate each group
  return Array.from(grouped.entries()).map(([timestamp, points]) => {
    const aggregated: TimeSeriesData = { timestamp };
    
    // Get all numeric keys (excluding timestamp)
    const numericKeys = Array.from(
      new Set(
        points.flatMap(p => 
          Object.keys(p).filter(k => k !== 'timestamp' && typeof p[k] === 'number')
        )
      )
    );

    numericKeys.forEach(key => {
      const values = points.map(p => p[key] as number).filter(v => !isNaN(v));
      
      switch (aggregationMethod) {
        case 'sum':
          aggregated[key] = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          aggregated[key] = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'min':
          aggregated[key] = Math.min(...values);
          break;
        case 'max':
          aggregated[key] = Math.max(...values);
          break;
        case 'count':
          aggregated[key] = values.length;
          break;
      }
    });

    return aggregated;
  }).sort((a, b) => a.timestamp - b.timestamp);
};

// Data Smoothing using Moving Averages
export const applyMovingAverage = (
  data: ChartDataPoint[],
  windowSize: number = 5
): ChartDataPoint[] => {
  if (windowSize <= 1 || data.length < windowSize) return data;

  return data.map((point, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(data.length, start + windowSize);
    
    const window = data.slice(start, end);
    const avgValue = window.reduce((sum, p) => sum + p.value, 0) / window.length;

    return {
      ...point,
      value: avgValue
    };
  });
};

// Outlier Detection and Removal
export const removeOutliers = (
  data: ChartDataPoint[],
  threshold: number = 2.5 // Standard deviations
): ChartDataPoint[] => {
  if (data.length < 3) return data;

  const values = data.map(d => d.value);
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return data.filter(point => {
    const zScore = Math.abs((point.value - mean) / stdDev);
    return zScore <= threshold;
  });
};

// Performance Monitoring
export const measureChartPerformance = (
  operation: () => void,
  dataPointCount: number
): ChartPerformanceMetrics => {
  const startTime = performance.now();
  const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  operation();
  
  const endTime = performance.now();
  const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  return {
    renderTime: endTime - startTime,
    dataProcessingTime: 0, // Set by calling code
    memoryUsage: endMemory - startMemory,
    frameRate: 1000 / (endTime - startTime),
    dataPointCount,
    lastUpdate: Date.now()
  };
};

// Data Validation
export const validateChartData = (data: any[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!Array.isArray(data)) {
    errors.push('Data must be an array');
    return { isValid: false, errors };
  }

  if (data.length === 0) {
    errors.push('Data array is empty');
    return { isValid: false, errors };
  }

  if (data.length > DATA_PROCESSING_CONFIG.MAX_SAFE_ARRAY_SIZE) {
    errors.push(`Data array too large (${data.length} > ${DATA_PROCESSING_CONFIG.MAX_SAFE_ARRAY_SIZE})`);
  }

  // Check for consistent data structure
  const firstItem = data[0];
  if (typeof firstItem !== 'object' || firstItem === null) {
    errors.push('Data items must be objects');
  }

  // Check for required fields
  const hasTimestamp = data.some(item => 'timestamp' in item || 'time' in item || 'date' in item);
  if (!hasTimestamp) {
    errors.push('Data must contain timestamp field');
  }

  const hasValue = data.some(item => typeof Object.values(item).find(v => typeof v === 'number') === 'number');
  if (!hasValue) {
    errors.push('Data must contain at least one numeric field');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Memory Management
export const optimizeDataForRendering = (
  data: any[],
  config: Partial<ChartOptimizationConfig>
): any[] => {
  const optimizedConfig = {
    enableDecimation: true,
    enableMemoization: true,
    maxDataPoints: CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD,
    decimationFactor: 0.1,
    ...config
  };

  let processedData = [...data];

  // Apply decimation if enabled and data exceeds threshold
  if (optimizedConfig.enableDecimation && data.length > optimizedConfig.maxDataPoints) {
    const targetPoints = Math.max(
      optimizedConfig.maxDataPoints,
      Math.floor(data.length * optimizedConfig.decimationFactor)
    );
    
    processedData = decimateData(
      processedData as ChartDataPoint[], 
      targetPoints,
      'lttb'
    );
  }

  return processedData;
};

// Responsive Chart Utilities
export const calculateResponsiveDimensions = (
  containerWidth: number,
  containerHeight: number,
  aspectRatio: number = 16 / 9
): { width: number; height: number } => {
  const calculatedHeight = containerWidth / aspectRatio;
  
  return {
    width: containerWidth,
    height: containerHeight > 0 
      ? Math.min(calculatedHeight, containerHeight)
      : calculatedHeight
  };
};

// Color Utilities
export const generateColorPalette = (baseColor: string, count: number): string[] => {
  const colors: string[] = [];
  const hsl = hexToHsl(baseColor);
  
  if (!hsl) return [baseColor];

  for (let i = 0; i < count; i++) {
    const hue = (hsl.h + (i * 360 / count)) % 360;
    colors.push(hslToHex(hue, hsl.s, hsl.l));
  }

  return colors;
};

const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
};

const hslToHex = (h: number, s: number, l: number): string => {
  h /= 360; s /= 100; l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 1/6) { r = c; g = x; b = 0; }
  else if (1/6 <= h && h < 1/3) { r = x; g = c; b = 0; }
  else if (1/3 <= h && h < 1/2) { r = 0; g = c; b = x; }
  else if (1/2 <= h && h < 2/3) { r = 0; g = x; b = c; }
  else if (2/3 <= h && h < 5/6) { r = x; g = 0; b = c; }
  else if (5/6 <= h && h < 1) { r = c; g = 0; b = x; }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

// Export utilities
export const formatDataForExport = (data: any[], format: 'csv' | 'json' | 'xlsx'): string | any[] => {
  switch (format) {
    case 'csv':
      if (data.length === 0) return '';
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ];
      return csvRows.join('\n');
    
    case 'json':
      return JSON.stringify(data, null, 2);
    
    case 'xlsx':
      // Return structured data for Excel export (would need additional library)
      return data;
    
    default:
      return data;
  }
};