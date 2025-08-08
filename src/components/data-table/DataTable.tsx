'use client';

import React, { useMemo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { 
  DataTableProps, 
  ExportFormat, 
  ViewMode,
  Row,
  Column,
  HeaderGroup,
} from './types';

// Import components
import { TableHeader } from './TableHeader';
import { VirtualizedTable, VirtualizedRow } from './VirtualizedTable';
import { MobileView, useMobile } from './MobileView';
import { SelectionActions } from './SelectionActions';

// Import hooks
import { 
  useTableState, 
  useTableData, 
  useTableKeyboard, 
  useTableSelection,
} from './hooks';

// Import utilities
import { exportData } from '@/lib/export';
import { validateTableData } from '@/lib/table-utils';

export function DataTable<T>({
  data,
  columns,
  // State management
  state: externalState,
  onStateChange,
  // Virtualization
  enableVirtualization = true,
  estimateSize = 50,
  overscan = 5,
  // Features
  enableSorting = true,
  enableMultiSort = true,
  enableFiltering = true,
  enableColumnFilters = true,
  enableGlobalFilter = true,
  enableGrouping = false,
  enableExpanding = false,
  enableRowSelection = true,
  enableMultiRowSelection = true,
  enableColumnResizing = true,
  enableColumnOrdering = true,
  enableColumnPinning = true,
  enablePagination = false,
  // Export
  enableExport = true,
  exportOptions,
  // Actions
  bulkActions = [],
  rowActions = [],
  // Mobile
  enableMobile = true,
  mobileBreakpoint = 768,
  cardRenderer,
  // Styling
  className,
  headerClassName,
  rowClassName,
  cellClassName,
  // Events
  onRowClick,
  onRowDoubleClick,
  onCellClick,
  onKeyDown,
  // Loading states
  loading = false,
  loadingComponent,
  // Empty state
  emptyComponent,
  // Error state
  error,
  errorComponent,
  // Performance
  debugTable = false,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobile(mobileBreakpoint);

  // Validate data and columns
  const validation = useMemo(() => {
    return validateTableData(data, columns);
  }, [data, columns]);

  // Initialize table state
  const {
    state,
    updateSorting,
    updateColumnFilters,
    updateColumnSizing,
    updateColumnOrder,
    updateColumnPinning,
    updateColumnVisibility,
    updatePagination,
    updateRowSelection,
    updateGlobalFilter,
    resetSorting,
    resetFilters,
    resetSelection,
    selectAllRows,
    nextPage,
    previousPage,
    setPageIndex,
    setPageSize,
  } = useTableState({
    data,
    columns,
    initialState: externalState,
    onStateChange,
    enablePagination,
    enableSelection: enableRowSelection,
    enableSorting,
    enableFiltering,
  });

  // Process table data
  const {
    rows,
    allRows,
    totalRows,
    filteredRows,
    paginationInfo,
    getSelectedRowCount,
    getSelectedRows,
    isAllRowsSelected,
    isSomeRowsSelected,
  } = useTableData({
    data,
    columns,
    sorting: state.sorting,
    columnFilters: state.columnFilters,
    globalFilter: state.globalFilter,
    grouping: state.grouping,
    expanded: state.expanded,
    pagination: state.pagination,
    enableSorting,
    enableFiltering,
    enableGrouping,
    enablePagination,
  });

  // Handle row selection
  const {
    selectedRows,
    selectedRowCount,
    toggleAllRowsSelection,
    clearSelection,
    invertSelection,
  } = useTableSelection({
    rows: allRows,
    rowSelection: state.rowSelection,
    onRowSelectionChange: updateRowSelection,
    enableMultiRowSelection,
  });

  // Handle keyboard navigation
  const { handleKeyDown: handleTableKeyDown } = useTableKeyboard({
    rows,
    onRowSelect: (row) => {
      if (enableRowSelection) {
        updateRowSelection({
          ...state.rowSelection,
          [row.id]: !state.rowSelection[row.id],
        });
      }
    },
    onRowActivate: onRowClick,
    enableMultiSelect: enableMultiRowSelection,
  });

  // Create header groups (simplified for this implementation)
  const headerGroups: HeaderGroup<T>[] = useMemo(() => {
    const visibleColumns = columns.filter(col => 
      state.columnVisibility[col.id] !== false
    );

    // Sort columns based on column order
    const orderedColumns = state.columnOrder.columnIds
      .map(id => visibleColumns.find(col => col.id === id))
      .filter(Boolean) as Column<T>[];

    // Add any columns not in the order
    const unorderedColumns = visibleColumns.filter(col => 
      !state.columnOrder.columnIds.includes(col.id)
    );

    const finalColumns = [...orderedColumns, ...unorderedColumns];

    return [{
      id: 'header-group-0',
      depth: 0,
      headers: finalColumns.map((column, index) => ({
        id: `header-${column.id}`,
        index,
        depth: 0,
        column,
        headerGroup: {} as HeaderGroup<T>,
        subHeaders: [],
        colSpan: 1,
        rowSpan: 1,
        getSize: () => state.columnSizing[column.id] || column.size || 150,
        getStart: () => {
          let start = 0;
          for (let i = 0; i < index; i++) {
            const prevCol = finalColumns[i];
            start += state.columnSizing[prevCol.id] || prevCol.size || 150;
          }
          return start;
        },
        getResizeHandler: () => (event: React.MouseEvent) => {
          // Resize handler implementation
          console.log('Resize handler', event);
        },
        getContext: () => ({
          table: {} as any,
          header: {} as any,
          column,
        }),
      })),
    }];
  }, [columns, state.columnVisibility, state.columnOrder, state.columnSizing]);

  const visibleColumns = useMemo(() => {
    return headerGroups[0]?.headers.map(h => h.column) || [];
  }, [headerGroups]);

  // Handle export
  const handleExport = useCallback((format: ExportFormat, selectedOnly: boolean = false) => {
    if (!enableExport) return;

    const exportRows = selectedOnly ? selectedRows : allRows;
    exportData(exportRows, visibleColumns, format, {
      ...exportOptions,
      download: true,
      selectedRowsOnly: selectedOnly,
    });
  }, [enableExport, selectedRows, allRows, visibleColumns, exportOptions]);

  // Handle global filter
  const handleGlobalFilterChange = useCallback((value: string) => {
    updateGlobalFilter(value);
  }, [updateGlobalFilter]);

  // Handle bulk actions
  const handleBulkAction = useCallback((actionId: string, rows: Row<T>[]) => {
    const action = bulkActions.find(a => a.id === actionId);
    if (action) {
      action.action(rows);
    }
  }, [bulkActions]);

  // Render loading state
  if (loading) {
    return (
      <div className={cn('data-table-container', className)}>
        {loadingComponent || (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={cn('data-table-container', className)}>
        {errorComponent || (
          <div className="flex items-center justify-center h-64">
            <div className="text-destructive">
              {typeof error === 'string' ? error : 'An error occurred'}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render validation errors
  if (!validation.isValid) {
    return (
      <div className={cn('data-table-container', className)}>
        <div className="p-4 border border-destructive rounded-md">
          <h3 className="text-destructive font-medium mb-2">Table Configuration Error</h3>
          <ul className="list-disc list-inside text-sm text-destructive">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <div className={cn('data-table-container', className)}>
        {emptyComponent || (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">No data available</div>
          </div>
        )}
      </div>
    );
  }

  // Mobile view
  if (enableMobile && isMobile) {
    return (
      <div className={cn('data-table-container', className)} ref={containerRef}>
        <MobileView
          rows={rows}
          columns={visibleColumns}
          rowSelection={state.rowSelection}
          globalFilter={state.globalFilter}
          onRowSelectionChange={updateRowSelection}
          onGlobalFilterChange={handleGlobalFilterChange}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
          bulkActions={bulkActions}
          rowActions={rowActions}
          enableSelection={enableRowSelection}
          enableSearch={enableGlobalFilter}
          cardRenderer={cardRenderer}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div
      className={cn('data-table-container w-full', className)}
      ref={containerRef}
      onKeyDown={(e) => {
        handleTableKeyDown(e as any);
        onKeyDown?.(e);
      }}
    >
      {/* Selection Actions Bar */}
      {enableRowSelection && selectedRowCount > 0 && (
        <SelectionActions
          selectedRows={selectedRows}
          totalRows={allRows.length}
          rowSelection={state.rowSelection}
          onRowSelectionChange={updateRowSelection}
          bulkActions={bulkActions}
          onExport={enableExport ? handleExport : undefined}
          onSelectAll={() => selectAllRows(allRows)}
          onClearSelection={clearSelection}
          onInvertSelection={invertSelection}
        />
      )}

      {/* Main Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Table Header */}
        <TableHeader
          headerGroups={headerGroups}
          sorting={state.sorting}
          columnFilters={state.columnFilters}
          columnSizing={state.columnSizing}
          columnOrder={state.columnOrder}
          columnPinning={state.columnPinning}
          onSortingChange={updateSorting}
          onColumnFiltersChange={updateColumnFilters}
          onColumnSizingChange={updateColumnSizing}
          onColumnOrderChange={updateColumnOrder}
          onColumnPinningChange={updateColumnPinning}
          onColumnVisibilityChange={updateColumnVisibility}
          enableSorting={enableSorting}
          enableFiltering={enableColumnFilters}
          enableResizing={enableColumnResizing}
          enableOrdering={enableColumnOrdering}
          enablePinning={enableColumnPinning}
          className={headerClassName}
        />

        {/* Table Body */}
        {enableVirtualization && rows.length > 100 ? (
          <VirtualizedTable
            rows={rows}
            visibleColumns={visibleColumns}
            columnSizing={state.columnSizing}
            estimateSize={estimateSize}
            overscan={overscan}
            height={600} // Default height, should be configurable
            renderRow={(virtualItem, row) => (
              <VirtualizedRow
                row={row}
                columns={visibleColumns}
                columnSizing={state.columnSizing}
                cellClassName={cellClassName}
                onCellClick={onCellClick}
              />
            )}
            rowClassName={rowClassName}
            cellClassName={cellClassName}
            onRowClick={onRowClick}
            onRowDoubleClick={onRowDoubleClick}
            onCellClick={onCellClick}
          />
        ) : (
          <div className="table-body">
            {rows.map((row) => (
              <div
                key={row.id}
                className={cn(
                  'flex border-b border-border hover:bg-muted/50 transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
                  state.rowSelection[row.id] && 'bg-primary/5 border-primary/20',
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                )}
                onClick={(e) => onRowClick?.(row, e)}
                onDoubleClick={(e) => onRowDoubleClick?.(row, e)}
                tabIndex={0}
                role="row"
              >
                <VirtualizedRow
                  row={row}
                  columns={visibleColumns}
                  columnSizing={state.columnSizing}
                  cellClassName={cellClassName}
                  onCellClick={onCellClick}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {enablePagination && paginationInfo && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {paginationInfo.startRow} to {paginationInfo.endRow} of {paginationInfo.totalRows} results
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={previousPage}
              disabled={!paginationInfo.canPreviousPage}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm">
              Page {paginationInfo.pageIndex + 1} of {paginationInfo.totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={!paginationInfo.canNextPage}
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Debug Information */}
      {debugTable && (
        <div className="mt-4 p-4 bg-muted rounded-lg text-xs">
          <h4 className="font-semibold mb-2">Debug Information</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div>Total Rows: {totalRows}</div>
              <div>Filtered Rows: {filteredRows}</div>
              <div>Selected Rows: {selectedRowCount}</div>
              <div>Visible Columns: {visibleColumns.length}</div>
            </div>
            <div>
              <div>Sorting: {state.sorting.length > 0 ? 'Yes' : 'No'}</div>
              <div>Filtering: {state.columnFilters.length > 0 || state.globalFilter.value ? 'Yes' : 'No'}</div>
              <div>Virtualization: {enableVirtualization && rows.length > 100 ? 'Yes' : 'No'}</div>
              <div>Mobile: {isMobile ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export default with proper typing
export default DataTable;

// Re-export types for convenience
export type { DataTableProps, Column, Row, Cell, ExportFormat, BulkAction, TableAction };
export { defaultBulkActions, defaultRowActions } from './SelectionActions';
export * from './TableCell';