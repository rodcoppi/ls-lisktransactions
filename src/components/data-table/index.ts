// Main components
export { DataTable as default, DataTable } from './DataTable';
export { VirtualizedTable, VirtualizedRow, useVirtualizer } from './VirtualizedTable';
export { TableHeader, SortIndicator, FilterInput } from './TableHeader';
export { 
  TableCell, 
  NumericCell, 
  DateCell, 
  StatusCell, 
  ImageCell, 
  LinkCell, 
  ProgressCell, 
  TagsCell 
} from './TableCell';
export { MobileView, useMobile, getMobileTableConfig } from './MobileView';
export { 
  SelectionActions, 
  RowActionsMenu, 
  BulkActionsToolbar, 
  SelectionCheckbox,
  defaultBulkActions,
  defaultRowActions
} from './SelectionActions';

// Accessibility components
export {
  AriaLiveRegion,
  useScreenReaderAnnouncements,
  useFocusManagement,
  generateAriaAttributes,
  TableDescription,
  SkipToTableLink,
  useHighContrastMode,
  useReducedMotion,
  getContrastRatio,
  validateTableAccessibility,
  defaultAccessibilityConfig,
  AccessibleSortButton,
  AccessibleRow
} from './Accessibility';

// Hooks
export {
  useTableState,
  useTableData,
  useTablePerformance,
  useTableKeyboard,
  useTableSelection,
  useTableVirtualization
} from './hooks';

// Types
export type {
  // Core types
  Column,
  Row,
  Cell,
  DataTableProps,
  CellProps,
  HeaderGroup,
  Header,
  HeaderContext,
  
  // State types
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
  TableState,
  
  // Feature types
  BulkAction,
  TableAction,
  ExportFormat,
  ExportOptions,
  FilterOption,
  ViewMode,
  SortDirection,
  FilterType,
  ColumnAlignment,
  
  // Virtualization types
  VirtualizerOptions,
  VirtualizerInstance,
  VirtualItem,
  
  // Configuration types
  MobileConfig,
  AccessibilityConfig,
  PerformanceConfig,
} from './types';

// Utilities
export {
  // Sorting utilities
  getSortingFn,
  
  // Filtering utilities
  getGlobalFilterFn,
  getColumnFilterFn,
  
  // Column utilities
  getColumnSize,
  getTotalSize,
  
  // Virtual scrolling utilities
  getVirtualRange,
  getVirtualItems,
  
  // Export utilities
  formatCellValue,
  generateCSV,
  generateJSON,
  
  // Performance utilities
  debounce,
  throttle,
  
  // Accessibility utilities
  getAriaSort,
  generateAccessibleId,
  
  // Mobile utilities
  isMobileDevice,
  getSwipeDirection,
  
  // Data transformation utilities
  flattenData,
  generateSampleData,
  
  // Validation utilities
  validateTableData,
} from '@/lib/table-utils';

// Export utilities
export {
  // CSV export
  exportToCSV,
  downloadCSV,
  parseCSV,
  
  // JSON export
  exportToJSON,
  createJSONExport,
  downloadJSON,
  parseJSONExport,
  convertJSONToTableData,
  
  // PDF export
  exportToPDF,
  downloadPDF,
  generateAdvancedPDF,
  estimateTableDimensions,
  
  // Excel export
  exportToExcel,
  downloadExcel,
  createWorkbookWithMultipleSheets,
  addChartsToWorkbook,
  
  // Unified export
  exportData,
  batchExport,
  ExportProgress,
  exportDataWithProgress,
  getExportFormats,
  validateExportOptions,
  estimateExportSize,
} from '@/lib/export';

// Column factory functions
export function createColumn<T>(options: Partial<Column<T>> & { 
  id: string; 
  accessorKey: string; 
  header: string | React.ReactNode;
}): Column<T> {
  return {
    size: 150,
    minSize: 50,
    maxSize: Number.MAX_SAFE_INTEGER,
    enableSorting: true,
    enableFiltering: true,
    enableColumnFilter: true,
    enableGlobalFilter: true,
    align: 'left',
    sticky: false,
    pinned: false,
    visible: true,
    resizable: true,
    ...options,
  };
}

export function createSelectColumn<T>(): Column<T> {
  return createColumn<T>({
    id: 'select',
    accessorKey: '_select',
    header: '',
    size: 40,
    enableSorting: false,
    enableFiltering: false,
    cell: ({ row }) => (
      <SelectionCheckbox
        checked={row.getIsSelected()}
        onChange={(checked) => row.toggleSelected(checked)}
        aria-label="Select row"
      />
    ),
  });
}

export function createActionsColumn<T>(actions: TableAction<T>[]): Column<T> {
  return createColumn<T>({
    id: 'actions',
    accessorKey: '_actions',
    header: 'Actions',
    size: 80,
    enableSorting: false,
    enableFiltering: false,
    cell: ({ row }) => (
      <RowActionsMenu row={row} actions={actions} />
    ),
  });
}

export function createExpandColumn<T>(): Column<T> {
  return createColumn<T>({
    id: 'expand',
    accessorKey: '_expand',
    header: '',
    size: 40,
    enableSorting: false,
    enableFiltering: false,
    cell: ({ row }) => (
      <button
        onClick={() => row.toggleExpanded()}
        disabled={!row.getCanExpand()}
        className="p-1 hover:bg-muted rounded"
      >
        {row.getIsExpanded() ? '−' : '+'}
      </button>
    ),
  });
}

// Default configurations
export const defaultTableConfig = {
  enableVirtualization: true,
  estimateSize: 50,
  overscan: 5,
  enableSorting: true,
  enableMultiSort: true,
  enableFiltering: true,
  enableColumnFilters: true,
  enableGlobalFilter: true,
  enableRowSelection: true,
  enableMultiRowSelection: true,
  enableColumnResizing: true,
  enableColumnOrdering: true,
  enableColumnPinning: true,
  enableExport: true,
  enableMobile: true,
  mobileBreakpoint: 768,
};

// Performance presets
export const performancePresets = {
  small: {
    enableVirtualization: false,
    estimateSize: 40,
    overscan: 3,
  },
  medium: {
    enableVirtualization: true,
    estimateSize: 50,
    overscan: 5,
  },
  large: {
    enableVirtualization: true,
    estimateSize: 60,
    overscan: 10,
  },
  extraLarge: {
    enableVirtualization: true,
    estimateSize: 50,
    overscan: 15,
  },
};