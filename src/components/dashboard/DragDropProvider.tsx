'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface DragDropContextType {
  draggedItem: string | null;
  dragOffset: { x: number; y: number };
  isDragging: boolean;
  disabled: boolean;
  startDrag: (itemId: string, offset: { x: number; y: number }) => void;
  updateDrag: (position: { x: number; y: number }) => void;
  endDrag: () => void;
  getDragPosition: () => { x: number; y: number };
}

const DragDropContext = createContext<DragDropContextType | null>(null);

interface DragDropProviderProps {
  children: React.ReactNode;
  disabled?: boolean;
  onDragStart?: (itemId: string) => void;
  onDragEnd?: (itemId: string, position: { x: number; y: number }) => void;
}

export function DragDropProvider({ 
  children, 
  disabled = false,
  onDragStart,
  onDragEnd
}: DragDropProviderProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragPosition = useRef({ x: 0, y: 0 });

  const startDrag = useCallback((itemId: string, offset: { x: number; y: number }) => {
    if (disabled) return;
    
    setDraggedItem(itemId);
    setDragOffset(offset);
    onDragStart?.(itemId);
  }, [disabled, onDragStart]);

  const updateDrag = useCallback((position: { x: number; y: number }) => {
    dragPosition.current = position;
  }, []);

  const endDrag = useCallback(() => {
    if (draggedItem) {
      onDragEnd?.(draggedItem, dragPosition.current);
      setDraggedItem(null);
      setDragOffset({ x: 0, y: 0 });
      dragPosition.current = { x: 0, y: 0 };
    }
  }, [draggedItem, onDragEnd]);

  const getDragPosition = useCallback(() => {
    return dragPosition.current;
  }, []);

  const value: DragDropContextType = {
    draggedItem,
    dragOffset,
    isDragging: draggedItem !== null,
    disabled,
    startDrag,
    updateDrag,
    endDrag,
    getDragPosition
  };

  return (
    <DragDropContext.Provider value={value}>
      {children}
    </DragDropContext.Provider>
  );
}

export function useDragDrop() {
  const context = useContext(DragDropContext);
  if (!context) {
    throw new Error('useDragDrop must be used within a DragDropProvider');
  }
  return context;
}

// Hook for draggable items
export function useDraggable(itemId: string) {
  const { draggedItem, startDrag, updateDrag, endDrag, disabled } = useDragDrop();
  
  const isDragging = draggedItem === itemId;
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    
    startDrag(itemId, offset);
    
    const handleMouseMove = (e: MouseEvent) => {
      updateDrag({ x: e.clientX, y: e.clientY });
    };
    
    const handleMouseUp = () => {
      endDrag();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [itemId, startDrag, updateDrag, endDrag, disabled]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
    
    startDrag(itemId, offset);
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      updateDrag({ x: touch.clientX, y: touch.clientY });
    };
    
    const handleTouchEnd = () => {
      endDrag();
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  }, [itemId, startDrag, updateDrag, endDrag, disabled]);

  return {
    isDragging,
    dragHandleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      style: {
        cursor: disabled ? 'default' : 'move',
        userSelect: 'none' as const,
        touchAction: 'none'
      }
    }
  };
}

// Hook for drop zones
export function useDropZone(onDrop?: (itemId: string) => void) {
  const { draggedItem, isDragging } = useDragDrop();
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    
    if (draggedItem && onDrop) {
      onDrop(draggedItem);
    }
  }, [draggedItem, onDrop]);

  return {
    isOver: isOver && isDragging,
    dropZoneProps: {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop
    }
  };
}