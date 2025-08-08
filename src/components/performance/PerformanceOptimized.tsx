// Performance-optimized React components with advanced memoization and optimization strategies
'use client';

import React, { 
  memo, 
  useMemo, 
  useCallback, 
  forwardRef, 
  useRef, 
  useEffect,
  useState,
  useLayoutEffect,
  ComponentType,
  ReactNode,
  HTMLAttributes,
} from 'react';
import { performanceMonitor } from '../../lib/performance/monitoring';

// Types
interface OptimizedComponentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  trackPerformance?: boolean;
  componentName?: string;
  shouldUpdate?: (prevProps: any, nextProps: any) => boolean;
}

interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

interface MemoizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
}

// Advanced memo wrapper with custom comparison
export function createOptimizedMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const OptimizedComponent = memo(Component, propsAreEqual);
  OptimizedComponent.displayName = `Optimized(${Component.displayName || Component.name})`;
  return OptimizedComponent;
}

// Performance tracking HOC
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = forwardRef<any, P>((props, ref) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const renderCount = useRef(0);
    const mountTime = useRef(0);

    useLayoutEffect(() => {
      mountTime.current = performance.now();
      performanceMonitor.startMeasure(`${name}-mount`);
    }, []);

    useEffect(() => {
      const mountDuration = performanceMonitor.endMeasure(`${name}-mount`);
      performanceMonitor.recordCustomMetric('component-mount', mountDuration, {
        component: name,
      });

      return () => {
        const unmountTime = performance.now();
        const lifespan = unmountTime - mountTime.current;
        performanceMonitor.recordCustomMetric('component-lifespan', lifespan, {
          component: name,
          renders: renderCount.current.toString(),
        });
      };
    }, [name]);

    // Track renders
    renderCount.current++;
    performanceMonitor.recordCustomMetric('component-render', 1, {
      component: name,
      renderCount: renderCount.current.toString(),
    });

    return <Component {...props} ref={ref} />;
  });

  WrappedComponent.displayName = `WithPerformanceTracking(${componentName || Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Optimized container component
export const OptimizedContainer = memo<OptimizedComponentProps>(
  forwardRef<HTMLDivElement, OptimizedComponentProps>(({
    children,
    trackPerformance = false,
    componentName = 'OptimizedContainer',
    shouldUpdate,
    className,
    ...props
  }, ref) => {
    const renderTime = useRef(performance.now());
    
    useLayoutEffect(() => {
      if (trackPerformance) {
        const duration = performance.now() - renderTime.current;
        performanceMonitor.recordCustomMetric('container-render', duration, {
          component: componentName,
        });
      }
    });

    return (
      <div
        ref={ref}
        className={`optimized-container ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }),
  (prevProps, nextProps) => {
    // Custom comparison function
    if (prevProps.shouldUpdate) {
      return !prevProps.shouldUpdate(prevProps, nextProps);
    }

    // Default shallow comparison for common props
    const keys = Object.keys(nextProps) as Array<keyof OptimizedComponentProps>;
    return keys.every(key => {
      if (key === 'children') {
        // For children, do reference equality check
        return prevProps.children === nextProps.children;
      }
      return prevProps[key] === nextProps[key];
    });
  }
);

OptimizedContainer.displayName = 'OptimizedContainer';

// Virtualized list component for large datasets
export const VirtualizedList = memo<VirtualizedListProps>(({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTime = useRef(0);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Throttled scroll handler
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const now = performance.now();
    
    // Throttle scroll events to 60fps
    if (now - lastScrollTime.current < 16) return;
    lastScrollTime.current = now;

    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Memoized visible items
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={containerRef}
      className="virtualized-list"
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map(({ item, index }) => (
            <div
              key={index}
              style={{
                height: itemHeight,
                position: 'relative',
              }}
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

// Memoized image component with lazy loading
export const MemoizedImage = memo<MemoizedImageProps>(({
  src,
  alt,
  width,
  height,
  priority = false,
  onLoad,
  onError,
  className,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver>();

  useEffect(() => {
    const img = imgRef.current;
    if (!img || priority) return;

    // Set up intersection observer for lazy loading
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoaded) {
            loadImage();
            observerRef.current?.unobserve(img);
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    observerRef.current.observe(img);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, isLoaded]);

  const loadImage = useCallback(() => {
    const img = new Image();
    const startTime = performance.now();

    img.onload = () => {
      setIsLoaded(true);
      setHasError(false);
      const loadTime = performance.now() - startTime;
      
      performanceMonitor.recordCustomMetric('image-load-time', loadTime, {
        src: src.substring(src.lastIndexOf('/') + 1),
        size: `${width || 0}x${height || 0}`,
      });
      
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      const error = new Error(`Failed to load image: ${src}`);
      performanceMonitor.recordCustomMetric('image-load-error', 1, {
        src: src.substring(src.lastIndexOf('/') + 1),
      });
      onError?.(error);
    };

    img.src = src;
  }, [src, width, height, onLoad, onError]);

  // Load immediately if priority
  useEffect(() => {
    if (priority && !isLoaded) {
      loadImage();
    }
  }, [priority, isLoaded, loadImage]);

  if (hasError) {
    return (
      <div 
        className={`image-error ${className || ''}`}
        style={{ width, height, backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span className="text-gray-500 text-sm">Failed to load</span>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={isLoaded || priority ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      className={`memoized-image ${className || ''} ${
        isLoaded ? 'opacity-100' : 'opacity-50'
      } transition-opacity duration-300`}
      loading={priority ? 'eager' : 'lazy'}
      onLoad={() => {
        setIsLoaded(true);
        onLoad?.();
      }}
      onError={(e) => {
        setHasError(true);
        onError?.(new Error('Image load failed'));
      }}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for image props
  return (
    prevProps.src === nextProps.src &&
    prevProps.alt === nextProps.alt &&
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.priority === nextProps.priority &&
    prevProps.className === nextProps.className
  );
});

MemoizedImage.displayName = 'MemoizedImage';

// Optimized text component with content change detection
interface OptimizedTextProps {
  content: string;
  tag?: keyof JSX.IntrinsicElements;
  className?: string;
  maxLength?: number;
  truncate?: boolean;
}

export const OptimizedText = memo<OptimizedTextProps>(({
  content,
  tag: Tag = 'span',
  className,
  maxLength,
  truncate = false,
}) => {
  const displayContent = useMemo(() => {
    if (truncate && maxLength && content.length > maxLength) {
      return content.substring(0, maxLength) + '...';
    }
    return content;
  }, [content, maxLength, truncate]);

  return (
    <Tag className={className}>
      {displayContent}
    </Tag>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.content === nextProps.content &&
    prevProps.tag === nextProps.tag &&
    prevProps.className === nextProps.className &&
    prevProps.maxLength === nextProps.maxLength &&
    prevProps.truncate === nextProps.truncate
  );
});

OptimizedText.displayName = 'OptimizedText';

// Debounced input component
interface DebouncedInputProps extends Omit<HTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  placeholder?: string;
  className?: string;
}

export const DebouncedInput = memo<DebouncedInputProps>(({
  value,
  onChange,
  delay = 300,
  placeholder,
  className,
  ...props
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Update local value when prop changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced change handler
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  }, [onChange, delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
});

DebouncedInput.displayName = 'DebouncedInput';

// Performance boundary component
interface PerformanceBoundaryProps {
  children: ReactNode;
  name: string;
  threshold?: number; // ms
  onSlowRender?: (duration: number, name: string) => void;
}

export const PerformanceBoundary = memo<PerformanceBoundaryProps>(({
  children,
  name,
  threshold = 16, // 60fps = 16ms per frame
  onSlowRender,
}) => {
  const renderStartRef = useRef<number>();
  const renderCountRef = useRef(0);

  useLayoutEffect(() => {
    renderStartRef.current = performance.now();
  });

  useEffect(() => {
    if (renderStartRef.current) {
      const renderDuration = performance.now() - renderStartRef.current;
      renderCountRef.current++;

      performanceMonitor.recordCustomMetric('render-duration', renderDuration, {
        component: name,
        renderCount: renderCountRef.current.toString(),
      });

      if (renderDuration > threshold) {
        performanceMonitor.recordCustomMetric('slow-render', renderDuration, {
          component: name,
          threshold: threshold.toString(),
        });

        onSlowRender?.(renderDuration, name);
      }
    }
  });

  return <>{children}</>;
});

PerformanceBoundary.displayName = 'PerformanceBoundary';

// Optimized hooks
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  
  useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(
    ((...args: Parameters<T>) => callbackRef.current(...args)) as T,
    deps
  );
}

export function useShallowMemo<T>(
  factory: () => T,
  deps: React.DependencyList | undefined
): T {
  return useMemo(factory, deps);
}

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

// Export all components
export default {
  OptimizedContainer,
  VirtualizedList,
  MemoizedImage,
  OptimizedText,
  DebouncedInput,
  PerformanceBoundary,
  createOptimizedMemo,
  withPerformanceTracking,
  useStableCallback,
  useShallowMemo,
  usePrevious,
};