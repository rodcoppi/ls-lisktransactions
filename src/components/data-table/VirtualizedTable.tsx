'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  VirtualItem,
  VirtualizerInstance,
  Row,
  Column,
  DataTableProps,
} from './types';
import { getVirtualRange, getVirtualItems, throttle } from '@/lib/table-utils';

interface VirtualizedTableProps<T> extends Pick<DataTableProps<T>, 
  'data' | 'columns' | 'rowClassName' | 'cellClassName' | 'onRowClick' | 'onRowDoubleClick' | 'onCellClick'
> {
  rows: Row<T>[];
  visibleColumns: Column<T>[];
  columnSizing: Record<string, number>;
  estimateSize?: number;
  overscan?: number;
  height: number;
  className?: string;
  renderRow: (virtualItem: VirtualItem, row: Row<T>) => React.ReactNode;
}

export function VirtualizedTable<T>({
  rows,
  visibleColumns,
  columnSizing,
  estimateSize = 50,
  overscan = 5,
  height,
  className,
  renderRow,
  ...props
}: VirtualizedTableProps<T>) {
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Calculate total size and virtual range
  const totalSize = useMemo(() => rows.length * estimateSize, [rows.length, estimateSize]);
  
  const virtualRange = useMemo(() => {
    return getVirtualRange(scrollTop, height, estimateSize, rows.length, overscan);
  }, [scrollTop, height, estimateSize, rows.length, overscan]);
  
  const virtualItems = useMemo(() => {
    return getVirtualItems(virtualRange, estimateSize);
  }, [virtualRange, estimateSize]);

  // Throttled scroll handler for performance
  const handleScroll = useCallback(
    throttle((event: React.UIEvent<HTMLDivElement>) => {
      const target = event.currentTarget;
      setScrollTop(target.scrollTop);
      setIsScrolling(true);
      
      // Reset scrolling state after a delay
      setTimeout(() => setIsScrolling(false), 150);
    }, 16), // ~60fps
    []
  );

  // Create virtualizer instance
  const virtualizer: VirtualizerInstance = useMemo(() => ({
    scrollElement: scrollElementRef.current,
    isScrolling,
    totalSize,
    range: virtualRange,
    getVirtualItems: () => virtualItems,
    scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => {
      if (!scrollElementRef.current) return;
      
      const itemTop = index * estimateSize;
      let scrollTop = itemTop;
      
      if (options?.align === 'center') {
        scrollTop = itemTop - height / 2 + estimateSize / 2;
      } else if (options?.align === 'end') {
        scrollTop = itemTop - height + estimateSize;
      }
      
      scrollElementRef.current.scrollTop = Math.max(0, scrollTop);
    },
    scrollToOffset: (offset: number) => {
      if (scrollElementRef.current) {
        scrollElementRef.current.scrollTop = offset;
      }
    },
    measureElement: (element: HTMLElement) => {
      // Dynamic height measurement could be implemented here
      // For now, we use the estimated size
    },
  }), [isScrolling, totalSize, virtualRange, virtualItems, height, estimateSize]);

  // Keyboard navigation support
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!virtualizer || virtualItems.length === 0) return;
    
    const currentFocus = document.activeElement;
    const currentRowIndex = currentFocus?.getAttribute('data-row-index');
    
    let newIndex = currentRowIndex ? parseInt(currentRowIndex, 10) : 0;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(rows.length - 1, newIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, newIndex - 1);
        break;
      case 'PageDown':
        event.preventDefault();
        newIndex = Math.min(rows.length - 1, newIndex + Math.floor(height / estimateSize));
        break;
      case 'PageUp':
        event.preventDefault();
        newIndex = Math.max(0, newIndex - Math.floor(height / estimateSize));
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = rows.length - 1;
        break;
      default:
        return;
    }
    
    // Scroll to the new index
    virtualizer.scrollToIndex(newIndex);
    
    // Focus the new row after a small delay to ensure it's rendered
    setTimeout(() => {
      const newRow = scrollElementRef.current?.querySelector(`[data-row-index="${newIndex}"]`);
      if (newRow instanceof HTMLElement) {
        newRow.focus();
      }
    }, 50);
  }, [virtualizer, virtualItems, rows.length, height, estimateSize]);

  // Intersection Observer for performance optimization
  useEffect(() => {
    if (!scrollElementRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // Element is visible, can perform additional optimizations here
            const element = entry.target as HTMLElement;
            element.setAttribute('data-visible', 'true');
          } else {
            const element = entry.target as HTMLElement;
            element.removeAttribute('data-visible');
          }
        });
      },
      {
        root: scrollElementRef.current,
        rootMargin: '50px',
        threshold: 0,
      }
    );

    // Observe all virtual items
    const items = scrollElementRef.current.querySelectorAll('[data-virtual-item]');
    items.forEach(item => observer.observe(item));

    return () => observer.disconnect();
  }, [virtualItems]);

  return (
    <div
      ref={scrollElementRef}
      className={cn(
        'relative overflow-auto',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
        className
      )}
      style={{ height }}
      onScroll={handleScroll}
      onKeyDown={handleKeyDown}
      role="grid"
      tabIndex={0}
      aria-rowcount={rows.length}
      aria-colcount={visibleColumns.length}
    >
      {/* Spacer for total height */}
      <div style={{ height: totalSize }} />
      
      {/* Virtual items container */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const row = rows[virtualItem.index];
          if (!row) return null;
          
          return (
            <div
              key={virtualItem.key}
              data-virtual-item
              data-row-index={virtualItem.index}
              style={{
                height: virtualItem.size,
                minHeight: virtualItem.size,
              }}
              className={cn(
                'flex border-b border-border',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                'hover:bg-muted/50 transition-colors',
                typeof props.rowClassName === 'function' 
                  ? props.rowClassName(row)
                  : props.rowClassName
              )}
              tabIndex={-1}
              role="row"
              aria-rowindex={virtualItem.index + 1}
              onClick={(e) => props.onRowClick?.(row, e)}
              onDoubleClick={(e) => props.onRowDoubleClick?.(row, e)}
            >
              {renderRow(virtualItem, row)}
            </div>
          );
        })}
      </div>
      
      {/* Loading indicator when scrolling */}
      {isScrolling && (
        <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
          Scrolling...
        </div>
      )}
    </div>
  );
}

// Row renderer component for better performance
export const VirtualizedRow = React.memo(<T,>({
  row,
  columns,
  columnSizing,
  cellClassName,
  onCellClick,
}: {
  row: Row<T>;
  columns: Column<T>[];
  columnSizing: Record<string, number>;
  cellClassName?: string | ((cell: any) => string);
  onCellClick?: (cell: any, event: React.MouseEvent) => void;
}) => {
  return (
    <>
      {columns.map((column, columnIndex) => {
        const cell = row.getAllCells().find(c => c.column.id === column.id);
        if (!cell) return null;
        
        const size = columnSizing[column.id] || column.size || 150;
        const cellValue = cell.getValue();
        
        return (
          <div
            key={column.id}
            className={cn(
              'flex items-center px-3 py-2 text-sm',
              'border-r border-border last:border-r-0',
              'overflow-hidden text-ellipsis whitespace-nowrap',
              column.align === 'center' && 'justify-center',
              column.align === 'right' && 'justify-end',
              typeof cellClassName === 'function' 
                ? cellClassName(cell)
                : cellClassName
            )}
            style={{
              width: size,
              minWidth: size,
              maxWidth: size,
            }}
            role="gridcell"
            aria-colindex={columnIndex + 1}
            title={String(cellValue)}
            onClick={(e) => onCellClick?.(cell, e)}
          >
            {column.cell ? column.cell({ 
              getValue: () => cellValue,
              row,
              column,
              cell,
              table: {} as any, // Will be provided by parent
            }) : String(cellValue)}
          </div>
        );
      })}
    </>
  );
});

VirtualizedRow.displayName = 'VirtualizedRow';

// Hook for managing virtual scrolling
export function useVirtualizer<T>(
  parentRef: React.RefObject<HTMLElement>,
  size: number,
  options: {
    estimateSize?: number;
    overscan?: number;
    paddingStart?: number;
    paddingEnd?: number;
  } = {}
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  const {
    estimateSize = 50,
    overscan = 5,
    paddingStart = 0,
    paddingEnd = 0,
  } = options;

  // Calculate virtual range
  const range = useMemo(() => {
    return getVirtualRange(scrollTop, clientHeight, estimateSize, size, overscan);
  }, [scrollTop, clientHeight, estimateSize, size, overscan]);

  // Calculate virtual items
  const virtualItems = useMemo(() => {
    return getVirtualItems(range, estimateSize).map(item => ({
      ...item,
      start: item.start + paddingStart,
      end: item.end + paddingStart,
    }));
  }, [range, estimateSize, paddingStart]);

  // Total size including padding
  const totalSize = size * estimateSize + paddingStart + paddingEnd;

  // Scroll event handler
  useEffect(() => {
    if (!parentRef.current) return;

    const element = parentRef.current;
    
    const handleScroll = throttle(() => {
      setScrollTop(element.scrollTop);
      setScrollHeight(element.scrollHeight);
      setClientHeight(element.clientHeight);
      
      setIsScrolling(true);
      setTimeout(() => setIsScrolling(false), 150);
    }, 16);

    // Initial measurements
    handleScroll();
    
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      setClientHeight(element.clientHeight);
    });
    
    resizeObserver.observe(element);

    return () => {
      element.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [parentRef]);

  const scrollToIndex = useCallback((index: number, align: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
    if (!parentRef.current) return;
    
    const itemTop = index * estimateSize + paddingStart;
    let scrollTop = itemTop;
    
    if (align === 'center') {
      scrollTop = itemTop - clientHeight / 2 + estimateSize / 2;
    } else if (align === 'end') {
      scrollTop = itemTop - clientHeight + estimateSize;
    }
    
    parentRef.current.scrollTop = Math.max(0, Math.min(scrollTop, totalSize - clientHeight));
  }, [parentRef, estimateSize, paddingStart, clientHeight, totalSize]);

  const scrollToOffset = useCallback((offset: number) => {
    if (parentRef.current) {
      parentRef.current.scrollTop = offset;
    }
  }, [parentRef]);

  return {
    virtualItems,
    totalSize,
    scrollToIndex,
    scrollToOffset,
    isScrolling,
    range,
  };
}