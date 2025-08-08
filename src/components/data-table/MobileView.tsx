'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Row,
  Column,
  BulkAction,
  TableAction,
  GlobalFilterState,
  RowSelectionState,
} from './types';
import { getSwipeDirection } from '@/lib/table-utils';

interface MobileViewProps<T> {
  rows: Row<T>[];
  columns: Column<T>[];
  rowSelection: RowSelectionState;
  globalFilter: GlobalFilterState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  onGlobalFilterChange: (filter: string) => void;
  onRowClick?: (row: Row<T>) => void;
  onRowDoubleClick?: (row: Row<T>) => void;
  bulkActions?: BulkAction<T>[];
  rowActions?: TableAction<T>[];
  enableSelection?: boolean;
  enableSearch?: boolean;
  enableSwipeActions?: boolean;
  cardRenderer?: (row: Row<T>) => React.ReactNode;
  className?: string;
}

export function MobileView<T>({
  rows,
  columns,
  rowSelection,
  globalFilter,
  onRowSelectionChange,
  onGlobalFilterChange,
  onRowClick,
  onRowDoubleClick,
  bulkActions = [],
  rowActions = [],
  enableSelection = true,
  enableSearch = true,
  enableSwipeActions = true,
  cardRenderer,
  className,
}: MobileViewProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);

  // Handle row expansion
  const toggleRowExpansion = useCallback((rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rowId)) {
        newSet.delete(rowId);
      } else {
        newSet.add(rowId);
      }
      return newSet;
    });
  }, []);

  // Handle row selection
  const toggleRowSelection = useCallback((rowId: string) => {
    if (!enableSelection) return;
    
    const newSelection = { ...rowSelection };
    if (newSelection[rowId]) {
      delete newSelection[rowId];
    } else {
      newSelection[rowId] = true;
    }
    onRowSelectionChange(newSelection);
  }, [rowSelection, onRowSelectionChange, enableSelection]);

  // Get selected rows count
  const selectedRowCount = Object.values(rowSelection).filter(Boolean).length;

  return (
    <div className={cn('mobile-table-view', className)}>
      {/* Mobile Header */}
      <div className="mobile-header sticky top-0 z-10 bg-background border-b border-border p-4 space-y-3">
        {/* Search Bar */}
        {enableSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={globalFilter.value}
              onChange={(e) => onGlobalFilterChange(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className={cn(
                'pl-10 pr-4',
                searchFocused && 'ring-2 ring-primary'
              )}
            />
          </div>
        )}

        {/* Selection and Actions Bar */}
        {enableSelection && selectedRowCount > 0 && (
          <div className="flex items-center justify-between bg-primary/10 rounded-lg p-3">
            <span className="text-sm font-medium">
              {selectedRowCount} selected
            </span>
            <div className="flex space-x-2">
              {bulkActions.map(action => (
                <Button
                  key={action.id}
                  variant={action.variant || 'default'}
                  size="sm"
                  onClick={() => {
                    const selectedRows = rows.filter(row => rowSelection[row.id]);
                    action.action(selectedRows);
                  }}
                  disabled={action.disabled}
                  className="h-8 px-3"
                >
                  {action.icon && <span className="mr-1">{action.icon}</span>}
                  {action.label}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRowSelectionChange({})}
                className="h-8 px-3"
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="text-sm text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'item' : 'items'}
          {globalFilter.value && ' found'}
        </div>
      </div>

      {/* Mobile Cards List */}
      <div className="mobile-cards-container p-4 space-y-3">
        {rows.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              {globalFilter.value ? 'No items found' : 'No data available'}
            </div>
          </div>
        ) : (
          rows.map((row) => (
            <MobileCard
              key={row.id}
              row={row}
              columns={columns}
              isSelected={Boolean(rowSelection[row.id])}
              isExpanded={expandedRows.has(row.id)}
              onToggleSelection={() => toggleRowSelection(row.id)}
              onToggleExpansion={() => toggleRowExpansion(row.id)}
              onClick={() => onRowClick?.(row)}
              onDoubleClick={() => onRowDoubleClick?.(row)}
              enableSelection={enableSelection}
              enableSwipeActions={enableSwipeActions}
              rowActions={rowActions}
              customRenderer={cardRenderer}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface MobileCardProps<T> {
  row: Row<T>;
  columns: Column<T>[];
  isSelected: boolean;
  isExpanded: boolean;
  onToggleSelection: () => void;
  onToggleExpansion: () => void;
  onClick?: () => void;
  onDoubleClick?: () => void;
  enableSelection: boolean;
  enableSwipeActions: boolean;
  rowActions: TableAction<T>[];
  customRenderer?: (row: Row<T>) => React.ReactNode;
}

function MobileCard<T>({
  row,
  columns,
  isSelected,
  isExpanded,
  onToggleSelection,
  onToggleExpansion,
  onClick,
  onDoubleClick,
  enableSelection,
  enableSwipeActions,
  rowActions,
  customRenderer,
}: MobileCardProps<T>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActionsVisible, setIsSwipeActionsVisible] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Custom renderer takes precedence
  if (customRenderer) {
    return (
      <div
        className={cn(
          'mobile-card bg-card border border-border rounded-lg p-4 transition-all duration-200',
          isSelected && 'ring-2 ring-primary bg-primary/5',
          'hover:shadow-md active:scale-[0.98]'
        )}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
      >
        {customRenderer(row)}
      </div>
    );
  }

  // Get primary columns (first few important ones)
  const primaryColumns = columns.slice(0, 2);
  const secondaryColumns = columns.slice(2);

  // Handle touch events for swipe actions
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeActions) return;
    
    const touch = e.touches[0];
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  }, [enableSwipeActions]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeActions || !swipeStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    
    // Only handle horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault();
      setSwipeOffset(Math.max(-120, Math.min(0, deltaX)));
    }
  }, [enableSwipeActions]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableSwipeActions || !swipeStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - swipeStartRef.current.x;
    const deltaY = touch.clientY - swipeStartRef.current.y;
    const timeDelta = Date.now() - swipeStartRef.current.time;
    
    const direction = getSwipeDirection(
      swipeStartRef.current.x,
      swipeStartRef.current.y,
      touch.clientX,
      touch.clientY
    );
    
    // Handle swipe actions
    if (direction === 'left' && Math.abs(deltaX) > 50) {
      setIsSwipeActionsVisible(true);
      setSwipeOffset(-120);
    } else if (direction === 'right' && isSwipeActionsVisible) {
      setIsSwipeActionsVisible(false);
      setSwipeOffset(0);
    } else if (timeDelta < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      // Quick tap - toggle selection or trigger click
      if (enableSelection) {
        onToggleSelection();
      } else {
        onClick?.();
      }
    }
    
    // Reset swipe offset if not showing actions
    if (!isSwipeActionsVisible) {
      setSwipeOffset(0);
    }
    
    swipeStartRef.current = null;
  }, [enableSwipeActions, isSwipeActionsVisible, enableSelection, onToggleSelection, onClick]);

  // Close swipe actions when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsSwipeActionsVisible(false);
        setSwipeOffset(0);
      }
    };

    if (isSwipeActionsVisible) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isSwipeActionsVisible]);

  return (
    <div
      ref={cardRef}
      className={cn(
        'mobile-card relative overflow-hidden bg-card border border-border rounded-lg transition-all duration-200',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        'hover:shadow-md'
      )}
      style={{
        transform: `translateX(${swipeOffset}px)`,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={!enableSwipeActions ? onClick : undefined}
      onDoubleClick={onDoubleClick}
    >
      {/* Card Content */}
      <div className="p-4">
        {/* Header with selection and expand */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {enableSelection && (
              <button
                className={cn(
                  'w-5 h-5 rounded border-2 border-border transition-colors',
                  isSelected && 'bg-primary border-primary'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSelection();
                }}
                aria-label="Select row"
              >
                {isSelected && (
                  <div className="w-full h-full flex items-center justify-center text-primary-foreground text-xs">
                    ✓
                  </div>
                )}
              </button>
            )}
            
            {/* Primary content */}
            <div className="flex-1 min-w-0">
              {primaryColumns.map((column, index) => {
                const value = row.getValue(column.id);
                return (
                  <div
                    key={column.id}
                    className={cn(
                      'truncate',
                      index === 0 && 'font-semibold text-foreground',
                      index === 1 && 'text-sm text-muted-foreground'
                    )}
                  >
                    {column.cell ? column.cell({
                      getValue: () => value,
                      row,
                      column,
                      cell: row.getAllCells().find(c => c.column.id === column.id)!,
                      table: {} as any,
                    }) : String(value || '')}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {secondaryColumns.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpansion();
                }}
                className="p-1 hover:bg-muted rounded"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            
            {rowActions.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Show context menu or actions
                }}
                className="p-1 hover:bg-muted rounded"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Expanded secondary content */}
        {isExpanded && secondaryColumns.length > 0 && (
          <div className="space-y-2 pt-3 border-t border-border">
            {secondaryColumns.map(column => {
              const value = row.getValue(column.id);
              if (value == null || value === '') return null;
              
              return (
                <div key={column.id} className="flex justify-between items-start">
                  <span className="text-sm text-muted-foreground font-medium">
                    {typeof column.header === 'string' ? column.header : column.accessorKey}:
                  </span>
                  <span className="text-sm text-right ml-2 flex-1">
                    {column.cell ? column.cell({
                      getValue: () => value,
                      row,
                      column,
                      cell: row.getAllCells().find(c => c.column.id === column.id)!,
                      table: {} as any,
                    }) : String(value)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Swipe Actions */}
      {enableSwipeActions && rowActions.length > 0 && (
        <div className="absolute top-0 right-0 h-full flex items-center bg-muted-foreground/10 px-2 space-x-1 transform translate-x-full transition-transform duration-200"
             style={{
               transform: isSwipeActionsVisible ? 'translateX(0)' : 'translateX(100%)',
             }}>
          {rowActions.slice(0, 2).map(action => (
            <Button
              key={action.id}
              variant={action.variant || 'default'}
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                action.action(row);
                setIsSwipeActionsVisible(false);
                setSwipeOffset(0);
              }}
              disabled={action.disabled?.(row)}
              className="h-8 w-8 p-0"
              title={action.label}
            >
              {action.icon || action.label.charAt(0)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Hook for mobile detection and handling
export function useMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}

// Mobile-specific table configuration
export function getMobileTableConfig<T>(): {
  estimateSize: number;
  overscan: number;
  enableVirtualization: boolean;
  pageSize: number;
} {
  return {
    estimateSize: 80, // Taller cards for mobile
    overscan: 2, // Smaller overscan for mobile
    enableVirtualization: true,
    pageSize: 20, // Smaller page size for mobile
  };
}