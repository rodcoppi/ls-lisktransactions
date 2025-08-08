'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Settings, 
  Check,
  Search,
  Plus,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  FilterState, 
  FilterGroup, 
  FilterCondition, 
  FilterConfig,
  FilterType,
  FilterOperator,
  LogicalOperator
} from './types';
import { DateRangePicker } from './DateRangePicker';
import { MultiSelect } from './MultiSelect';
import { RangeSlider } from './RangeSlider';
import { useFilters } from '@/hooks/use-filters';
import { FilterPresetManager } from '@/lib/filter-presets';

interface MobileFilterPanelProps {
  configs: FilterConfig[];
  className?: string;
  onFiltersChange?: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
}

const operatorLabels: { [key in FilterOperator]: string } = {
  [FilterOperator.EQUALS]: '=',
  [FilterOperator.NOT_EQUALS]: '≠',
  [FilterOperator.CONTAINS]: 'contains',
  [FilterOperator.NOT_CONTAINS]: '!contains',
  [FilterOperator.STARTS_WITH]: 'starts',
  [FilterOperator.ENDS_WITH]: 'ends',
  [FilterOperator.GREATER_THAN]: '>',
  [FilterOperator.GREATER_THAN_OR_EQUAL]: '≥',
  [FilterOperator.LESS_THAN]: '<',
  [FilterOperator.LESS_THAN_OR_EQUAL]: '≤',
  [FilterOperator.BETWEEN]: 'between',
  [FilterOperator.NOT_BETWEEN]: '!between',
  [FilterOperator.IN]: 'in',
  [FilterOperator.NOT_IN]: '!in',
  [FilterOperator.IS_NULL]: 'empty',
  [FilterOperator.IS_NOT_NULL]: '!empty'
};

export const MobileFilterPanel: React.FC<MobileFilterPanelProps> = ({
  configs,
  className = '',
  onFiltersChange,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'presets' | 'search'>('filters');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showAddCondition, setShowAddCondition] = useState<string | null>(null);

  const {
    filters,
    hasActiveFilters,
    activeFiltersCount,
    addGroup,
    removeGroup,
    updateGroup,
    toggleGroup,
    addCondition,
    removeCondition,
    updateCondition,
    toggleCondition,
    loadPreset,
    clearFilters,
    setSearch
  } = useFilters({
    configs,
    presets: FilterPresetManager.getAllPresets(),
    syncWithUrl: true,
    onFiltersChange
  });

  const presets = FilterPresetManager.getAllPresets();

  // Auto-expand groups on mobile
  useEffect(() => {
    if (isOpen && filters.groups.length > 0) {
      setExpandedGroups(new Set(filters.groups.map(g => g.id)));
    }
  }, [isOpen, filters.groups]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  }, []);

  const handleAddGroup = useCallback(() => {
    const newGroupId = `group-${Date.now()}`;
    addGroup('New Filter');
    setExpandedGroups(prev => new Set([...prev, newGroupId]));
  }, [addGroup]);

  const renderMobileConditionInput = useCallback((
    groupId: string, 
    condition: FilterCondition, 
    config: FilterConfig
  ) => {
    const commonProps = {
      disabled: !condition.enabled,
      className: 'w-full px-3 py-3 border border-gray-300 rounded-lg text-base'
    };

    switch (condition.type) {
      case FilterType.TEXT:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            placeholder={config.placeholder || 'Enter text...'}
            {...commonProps}
          />
        );

      case FilterType.NUMBER:
        return (
          <input
            type="number"
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: Number(e.target.value) })}
            placeholder={config.placeholder || 'Enter number...'}
            inputMode="numeric"
            {...commonProps}
          />
        );

      case FilterType.DATE:
        return (
          <input
            type="date"
            value={condition.value ? new Date(condition.value).toISOString().split('T')[0] : ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: new Date(e.target.value) })}
            {...commonProps}
          />
        );

      case FilterType.DATE_RANGE:
        return (
          <DateRangePicker
            value={condition.value || { from: null, to: null }}
            onChange={(range) => updateCondition(groupId, condition.id, { value: range })}
            placeholder="Select date range..."
            disabled={!condition.enabled}
            className="w-full"
          />
        );

      case FilterType.SELECT:
        return (
          <select
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            {...commonProps}
          >
            <option value="">Select option...</option>
            {config.options?.map(option => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case FilterType.MULTI_SELECT:
        return (
          <MultiSelect
            options={config.options || []}
            value={condition.value || []}
            onChange={(values) => updateCondition(groupId, condition.id, { value: values })}
            placeholder="Select options..."
            disabled={!condition.enabled}
            searchable={config.searchable}
            className="w-full"
            maxHeight={200}
          />
        );

      case FilterType.RANGE:
        const rangeValue = condition.value || [0, 100];
        return (
          <div className="p-4">
            <RangeSlider
              min={config.validation?.min || 0}
              max={config.validation?.max || 100}
              value={Array.isArray(rangeValue) ? rangeValue : [0, rangeValue]}
              onChange={(range) => updateCondition(groupId, condition.id, { value: range })}
              disabled={!condition.enabled}
              className="w-full"
              showLabels
              size="lg"
            />
          </div>
        );

      case FilterType.BOOLEAN:
        return (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => updateCondition(groupId, condition.id, { value: true })}
              className={`flex-1 px-4 py-3 rounded-lg border font-medium ${
                condition.value === true
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              disabled={!condition.enabled}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => updateCondition(groupId, condition.id, { value: false })}
              className={`flex-1 px-4 py-3 rounded-lg border font-medium ${
                condition.value === false
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300'
              }`}
              disabled={!condition.enabled}
            >
              No
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            {...commonProps}
          />
        );
    }
  }, [updateCondition]);

  const renderMobileCondition = useCallback((groupId: string, condition: FilterCondition) => {
    const config = configs.find(c => c.field === condition.field);
    if (!config) return null;

    return (
      <div key={condition.id} className={`bg-gray-50 rounded-lg p-4 ${!condition.enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => toggleCondition(groupId, condition.id)}
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              condition.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
            }`}
          >
            {condition.enabled ? <Check size={14} className="text-white" /> : null}
          </button>

          <button
            type="button"
            onClick={() => removeCondition(groupId, condition.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field</label>
            <select
              value={condition.field}
              onChange={(e) => {
                const newConfig = configs.find(c => c.field === e.target.value);
                if (newConfig) {
                  updateCondition(groupId, condition.id, {
                    field: e.target.value,
                    type: newConfig.type,
                    operator: newConfig.operators[0],
                    value: undefined
                  });
                }
              }}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              disabled={!condition.enabled}
            >
              {configs.map(config => (
                <option key={config.field} value={config.field}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(groupId, condition.id, { operator: e.target.value as FilterOperator })}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base"
              disabled={!condition.enabled}
            >
              {config.operators.map(op => (
                <option key={op} value={op}>
                  {operatorLabels[op]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Value</label>
            {renderMobileConditionInput(groupId, condition, config)}
          </div>
        </div>
      </div>
    );
  }, [configs, toggleCondition, removeCondition, updateCondition, renderMobileConditionInput]);

  const renderMobileGroup = useCallback((group: FilterGroup) => {
    const isExpanded = expandedGroups.has(group.id);

    return (
      <div key={group.id} className={`bg-white rounded-lg border border-gray-200 ${!group.enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                group.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}
            >
              {group.enabled ? <Check size={14} className="text-white" /> : null}
            </button>

            <div>
              <input
                type="text"
                value={group.name || ''}
                onChange={(e) => updateGroup(group.id, { name: e.target.value })}
                className="font-medium text-lg bg-transparent border-none outline-none focus:bg-gray-50 focus:border focus:border-blue-500 focus:rounded px-2"
                placeholder="Group name..."
                disabled={!group.enabled}
              />
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={group.operator}
                  onChange={(e) => updateGroup(group.id, { operator: e.target.value as LogicalOperator })}
                  className="text-sm px-2 py-1 border border-gray-300 rounded"
                  disabled={!group.enabled}
                >
                  <option value={LogicalOperator.AND}>Match ALL</option>
                  <option value={LogicalOperator.OR}>Match ANY</option>
                </select>
                <span className="text-sm text-gray-500">
                  {group.conditions.length} condition{group.conditions.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleGroupExpansion(group.id)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-4 space-y-4">
            {group.conditions.map(condition => renderMobileCondition(group.id, condition))}
            
            {group.conditions.length === 0 && group.enabled && (
              <div className="text-center py-8 text-gray-500">
                <Filter size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-lg">No conditions</p>
                <p className="text-sm">Add a condition to filter results</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAddCondition(group.id)}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-500"
              disabled={!group.enabled}
            >
              <Plus size={20} className="inline mr-2" />
              Add Condition
            </button>
          </div>
        )}
      </div>
    );
  }, [expandedGroups, toggleGroup, updateGroup, toggleGroupExpansion, removeGroup, renderMobileCondition]);

  const renderAddConditionModal = useCallback(() => {
    if (!showAddCondition) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
        <div className="bg-white rounded-lg w-full max-w-sm max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Add Condition</h3>
            <button
              type="button"
              onClick={() => setShowAddCondition(null)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {configs.map(config => (
              <button
                key={config.field}
                type="button"
                onClick={() => {
                  addCondition(showAddCondition, {
                    field: config.field,
                    operator: config.operators[0],
                    value: undefined,
                    type: config.type
                  });
                  setShowAddCondition(null);
                }}
                className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
              >
                <div className="font-medium">{config.label}</div>
                <div className="text-sm text-gray-500 mt-1">{config.type}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }, [showAddCondition, configs, addCondition]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={onClose} />
      
      <div className={`fixed inset-x-0 bottom-0 bg-white rounded-t-xl z-50 max-h-[90vh] overflow-hidden ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Filter size={24} />
            <div>
              <h2 className="text-xl font-semibold">Filters</h2>
              {hasActiveFilters && (
                <span className="text-sm text-blue-600">{activeFiltersCount} active</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg"
              >
                Clear
              </button>
            )}
            
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'search'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Search size={16} className="inline mr-2" />
            Search
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'filters'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Filter size={16} className="inline mr-2" />
            Filters
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'presets'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500'
            }`}
          >
            <Settings size={16} className="inline mr-2" />
            Presets
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="p-4">
              <div className="relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search across all fields..."
                  value={filters.searchQuery || ''}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg text-base"
                />
              </div>
            </div>
          )}

          {/* Filters Tab */}
          {activeTab === 'filters' && (
            <div className="p-4 space-y-4">
              {filters.groups.map(group => renderMobileGroup(group))}
              
              {filters.groups.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Filter size={48} className="mx-auto mb-4 text-gray-300" />
                  <h3 className="text-xl font-medium mb-2">No filters</h3>
                  <p className="text-base mb-4">Add filter groups to refine your results</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddGroup}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-300 hover:text-blue-500 text-lg"
              >
                <Plus size={24} className="inline mr-2" />
                Add Filter Group
              </button>
            </div>
          )}

          {/* Presets Tab */}
          {activeTab === 'presets' && (
            <div className="p-4 space-y-3">
              {presets.map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    loadPreset(preset.id);
                    onClose();
                  }}
                  className="w-full p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="font-medium text-base">{preset.name}</div>
                  {preset.description && (
                    <div className="text-sm text-gray-500 mt-1">{preset.description}</div>
                  )}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {preset.tags?.map(tag => (
                      <span key={tag} className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              ))}

              {presets.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Settings size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-lg">No presets available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {renderAddConditionModal()}
    </>
  );
};