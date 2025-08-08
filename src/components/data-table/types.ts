import { ReactNode, MouseEvent, KeyboardEvent } from 'react';

export type SortDirection = 'asc' | 'desc' | null;
export type FilterType = 'text' | 'number' | 'date' | 'select' | 'boolean';
export type ColumnAlignment = 'left' | 'center' | 'right';
export type ExportFormat = 'csv' | 'excel' | 'pdf' | 'json';
export type ViewMode = 'table' | 'card';

export interface Column<T = any> {
  id: string;
  accessorKey: string;
  header: string | ReactNode;
  cell?: (props: CellProps<T>) => ReactNode;
  size?: number;
  minSize?: number;
  maxSize?: number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnFilter?: boolean;
  enableGlobalFilter?: boolean;
  sortingFn?: (rowA: Row<T>, rowB: Row<T>, columnId: string) => number;
  filterFn?: (row: Row<T>, columnId: string, filterValue: any) => boolean;
  aggregationFn?: (columnId: string, leafRows: Row<T>[], childRows: Row<T>[]) => any;
  aggregatedCell?: (props: CellProps<T>) => ReactNode;
  footer?: string | ReactNode | ((props: { table: DataTable<T> }) => ReactNode);
  align?: ColumnAlignment;
  sticky?: 'left' | 'right' | false;
  pinned?: boolean;
  visible?: boolean;
  resizable?: boolean;
  meta?: Record<string, any>;
}

export interface CellProps<T = any> {
  getValue: () => any;
  row: Row<T>;
  column: Column<T>;
  cell: Cell<T>;
  table: DataTable<T>;
}

export interface Cell<T = any> {
  id: string;
  value: any;
  row: Row<T>;
  column: Column<T>;
  getContext: () => CellProps<T>;
}

export interface Row<T = any> {
  id: string;
  index: number;
  original: T;
  depth: number;
  subRows: Row<T>[];
  parentRow?: Row<T>;
  getValue: (columnId: string) => any;
  getAllCells: () => Cell<T>[];
  getIsSelected: () => boolean;
  getIsExpanded: () => boolean;
  getCanExpand: () => boolean;
  toggleSelected: (value?: boolean) => void;
  toggleExpanded: (value?: boolean) => void;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface ColumnFiltersState {
  id: string;
  value: any;
}

export interface ColumnSizingState {
  [columnId: string]: number;
}

export interface ColumnOrderState {
  columnIds: string[];
}

export interface ColumnPinningState {
  left?: string[];
  right?: string[];
}

export interface ColumnVisibilityState {
  [columnId: string]: boolean;
}

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface RowSelectionState {
  [rowId: string]: boolean;
}

export interface ExpandedState {
  [rowId: string]: boolean;
}

export interface GroupingState {
  columnIds: string[];
}

export interface GlobalFilterState {
  value: string;
  debounceMs?: number;
}

export interface TableState {
  sorting: SortingState[];
  columnFilters: ColumnFiltersState[];
  columnSizing: ColumnSizingState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  columnVisibility: ColumnVisibilityState;
  pagination: PaginationState;
  rowSelection: RowSelectionState;
  expanded: ExpandedState;
  grouping: GroupingState;
  globalFilter: GlobalFilterState;
}

export interface VirtualizerOptions {
  size: number;
  paddingStart?: number;
  paddingEnd?: number;
  scrollMargin?: number;
  gap?: number;
  indexAttribute?: string;
  initialOffset?: number;
  initialRect?: { width: number; height: number };
  observeElementRect?: (
    instance: VirtualizerInstance,
    cb: (rect: { width: number; height: number }) => void
  ) => () => void;
  observeElementOffset?: (
    instance: VirtualizerInstance,
    cb: (offset: number) => void
  ) => () => void;
  scrollToFn?: (
    offset: number,
    canSmooth: boolean,
    instance: VirtualizerInstance
  ) => void;
}

export interface VirtualizerInstance {
  scrollElement: HTMLElement | null;
  isScrolling: boolean;
  totalSize: number;
  range: { start: number; end: number } | null;
  getVirtualItems: () => VirtualItem[];
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
  scrollToOffset: (offset: number, options?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
  measureElement: (element: HTMLElement) => void;
}

export interface VirtualItem {
  key: string | number;
  index: number;
  start: number;
  end: number;
  size: number;
}

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  includeHeaders?: boolean;
  visibleColumnsOnly?: boolean;
  selectedRowsOnly?: boolean;
  customFormatter?: (value: any, column: Column, row: Row) => string;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
  };
}

export interface FilterOption {
  label: string;
  value: any;
  icon?: ReactNode;
}

export interface BulkAction<T = any> {
  id: string;
  label: string;
  icon?: ReactNode;
  action: (selectedRows: Row<T>[]) => void | Promise<void>;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export interface TableAction<T = any> {
  id: string;
  label: string;
  icon?: ReactNode;
  action: (row: Row<T>) => void | Promise<void>;
  disabled?: (row: Row<T>) => boolean;
  visible?: (row: Row<T>) => boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary';
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  // State management
  state?: Partial<TableState>;
  onStateChange?: (state: Partial<TableState>) => void;
  // Virtualization
  enableVirtualization?: boolean;
  estimateSize?: number;
  overscan?: number;
  // Features
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  enableFiltering?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalFilter?: boolean;
  enableGrouping?: boolean;
  enableExpanding?: boolean;
  enableRowSelection?: boolean;
  enableMultiRowSelection?: boolean;
  enableColumnResizing?: boolean;
  enableColumnOrdering?: boolean;
  enableColumnPinning?: boolean;
  enablePagination?: boolean;
  // Export
  enableExport?: boolean;
  exportOptions?: Partial<ExportOptions>;
  // Actions
  bulkActions?: BulkAction<T>[];
  rowActions?: TableAction<T>[];
  // Mobile
  enableMobile?: boolean;
  mobileBreakpoint?: number;
  cardRenderer?: (row: Row<T>) => ReactNode;
  // Styling
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: Row<T>) => string);
  cellClassName?: string | ((cell: Cell<T>) => string);
  // Events
  onRowClick?: (row: Row<T>, event: MouseEvent) => void;
  onRowDoubleClick?: (row: Row<T>, event: MouseEvent) => void;
  onCellClick?: (cell: Cell<T>, event: MouseEvent) => void;
  onKeyDown?: (event: KeyboardEvent) => void;
  // Loading states
  loading?: boolean;
  loadingComponent?: ReactNode;
  // Empty state
  emptyComponent?: ReactNode;
  // Error state
  error?: Error | string | null;
  errorComponent?: ReactNode;
  // Performance
  debugTable?: boolean;
  debugHeaders?: boolean;
  debugColumns?: boolean;
}

export interface DataTable<T = any> {
  // Data
  getRowModel: () => { rows: Row<T>[] };
  getPrePaginationRowModel: () => { rows: Row<T>[] };
  getFilteredRowModel: () => { rows: Row<T>[] };
  getSortedRowModel: () => { rows: Row<T>[] };
  getGroupedRowModel: () => { rows: Row<T>[] };
  getExpandedRowModel: () => { rows: Row<T>[] };
  getPaginationRowModel: () => { rows: Row<T>[] };
  // Headers
  getHeaderGroups: () => HeaderGroup<T>[];
  getFooterGroups: () => HeaderGroup<T>[];
  getFlatHeaders: () => Header<T>[];
  getLeafHeaders: () => Header<T>[];
  // Columns
  getAllColumns: () => Column<T>[];
  getAllFlatColumns: () => Column<T>[];
  getAllLeafColumns: () => Column<T>[];
  getVisibleFlatColumns: () => Column<T>[];
  getVisibleLeafColumns: () => Column<T>[];
  // State
  getState: () => TableState;
  setState: (updater: (old: TableState) => TableState) => void;
  // Selection
  getIsAllRowsSelected: () => boolean;
  getIsAllPageRowsSelected: () => boolean;
  getIsSomeRowsSelected: () => boolean;
  getIsSomePageRowsSelected: () => boolean;
  toggleAllRowsSelected: (value?: boolean) => void;
  toggleAllPageRowsSelected: (value?: boolean) => void;
  getSelectedRowModel: () => { rows: Row<T>[] };
  // Pagination
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  previousPage: () => void;
  nextPage: () => void;
  setPageIndex: (pageIndex: number) => void;
  setPageSize: (pageSize: number) => void;
  getPageCount: () => number;
  // Sorting
  toggleSorting: (columnId: string, desc?: boolean) => void;
  clearSorting: () => void;
  // Filtering
  setColumnFilters: (filters: ColumnFiltersState[]) => void;
  setGlobalFilter: (filter: string) => void;
  // Column operations
  toggleColumnVisibility: (columnId: string, value?: boolean) => void;
  resetColumnSizing: () => void;
  resetColumnOrder: () => void;
  resetColumnPinning: () => void;
}

export interface HeaderGroup<T = any> {
  id: string;
  depth: number;
  headers: Header<T>[];
}

export interface Header<T = any> {
  id: string;
  index: number;
  depth: number;
  column: Column<T>;
  headerGroup: HeaderGroup<T>;
  subHeaders: Header<T>[];
  colSpan: number;
  rowSpan: number;
  getSize: () => number;
  getStart: () => number;
  getResizeHandler: () => (event: MouseEvent) => void;
  getContext: () => HeaderContext<T>;
}

export interface HeaderContext<T = any> {
  table: DataTable<T>;
  header: Header<T>;
  column: Column<T>;
}

export interface MobileConfig {
  enabled: boolean;
  breakpoint: number;
  cardView: boolean;
  swipeActions: boolean;
  virtualKeyboard: boolean;
}

export interface AccessibilityConfig {
  enableKeyboardNavigation: boolean;
  enableScreenReader: boolean;
  announceUpdates: boolean;
  focusManagement: boolean;
  ariaLabels: {
    table?: string;
    sortButton?: string;
    filterButton?: string;
    selectRow?: string;
    selectAllRows?: string;
    expandRow?: string;
    collapseRow?: string;
    pagination?: string;
    export?: string;
  };
}

export interface PerformanceConfig {
  debounceFilter: number;
  debounceResize: number;
  throttleScroll: number;
  batchUpdates: boolean;
  memoizeCalculations: boolean;
  lazyLoading: boolean;
  prefetchRows: number;
}