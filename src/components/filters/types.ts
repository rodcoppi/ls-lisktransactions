// Filter system type definitions

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export interface FilterValue {
  id: string;
  value: any;
  operator: FilterOperator;
  type: FilterType;
}

export enum FilterType {
  TEXT = 'text',
  NUMBER = 'number',
  DATE = 'date',
  DATE_RANGE = 'date_range',
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  BOOLEAN = 'boolean',
  RANGE = 'range',
  TAG = 'tag'
}

export enum FilterOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  GREATER_THAN = 'greater_than',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN = 'less_than',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
  IN = 'in',
  NOT_IN = 'not_in',
  IS_NULL = 'is_null',
  IS_NOT_NULL = 'is_not_null'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or'
}

export interface FilterCondition {
  id: string;
  field: string;
  operator: FilterOperator;
  value: any;
  type: FilterType;
  enabled: boolean;
}

export interface FilterGroup {
  id: string;
  name?: string;
  conditions: FilterCondition[];
  operator: LogicalOperator;
  enabled: boolean;
  groups?: FilterGroup[];
}

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: FilterGroup[];
  isDefault?: boolean;
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface FilterConfig {
  field: string;
  label: string;
  type: FilterType;
  operators: FilterOperator[];
  options?: SelectOption[];
  placeholder?: string;
  validation?: FilterValidation;
  searchable?: boolean;
  multiple?: boolean;
}

export interface SelectOption {
  value: any;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface FilterValidation {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: string;
  custom?: (value: any) => boolean | string;
}

export interface FilterState {
  groups: FilterGroup[];
  activePreset?: string;
  searchQuery?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FilterAction {
  type: FilterActionType;
  payload?: any;
}

export enum FilterActionType {
  ADD_GROUP = 'ADD_GROUP',
  REMOVE_GROUP = 'REMOVE_GROUP',
  UPDATE_GROUP = 'UPDATE_GROUP',
  ADD_CONDITION = 'ADD_CONDITION',
  REMOVE_CONDITION = 'REMOVE_CONDITION',
  UPDATE_CONDITION = 'UPDATE_CONDITION',
  TOGGLE_GROUP = 'TOGGLE_GROUP',
  TOGGLE_CONDITION = 'TOGGLE_CONDITION',
  SET_PRESET = 'SET_PRESET',
  CLEAR_FILTERS = 'CLEAR_FILTERS',
  SET_SEARCH = 'SET_SEARCH',
  SET_SORT = 'SET_SORT',
  SET_PAGINATION = 'SET_PAGINATION'
}

export interface DatePreset {
  id: string;
  label: string;
  getValue: () => DateRange;
  shortcut?: string;
}

export interface FilterResult {
  filters: FilterState;
  isLoading: boolean;
  hasActiveFilters: boolean;
  filteredCount?: number;
  totalCount?: number;
}

export interface UrlState {
  filters?: string;
  preset?: string;
  search?: string;
  sort?: string;
  page?: string;
  limit?: string;
}

export interface FilterContext {
  filters: FilterState;
  dispatch: (action: FilterAction) => void;
  configs: FilterConfig[];
  presets: FilterPreset[];
  applyFilters: (filters: FilterState) => void;
  savePreset: (preset: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deletePreset: (presetId: string) => void;
  loadPreset: (presetId: string) => void;
  clearFilters: () => void;
  exportFilters: () => string;
  importFilters: (data: string) => void;
}