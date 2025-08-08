'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { 
  Filter, 
  Plus, 
  X, 
  Search, 
  Settings, 
  Save, 
  Download, 
  Upload, 
  History, 
  Copy,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { DateRangePicker } from './DateRangePicker';
import { MultiSelect } from './MultiSelect';
import { RangeSlider } from './RangeSlider';
import { 
  FilterState, 
  FilterGroup, 
  FilterCondition, 
  FilterConfig, 
  FilterType, 
  FilterOperator,
  LogicalOperator,
  DateRange,
  SelectOption
} from './types';
import { useFilters } from '@/hooks/use-filters';
import { FilterPresetManager } from '@/lib/filter-presets';

interface FilterPanelProps {
  configs: FilterConfig[];
  className?: string;
  onFiltersChange?: (filters: FilterState) => void;
  showPresets?: boolean;
  showSearch?: boolean;
  showExportImport?: boolean;
  collapsible?: boolean;
  maxHeight?: number;
}

const operatorLabels: { [key in FilterOperator]: string } = {
  [FilterOperator.EQUALS]: 'equals',
  [FilterOperator.NOT_EQUALS]: 'does not equal',
  [FilterOperator.CONTAINS]: 'contains',
  [FilterOperator.NOT_CONTAINS]: 'does not contain',
  [FilterOperator.STARTS_WITH]: 'starts with',
  [FilterOperator.ENDS_WITH]: 'ends with',
  [FilterOperator.GREATER_THAN]: 'greater than',
  [FilterOperator.GREATER_THAN_OR_EQUAL]: 'greater than or equal',
  [FilterOperator.LESS_THAN]: 'less than',
  [FilterOperator.LESS_THAN_OR_EQUAL]: 'less than or equal',
  [FilterOperator.BETWEEN]: 'between',
  [FilterOperator.NOT_BETWEEN]: 'not between',
  [FilterOperator.IN]: 'in',
  [FilterOperator.NOT_IN]: 'not in',
  [FilterOperator.IS_NULL]: 'is empty',
  [FilterOperator.IS_NOT_NULL]: 'is not empty'
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  configs,
  className = '',
  onFiltersChange,
  showPresets = true,
  showSearch = true,
  showExportImport = true,
  collapsible = true,
  maxHeight = 600
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [savePresetName, setSavePresetName] = useState('');
  const [importData, setImportData] = useState('');

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
    setSearch,
    exportFilters,
    importFilters
  } = useFilters({
    configs,
    presets: FilterPresetManager.getAllPresets(),
    syncWithUrl: true,
    onFiltersChange
  });

  const presets = useMemo(() => FilterPresetManager.getAllPresets(), []);

  const handleAddGroup = useCallback(() => {
    addGroup('New Filter Group');
  }, [addGroup]);

  const handleSavePreset = useCallback(() => {
    if (!savePresetName.trim()) return;
    
    try {
      FilterPresetManager.savePreset({
        name: savePresetName,
        description: `Custom filter preset with ${activeFiltersCount} conditions`,
        filters: filters.groups,
        tags: ['custom', 'user-created']
      });
      setSavePresetName('');
      setShowPresetModal(false);
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }, [savePresetName, filters.groups, activeFiltersCount]);

  const handleImport = useCallback(() => {
    try {
      importFilters(importData);
      setImportData('');
      setShowPresetModal(false);
    } catch (error) {
      console.error('Failed to import filters:', error);
    }
  }, [importData, importFilters]);

  const handleExport = useCallback(async () => {
    try {
      const data = exportFilters();
      await navigator.clipboard.writeText(data);
      // Show toast notification
    } catch (error) {
      console.error('Failed to export filters:', error);
    }
  }, [exportFilters]);

  const renderConditionInput = useCallback((
    groupId: string, 
    condition: FilterCondition, 
    config: FilterConfig
  ) => {
    const commonProps = {
      disabled: !condition.enabled,
      className: 'flex-1'
    };

    switch (condition.type) {
      case FilterType.TEXT:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            placeholder={config.placeholder || 'Enter text...'}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
            min={config.validation?.min}
            max={config.validation?.max}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            {...commonProps}
          />
        );

      case FilterType.DATE:
        return (
          <input
            type="date"
            value={condition.value ? new Date(condition.value).toISOString().split('T')[0] : ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: new Date(e.target.value) })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
            className="flex-1"
          />
        );

      case FilterType.SELECT:
        return (
          <select
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
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
            className="flex-1"
          />
        );

      case FilterType.RANGE:
        const rangeValue = condition.value || [0, 100];
        return (
          <RangeSlider
            min={config.validation?.min || 0}
            max={config.validation?.max || 100}
            value={Array.isArray(rangeValue) ? rangeValue : [0, rangeValue]}
            onChange={(range) => updateCondition(groupId, condition.id, { value: range })}
            disabled={!condition.enabled}
            className="flex-1"
            showLabels
          />
        );

      case FilterType.BOOLEAN:
        return (
          <select
            value={condition.value?.toString() || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value === 'true' })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            {...commonProps}
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case FilterType.TAG:
        return (
          <MultiSelect
            options={config.options || []}
            value={condition.value || []}
            onChange={(values) => updateCondition(groupId, condition.id, { value: values })}
            placeholder="Add tags..."
            disabled={!condition.enabled}
            searchable
            creatable
            onCreateOption={(inputValue) => ({ value: inputValue, label: inputValue })}
            className="flex-1"
          />
        );

      default:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
            className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            {...commonProps}
          />
        );
    }
  }, [updateCondition]);

  const renderCondition = useCallback((groupId: string, condition: FilterCondition) => {
    const config = configs.find(c => c.field === condition.field);
    if (!config) return null;

    return (
      <div key={condition.id} className={`flex items-center gap-2 p-2 bg-gray-50 rounded ${!condition.enabled ? 'opacity-60' : ''}`}>
        <button
          type="button"
          onClick={() => toggleCondition(groupId, condition.id)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
            condition.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
          }`}
        >
          {condition.enabled ? <Eye size={10} className="text-white" /> : <EyeOff size={10} className="text-gray-400" />}
        </button>

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
          className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[120px]"
          disabled={!condition.enabled}
        >
          {configs.map(config => (
            <option key={config.field} value={config.field}>
              {config.label}
            </option>
          ))}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => updateCondition(groupId, condition.id, { operator: e.target.value as FilterOperator })}
          className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[140px]"
          disabled={!condition.enabled}
        >
          {config.operators.map(op => (
            <option key={op} value={op}>
              {operatorLabels[op]}
            </option>
          ))}
        </select>

        {renderConditionInput(groupId, condition, config)}

        <button
          type="button"
          onClick={() => removeCondition(groupId, condition.id)}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <X size={14} />
        </button>
      </div>
    );
  }, [configs, toggleCondition, updateCondition, removeCondition, renderConditionInput]);

  const renderGroup = useCallback((group: FilterGroup) => {
    return (
      <div key={group.id} className={`border border-gray-200 rounded-lg p-3 ${!group.enabled ? 'opacity-60' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                group.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}
            >
              {group.enabled ? <Eye size={12} className="text-white" /> : <EyeOff size={12} className="text-gray-400" />}
            </button>
            
            <input
              type="text"
              value={group.name || ''}
              onChange={(e) => updateGroup(group.id, { name: e.target.value })}
              className="font-medium text-gray-800 bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-500 focus:rounded px-1"
              placeholder="Group name..."
            />

            <select
              value={group.operator}
              onChange={(e) => updateGroup(group.id, { operator: e.target.value as LogicalOperator })}
              className="px-2 py-1 text-xs border border-gray-300 rounded"
              disabled={!group.enabled}
            >
              <option value={LogicalOperator.AND}>AND</option>
              <option value={LogicalOperator.OR}>OR</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const defaultConfig = configs[0];
                if (defaultConfig) {
                  addCondition(group.id, {
                    field: defaultConfig.field,
                    operator: defaultConfig.operators[0],
                    value: undefined,
                    type: defaultConfig.type
                  });
                }
              }}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!group.enabled}
            >
              <Plus size={12} />
            </button>
            
            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {group.conditions.map(condition => renderCondition(group.id, condition))}
          
          {group.conditions.length === 0 && group.enabled && (
            <div className="text-center py-4 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded">
              No conditions. Click the + button to add one.
            </div>
          )}
        </div>

        {/* Nested groups would be rendered here */}
        {group.groups && group.groups.length > 0 && (
          <div className="mt-3 ml-4 border-l-2 border-gray-200 pl-4">
            {group.groups.map(nestedGroup => renderGroup(nestedGroup))}
          </div>
        )}
      </div>
    );
  }, [configs, toggleGroup, updateGroup, removeGroup, addCondition, renderCondition]);

  if (isCollapsed && collapsible) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter size={16} />
            <span className="font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Filter size={16} />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showPresets && (
            <button
              type="button"
              onClick={() => setShowPresetModal(true)}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              <Settings size={12} />
            </button>
          )}
          
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 hover:bg-red-200 rounded"
            >
              Clear
            </button>
          )}

          {collapsible && (
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronDown size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="p-3 border-b border-gray-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search across all fields..."
              value={filters.searchQuery || ''}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
            />
          </div>
        </div>
      )}

      {/* Filter Groups */}
      <div 
        className="p-3 space-y-3 overflow-y-auto"
        style={{ maxHeight: maxHeight - 120 }}
      >
        {filters.groups.map(group => renderGroup(group))}
        
        {filters.groups.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Filter size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No filters applied</p>
            <p className="text-sm">Add a filter group to get started</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-3 border-t border-gray-200">
        <button
          type="button"
          onClick={handleAddGroup}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          <Plus size={14} />
          Add Group
        </button>

        {showExportImport && hasActiveFilters && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExport}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Copy filters to clipboard"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowPresetModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Export/Import filters"
            >
              <Download size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Preset Modal */}
      {showPresetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Filter Presets</h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Load Preset */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Load Preset</label>
              <select
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 mb-2"
              >
                <option value="">Select a preset...</option>
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} {preset.description && `- ${preset.description}`}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  if (selectedPreset) {
                    loadPreset(selectedPreset);
                    setShowPresetModal(false);
                  }
                }}
                disabled={!selectedPreset}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load Preset
              </button>
            </div>

            {/* Save Preset */}
            {hasActiveFilters && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Save Current Filters</label>
                <input
                  type="text"
                  value={savePresetName}
                  onChange={(e) => setSavePresetName(e.target.value)}
                  placeholder="Enter preset name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 mb-2"
                />
                <button
                  type="button"
                  onClick={handleSavePreset}
                  disabled={!savePresetName.trim()}
                  className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Preset
                </button>
              </div>
            )}

            {/* Import/Export */}
            <div>
              <label className="block text-sm font-medium mb-2">Import/Export</label>
              <textarea
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder="Paste filter data here to import..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-200 mb-2 text-sm font-mono"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importData.trim()}
                  className="flex-1 px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!hasActiveFilters}
                  className="flex-1 px-3 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};