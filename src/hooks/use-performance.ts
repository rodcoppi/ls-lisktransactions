// Performance monitoring and optimization hooks
'use client';

import { 
  useEffect, 
  useCallback, 
  useRef, 
  useState, 
  useMemo,
  useLayoutEffect,
} from 'react';
import { performanceMonitor } from '../lib/performance/monitoring';
import { cacheManager, useCache } from '../lib/performance/caching';

// Performance metrics hook
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState(() => performanceMonitor.getPerformanceSummary());
  const [customMetrics, setCustomMetrics] = useState(() => performanceMonitor.getCustomMetrics());

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getPerformanceSummary());
      setCustomMetrics(performanceMonitor.getCustomMetrics());
    };

    // Update metrics every 10 seconds
    const interval = setInterval(updateMetrics, 10000);
    
    // Update on visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateMetrics();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const recordCustomMetric = useCallback((name: string, value: number, tags?: Record<string, string>) => {
    performanceMonitor.recordCustomMetric(name, value, tags);
  }, []);

  const startMeasure = useCallback((name: string) => {
    performanceMonitor.startMeasure(name);
  }, []);

  const endMeasure = useCallback((name: string) => {
    return performanceMonitor.endMeasure(name);
  }, []);

  return {
    metrics,
    customMetrics,
    recordCustomMetric,
    startMeasure,
    endMeasure,
  };
}

// Performance measurement hook for components
export function usePerformanceMeasure(name: string) {
  const measureRef = useRef<{ start?: number; count: number }>({ count: 0 });

  const start = useCallback(() => {
    measureRef.current.start = performance.now();
    performanceMonitor.startMeasure(name);
  }, [name]);

  const end = useCallback(() => {
    const duration = performanceMonitor.endMeasure(name);
    measureRef.current.count++;
    
    return {
      duration,
      count: measureRef.current.count,
    };
  }, [name]);

  useEffect(() => {
    // Auto-measure component lifecycle
    start();
    
    return () => {
      end();
    };
  }, [start, end]);

  return { start, end };
}

// Render performance tracking hook
export function useRenderPerformance(componentName: string, threshold: number = 16) {
  const renderStart = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const slowRenders = useRef<number>(0);
  
  useLayoutEffect(() => {
    renderStart.current = performance.now();
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    renderCount.current++;

    if (renderTime > threshold) {
      slowRenders.current++;
      performanceMonitor.recordCustomMetric('slow-render', renderTime, {
        component: componentName,
        threshold: threshold.toString(),
      });
    }

    performanceMonitor.recordCustomMetric('render-time', renderTime, {
      component: componentName,
    });
  });

  return {
    renderCount: renderCount.current,
    slowRenders: slowRenders.current,
    slowRenderRate: renderCount.current > 0 ? slowRenders.current / renderCount.current : 0,
  };
}

// Memory monitoring hook
export function useMemoryMonitoring(interval: number = 30000) {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    limit: number;
  } | null>(null);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMemoryInfo({
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
        });

        performanceMonitor.recordCustomMetric('memory-used', memory.usedJSHeapSize);
        performanceMonitor.recordCustomMetric('memory-total', memory.totalJSHeapSize);
      }
    };

    checkMemory();
    const intervalId = setInterval(checkMemory, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  const memoryUsagePercent = memoryInfo 
    ? (memoryInfo.used / memoryInfo.total) * 100 
    : 0;

  const isMemoryHigh = memoryUsagePercent > 85;

  return {
    memoryInfo,
    memoryUsagePercent,
    isMemoryHigh,
  };
}

// Network performance monitoring hook
export function useNetworkPerformance() {
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  }>({});

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setNetworkInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData,
        });

        performanceMonitor.recordCustomMetric('network-rtt', connection.rtt || 0);
        performanceMonitor.recordCustomMetric('network-downlink', connection.downlink || 0);
      }
    };

    updateNetworkInfo();

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  const isSlowNetwork = networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g';
  const shouldOptimize = isSlowNetwork || networkInfo.saveData;

  return {
    networkInfo,
    isSlowNetwork,
    shouldOptimize,
  };
}

// Cache performance monitoring hook
export function useCachePerformance() {
  const [cacheStats, setCacheStats] = useState(() => cacheManager.getAllStats());

  useEffect(() => {
    const updateCacheStats = () => {
      const stats = cacheManager.getAllStats();
      setCacheStats(stats);

      // Record cache metrics
      Object.entries(stats).forEach(([cacheName, stat]) => {
        performanceMonitor.recordCustomMetric('cache-hit-rate', stat.hitRate * 100, {
          cache: cacheName,
        });
        performanceMonitor.recordCustomMetric('cache-size', stat.size, {
          cache: cacheName,
        });
      });
    };

    const interval = setInterval(updateCacheStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalHitRate = useMemo(() => {
    const stats = Object.values(cacheStats);
    if (stats.length === 0) return 0;
    
    return stats.reduce((sum, stat) => sum + stat.hitRate, 0) / stats.length;
  }, [cacheStats]);

  return {
    cacheStats,
    totalHitRate,
  };
}

// Performance budget monitoring hook
export function usePerformanceBudget(budget: Record<string, number>) {
  const [violations, setViolations] = useState<Array<{
    metric: string;
    actual: number;
    budget: number;
    severity: 'warning' | 'error';
  }>>([]);

  useEffect(() => {
    const checkBudget = () => {
      const metrics = performanceMonitor.getPerformanceSummary();
      const newViolations: typeof violations = [];

      Object.entries(budget).forEach(([metric, budgetValue]) => {
        const metricData = metrics[metric];
        if (metricData && metricData.latest > budgetValue) {
          const severity = metricData.latest > budgetValue * 1.5 ? 'error' : 'warning';
          newViolations.push({
            metric,
            actual: metricData.latest,
            budget: budgetValue,
            severity,
          });
        }
      });

      setViolations(newViolations);

      // Record budget violations
      newViolations.forEach(violation => {
        performanceMonitor.recordCustomMetric('budget-violation', 1, {
          metric: violation.metric,
          severity: violation.severity,
        });
      });
    };

    const interval = setInterval(checkBudget, 10000);
    return () => clearInterval(interval);
  }, [budget]);

  const hasViolations = violations.length > 0;
  const hasErrors = violations.some(v => v.severity === 'error');

  return {
    violations,
    hasViolations,
    hasErrors,
  };
}

// Service Worker performance monitoring hook
export function useServiceWorkerPerformance() {
  const [swMetrics, setSwMetrics] = useState<{
    cacheHitRate: number;
    networkRequests: number;
    cacheHits: number;
    cacheMisses: number;
    errors: number;
  } | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'SW_PERFORMANCE_METRICS') {
          setSwMetrics(event.data.data);
        }
      };

      navigator.serviceWorker.addEventListener('message', handleMessage);

      // Request current metrics
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'GET_PERFORMANCE_METRICS',
        });
      }

      return () => {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      };
    }
  }, []);

  return swMetrics;
}

// Web Vitals monitoring hook
export function useWebVitals() {
  const [vitals, setVitals] = useState<{
    lcp?: number;
    fid?: number;
    cls?: number;
    fcp?: number;
    ttfb?: number;
    inp?: number;
  }>({});

  useEffect(() => {
    const updateVitals = () => {
      const metrics = performanceMonitor.getPerformanceSummary();
      setVitals({
        lcp: metrics.LCP?.latest,
        fid: metrics.FID?.latest,
        cls: metrics.CLS?.latest,
        fcp: metrics.FCP?.latest,
        ttfb: metrics.TTFB?.latest,
        inp: metrics.INP?.latest,
      });
    };

    updateVitals();
    const interval = setInterval(updateVitals, 5000);

    return () => clearInterval(interval);
  }, []);

  const getVitalRating = useCallback((metric: keyof typeof vitals, value?: number) => {
    if (!value) return 'unknown';

    const thresholds: Record<string, { good: number; poor: number }> = {
      lcp: { good: 2500, poor: 4000 },
      fid: { good: 100, poor: 300 },
      cls: { good: 0.1, poor: 0.25 },
      fcp: { good: 1800, poor: 3000 },
      ttfb: { good: 800, poor: 1800 },
      inp: { good: 200, poor: 500 },
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }, []);

  const vitalsWithRatings = useMemo(() => {
    return Object.entries(vitals).reduce((acc, [key, value]) => {
      acc[key] = {
        value,
        rating: getVitalRating(key as keyof typeof vitals, value),
      };
      return acc;
    }, {} as Record<string, { value?: number; rating: string }>);
  }, [vitals, getVitalRating]);

  return {
    vitals,
    vitalsWithRatings,
  };
}

// Performance optimization recommendations hook
export function usePerformanceRecommendations() {
  const { vitalsWithRatings } = useWebVitals();
  const { memoryInfo, isMemoryHigh } = useMemoryMonitoring();
  const { isSlowNetwork } = useNetworkPerformance();
  const { totalHitRate } = useCachePerformance();

  const recommendations = useMemo(() => {
    const recs: Array<{
      type: 'lcp' | 'fid' | 'cls' | 'memory' | 'network' | 'cache';
      message: string;
      priority: 'low' | 'medium' | 'high';
      action?: string;
    }> = [];

    // LCP recommendations
    if (vitalsWithRatings.lcp?.rating === 'poor') {
      recs.push({
        type: 'lcp',
        message: 'Largest Contentful Paint is slow',
        priority: 'high',
        action: 'Optimize images and critical resource loading',
      });
    }

    // FID recommendations
    if (vitalsWithRatings.fid?.rating === 'poor') {
      recs.push({
        type: 'fid',
        message: 'First Input Delay is high',
        priority: 'high',
        action: 'Reduce JavaScript execution time',
      });
    }

    // CLS recommendations
    if (vitalsWithRatings.cls?.rating === 'poor') {
      recs.push({
        type: 'cls',
        message: 'Cumulative Layout Shift is high',
        priority: 'medium',
        action: 'Set explicit dimensions for images and ads',
      });
    }

    // Memory recommendations
    if (isMemoryHigh) {
      recs.push({
        type: 'memory',
        message: 'Memory usage is high',
        priority: 'medium',
        action: 'Check for memory leaks and optimize large objects',
      });
    }

    // Network recommendations
    if (isSlowNetwork) {
      recs.push({
        type: 'network',
        message: 'Slow network detected',
        priority: 'low',
        action: 'Enable data saver mode',
      });
    }

    // Cache recommendations
    if (totalHitRate < 0.8) {
      recs.push({
        type: 'cache',
        message: 'Cache hit rate is low',
        priority: 'medium',
        action: 'Improve caching strategy',
      });
    }

    return recs.sort((a, b) => {
      const priority = { high: 3, medium: 2, low: 1 };
      return priority[b.priority] - priority[a.priority];
    });
  }, [vitalsWithRatings, isMemoryHigh, isSlowNetwork, totalHitRate]);

  return recommendations;
}

export default {
  usePerformanceMetrics,
  usePerformanceMeasure,
  useRenderPerformance,
  useMemoryMonitoring,
  useNetworkPerformance,
  useCachePerformance,
  usePerformanceBudget,
  useServiceWorkerPerformance,
  useWebVitals,
  usePerformanceRecommendations,
};