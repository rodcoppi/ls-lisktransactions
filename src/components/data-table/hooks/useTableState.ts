'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  TableState,
  SortingState,
  ColumnFiltersState,
  ColumnSizingState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnVisibilityState,
  PaginationState,
  RowSelectionState,
  ExpandedState,
  GroupingState,
  GlobalFilterState,
  Column,
  Row,
  DataTableProps,
} from '../types';
import { debounce } from '@/lib/table-utils';

interface UseTableStateOptions<T> {
  data: T[];
  columns: Column<T>[];
  initialState?: Partial<TableState>;
  onStateChange?: (state: Partial<TableState>) => void;
  enablePagination?: boolean;
  pageSize?: number;
  enableSelection?: boolean;
  enableSorting?: boolean;
  enableFiltering?: boolean;
}

export function useTableState<T>({
  data,
  columns,
  initialState = {},
  onStateChange,
  enablePagination = false,
  pageSize = 50,
  enableSelection = true,
  enableSorting = true,
  enableFiltering = true,
}: UseTableStateOptions<T>) {
  // Initialize state with defaults
  const [sorting, setSorting] = useState<SortingState[]>(
    initialState.sorting || []
  );
  
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    initialState.columnFilters || []
  );
  
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(
    initialState.columnSizing || {}
  );
  
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(
    initialState.columnOrder || { columnIds: columns.map(col => col.id) }
  );
  
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    initialState.columnPinning || { left: [], right: [] }
  );
  
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>(
    initialState.columnVisibility || 
    columns.reduce((acc, col) => ({ ...acc, [col.id]: col.visible !== false }), {})
  );
  
  const [pagination, setPagination] = useState<PaginationState>(
    initialState.pagination || { pageIndex: 0, pageSize }
  );
  
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(
    initialState.rowSelection || {}
  );
  
  const [expanded, setExpanded] = useState<ExpandedState>(
    initialState.expanded || {}
  );
  
  const [grouping, setGrouping] = useState<GroupingState>(
    initialState.grouping || { columnIds: [] }
  );
  
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterState>(
    initialState.globalFilter || { value: '', debounceMs: 300 }
  );

  // Memoized state object
  const state = useMemo<TableState>(() => ({
    sorting,
    columnFilters,
    columnSizing,
    columnOrder,
    columnPinning,
    columnVisibility,
    pagination,
    rowSelection,
    expanded,
    grouping,
    globalFilter,
  }), [
    sorting,
    columnFilters,
    columnSizing,
    columnOrder,
    columnPinning,
    columnVisibility,
    pagination,
    rowSelection,
    expanded,
    grouping,
    globalFilter,
  ]);

  // State update handlers
  const updateSorting = useCallback((newSorting: SortingState[]) => {
    setSorting(newSorting);
    onStateChange?.({ sorting: newSorting });
  }, [onStateChange]);

  const updateColumnFilters = useCallback((newFilters: ColumnFiltersState) => {
    setColumnFilters(newFilters);
    // Reset pagination when filtering
    if (enablePagination) {
      setPagination(prev => ({ ...prev, pageIndex: 0 }));
    }
    onStateChange?.({ columnFilters: newFilters });
  }, [onStateChange, enablePagination]);

  const updateColumnSizing = useCallback((newSizing: ColumnSizingState) => {
    setColumnSizing(newSizing);
    onStateChange?.({ columnSizing: newSizing });
  }, [onStateChange]);

  const updateColumnOrder = useCallback((newOrder: ColumnOrderState) => {
    setColumnOrder(newOrder);
    onStateChange?.({ columnOrder: newOrder });
  }, [onStateChange]);

  const updateColumnPinning = useCallback((newPinning: ColumnPinningState) => {
    setColumnPinning(newPinning);
    onStateChange?.({ columnPinning: newPinning });
  }, [onStateChange]);

  const updateColumnVisibility = useCallback((columnId: string, visible: boolean) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnId]: visible,
    }));
    onStateChange?.({ columnVisibility: { ...columnVisibility, [columnId]: visible } });
  }, [onStateChange, columnVisibility]);

  const updatePagination = useCallback((newPagination: Partial<PaginationState>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
    onStateChange?.({ pagination: { ...pagination, ...newPagination } });
  }, [onStateChange, pagination]);

  const updateRowSelection = useCallback((newSelection: RowSelectionState) => {
    setRowSelection(newSelection);
    onStateChange?.({ rowSelection: newSelection });
  }, [onStateChange]);

  const updateExpanded = useCallback((newExpanded: ExpandedState) => {
    setExpanded(newExpanded);
    onStateChange?.({ expanded: newExpanded });
  }, [onStateChange]);

  const updateGrouping = useCallback((newGrouping: GroupingState) => {
    setGrouping(newGrouping);
    onStateChange?.({ grouping: newGrouping });
  }, [onStateChange]);

  const debouncedGlobalFilterUpdate = useCallback(
    debounce((value: string) => {
      setGlobalFilter(prev => ({ ...prev, value }));
      // Reset pagination when filtering
      if (enablePagination) {
        setPagination(prev => ({ ...prev, pageIndex: 0 }));
      }
      onStateChange?.({ globalFilter: { ...globalFilter, value } });
    }, globalFilter.debounceMs || 300),
    [onStateChange, globalFilter, enablePagination]
  );

  const updateGlobalFilter = useCallback((value: string) => {
    debouncedGlobalFilterUpdate(value);
  }, [debouncedGlobalFilterUpdate]);

  // Utility functions
  const resetSorting = useCallback(() => {
    updateSorting([]);
  }, [updateSorting]);

  const resetFilters = useCallback(() => {
    updateColumnFilters([]);
    updateGlobalFilter('');
  }, [updateColumnFilters, updateGlobalFilter]);

  const resetColumnSizing = useCallback(() => {
    updateColumnSizing({});
  }, [updateColumnSizing]);

  const resetColumnOrder = useCallback(() => {
    updateColumnOrder({ columnIds: columns.map(col => col.id) });
  }, [updateColumnOrder, columns]);

  const resetColumnPinning = useCallback(() => {
    updateColumnPinning({ left: [], right: [] });
  }, [updateColumnPinning]);

  const resetSelection = useCallback(() => {
    updateRowSelection({});
  }, [updateRowSelection]);

  const selectAllRows = useCallback((rows: Row<T>[]) => {
    const newSelection: RowSelectionState = {};
    rows.forEach(row => {
      newSelection[row.id] = true;
    });
    updateRowSelection(newSelection);
  }, [updateRowSelection]);

  const selectRow = useCallback((rowId: string, selected: boolean = true) => {
    setRowSelection(prev => ({
      ...prev,
      [rowId]: selected,
    }));
  }, []);

  const toggleRowSelection = useCallback((rowId: string) => {
    setRowSelection(prev => ({
      ...prev,
      [rowId]: !prev[rowId],
    }));
  }, []);

  // Navigation helpers
  const nextPage = useCallback(() => {
    if (enablePagination) {
      updatePagination({ pageIndex: pagination.pageIndex + 1 });
    }
  }, [enablePagination, updatePagination, pagination.pageIndex]);

  const previousPage = useCallback(() => {
    if (enablePagination) {
      updatePagination({ pageIndex: Math.max(0, pagination.pageIndex - 1) });
    }
  }, [enablePagination, updatePagination, pagination.pageIndex]);

  const setPageIndex = useCallback((pageIndex: number) => {
    if (enablePagination) {
      updatePagination({ pageIndex });
    }
  }, [enablePagination, updatePagination]);

  const setPageSize = useCallback((pageSize: number) => {
    if (enablePagination) {
      updatePagination({ pageSize, pageIndex: 0 });
    }
  }, [enablePagination, updatePagination]);

  return {
    state,
    // State updates
    updateSorting,
    updateColumnFilters,
    updateColumnSizing,
    updateColumnOrder,
    updateColumnPinning,
    updateColumnVisibility,
    updatePagination,
    updateRowSelection,
    updateExpanded,
    updateGrouping,
    updateGlobalFilter,
    // Utilities
    resetSorting,
    resetFilters,
    resetColumnSizing,
    resetColumnOrder,
    resetColumnPinning,
    resetSelection,
    selectAllRows,
    selectRow,
    toggleRowSelection,
    // Navigation
    nextPage,
    previousPage,
    setPageIndex,
    setPageSize,
  };
}