'use client';

import { useReducer, useCallback, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FilterState, 
  FilterAction, 
  FilterActionType, 
  FilterGroup, 
  FilterCondition, 
  FilterPreset,
  FilterConfig,
  LogicalOperator 
} from '@/components/filters/types';

// Initial state
const initialState: FilterState = {
  groups: [],
  activePreset: undefined,
  searchQuery: '',
  sortBy: undefined,
  sortOrder: 'asc',
  page: 1,
  limit: 20
};

// Filter reducer
const filterReducer = (state: FilterState, action: FilterAction): FilterState => {
  switch (action.type) {
    case FilterActionType.ADD_GROUP:
      return {
        ...state,
        groups: [
          ...state.groups,
          {
            id: action.payload.id || `group-${Date.now()}`,
            name: action.payload.name,
            conditions: [],
            operator: LogicalOperator.AND,
            enabled: true,
            groups: []
          }
        ]
      };

    case FilterActionType.REMOVE_GROUP:
      return {
        ...state,
        groups: state.groups.filter(group => group.id !== action.payload.groupId)
      };

    case FilterActionType.UPDATE_GROUP:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId 
            ? { ...group, ...action.payload.updates }
            : group
        )
      };

    case FilterActionType.ADD_CONDITION:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? {
                ...group,
                conditions: [
                  ...group.conditions,
                  {
                    id: action.payload.condition.id || `condition-${Date.now()}`,
                    ...action.payload.condition,
                    enabled: true
                  }
                ]
              }
            : group
        )
      };

    case FilterActionType.REMOVE_CONDITION:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? {
                ...group,
                conditions: group.conditions.filter(
                  condition => condition.id !== action.payload.conditionId
                )
              }
            : group
        )
      };

    case FilterActionType.UPDATE_CONDITION:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? {
                ...group,
                conditions: group.conditions.map(condition =>
                  condition.id === action.payload.conditionId
                    ? { ...condition, ...action.payload.updates }
                    : condition
                )
              }
            : group
        )
      };

    case FilterActionType.TOGGLE_GROUP:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? { ...group, enabled: !group.enabled }
            : group
        )
      };

    case FilterActionType.TOGGLE_CONDITION:
      return {
        ...state,
        groups: state.groups.map(group => 
          group.id === action.payload.groupId
            ? {
                ...group,
                conditions: group.conditions.map(condition =>
                  condition.id === action.payload.conditionId
                    ? { ...condition, enabled: !condition.enabled }
                    : condition
                )
              }
            : group
        )
      };

    case FilterActionType.SET_PRESET:
      return {
        ...state,
        activePreset: action.payload.presetId,
        groups: action.payload.filters?.groups || state.groups
      };

    case FilterActionType.CLEAR_FILTERS:
      return {
        ...initialState,
        limit: state.limit
      };

    case FilterActionType.SET_SEARCH:
      return {
        ...state,
        searchQuery: action.payload.query,
        page: 1 // Reset page when searching
      };

    case FilterActionType.SET_SORT:
      return {
        ...state,
        sortBy: action.payload.sortBy,
        sortOrder: action.payload.sortOrder,
        page: 1 // Reset page when sorting
      };

    case FilterActionType.SET_PAGINATION:
      return {
        ...state,
        page: action.payload.page !== undefined ? action.payload.page : state.page,
        limit: action.payload.limit !== undefined ? action.payload.limit : state.limit
      };

    default:
      return state;
  }
};

// URL serialization helpers
const serializeFilters = (filters: FilterState): string => {
  try {
    return btoa(JSON.stringify(filters));
  } catch {
    return '';
  }
};

const deserializeFilters = (serialized: string): FilterState => {
  try {
    return JSON.parse(atob(serialized));
  } catch {
    return initialState;
  }
};

interface UseFiltersOptions {
  configs?: FilterConfig[];
  presets?: FilterPreset[];
  syncWithUrl?: boolean;
  debounceMs?: number;
  onFiltersChange?: (filters: FilterState) => void;
}

export const useFilters = (options: UseFiltersOptions = {}) => {
  const {
    configs = [],
    presets = [],
    syncWithUrl = true,
    debounceMs = 300,
    onFiltersChange
  } = options;

  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize state from URL if available
  const [filters, dispatch] = useReducer(filterReducer, initialState, (initial) => {
    if (!syncWithUrl) return initial;
    
    const urlFilters = searchParams.get('filters');
    const urlPreset = searchParams.get('preset');
    const urlSearch = searchParams.get('search');
    const urlSort = searchParams.get('sort');
    const urlPage = searchParams.get('page');
    const urlLimit = searchParams.get('limit');

    let state = initial;

    if (urlFilters) {
      state = { ...state, ...deserializeFilters(urlFilters) };
    }

    if (urlPreset) {
      state = { ...state, activePreset: urlPreset };
    }

    if (urlSearch) {
      state = { ...state, searchQuery: urlSearch };
    }

    if (urlSort) {
      const [sortBy, sortOrder = 'asc'] = urlSort.split(',');
      state = { ...state, sortBy, sortOrder: sortOrder as 'asc' | 'desc' };
    }

    if (urlPage) {
      state = { ...state, page: parseInt(urlPage, 10) || 1 };
    }

    if (urlLimit) {
      state = { ...state, limit: parseInt(urlLimit, 10) || 20 };
    }

    return state;
  });

  // Debounced URL sync
  useEffect(() => {
    if (!syncWithUrl) return;

    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Update URL parameters
      if (filters.groups.length > 0 || filters.activePreset) {
        params.set('filters', serializeFilters(filters));
      } else {
        params.delete('filters');
      }

      if (filters.activePreset) {
        params.set('preset', filters.activePreset);
      } else {
        params.delete('preset');
      }

      if (filters.searchQuery) {
        params.set('search', filters.searchQuery);
      } else {
        params.delete('search');
      }

      if (filters.sortBy) {
        params.set('sort', `${filters.sortBy},${filters.sortOrder}`);
      } else {
        params.delete('sort');
      }

      if (filters.page && filters.page > 1) {
        params.set('page', filters.page.toString());
      } else {
        params.delete('page');
      }

      if (filters.limit && filters.limit !== 20) {
        params.set('limit', filters.limit.toString());
      } else {
        params.delete('limit');
      }

      const newUrl = `${window.location.pathname}?${params.toString()}`;
      if (newUrl !== window.location.pathname + window.location.search) {
        router.replace(newUrl, { scroll: false });
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [filters, router, searchParams, syncWithUrl, debounceMs]);

  // Notify of filter changes
  useEffect(() => {
    onFiltersChange?.(filters);
  }, [filters, onFiltersChange]);

  // Helper functions
  const addGroup = useCallback((name?: string) => {
    dispatch({
      type: FilterActionType.ADD_GROUP,
      payload: { name }
    });
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    dispatch({
      type: FilterActionType.REMOVE_GROUP,
      payload: { groupId }
    });
  }, []);

  const updateGroup = useCallback((groupId: string, updates: Partial<FilterGroup>) => {
    dispatch({
      type: FilterActionType.UPDATE_GROUP,
      payload: { groupId, updates }
    });
  }, []);

  const addCondition = useCallback((groupId: string, condition: Omit<FilterCondition, 'id' | 'enabled'>) => {
    dispatch({
      type: FilterActionType.ADD_CONDITION,
      payload: { groupId, condition }
    });
  }, []);

  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    dispatch({
      type: FilterActionType.REMOVE_CONDITION,
      payload: { groupId, conditionId }
    });
  }, []);

  const updateCondition = useCallback((groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    dispatch({
      type: FilterActionType.UPDATE_CONDITION,
      payload: { groupId, conditionId, updates }
    });
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    dispatch({
      type: FilterActionType.TOGGLE_GROUP,
      payload: { groupId }
    });
  }, []);

  const toggleCondition = useCallback((groupId: string, conditionId: string) => {
    dispatch({
      type: FilterActionType.TOGGLE_CONDITION,
      payload: { groupId, conditionId }
    });
  }, []);

  const loadPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      dispatch({
        type: FilterActionType.SET_PRESET,
        payload: { presetId, filters: { groups: preset.filters } }
      });
    }
  }, [presets]);

  const clearFilters = useCallback(() => {
    dispatch({ type: FilterActionType.CLEAR_FILTERS });
  }, []);

  const setSearch = useCallback((query: string) => {
    dispatch({
      type: FilterActionType.SET_SEARCH,
      payload: { query }
    });
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
    dispatch({
      type: FilterActionType.SET_SORT,
      payload: { sortBy, sortOrder }
    });
  }, []);

  const setPagination = useCallback((page?: number, limit?: number) => {
    dispatch({
      type: FilterActionType.SET_PAGINATION,
      payload: { page, limit }
    });
  }, []);

  // Export/Import functions
  const exportFilters = useCallback(() => {
    return JSON.stringify(filters, null, 2);
  }, [filters]);

  const importFilters = useCallback((data: string) => {
    try {
      const imported = JSON.parse(data);
      dispatch({
        type: FilterActionType.SET_PRESET,
        payload: { presetId: undefined, filters: imported }
      });
    } catch (error) {
      console.error('Failed to import filters:', error);
    }
  }, []);

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return filters.groups.some(group => 
      group.enabled && group.conditions.some(condition => condition.enabled)
    ) || Boolean(filters.searchQuery);
  }, [filters]);

  const activeFiltersCount = useMemo(() => {
    return filters.groups.reduce((count, group) => {
      if (!group.enabled) return count;
      return count + group.conditions.filter(condition => condition.enabled).length;
    }, 0) + (filters.searchQuery ? 1 : 0);
  }, [filters]);

  const isLoading = false; // Can be extended for async operations

  return {
    filters,
    dispatch,
    configs,
    presets,
    hasActiveFilters,
    activeFiltersCount,
    isLoading,
    
    // Group operations
    addGroup,
    removeGroup,
    updateGroup,
    toggleGroup,
    
    // Condition operations
    addCondition,
    removeCondition,
    updateCondition,
    toggleCondition,
    
    // Preset operations
    loadPreset,
    clearFilters,
    
    // Search and sorting
    setSearch,
    setSort,
    setPagination,
    
    // Import/Export
    exportFilters,
    importFilters
  };
};

export type UseFiltersReturn = ReturnType<typeof useFilters>;