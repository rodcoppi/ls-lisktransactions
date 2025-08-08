'use client';

import { useMemo, useCallback } from 'react';
import {
  Row,
  Column,
  Cell,
  SortingState,
  ColumnFiltersState,
  GlobalFilterState,
  GroupingState,
  ExpandedState,
  PaginationState,
} from '../types';
import {
  getSortingFn,
  getGlobalFilterFn,
  getColumnFilterFn,
} from '@/lib/table-utils';

interface UseTableDataOptions<T> {
  data: T[];
  columns: Column<T>[];
  sorting: SortingState[];
  columnFilters: ColumnFiltersState;
  globalFilter: GlobalFilterState;
  grouping: GroupingState;
  expanded: ExpandedState;
  pagination?: PaginationState;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableGrouping?: boolean;
  enablePagination?: boolean;
}

export function useTableData<T>({
  data,
  columns,
  sorting,
  columnFilters,
  globalFilter,
  grouping,
  expanded,
  pagination,
  enableSorting = true,
  enableFiltering = true,
  enableGrouping = false,
  enablePagination = false,
}: UseTableDataOptions<T>) {
  // Create rows from raw data
  const baseRows = useMemo(() => {
    return data.map((item, index) => createRow(item, index, columns));
  }, [data, columns]);

  // Apply global filtering
  const globalFilteredRows = useMemo(() => {
    if (!enableFiltering || !globalFilter.value) {
      return baseRows;
    }

    const globalFilterFn = getGlobalFilterFn<T>();
    
    return baseRows.filter(row => {
      return columns.some(column => {
        if (column.enableGlobalFilter === false) return false;
        return globalFilterFn(row, column.id, globalFilter.value);
      });
    });
  }, [baseRows, globalFilter, columns, enableFiltering]);

  // Apply column filtering
  const columnFilteredRows = useMemo(() => {
    if (!enableFiltering || columnFilters.length === 0) {
      return globalFilteredRows;
    }

    return globalFilteredRows.filter(row => {
      return columnFilters.every(filter => {
        const column = columns.find(col => col.id === filter.id);
        if (!column || column.enableFiltering === false) return true;
        
        const filterFn = getColumnFilterFn(column);
        return filterFn(row, filter.id, filter.value);
      });
    });
  }, [globalFilteredRows, columnFilters, columns, enableFiltering]);

  // Apply sorting
  const sortedRows = useMemo(() => {
    if (!enableSorting || sorting.length === 0) {
      return columnFilteredRows;
    }

    return [...columnFilteredRows].sort((rowA, rowB) => {
      for (const sort of sorting) {
        const column = columns.find(col => col.id === sort.id);
        if (!column || column.enableSorting === false) continue;
        
        const sortingFn = getSortingFn(column);
        const result = sortingFn(rowA, rowB, sort.id);
        
        if (result !== 0) {
          return sort.desc ? -result : result;
        }
      }
      
      return 0;
    });
  }, [columnFilteredRows, sorting, columns, enableSorting]);

  // Apply grouping
  const groupedRows = useMemo(() => {
    if (!enableGrouping || grouping.columnIds.length === 0) {
      return sortedRows;
    }

    // TODO: Implement row grouping logic
    // For now, return sorted rows as-is
    return sortedRows;
  }, [sortedRows, grouping, enableGrouping]);

  // Apply expansion (for grouped rows)
  const expandedRows = useMemo(() => {
    if (!enableGrouping) {
      return groupedRows;
    }

    // TODO: Implement row expansion logic
    // For now, return grouped rows as-is
    return groupedRows;
  }, [groupedRows, expanded, enableGrouping]);

  // Apply pagination
  const paginatedRows = useMemo(() => {
    if (!enablePagination || !pagination) {
      return expandedRows;
    }

    const { pageIndex, pageSize } = pagination;
    const startIndex = pageIndex * pageSize;
    const endIndex = startIndex + pageSize;
    
    return expandedRows.slice(startIndex, endIndex);
  }, [expandedRows, pagination, enablePagination]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => {
    if (!enablePagination || !pagination) {
      return null;
    }

    const totalRows = expandedRows.length;
    const { pageIndex, pageSize } = pagination;
    const totalPages = Math.ceil(totalRows / pageSize);
    const canPreviousPage = pageIndex > 0;
    const canNextPage = pageIndex < totalPages - 1;
    const startRow = pageIndex * pageSize + 1;
    const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

    return {
      totalRows,
      totalPages,
      canPreviousPage,
      canNextPage,
      startRow,
      endRow,
      pageIndex,
      pageSize,
    };
  }, [expandedRows.length, pagination, enablePagination]);

  // Selection utilities
  const getSelectedRowCount = useCallback((selection: Record<string, boolean>) => {
    return Object.values(selection).filter(Boolean).length;
  }, []);

  const getSelectedRows = useCallback((selection: Record<string, boolean>) => {
    return expandedRows.filter(row => selection[row.id]);
  }, [expandedRows]);

  const isAllRowsSelected = useCallback((selection: Record<string, boolean>) => {
    return expandedRows.length > 0 && expandedRows.every(row => selection[row.id]);
  }, [expandedRows]);

  const isSomeRowsSelected = useCallback((selection: Record<string, boolean>) => {
    const selectedCount = getSelectedRowCount(selection);
    return selectedCount > 0 && selectedCount < expandedRows.length;
  }, [expandedRows.length, getSelectedRowCount]);

  return {
    // Processed data
    rows: paginatedRows,
    allRows: expandedRows,
    
    // Row counts at each stage
    totalRows: baseRows.length,
    filteredRows: columnFilteredRows.length,
    
    // Pagination
    paginationInfo,
    
    // Selection utilities
    getSelectedRowCount,
    getSelectedRows,
    isAllRowsSelected,
    isSomeRowsSelected,
  };
}

// Helper function to create a row object
function createRow<T>(data: T, index: number, columns: Column<T>[]): Row<T> {
  const cells = columns.map(column => createCell(data, column, index));
  
  const row: Row<T> = {
    id: String(index),
    index,
    original: data,
    depth: 0,
    subRows: [],
    getValue: (columnId: string) => {
      const cell = cells.find(c => c.column.id === columnId);
      return cell ? cell.value : undefined;
    },
    getAllCells: () => cells,
    getIsSelected: () => false, // Will be updated by selection logic
    getIsExpanded: () => false, // Will be updated by expansion logic
    getCanExpand: () => false, // Will be updated based on grouping
    toggleSelected: () => {}, // Will be implemented by parent component
    toggleExpanded: () => {}, // Will be implemented by parent component
  };

  // Update cells with row reference
  cells.forEach(cell => {
    cell.row = row;
  });

  return row;
}

// Helper function to create a cell object
function createCell<T>(data: T, column: Column<T>, rowIndex: number): Cell<T> {
  const getValue = () => {
    if (typeof data === 'object' && data != null) {
      return (data as any)[column.accessorKey];
    }
    return data;
  };

  const cell: Cell<T> = {
    id: `${rowIndex}-${column.id}`,
    value: getValue(),
    row: {} as Row<T>, // Will be set by createRow
    column,
    getContext: () => ({
      getValue,
      row: cell.row,
      column,
      cell,
      table: {} as any, // Will be provided by parent component
    }),
  };

  return cell;
}

// Hook for managing table performance
export function useTablePerformance<T>(
  rows: Row<T>[],
  options: {
    enableVirtualization?: boolean;
    overscan?: number;
    estimateSize?: number;
    measureDynamicSize?: boolean;
    prefetchRows?: number;
  } = {}
) {
  const {
    enableVirtualization = true,
    overscan = 5,
    estimateSize = 50,
    measureDynamicSize = false,
    prefetchRows = 10,
  } = options;

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    const totalRows = rows.length;
    const shouldVirtualize = enableVirtualization && totalRows > 100;
    const estimatedHeight = totalRows * estimateSize;
    const memoryUsage = totalRows * 0.1; // Rough estimate in KB

    return {
      totalRows,
      shouldVirtualize,
      estimatedHeight,
      memoryUsage,
      overscan: shouldVirtualize ? overscan : 0,
      prefetchRows: Math.min(prefetchRows, totalRows),
    };
  }, [rows.length, enableVirtualization, estimateSize, overscan, prefetchRows]);

  // Row measurement cache
  const rowMeasurements = useMemo(() => {
    if (!measureDynamicSize) {
      return new Map<string, number>();
    }

    // Initialize with estimated sizes
    const measurements = new Map<string, number>();
    rows.forEach(row => {
      measurements.set(row.id, estimateSize);
    });

    return measurements;
  }, [rows, measureDynamicSize, estimateSize]);

  const measureRow = useCallback((rowId: string, height: number) => {
    if (measureDynamicSize) {
      rowMeasurements.set(rowId, height);
    }
  }, [measureDynamicSize, rowMeasurements]);

  const getRowSize = useCallback((rowId: string) => {
    return rowMeasurements.get(rowId) || estimateSize;
  }, [rowMeasurements, estimateSize]);

  return {
    performanceMetrics,
    measureRow,
    getRowSize,
    rowMeasurements,
  };
}