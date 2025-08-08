/**
 * Chart Performance Hooks
 * React hooks for optimized chart rendering and performance monitoring
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { 
  ChartPerformanceMetrics, 
  ChartOptimizationConfig,
  TimeSeriesData,
  ChartDataPoint
} from '@/types';
import { 
  optimizeDataForRendering, 
  measureChartPerformance,
  calculateResponsiveDimensions,
  decimateData,
  validateChartData
} from '../utils';
import { getTheme, type ThemeName } from '../themes';
import { CHART_PERFORMANCE_CONFIG, CHART_DIMENSIONS } from '@/lib/chart-config';

// Performance monitoring hook
export const useChartPerformance = (dataPointCount: number = 0) => {
  const [metrics, setMetrics] = useState<ChartPerformanceMetrics>({
    renderTime: 0,
    dataProcessingTime: 0,
    memoryUsage: 0,
    frameRate: 0,
    dataPointCount,
    lastUpdate: Date.now()
  });

  const [isOptimized, setIsOptimized] = useState(false);
  const frameTimeRef = useRef<number[]>([]);

  const startPerformanceMeasure = useCallback(() => {
    const startTime = performance.now();
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

    return {
      end: (operation: string = 'render') => {
        const endTime = performance.now();
        const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
        const frameTime = endTime - startTime;

        // Track frame times for FPS calculation
        frameTimeRef.current.push(frameTime);
        if (frameTimeRef.current.length > 60) {
          frameTimeRef.current.shift();
        }

        const avgFrameTime = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
        const fps = 1000 / avgFrameTime;

        const newMetrics: ChartPerformanceMetrics = {
          renderTime: frameTime,
          dataProcessingTime: operation === 'dataProcessing' ? frameTime : metrics.dataProcessingTime,
          memoryUsage: endMemory - startMemory,
          frameRate: fps,
          dataPointCount,
          lastUpdate: Date.now()
        };

        setMetrics(newMetrics);

        // Auto-optimize if performance is poor
        const shouldOptimize = 
          frameTime > CHART_PERFORMANCE_CONFIG.ANIMATION_DURATION ||
          fps < 30 ||
          dataPointCount > CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD;

        if (shouldOptimize !== isOptimized) {
          setIsOptimized(shouldOptimize);
        }

        return newMetrics;
      }
    };
  }, [dataPointCount, metrics.dataProcessingTime, isOptimized]);

  return {
    metrics,
    isOptimized,
    startPerformanceMeasure,
    shouldUseCanvas: dataPointCount > CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD,
    shouldDecimateData: dataPointCount > CHART_PERFORMANCE_CONFIG.DECIMATION_THRESHOLD
  };
};

// Responsive chart dimensions hook
export const useResponsiveChart = (aspectRatio: number = 16 / 9) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const { width, height } = container.getBoundingClientRect();
    
    const newDimensions = calculateResponsiveDimensions(width, height, aspectRatio);
    setDimensions(newDimensions);
  }, [aspectRatio]);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      // Debounce resize events
      const timeoutId = setTimeout(updateDimensions, CHART_PERFORMANCE_CONFIG.DEBOUNCE_DELAY);
      return () => clearTimeout(timeoutId);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [updateDimensions]);

  // Get responsive breakpoint
  const breakpoint = useMemo(() => {
    const width = dimensions.width;
    if (width >= 1536) return '2xl';
    if (width >= 1280) return 'xl';
    if (width >= 1024) return 'lg';
    if (width >= 768) return 'md';
    if (width >= 640) return 'sm';
    return 'xs';
  }, [dimensions.width]);

  return {
    containerRef,
    dimensions,
    breakpoint,
    isMobile: breakpoint === 'xs' || breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl'
  };
};

// Optimized data processing hook
export const useOptimizedChartData = <T extends any[]>(
  data: T,
  config: Partial<ChartOptimizationConfig> = {}
) => {
  const { metrics, startPerformanceMeasure, shouldDecimateData } = useChartPerformance(data.length);
  
  const optimizedData = useMemo(() => {
    const measure = startPerformanceMeasure();
    
    // Validate data first
    const validation = validateChartData(data);
    if (!validation.isValid) {
      console.warn('Chart data validation failed:', validation.errors);
      return data;
    }

    // Apply optimizations
    const optimizationConfig: ChartOptimizationConfig = {
      enableVirtualization: false,
      enableDecimation: shouldDecimateData,
      enableMemoization: true,
      enableCanvasRendering: data.length > CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD,
      maxDataPoints: CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD,
      decimationFactor: 0.1,
      updateThrottle: CHART_PERFORMANCE_CONFIG.DEBOUNCE_DELAY,
      ...config
    };

    const result = optimizeDataForRendering(data, optimizationConfig);
    measure.end('dataProcessing');
    
    return result as T;
  }, [data, config, shouldDecimateData, startPerformanceMeasure]);

  return {
    data: optimizedData,
    originalDataLength: data.length,
    optimizedDataLength: optimizedData.length,
    isDecimated: optimizedData.length < data.length,
    performanceMetrics: metrics,
    validationResult: validateChartData(data)
  };
};

// Chart theme hook
export const useChartTheme = (themeName?: ThemeName) => {
  const { theme: systemTheme, resolvedTheme } = useTheme();
  
  const activeTheme = useMemo(() => {
    const targetTheme = themeName || (resolvedTheme as ThemeName) || 'light';
    return getTheme(targetTheme);
  }, [themeName, resolvedTheme]);

  return {
    theme: activeTheme,
    isDark: activeTheme.name === 'dark',
    isHighContrast: activeTheme.name === 'high-contrast'
  };
};

// Debounced value hook for performance
export const useDebouncedValue = <T>(value: T, delay: number = CHART_PERFORMANCE_CONFIG.DEBOUNCE_DELAY) => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeoutId);
  }, [value, delay]);

  return debouncedValue;
};

// Chart data cache hook
export const useChartDataCache = <T>(
  key: string,
  data: T,
  ttl: number = 5 * 60 * 1000 // 5 minutes
) => {
  const cacheRef = useRef<Map<string, { data: T; timestamp: number; ttl: number }>>(new Map());

  const getCachedData = useCallback((cacheKey: string): T | null => {
    const cached = cacheRef.current.get(cacheKey);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      cacheRef.current.delete(cacheKey);
      return null;
    }

    return cached.data;
  }, []);

  const setCachedData = useCallback((cacheKey: string, value: T, cacheTtl: number = ttl) => {
    cacheRef.current.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
      ttl: cacheTtl
    });

    // Clean up expired entries periodically
    if (cacheRef.current.size > 100) {
      const now = Date.now();
      for (const [k, v] of cacheRef.current.entries()) {
        if (now - v.timestamp > v.ttl) {
          cacheRef.current.delete(k);
        }
      }
    }
  }, [ttl]);

  // Try to get from cache first
  const cachedResult = getCachedData(key);
  
  useEffect(() => {
    if (!cachedResult) {
      setCachedData(key, data);
    }
  }, [key, data, cachedResult, setCachedData]);

  return cachedResult || data;
};

// Animation control hook
export const useChartAnimation = (enabled: boolean = true, duration: number = CHART_PERFORMANCE_CONFIG.ANIMATION_DURATION) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();

  const startAnimation = useCallback(() => {
    if (!enabled) return;
    
    setIsAnimating(true);
    
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    
    animationRef.current = window.setTimeout(() => {
      setIsAnimating(false);
    }, duration);
  }, [enabled, duration]);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, []);

  return {
    isAnimating,
    startAnimation,
    stopAnimation,
    animationDuration: enabled ? duration : 0
  };
};

// Virtual scrolling hook for large datasets
export const useVirtualScrolling = <T>(
  data: T[],
  viewportHeight: number,
  itemHeight: number = 20,
  overscan: number = 5
) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = data.length * itemHeight;
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(data.length, startIndex + visibleCount + overscan * 2);

  const visibleItems = useMemo(() => 
    data.slice(startIndex, endIndex).map((item, index) => ({
      data: item,
      index: startIndex + index,
      offsetTop: (startIndex + index) * itemHeight
    }))
  , [data, startIndex, endIndex, itemHeight]);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    handleScroll,
    startIndex,
    endIndex
  };
};

// Export utility hook
export const useChartExport = () => {
  const [isExporting, setIsExporting] = useState(false);

  const exportChart = useCallback(async (
    chartRef: React.RefObject<any>,
    options: {
      format: 'png' | 'svg' | 'pdf';
      filename?: string;
      width?: number;
      height?: number;
    }
  ) => {
    if (!chartRef.current) return;

    setIsExporting(true);
    
    try {
      // This would integrate with a chart export library
      // For now, we'll implement a basic canvas export
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (ctx && options.format === 'png') {
        canvas.width = options.width || 800;
        canvas.height = options.height || 600;
        
        // Basic export implementation
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = options.filename || `chart-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Chart export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportChart,
    isExporting
  };
};