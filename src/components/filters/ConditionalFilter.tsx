'use client';

import React, { useState, useCallback } from 'react';
import { 
  GitBranch, 
  Plus, 
  X, 
  ArrowRight, 
  Copy, 
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  FilterCondition, 
  FilterGroup, 
  FilterConfig,
  LogicalOperator,
  FilterType,
  FilterOperator
} from './types';
import { MultiSelect } from './MultiSelect';

interface ConditionalRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: FilterCondition; // IF condition
  actions: FilterCondition[]; // THEN conditions
  elseActions?: FilterCondition[]; // ELSE conditions (optional)
  priority: number;
}

interface ConditionalFilterProps {
  rules: ConditionalRule[];
  configs: FilterConfig[];
  onChange: (rules: ConditionalRule[]) => void;
  className?: string;
}

export const ConditionalFilter: React.FC<ConditionalFilterProps> = ({
  rules,
  configs,
  onChange,
  className = ''
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleRuleExpansion = useCallback((ruleId: string) => {
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  }, []);

  const addRule = useCallback(() => {
    const newRule: ConditionalRule = {
      id: `rule-${Date.now()}`,
      name: 'New Conditional Rule',
      enabled: true,
      priority: rules.length + 1,
      condition: {
        id: `condition-${Date.now()}`,
        field: configs[0]?.field || '',
        operator: FilterOperator.EQUALS,
        value: undefined,
        type: configs[0]?.type || FilterType.TEXT,
        enabled: true
      },
      actions: [
        {
          id: `action-${Date.now()}`,
          field: configs[0]?.field || '',
          operator: FilterOperator.EQUALS,
          value: undefined,
          type: configs[0]?.type || FilterType.TEXT,
          enabled: true
        }
      ]
    };

    onChange([...rules, newRule]);
    setExpandedRules(prev => new Set([...prev, newRule.id]));
  }, [rules, configs, onChange]);

  const removeRule = useCallback((ruleId: string) => {
    onChange(rules.filter(rule => rule.id !== ruleId));
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      newSet.delete(ruleId);
      return newSet;
    });
  }, [rules, onChange]);

  const updateRule = useCallback((ruleId: string, updates: Partial<ConditionalRule>) => {
    onChange(rules.map(rule => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    ));
  }, [rules, onChange]);

  const toggleRule = useCallback((ruleId: string) => {
    updateRule(ruleId, { enabled: !rules.find(r => r.id === ruleId)?.enabled });
  }, [rules, updateRule]);

  const updateCondition = useCallback((
    ruleId: string, 
    conditionId: string, 
    updates: Partial<FilterCondition>,
    section: 'condition' | 'actions' | 'elseActions'
  ) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    if (section === 'condition') {
      updateRule(ruleId, {
        condition: { ...rule.condition, ...updates }
      });
    } else {
      const targetActions = section === 'actions' ? rule.actions : (rule.elseActions || []);
      const updatedActions = targetActions.map(action =>
        action.id === conditionId ? { ...action, ...updates } : action
      );
      
      updateRule(ruleId, {
        [section]: updatedActions
      });
    }
  }, [rules, updateRule]);

  const addAction = useCallback((ruleId: string, section: 'actions' | 'elseActions') => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const newAction: FilterCondition = {
      id: `action-${Date.now()}`,
      field: configs[0]?.field || '',
      operator: FilterOperator.EQUALS,
      value: undefined,
      type: configs[0]?.type || FilterType.TEXT,
      enabled: true
    };

    const currentActions = section === 'actions' ? rule.actions : (rule.elseActions || []);
    
    updateRule(ruleId, {
      [section]: [...currentActions, newAction]
    });
  }, [rules, configs, updateRule]);

  const removeAction = useCallback((
    ruleId: string, 
    actionId: string, 
    section: 'actions' | 'elseActions'
  ) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const currentActions = section === 'actions' ? rule.actions : (rule.elseActions || []);
    const updatedActions = currentActions.filter(action => action.id !== actionId);
    
    updateRule(ruleId, {
      [section]: updatedActions
    });
  }, [rules, updateRule]);

  const duplicateRule = useCallback((ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;

    const duplicatedRule: ConditionalRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      name: `${rule.name} (Copy)`,
      priority: rules.length + 1,
      condition: {
        ...rule.condition,
        id: `condition-${Date.now()}`
      },
      actions: rule.actions.map(action => ({
        ...action,
        id: `action-${Date.now()}`
      })),
      elseActions: rule.elseActions?.map(action => ({
        ...action,
        id: `action-${Date.now()}`
      }))
    };

    onChange([...rules, duplicatedRule]);
  }, [rules, onChange]);

  const renderConditionInput = useCallback((
    condition: FilterCondition,
    onUpdate: (updates: Partial<FilterCondition>) => void
  ) => {
    const config = configs.find(c => c.field === condition.field);
    if (!config) return null;

    const commonProps = {
      disabled: !condition.enabled,
      className: 'flex-1 px-2 py-1 border border-gray-300 rounded text-sm'
    };

    switch (condition.type) {
      case FilterType.TEXT:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            placeholder="Enter text..."
            {...commonProps}
          />
        );

      case FilterType.NUMBER:
        return (
          <input
            type="number"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ value: Number(e.target.value) })}
            placeholder="Enter number..."
            {...commonProps}
          />
        );

      case FilterType.SELECT:
        return (
          <select
            value={condition.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            {...commonProps}
          >
            <option value="">Select option...</option>
            {config.options?.map(option => (
              <option key={option.value} value={option.value}>
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
            onChange={(values) => onUpdate({ value: values })}
            disabled={!condition.enabled}
            className="flex-1"
            maxHeight={150}
          />
        );

      case FilterType.BOOLEAN:
        return (
          <select
            value={condition.value?.toString() || ''}
            onChange={(e) => onUpdate({ value: e.target.value === 'true' })}
            {...commonProps}
          >
            <option value="">Select...</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ value: e.target.value })}
            {...commonProps}
          />
        );
    }
  }, [configs]);

  const renderCondition = useCallback((
    condition: FilterCondition,
    onUpdate: (updates: Partial<FilterCondition>) => void,
    onRemove?: () => void,
    showRemove = true
  ) => {
    const config = configs.find(c => c.field === condition.field);

    return (
      <div className={`flex items-center gap-2 p-2 bg-gray-50 rounded ${!condition.enabled ? 'opacity-60' : ''}`}>
        <button
          type="button"
          onClick={() => onUpdate({ enabled: !condition.enabled })}
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
              onUpdate({
                field: e.target.value,
                type: newConfig.type,
                operator: newConfig.operators[0],
                value: undefined
              });
            }
          }}
          className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[100px]"
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
          onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
          className="px-2 py-1 border border-gray-300 rounded text-sm min-w-[100px]"
          disabled={!condition.enabled}
        >
          {config?.operators.map(op => (
            <option key={op} value={op}>
              {op.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        {renderConditionInput(condition, onUpdate)}

        {showRemove && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }, [configs, renderConditionInput]);

  const renderRule = useCallback((rule: ConditionalRule) => {
    const isExpanded = expandedRules.has(rule.id);

    return (
      <div key={rule.id} className={`border border-gray-200 rounded-lg ${!rule.enabled ? 'opacity-60' : ''}`}>
        {/* Rule Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleRule(rule.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                rule.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}
            >
              {rule.enabled ? <Eye size={12} className="text-white" /> : <EyeOff size={12} className="text-gray-400" />}
            </button>

            <button
              type="button"
              onClick={() => toggleRuleExpansion(rule.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            <GitBranch size={16} className="text-purple-500" />

            <input
              type="text"
              value={rule.name}
              onChange={(e) => updateRule(rule.id, { name: e.target.value })}
              className="font-medium bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-500 focus:rounded px-1"
              disabled={!rule.enabled}
            />

            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              Priority: {rule.priority}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => duplicateRule(rule.id)}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
              title="Duplicate rule"
            >
              <Copy size={14} />
            </button>
            
            <button
              type="button"
              onClick={() => removeRule(rule.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
              title="Delete rule"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Rule Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* IF Condition */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  IF
                </span>
                <span className="text-sm text-gray-600">When this condition is met:</span>
              </div>
              
              {renderCondition(
                rule.condition,
                (updates) => updateCondition(rule.id, rule.condition.id, updates, 'condition'),
                undefined,
                false
              )}
            </div>

            {/* THEN Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <ArrowRight size={16} className="text-green-500" />
                  <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded">
                    THEN
                  </span>
                  <span className="text-sm text-gray-600">Apply these filters:</span>
                </div>
                <button
                  type="button"
                  onClick={() => addAction(rule.id, 'actions')}
                  className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={!rule.enabled}
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-2 ml-6">
                {rule.actions.map(action => (
                  <div key={action.id}>
                    {renderCondition(
                      action,
                      (updates) => updateCondition(rule.id, action.id, updates, 'actions'),
                      () => removeAction(rule.id, action.id, 'actions')
                    )}
                  </div>
                ))}

                {rule.actions.length === 0 && (
                  <div className="text-center py-2 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded">
                    No actions defined. Click + to add one.
                  </div>
                )}
              </div>
            </div>

            {/* ELSE Actions (Optional) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-orange-600 bg-orange-100 px-2 py-1 rounded">
                    ELSE
                  </span>
                  <span className="text-sm text-gray-600">Otherwise, apply these filters (optional):</span>
                </div>
                <button
                  type="button"
                  onClick={() => addAction(rule.id, 'elseActions')}
                  className="px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                  disabled={!rule.enabled}
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="space-y-2 ml-6">
                {(rule.elseActions || []).map(action => (
                  <div key={action.id}>
                    {renderCondition(
                      action,
                      (updates) => updateCondition(rule.id, action.id, updates, 'elseActions'),
                      () => removeAction(rule.id, action.id, 'elseActions')
                    )}
                  </div>
                ))}

                {(!rule.elseActions || rule.elseActions.length === 0) && (
                  <div className="text-center py-2 text-gray-400 text-xs border border-dashed border-gray-200 rounded">
                    No else actions defined (optional)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [
    expandedRules,
    toggleRule,
    toggleRuleExpansion,
    updateRule,
    duplicateRule,
    removeRule,
    renderCondition,
    updateCondition,
    addAction,
    removeAction
  ]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={20} className="text-purple-500" />
          <h3 className="text-lg font-semibold">Conditional Filters</h3>
          <span className="text-sm text-gray-500">({rules.length} rules)</span>
        </div>

        <button
          type="button"
          onClick={addRule}
          className="flex items-center gap-1 px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
        >
          <Plus size={14} />
          Add Rule
        </button>
      </div>

      <div className="space-y-3">
        {rules.map(rule => renderRule(rule))}

        {rules.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <GitBranch size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No conditional rules</p>
            <p className="text-sm">Create if-then rules to apply dynamic filters based on conditions</p>
          </div>
        )}
      </div>

      {rules.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <strong>How it works:</strong> Rules are evaluated in priority order. When an IF condition is met, 
          the corresponding THEN actions are applied as additional filters. If the condition is not met and 
          ELSE actions are defined, those are applied instead.
        </div>
      )}
    </div>
  );
};