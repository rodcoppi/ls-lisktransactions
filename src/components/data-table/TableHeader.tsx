'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, Filter, Eye, EyeOff, Move, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Column,
  SortDirection,
  HeaderGroup,
  Header,
  ColumnFiltersState,
  ColumnSizingState,
  ColumnOrderState,
  ColumnPinningState,
} from './types';
import { getAriaSort, debounce } from '@/lib/table-utils';

interface TableHeaderProps<T> {
  headerGroups: HeaderGroup<T>[];
  sorting: { id: string; desc: boolean }[];
  columnFilters: ColumnFiltersState;
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  onSortingChange: (sorting: { id: string; desc: boolean }[]) => void;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  onColumnSizingChange: (sizing: ColumnSizingState) => void;
  onColumnOrderChange: (order: ColumnOrderState) => void;
  onColumnPinningChange: (pinning: ColumnPinningState) => void;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableResizing?: boolean;
  enableOrdering?: boolean;
  enablePinning?: boolean;
  className?: string;
}

export function TableHeader<T>({
  headerGroups,
  sorting,
  columnFilters,
  columnSizing,
  columnOrder,
  columnPinning,
  onSortingChange,
  onColumnFiltersChange,
  onColumnSizingChange,
  onColumnOrderChange,
  onColumnPinningChange,
  onColumnVisibilityChange,
  enableSorting = true,
  enableFiltering = true,
  enableResizing = true,
  enableOrdering = true,
  enablePinning = true,
  className,
}: TableHeaderProps<T>) {
  const [resizing, setResizing] = useState<{ columnId: string; startX: number; startWidth: number } | null>(null);
  const [dragging, setDragging] = useState<{ columnId: string; startIndex: number } | null>(null);
  const [dropZone, setDropZone] = useState<{ index: number; position: 'before' | 'after' } | null>(null);

  // Handle column sorting
  const handleSort = (columnId: string) => {
    if (!enableSorting) return;
    
    const existingSort = sorting.find(s => s.id === columnId);
    let newSorting: { id: string; desc: boolean }[];
    
    if (!existingSort) {
      // Add ascending sort
      newSorting = [{ id: columnId, desc: false }, ...sorting];
    } else if (!existingSort.desc) {
      // Change to descending
      newSorting = sorting.map(s => s.id === columnId ? { ...s, desc: true } : s);
    } else {
      // Remove sort
      newSorting = sorting.filter(s => s.id !== columnId);
    }
    
    onSortingChange(newSorting);
  };

  // Handle column filtering with debouncing
  const handleFilterChange = debounce((columnId: string, value: string) => {
    const newFilters = value
      ? [...columnFilters.filter(f => f.id !== columnId), { id: columnId, value }]
      : columnFilters.filter(f => f.id !== columnId);
    onColumnFiltersChange(newFilters);
  }, 300);

  // Handle column resizing
  const handleResizeStart = (columnId: string, event: React.MouseEvent) => {
    if (!enableResizing) return;
    
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = columnSizing[columnId] || 150;
    
    setResizing({ columnId, startX, startWidth });
  };

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const deltaX = event.clientX - resizing.startX;
      const newWidth = Math.max(50, resizing.startWidth + deltaX);
      
      onColumnSizingChange({
        ...columnSizing,
        [resizing.columnId]: newWidth,
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, columnSizing, onColumnSizingChange]);

  // Handle column drag and drop
  const handleDragStart = (columnId: string, index: number, event: React.DragEvent) => {
    if (!enableOrdering) return;
    
    setDragging({ columnId, startIndex: index });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', columnId);
  };

  const handleDragOver = (index: number, event: React.DragEvent) => {
    if (!dragging) return;
    
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const position = event.clientX < midpoint ? 'before' : 'after';
    
    setDropZone({ index, position });
  };

  const handleDrop = (index: number, event: React.DragEvent) => {
    if (!dragging || !dropZone) return;
    
    event.preventDefault();
    
    const { columnId, startIndex } = dragging;
    const newColumnIds = [...columnOrder.columnIds];
    
    // Remove column from current position
    newColumnIds.splice(startIndex, 1);
    
    // Insert at new position
    const insertIndex = dropZone.position === 'before' ? index : index + 1;
    newColumnIds.splice(insertIndex, 0, columnId);
    
    onColumnOrderChange({ columnIds: newColumnIds });
    
    setDragging(null);
    setDropZone(null);
  };

  // Handle column pinning
  const handlePin = (columnId: string, side: 'left' | 'right') => {
    if (!enablePinning) return;
    
    const newPinning = { ...columnPinning };
    
    // Remove from both sides first
    newPinning.left = newPinning.left?.filter(id => id !== columnId) || [];
    newPinning.right = newPinning.right?.filter(id => id !== columnId) || [];
    
    // Add to the requested side
    if (side === 'left') {
      newPinning.left.push(columnId);
    } else {
      newPinning.right.push(columnId);
    }
    
    onColumnPinningChange(newPinning);
  };

  const handleUnpin = (columnId: string) => {
    const newPinning = { ...columnPinning };
    newPinning.left = newPinning.left?.filter(id => id !== columnId) || [];
    newPinning.right = newPinning.right?.filter(id => id !== columnId) || [];
    onColumnPinningChange(newPinning);
  };

  // Get sort direction for column
  const getSortDirection = (columnId: string): SortDirection => {
    const sort = sorting.find(s => s.id === columnId);
    if (!sort) return null;
    return sort.desc ? 'desc' : 'asc';
  };

  // Get sort priority for column
  const getSortPriority = (columnId: string): number | null => {
    const index = sorting.findIndex(s => s.id === columnId);
    return index === -1 ? null : index + 1;
  };

  // Get filter value for column
  const getFilterValue = (columnId: string): string => {
    const filter = columnFilters.find(f => f.id === columnId);
    return filter?.value || '';
  };

  // Check if column is pinned
  const isColumnPinned = (columnId: string): 'left' | 'right' | false => {
    if (columnPinning.left?.includes(columnId)) return 'left';
    if (columnPinning.right?.includes(columnId)) return 'right';
    return false;
  };

  return (
    <thead className={cn('bg-muted/50 sticky top-0 z-10', className)}>
      {headerGroups.map((headerGroup, groupIndex) => (
        <tr key={headerGroup.id} className="border-b border-border">
          {headerGroup.headers.map((header, headerIndex) => {
            const column = header.column;
            const sortDirection = getSortDirection(column.id);
            const sortPriority = getSortPriority(column.id);
            const filterValue = getFilterValue(column.id);
            const isPinned = isColumnPinned(column.id);
            const size = header.getSize();
            
            return (
              <th
                key={header.id}
                className={cn(
                  'relative group',
                  'border-r border-border last:border-r-0',
                  'bg-background',
                  isPinned && 'sticky z-20 shadow-md',
                  isPinned === 'left' && 'left-0',
                  isPinned === 'right' && 'right-0',
                  dropZone?.index === headerIndex && dropZone.position === 'before' && 'border-l-4 border-l-primary',
                  dropZone?.index === headerIndex && dropZone.position === 'after' && 'border-r-4 border-r-primary'
                )}
                style={{
                  width: size,
                  minWidth: size,
                  maxWidth: size,
                }}
                draggable={enableOrdering}
                onDragStart={(e) => handleDragStart(column.id, headerIndex, e)}
                onDragOver={(e) => handleDragOver(headerIndex, e)}
                onDrop={(e) => handleDrop(headerIndex, e)}
                onDragEnd={() => {
                  setDragging(null);
                  setDropZone(null);
                }}
              >
                {/* Header content */}
                <div className="flex flex-col">
                  {/* Header row */}
                  <div className="flex items-center justify-between px-3 py-2 min-h-[40px]">
                    {/* Drag handle */}
                    {enableOrdering && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity mr-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                      </div>
                    )}
                    
                    {/* Header text and sort button */}
                    <div className="flex items-center flex-1 min-w-0">
                      {enableSorting && column.enableSorting !== false ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-medium text-left justify-start flex-1"
                          onClick={() => handleSort(column.id)}
                          aria-sort={getAriaSort(sortDirection)}
                        >
                          <span className="truncate">{header.column.header}</span>
                          {sortDirection === 'asc' && <ChevronUp className="ml-1 h-4 w-4" />}
                          {sortDirection === 'desc' && <ChevronDown className="ml-1 h-4 w-4" />}
                          {sortDirection === null && <ChevronsUpDown className="ml-1 h-4 w-4 opacity-50" />}
                          {sortPriority && sortPriority > 1 && (
                            <span className="ml-1 text-xs bg-primary text-primary-foreground rounded-full px-1">
                              {sortPriority}
                            </span>
                          )}
                        </Button>
                      ) : (
                        <span className="font-medium text-sm px-3 py-1 truncate">
                          {header.column.header}
                        </span>
                      )}
                    </div>

                    {/* Header actions */}
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Filter button */}
                      {enableFiltering && column.enableFiltering !== false && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Filter className={cn(
                            "h-3 w-3",
                            filterValue && "text-primary"
                          )} />
                        </Button>
                      )}
                      
                      {/* Pin buttons */}
                      {enablePinning && (
                        <div className="flex space-x-0.5">
                          {isPinned !== 'left' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handlePin(column.id, 'left')}
                              title="Pin left"
                            >
                              ←
                            </Button>
                          )}
                          {isPinned !== 'right' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handlePin(column.id, 'right')}
                              title="Pin right"
                            >
                              →
                            </Button>
                          )}
                          {isPinned && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => handleUnpin(column.id)}
                              title="Unpin"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Visibility toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => onColumnVisibilityChange(column.id, false)}
                        title="Hide column"
                      >
                        <EyeOff className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Resize handle */}
                    {enableResizing && column.resizable !== false && (
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize opacity-0 group-hover:opacity-100 hover:bg-primary/20 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(column.id, e)}
                        title="Resize column"
                      />
                    )}
                  </div>
                  
                  {/* Filter row */}
                  {enableFiltering && column.enableFiltering !== false && (
                    <div className="px-3 pb-2">
                      <Input
                        placeholder={`Filter ${column.header}...`}
                        value={filterValue}
                        onChange={(e) => handleFilterChange(column.id, e.target.value)}
                        className="h-8 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              </th>
            );
          })}
        </tr>
      ))}
    </thead>
  );
}

// Sort indicator component
export function SortIndicator({
  direction,
  priority,
  className,
}: {
  direction: SortDirection;
  priority?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {direction === 'asc' && <ChevronUp className="h-4 w-4" />}
      {direction === 'desc' && <ChevronDown className="h-4 w-4" />}
      {direction === null && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
      {priority && priority > 1 && (
        <span className="text-xs bg-primary text-primary-foreground rounded-full px-1 min-w-[16px] text-center">
          {priority}
        </span>
      )}
    </div>
  );
}

// Filter input component
export function FilterInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const debouncedOnChange = debounce(onChange, 300);
  
  return (
    <Input
      placeholder={placeholder}
      defaultValue={value}
      onChange={(e) => debouncedOnChange(e.target.value)}
      className={cn('h-8 text-xs', className)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}