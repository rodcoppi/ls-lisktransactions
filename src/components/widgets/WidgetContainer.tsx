'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';
import { X, Move, Maximize2, Minimize2, Settings } from 'lucide-react';
import { useDraggable } from '../dashboard/DragDropProvider';
import type { Widget, LayoutItem } from '@/lib/dashboard/types';

interface WidgetContainerProps {
  widget: Widget;
  layoutItem: LayoutItem;
  children: React.ReactNode;
  onResize?: (size: { width: number; height: number }) => void;
  onRemove?: () => void;
  onSettings?: () => void;
  isDraggable?: boolean;
  isResizable?: boolean;
  className?: string;
}

export function WidgetContainer({
  widget,
  layoutItem,
  children,
  onResize,
  onRemove,
  onSettings,
  isDraggable = true,
  isResizable = true,
  className = ''
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const resizeStartRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const { isDragging, dragHandleProps } = useDraggable(widget.id);

  // Resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    if (!isResizable || !containerRef.current) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    setIsResizing(true);
    setResizeHandle(handle);
    
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height
    };
  }, [isResizable]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle || !resizeStartRef.current) return;
    
    const deltaX = e.clientX - resizeStartRef.current.x;
    const deltaY = e.clientY - resizeStartRef.current.y;
    
    let newWidth = resizeStartRef.current.width;
    let newHeight = resizeStartRef.current.height;
    
    // Apply resize based on handle
    if (resizeHandle.includes('e')) newWidth += deltaX;
    if (resizeHandle.includes('w')) newWidth -= deltaX;
    if (resizeHandle.includes('s')) newHeight += deltaY;
    if (resizeHandle.includes('n')) newHeight -= deltaY;
    
    // Enforce minimum dimensions
    const minWidth = 200;
    const minHeight = 150;
    newWidth = Math.max(newWidth, minWidth);
    newHeight = Math.max(newHeight, minHeight);
    
    // Enforce aspect ratio if specified
    if (widget.aspectRatio) {
      const ratio = widget.aspectRatio;
      if (resizeHandle.includes('e') || resizeHandle.includes('w')) {
        newHeight = newWidth / ratio;
      } else if (resizeHandle.includes('s') || resizeHandle.includes('n')) {
        newWidth = newHeight * ratio;
      }
    }
    
    // Update container size
    if (containerRef.current) {
      containerRef.current.style.width = `${newWidth}px`;
      containerRef.current.style.height = `${newHeight}px`;
    }
  }, [isResizing, resizeHandle, widget.aspectRatio]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    onResize?.({ width: rect.width, height: rect.height });
    
    setIsResizing(false);
    setResizeHandle(null);
    resizeStartRef.current = null;
    
    // Reset inline styles
    containerRef.current.style.width = '';
    containerRef.current.style.height = '';
  }, [isResizing, onResize]);

  // Mouse events for resizing
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  // Touch events for mobile resizing
  const handleTouchResize = useCallback((e: React.TouchEvent, handle: string) => {
    if (!isResizable || !containerRef.current) return;
    
    e.stopPropagation();
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    
    setIsResizing(true);
    setResizeHandle(handle);
    
    resizeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      width: rect.width,
      height: rect.height
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!resizeStartRef.current) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - resizeStartRef.current.x;
      const deltaY = touch.clientY - resizeStartRef.current.y;
      
      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      
      if (handle.includes('e')) newWidth += deltaX;
      if (handle.includes('w')) newWidth -= deltaX;
      if (handle.includes('s')) newHeight += deltaY;
      if (handle.includes('n')) newHeight -= deltaY;
      
      newWidth = Math.max(newWidth, 200);
      newHeight = Math.max(newHeight, 150);
      
      if (containerRef.current) {
        containerRef.current.style.width = `${newWidth}px`;
        containerRef.current.style.height = `${newHeight}px`;
      }
    };
    
    const handleTouchEnd = () => {
      handleResizeEnd();
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [isResizable, handleResizeEnd]);

  // Maximize/minimize functionality
  const handleToggleMaximize = useCallback(() => {
    setIsMaximized(!isMaximized);
  }, [isMaximized]);

  // Render resize handles
  const renderResizeHandles = () => {
    if (!isResizable || !isHovered) return null;
    
    const handles = [
      'nw', 'n', 'ne',
      'w',        'e',
      'sw', 's', 'se'
    ];
    
    return handles.map(handle => (
      <div
        key={handle}
        className={clsx(
          'absolute bg-blue-500 opacity-0 hover:opacity-100 transition-opacity',
          {
            // Corner handles
            'w-3 h-3': ['nw', 'ne', 'sw', 'se'].includes(handle),
            'w-1 h-3': ['w', 'e'].includes(handle),
            'w-3 h-1': ['n', 's'].includes(handle),
            
            // Positioning
            'top-0 left-0 cursor-nw-resize': handle === 'nw',
            'top-0 left-1/2 -translate-x-1/2 cursor-n-resize': handle === 'n',
            'top-0 right-0 cursor-ne-resize': handle === 'ne',
            'top-1/2 left-0 -translate-y-1/2 cursor-w-resize': handle === 'w',
            'top-1/2 right-0 -translate-y-1/2 cursor-e-resize': handle === 'e',
            'bottom-0 left-0 cursor-sw-resize': handle === 'sw',
            'bottom-0 left-1/2 -translate-x-1/2 cursor-s-resize': handle === 's',
            'bottom-0 right-0 cursor-se-resize': handle === 'se',
          }
        )}
        onMouseDown={(e) => handleResizeStart(e, handle)}
        onTouchStart={(e) => handleTouchResize(e, handle)}
      />
    ));
  };

  return (
    <div
      ref={containerRef}
      className={clsx(
        'group relative bg-white rounded-lg shadow-sm border border-gray-200',
        'transition-all duration-200',
        isDragging && 'shadow-xl scale-105 z-50',
        isResizing && 'select-none',
        isMaximized && 'fixed inset-4 z-40',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        minWidth: 200,
        minHeight: 150
      }}
    >
      {/* Widget Header */}
      <div
        className={clsx(
          'flex items-center justify-between p-3 border-b border-gray-100',
          'bg-gray-50 rounded-t-lg'
        )}
        {...(isDraggable ? dragHandleProps : {})}
      >
        <div className="flex items-center gap-2">
          {isDraggable && (
            <Move 
              className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-move" 
            />
          )}
          <h3 className="font-medium text-gray-900 text-sm truncate">
            {widget.title || 'Widget'}
          </h3>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSettings && (
            <button
              onClick={onSettings}
              className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={handleToggleMaximize}
            className="p-1 hover:bg-gray-200 rounded text-gray-500 hover:text-gray-700"
            title={isMaximized ? "Minimize" : "Maximize"}
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-red-100 rounded text-gray-500 hover:text-red-700"
              title="Remove widget"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Widget Content */}
      <div className="p-4 h-full overflow-hidden">
        {children}
      </div>
      
      {/* Resize Handles */}
      {renderResizeHandles()}
      
      {/* Loading Overlay */}
      {widget.loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      {/* Error Overlay */}
      {widget.error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center rounded-lg">
          <div className="text-center p-4">
            <div className="text-red-600 font-medium">Error Loading Widget</div>
            <div className="text-red-500 text-sm mt-1">{widget.error}</div>
          </div>
        </div>
      )}
    </div>
  );
}