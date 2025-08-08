'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { VirtualItem, Row } from '../types';
import { throttle } from '@/lib/table-utils';

interface UseTableVirtualizationOptions {
  totalCount: number;
  estimateSize?: number;
  overscan?: number;
  scrollingDelay?: number;
  getItemKey?: (index: number) => string | number;
  debug?: boolean;
}

export function useTableVirtualization({
  totalCount,
  estimateSize = 50,
  overscan = 5,
  scrollingDelay = 150,
  getItemKey,
  debug = false,
}: UseTableVirtualizationOptions) {
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const measurementsRef = useRef<Map<number, number>>(new Map());
  const resizeObserverRef = useRef<ResizeObserver>();
  
  // Calculate total size
  const totalSize = useMemo(() => {
    let total = 0;
    for (let i = 0; i < totalCount; i++) {
      total += measurementsRef.current.get(i) || estimateSize;
    }
    return total;
  }, [totalCount, estimateSize]);

  // Calculate visible range
  const range = useMemo(() => {
    if (clientHeight === 0 || totalCount === 0) {
      return { start: 0, end: -1 };
    }

    let start = 0;
    let accumulatedHeight = 0;
    
    // Find start index
    for (let i = 0; i < totalCount; i++) {
      const itemSize = measurementsRef.current.get(i) || estimateSize;
      if (accumulatedHeight + itemSize > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += itemSize;
    }

    // Find end index
    let end = start;
    let visibleHeight = 0;
    
    for (let i = start; i < totalCount; i++) {
      const itemSize = measurementsRef.current.get(i) || estimateSize;
      visibleHeight += itemSize;
      
      if (visibleHeight >= clientHeight + overscan * estimateSize) {
        end = Math.min(totalCount - 1, i + overscan);
        break;
      }
      
      end = i;
    }

    if (debug) {
      console.log('Virtual range:', { start, end, scrollTop, clientHeight, totalCount });
    }

    return { start, end };
  }, [scrollTop, clientHeight, totalCount, estimateSize, overscan, debug]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let offsetTop = 0;

    // Calculate offset to start
    for (let i = 0; i < range.start; i++) {
      offsetTop += measurementsRef.current.get(i) || estimateSize;
    }

    // Generate virtual items for visible range
    for (let i = range.start; i <= range.end && i < totalCount; i++) {
      const size = measurementsRef.current.get(i) || estimateSize;
      const key = getItemKey ? getItemKey(i) : i;
      
      items.push({
        key,
        index: i,
        start: offsetTop,
        end: offsetTop + size,
        size,
      });
      
      offsetTop += size;
    }

    return items;
  }, [range, totalCount, estimateSize, getItemKey]);

  // Measure item size
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const height = element.getBoundingClientRect().height;
    const currentHeight = measurementsRef.current.get(index);
    
    if (currentHeight !== height) {
      measurementsRef.current.set(index, height);
      
      if (debug) {
        console.log(`Measured item ${index}:`, height);
      }
      
      // Trigger re-calculation if measurement changed significantly
      if (Math.abs((currentHeight || estimateSize) - height) > 1) {
        // Force a small re-render to update calculations
        setScrollTop(prev => prev);
      }
    }
  }, [estimateSize, debug]);

  // Scroll event handler
  const handleScroll = useCallback(
    throttle((event: Event) => {
      if (!scrollElementRef.current) return;
      
      const element = event.target as HTMLElement;
      const newScrollTop = element.scrollTop;
      const newScrollHeight = element.scrollHeight;
      const newClientHeight = element.clientHeight;
      
      setScrollTop(newScrollTop);
      setScrollHeight(newScrollHeight);
      setClientHeight(newClientHeight);
      setIsScrolling(true);

      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Set scrolling to false after delay
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, scrollingDelay);

      if (debug) {
        console.log('Scroll event:', { newScrollTop, newScrollHeight, newClientHeight });
      }
    }, 16), // ~60fps
    [scrollingDelay, debug]
  );

  // Scroll to specific index
  const scrollToIndex = useCallback((
    index: number,
    align: 'start' | 'center' | 'end' | 'auto' = 'auto'
  ) => {
    if (!scrollElementRef.current || index < 0 || index >= totalCount) {
      return;
    }

    let offset = 0;
    
    // Calculate offset to item
    for (let i = 0; i < index; i++) {
      offset += measurementsRef.current.get(i) || estimateSize;
    }

    const itemSize = measurementsRef.current.get(index) || estimateSize;
    let scrollTo = offset;

    switch (align) {
      case 'center':
        scrollTo = offset - clientHeight / 2 + itemSize / 2;
        break;
      case 'end':
        scrollTo = offset - clientHeight + itemSize;
        break;
      case 'auto':
        // Only scroll if item is not fully visible
        if (offset < scrollTop) {
          // Item is above viewport
          scrollTo = offset;
        } else if (offset + itemSize > scrollTop + clientHeight) {
          // Item is below viewport
          scrollTo = offset - clientHeight + itemSize;
        } else {
          // Item is already visible, don't scroll
          return;
        }
        break;
    }

    scrollElementRef.current.scrollTop = Math.max(0, Math.min(scrollTo, totalSize - clientHeight));
  }, [totalCount, estimateSize, clientHeight, scrollTop, totalSize]);

  // Scroll to offset
  const scrollToOffset = useCallback((offset: number) => {
    if (scrollElementRef.current) {
      scrollElementRef.current.scrollTop = Math.max(0, Math.min(offset, totalSize - clientHeight));
    }
  }, [totalSize, clientHeight]);

  // Set up observers and event listeners
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    // Initial measurements
    setClientHeight(scrollElement.clientHeight);
    setScrollHeight(scrollElement.scrollHeight);
    setScrollTop(scrollElement.scrollTop);

    // Add scroll listener
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    // Set up resize observer
    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setClientHeight(entry.contentRect.height);
      }
    });
    
    resizeObserverRef.current.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
      resizeObserverRef.current?.disconnect();
      
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Reset measurements when totalCount changes
  useEffect(() => {
    measurementsRef.current.clear();
  }, [totalCount]);

  return {
    scrollElementRef,
    virtualItems,
    totalSize,
    isScrolling,
    scrollTop,
    scrollHeight,
    clientHeight,
    range,
    scrollToIndex,
    scrollToOffset,
    measureItem,
  };
}

// Hook for horizontal virtualization (columns)
export function useTableColumnVirtualization({
  totalCount,
  estimateSize = 150,
  overscan = 2,
  getItemKey,
  debug = false,
}: Omit<UseTableVirtualizationOptions, 'scrollingDelay'>) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [clientWidth, setClientWidth] = useState(0);
  const [scrollWidth, setScrollWidth] = useState(0);
  
  const scrollElementRef = useRef<HTMLElement | null>(null);
  const measurementsRef = useRef<Map<number, number>>(new Map());
  
  // Calculate total width
  const totalSize = useMemo(() => {
    let total = 0;
    for (let i = 0; i < totalCount; i++) {
      total += measurementsRef.current.get(i) || estimateSize;
    }
    return total;
  }, [totalCount, estimateSize]);

  // Calculate visible range
  const range = useMemo(() => {
    if (clientWidth === 0 || totalCount === 0) {
      return { start: 0, end: totalCount - 1 };
    }

    let start = 0;
    let accumulatedWidth = 0;
    
    // Find start index
    for (let i = 0; i < totalCount; i++) {
      const itemSize = measurementsRef.current.get(i) || estimateSize;
      if (accumulatedWidth + itemSize > scrollLeft) {
        start = Math.max(0, i - overscan);
        break;
      }
      accumulatedWidth += itemSize;
    }

    // Find end index
    let end = start;
    let visibleWidth = 0;
    
    for (let i = start; i < totalCount; i++) {
      const itemSize = measurementsRef.current.get(i) || estimateSize;
      visibleWidth += itemSize;
      
      if (visibleWidth >= clientWidth + overscan * estimateSize) {
        end = Math.min(totalCount - 1, i + overscan);
        break;
      }
      
      end = i;
    }

    return { start, end };
  }, [scrollLeft, clientWidth, totalCount, estimateSize, overscan]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let offsetLeft = 0;

    // Calculate offset to start
    for (let i = 0; i < range.start; i++) {
      offsetLeft += measurementsRef.current.get(i) || estimateSize;
    }

    // Generate virtual items for visible range
    for (let i = range.start; i <= range.end && i < totalCount; i++) {
      const size = measurementsRef.current.get(i) || estimateSize;
      const key = getItemKey ? getItemKey(i) : i;
      
      items.push({
        key,
        index: i,
        start: offsetLeft,
        end: offsetLeft + size,
        size,
      });
      
      offsetLeft += size;
    }

    return items;
  }, [range, totalCount, estimateSize, getItemKey]);

  // Measure item size
  const measureItem = useCallback((index: number, element: HTMLElement) => {
    const width = element.getBoundingClientRect().width;
    measurementsRef.current.set(index, width);
  }, []);

  // Scroll event handler
  const handleScroll = useCallback(
    throttle((event: Event) => {
      if (!scrollElementRef.current) return;
      
      const element = event.target as HTMLElement;
      setScrollLeft(element.scrollLeft);
      setScrollWidth(element.scrollWidth);
      setClientWidth(element.clientWidth);
    }, 16),
    []
  );

  // Set up event listeners
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (!scrollElement) return;

    // Initial measurements
    setClientWidth(scrollElement.clientWidth);
    setScrollWidth(scrollElement.scrollWidth);
    setScrollLeft(scrollElement.scrollLeft);

    // Add scroll listener
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      scrollElement.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    scrollElementRef,
    virtualItems,
    totalSize,
    scrollLeft,
    scrollWidth,
    clientWidth,
    range,
    measureItem,
  };
}