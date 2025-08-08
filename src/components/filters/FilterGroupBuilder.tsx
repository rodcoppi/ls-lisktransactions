'use client';

import React, { useState, useCallback } from 'react';
import { 
  Layers, 
  Plus, 
  X, 
  Copy, 
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Move,
  Link,
  Unlink
} from 'lucide-react';
import { 
  FilterGroup, 
  FilterCondition, 
  FilterConfig,
  LogicalOperator,
  FilterType,
  FilterOperator
} from './types';

interface FilterGroupBuilderProps {
  groups: FilterGroup[];
  configs: FilterConfig[];
  onChange: (groups: FilterGroup[]) => void;
  className?: string;
  maxDepth?: number;
  allowNesting?: boolean;
}

export const FilterGroupBuilder: React.FC<FilterGroupBuilderProps> = ({
  groups,
  configs,
  onChange,
  className = '',
  maxDepth = 3,
  allowNesting = true
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

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

  const findGroupPath = useCallback((groups: FilterGroup[], targetId: string, path: number[] = []): number[] | null => {
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const currentPath = [...path, i];
      
      if (group.id === targetId) {
        return currentPath;
      }
      
      if (group.groups && group.groups.length > 0) {
        const nestedPath = findGroupPath(group.groups, targetId, [...currentPath, -1]);
        if (nestedPath) {
          return nestedPath;
        }
      }
    }
    return null;
  }, []);

  const getGroupByPath = useCallback((groups: FilterGroup[], path: number[]): FilterGroup | null => {
    let current: FilterGroup[] = groups;
    let group: FilterGroup | null = null;
    
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      if (index === -1) {
        // Special case for nested groups
        if (group && group.groups) {
          current = group.groups;
        }
        continue;
      }
      
      if (index >= 0 && index < current.length) {
        group = current[index];
        if (i < path.length - 1 && group.groups) {
          current = group.groups;
        }
      } else {
        return null;
      }
    }
    
    return group;
  }, []);

  const updateGroupAtPath = useCallback((groups: FilterGroup[], path: number[], updates: Partial<FilterGroup>): FilterGroup[] => {
    if (path.length === 0) return groups;
    
    const newGroups = [...groups];
    let current = newGroups;
    let parent: FilterGroup | null = null;
    
    for (let i = 0; i < path.length; i++) {
      const index = path[i];
      
      if (index === -1) {
        // Move to nested groups
        if (parent && parent.groups) {
          current = parent.groups;
        }
        continue;
      }
      
      if (i === path.length - 1) {
        // Update the target group
        current[index] = { ...current[index], ...updates };
      } else {
        // Navigate deeper
        current[index] = { ...current[index] };
        parent = current[index];
        if (parent.groups) {
          parent.groups = [...parent.groups];
          current = parent.groups;
        }
      }
    }
    
    return newGroups;
  }, []);

  const addGroup = useCallback((parentId?: string) => {
    const newGroup: FilterGroup = {
      id: `group-${Date.now()}`,
      name: 'New Group',
      conditions: [],
      operator: LogicalOperator.AND,
      enabled: true,
      groups: []
    };

    if (parentId) {
      const parentPath = findGroupPath(groups, parentId);
      if (parentPath) {
        const updatedGroups = updateGroupAtPath(groups, parentPath, {
          groups: [...(getGroupByPath(groups, parentPath)?.groups || []), newGroup]
        });
        onChange(updatedGroups);
      }
    } else {
      onChange([...groups, newGroup]);
    }
    
    setExpandedGroups(prev => new Set([...prev, newGroup.id]));
  }, [groups, onChange, findGroupPath, updateGroupAtPath, getGroupByPath]);

  const removeGroup = useCallback((groupId: string) => {
    const removeFromGroups = (groupsList: FilterGroup[]): FilterGroup[] => {
      return groupsList
        .filter(group => group.id !== groupId)
        .map(group => ({
          ...group,
          groups: group.groups ? removeFromGroups(group.groups) : undefined
        }));
    };

    onChange(removeFromGroups(groups));
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      newSet.delete(groupId);
      return newSet;
    });
  }, [groups, onChange]);

  const updateGroup = useCallback((groupId: string, updates: Partial<FilterGroup>) => {
    const path = findGroupPath(groups, groupId);
    if (path) {
      const updatedGroups = updateGroupAtPath(groups, path, updates);
      onChange(updatedGroups);
    }
  }, [groups, onChange, findGroupPath, updateGroupAtPath]);

  const toggleGroup = useCallback((groupId: string) => {
    const path = findGroupPath(groups, groupId);
    if (path) {
      const group = getGroupByPath(groups, path);
      if (group) {
        updateGroup(groupId, { enabled: !group.enabled });
      }
    }
  }, [groups, findGroupPath, getGroupByPath, updateGroup]);

  const duplicateGroup = useCallback((groupId: string) => {
    const path = findGroupPath(groups, groupId);
    if (!path || path.length === 0) return;

    const group = getGroupByPath(groups, path);
    if (!group) return;

    const duplicateGroupRecursive = (originalGroup: FilterGroup): FilterGroup => ({
      ...originalGroup,
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: `${originalGroup.name} (Copy)`,
      conditions: originalGroup.conditions.map(condition => ({
        ...condition,
        id: `condition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      })),
      groups: originalGroup.groups?.map(nestedGroup => duplicateGroupRecursive(nestedGroup))
    });

    const duplicatedGroup = duplicateGroupRecursive(group);

    // Add the duplicated group at the same level
    if (path.length === 1) {
      // Top level group
      onChange([...groups, duplicatedGroup]);
    } else {
      // Nested group
      const parentPath = path.slice(0, -2); // Remove last two elements (index and -1)
      const parentGroup = getGroupByPath(groups, parentPath);
      if (parentGroup && parentGroup.groups) {
        const updatedGroups = updateGroupAtPath(groups, parentPath, {
          groups: [...parentGroup.groups, duplicatedGroup]
        });
        onChange(updatedGroups);
      }
    }
  }, [groups, onChange, findGroupPath, getGroupByPath, updateGroupAtPath]);

  const addCondition = useCallback((groupId: string) => {
    const defaultConfig = configs[0];
    if (!defaultConfig) return;

    const newCondition: FilterCondition = {
      id: `condition-${Date.now()}`,
      field: defaultConfig.field,
      operator: defaultConfig.operators[0],
      value: undefined,
      type: defaultConfig.type,
      enabled: true
    };

    const path = findGroupPath(groups, groupId);
    if (path) {
      const group = getGroupByPath(groups, path);
      if (group) {
        updateGroup(groupId, {
          conditions: [...group.conditions, newCondition]
        });
      }
    }
  }, [groups, configs, findGroupPath, getGroupByPath, updateGroup]);

  const removeCondition = useCallback((groupId: string, conditionId: string) => {
    const path = findGroupPath(groups, groupId);
    if (path) {
      const group = getGroupByPath(groups, path);
      if (group) {
        updateGroup(groupId, {
          conditions: group.conditions.filter(condition => condition.id !== conditionId)
        });
      }
    }
  }, [groups, findGroupPath, getGroupByPath, updateGroup]);

  const updateCondition = useCallback((groupId: string, conditionId: string, updates: Partial<FilterCondition>) => {
    const path = findGroupPath(groups, groupId);
    if (path) {
      const group = getGroupByPath(groups, path);
      if (group) {
        updateGroup(groupId, {
          conditions: group.conditions.map(condition =>
            condition.id === conditionId ? { ...condition, ...updates } : condition
          )
        });
      }
    }
  }, [groups, findGroupPath, getGroupByPath, updateGroup]);

  const toggleCondition = useCallback((groupId: string, conditionId: string) => {
    const path = findGroupPath(groups, groupId);
    if (path) {
      const group = getGroupByPath(groups, path);
      if (group) {
        const condition = group.conditions.find(c => c.id === conditionId);
        if (condition) {
          updateCondition(groupId, conditionId, { enabled: !condition.enabled });
        }
      }
    }
  }, [groups, findGroupPath, getGroupByPath, updateCondition]);

  const getGroupDepth = useCallback((groups: FilterGroup[], targetId: string, depth: number = 0): number => {
    for (const group of groups) {
      if (group.id === targetId) {
        return depth;
      }
      if (group.groups && group.groups.length > 0) {
        const nestedDepth = getGroupDepth(group.groups, targetId, depth + 1);
        if (nestedDepth !== -1) {
          return nestedDepth;
        }
      }
    }
    return -1;
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, groupId: string) => {
    setDraggedGroup(groupId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(groupId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    setDragOver(null);
    
    if (!draggedGroup || draggedGroup === targetGroupId) {
      setDraggedGroup(null);
      return;
    }

    const draggedDepth = getGroupDepth(groups, draggedGroup);
    const targetDepth = getGroupDepth(groups, targetGroupId);

    if (targetDepth >= maxDepth - 1) {
      // Cannot nest beyond max depth
      setDraggedGroup(null);
      return;
    }

    // Move the dragged group into the target group
    const draggedPath = findGroupPath(groups, draggedGroup);
    const targetPath = findGroupPath(groups, targetGroupId);
    
    if (!draggedPath || !targetPath) {
      setDraggedGroup(null);
      return;
    }

    const draggedGroupObj = getGroupByPath(groups, draggedPath);
    if (!draggedGroupObj) {
      setDraggedGroup(null);
      return;
    }

    // Remove from original location
    let updatedGroups = groups;
    const removeFromGroups = (groupsList: FilterGroup[]): FilterGroup[] => {
      return groupsList
        .filter(group => group.id !== draggedGroup)
        .map(group => ({
          ...group,
          groups: group.groups ? removeFromGroups(group.groups) : undefined
        }));
    };
    updatedGroups = removeFromGroups(updatedGroups);

    // Add to new location
    const finalGroups = updateGroupAtPath(updatedGroups, targetPath, {
      groups: [...(getGroupByPath(updatedGroups, targetPath)?.groups || []), draggedGroupObj]
    });

    onChange(finalGroups);
    setDraggedGroup(null);
  }, [draggedGroup, groups, maxDepth, getGroupDepth, findGroupPath, getGroupByPath, updateGroupAtPath, onChange]);

  const renderCondition = useCallback((groupId: string, condition: FilterCondition) => {
    const config = configs.find(c => c.field === condition.field);
    if (!config) return null;

    return (
      <div key={condition.id} className={`flex items-center gap-2 p-2 bg-white border border-gray-200 rounded ${!condition.enabled ? 'opacity-60' : ''}`}>
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
          className="px-2 py-1 border border-gray-300 rounded text-xs min-w-[80px]"
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
          className="px-2 py-1 border border-gray-300 rounded text-xs min-w-[80px]"
          disabled={!condition.enabled}
        >
          {config.operators.map(op => (
            <option key={op} value={op}>
              {op.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={condition.value || ''}
          onChange={(e) => updateCondition(groupId, condition.id, { value: e.target.value })}
          placeholder="Value..."
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
          disabled={!condition.enabled}
        />

        <button
          type="button"
          onClick={() => removeCondition(groupId, condition.id)}
          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
        >
          <X size={12} />
        </button>
      </div>
    );
  }, [configs, toggleCondition, updateCondition, removeCondition]);

  const renderGroup = useCallback((group: FilterGroup, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedGroups.has(group.id);
    const hasNestedGroups = group.groups && group.groups.length > 0;
    const canNest = allowNesting && depth < maxDepth - 1;
    const isDragging = draggedGroup === group.id;
    const isDragOver = dragOver === group.id;

    return (
      <div 
        key={group.id}
        className={`
          border border-gray-200 rounded-lg bg-white
          ${!group.enabled ? 'opacity-60' : ''}
          ${isDragging ? 'opacity-50' : ''}
          ${isDragOver ? 'ring-2 ring-blue-300 bg-blue-50' : ''}
        `}
        draggable
        onDragStart={(e) => handleDragStart(e, group.id)}
        onDragOver={(e) => canNest ? handleDragOver(e, group.id) : undefined}
        onDragLeave={handleDragLeave}
        onDrop={(e) => canNest ? handleDrop(e, group.id) : undefined}
      >
        {/* Group Header */}
        <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Move size={14} className="text-gray-400 cursor-move" />
            
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                group.enabled ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}
            >
              {group.enabled ? <Eye size={12} className="text-white" /> : <EyeOff size={12} className="text-gray-400" />}
            </button>

            <button
              type="button"
              onClick={() => toggleGroupExpansion(group.id)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            <Layers size={14} className={`${depth === 0 ? 'text-blue-500' : depth === 1 ? 'text-green-500' : 'text-purple-500'}`} />

            <input
              type="text"
              value={group.name || ''}
              onChange={(e) => updateGroup(group.id, { name: e.target.value })}
              className="font-medium bg-transparent border-none outline-none focus:bg-white focus:border focus:border-blue-500 focus:rounded px-1 text-sm"
              placeholder="Group name..."
              disabled={!group.enabled}
            />

            <select
              value={group.operator}
              onChange={(e) => updateGroup(group.id, { operator: e.target.value as LogicalOperator })}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white"
              disabled={!group.enabled}
            >
              <option value={LogicalOperator.AND}>AND</option>
              <option value={LogicalOperator.OR}>OR</option>
            </select>

            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
              Level {depth + 1}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => addCondition(group.id)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              disabled={!group.enabled}
              title="Add condition"
            >
              <Plus size={12} />
            </button>

            {canNest && (
              <button
                type="button"
                onClick={() => addGroup(group.id)}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                disabled={!group.enabled}
                title="Add nested group"
              >
                <Layers size={12} />
              </button>
            )}

            <button
              type="button"
              onClick={() => duplicateGroup(group.id)}
              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
              title="Duplicate group"
            >
              <Copy size={12} />
            </button>
            
            <button
              type="button"
              onClick={() => removeGroup(group.id)}
              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
              title="Delete group"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Group Content */}
        {isExpanded && (
          <div className="p-3 space-y-3">
            {/* Conditions */}
            <div className="space-y-2">
              {group.conditions.map(condition => renderCondition(group.id, condition))}
              
              {group.conditions.length === 0 && group.enabled && (
                <div className="text-center py-3 text-gray-500 text-sm border-2 border-dashed border-gray-300 rounded">
                  No conditions. Click + to add one.
                </div>
              )}
            </div>

            {/* Nested Groups */}
            {hasNestedGroups && (
              <div className="ml-4 border-l-2 border-gray-200 pl-4 space-y-3">
                <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">
                  Nested Groups
                </div>
                {group.groups!.map(nestedGroup => renderGroup(nestedGroup, depth + 1))}
              </div>
            )}

            {canNest && !hasNestedGroups && (
              <div className="text-center py-2 text-gray-400 text-xs border border-dashed border-gray-200 rounded">
                Drag groups here to nest them, or click the <Layers className="inline" size={12} /> button above
              </div>
            )}
          </div>
        )}
      </div>
    );
  }, [
    expandedGroups,
    allowNesting,
    maxDepth,
    draggedGroup,
    dragOver,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    toggleGroup,
    toggleGroupExpansion,
    updateGroup,
    addCondition,
    addGroup,
    duplicateGroup,
    removeGroup,
    renderCondition
  ]);

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold">Filter Groups</h3>
          <span className="text-sm text-gray-500">({groups.length} groups)</span>
        </div>

        <button
          type="button"
          onClick={() => addGroup()}
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          <Plus size={14} />
          Add Group
        </button>
      </div>

      <div className="space-y-3">
        {groups.map(group => renderGroup(group, 0))}

        {groups.length === 0 && (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <Layers size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-medium mb-1">No filter groups</p>
            <p className="text-sm">Create groups to organize your filter conditions</p>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
          <div className="flex items-center gap-1 mb-1">
            <Link size={12} />
            <strong>Tips:</strong>
          </div>
          <ul className="list-disc list-inside space-y-1">
            <li>Drag and drop groups to nest them (up to {maxDepth} levels deep)</li>
            <li>Use AND to require all conditions, OR to match any condition</li>
            <li>Disable groups or conditions to temporarily exclude them</li>
            <li>Duplicate groups to create similar filter sets quickly</li>
          </ul>
        </div>
      )}
    </div>
  );
};