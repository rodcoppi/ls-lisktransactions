'use client';

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { clsx } from 'clsx';
import type { LayoutItem, GridLayoutProps, BreakpointLayout } from '@/lib/dashboard/types';

// Custom responsive grid layout implementation
export function GridLayout({
  layout,
  onLayoutChange,
  breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
  cols = { lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 },
  rowHeight = 120,
  margin = [16, 16],
  containerPadding = [0, 0],
  isDraggable = true,
  isResizable = true,
  useCSSTransforms = true,
  preventCollision = false,
  compactType = 'vertical',
  className = '',
  children
}: GridLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });

  // Calculate current breakpoint
  const getCurrentBreakpoint = useCallback((width: number): string => {
    const sortedBreakpoints = Object.entries(breakpoints)
      .sort(([,a], [,b]) => b - a);
    
    for (const [name, breakpoint] of sortedBreakpoints) {
      if (width >= breakpoint) {
        return name;
      }
    }
    return 'xxs';
  }, [breakpoints]);

  // Handle container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        setContainerWidth(width);
        setCurrentBreakpoint(getCurrentBreakpoint(width));
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [getCurrentBreakpoint]);

  // Get current column count
  const currentCols = cols[currentBreakpoint as keyof typeof cols] || cols.lg;
  
  // Calculate cell dimensions
  const cellWidth = (containerWidth - containerPadding[0] * 2 - margin[0] * (currentCols - 1)) / currentCols;
  const cellHeight = rowHeight;

  // Position calculation
  const getItemPosition = useCallback((item: LayoutItem) => {
    const x = item.x * (cellWidth + margin[0]);
    const y = item.y * (cellHeight + margin[1]);
    const width = item.w * cellWidth + (item.w - 1) * margin[0];
    const height = item.h * cellHeight + (item.h - 1) * margin[1];
    
    return { x, y, width, height };
  }, [cellWidth, cellHeight, margin]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId: string) => {
    if (!isDraggable) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedItem(itemId);
    setDragOffset({ x: offsetX, y: offsetY });
    setDragPosition({ x: e.clientX - offsetX, y: e.clientY - offsetY });
  }, [isDraggable]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggedItem) return;
    
    setDragPosition({
      x: e.clientX - dragOffset.x,
      y: e.clientY - dragOffset.y
    });
  }, [draggedItem, dragOffset]);

  const handleMouseUp = useCallback(() => {
    if (!draggedItem || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeX = dragPosition.x - containerRect.left - containerPadding[0];
    const relativeY = dragPosition.y - containerRect.top - containerPadding[1];
    
    // Calculate grid position
    const newX = Math.round(relativeX / (cellWidth + margin[0]));
    const newY = Math.round(relativeY / (cellHeight + margin[1]));
    
    // Ensure within bounds
    const clampedX = Math.max(0, Math.min(newX, currentCols - 1));
    const clampedY = Math.max(0, newY);
    
    // Update layout
    const newLayout = layout.map(item => 
      item.i === draggedItem 
        ? { ...item, x: clampedX, y: clampedY }
        : item
    );
    
    onLayoutChange?.(newLayout);
    setDraggedItem(null);
  }, [
    draggedItem, 
    dragPosition, 
    containerPadding, 
    cellWidth, 
    cellHeight, 
    margin, 
    currentCols, 
    layout, 
    onLayoutChange
  ]);

  // Mouse event listeners
  useEffect(() => {
    if (draggedItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedItem, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: string) => {
    if (!isDraggable) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = touch.clientX - rect.left;
    const offsetY = touch.clientY - rect.top;
    
    setDraggedItem(itemId);
    setDragOffset({ x: offsetX, y: offsetY });
    setDragPosition({ x: touch.clientX - offsetX, y: touch.clientY - offsetY });
  }, [isDraggable]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!draggedItem) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    setDragPosition({
      x: touch.clientX - dragOffset.x,
      y: touch.clientY - dragOffset.y
    });
  }, [draggedItem, dragOffset]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  // Touch event listeners
  useEffect(() => {
    if (draggedItem) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      return () => {
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [draggedItem, handleTouchMove, handleTouchEnd]);

  // Calculate container height
  const containerHeight = layout.reduce((maxY, item) => {
    return Math.max(maxY, item.y + item.h);
  }, 0) * (cellHeight + margin[1]) - margin[1] + containerPadding[1] * 2;

  return (
    <div
      ref={containerRef}
      className={clsx('relative', className)}
      style={{
        height: containerHeight,
        padding: `${containerPadding[1]}px ${containerPadding[0]}px`
      }}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return null;
        
        const layoutItem = layout[index];
        if (!layoutItem) return null;

        const position = getItemPosition(layoutItem);
        const isDragging = draggedItem === layoutItem.i;
        
        return (
          <div
            key={layoutItem.i}
            className={clsx(
              'absolute transition-all duration-200 ease-out',
              isDragging && 'z-50 shadow-2xl scale-105',
              isDraggable && 'cursor-move'
            )}
            style={
              isDragging
                ? {
                    left: dragPosition.x,
                    top: dragPosition.y,
                    width: position.width,
                    height: position.height,
                    transform: useCSSTransforms ? 'translate(0, 0)' : undefined
                  }
                : {
                    left: position.x,
                    top: position.y,
                    width: position.width,
                    height: position.height,
                    transform: useCSSTransforms 
                      ? `translate(${position.x}px, ${position.y}px)` 
                      : undefined
                  }
            }
            onMouseDown={(e) => handleMouseDown(e, layoutItem.i)}
            onTouchStart={(e) => handleTouchStart(e, layoutItem.i)}
          >
            {child}
          </div>
        );
      })}
      
      {/* Grid overlay for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute inset-0 pointer-events-none opacity-10">
          {Array.from({ length: currentCols }).map((_, x) =>
            Array.from({ length: Math.ceil(containerHeight / (cellHeight + margin[1])) }).map((_, y) => (
              <div
                key={`${x}-${y}`}
                className="absolute border border-blue-300"
                style={{
                  left: x * (cellWidth + margin[0]),
                  top: y * (cellHeight + margin[1]),
                  width: cellWidth,
                  height: cellHeight
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}