'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronDown, X, Search, Tag } from 'lucide-react';
import { SelectOption } from './types';

interface MultiSelectProps {
  options: SelectOption[];
  value: any[];
  onChange: (values: any[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  creatable?: boolean;
  maxHeight?: number;
  maxSelected?: number;
  showSelectAll?: boolean;
  groupBy?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderTag?: (option: SelectOption) => React.ReactNode;
  onCreateOption?: (inputValue: string) => SelectOption;
  loading?: boolean;
  loadingMessage?: string;
  noOptionsMessage?: string;
  onSearch?: (query: string) => void;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  options = [],
  value = [],
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  className = '',
  searchable = true,
  creatable = false,
  maxHeight = 200,
  maxSelected,
  showSelectAll = false,
  groupBy,
  renderOption,
  renderTag,
  onCreateOption,
  loading = false,
  loadingMessage = 'Loading...',
  noOptionsMessage = 'No options found',
  onSearch
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and group options
  const { filteredOptions, groupedOptions, canCreateNew } = useMemo(() => {
    let filtered = options;
    
    if (searchQuery) {
      filtered = options.filter(option => 
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.value.toString().toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    let grouped: { [key: string]: SelectOption[] } = {};
    
    if (groupBy) {
      grouped = filtered.reduce((acc, option) => {
        const group = option.group || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(option);
        return acc;
      }, {} as { [key: string]: SelectOption[] });
    } else {
      grouped = { '': filtered };
    }
    
    const canCreate = creatable && 
      searchQuery && 
      !filtered.some(option => 
        option.label.toLowerCase() === searchQuery.toLowerCase()
      );
    
    return { filteredOptions: filtered, groupedOptions: grouped, canCreateNew: canCreate };
  }, [options, searchQuery, groupBy, creatable]);

  // Selected options lookup
  const selectedValues = useMemo(() => new Set(value), [value]);
  
  const selectedOptions = useMemo(() => 
    options.filter(option => selectedValues.has(option.value)),
    [options, selectedValues]
  );

  // Flatten grouped options for keyboard navigation
  const flattenedOptions = useMemo(() => {
    const flattened: SelectOption[] = [];
    Object.values(groupedOptions).forEach(groupOptions => {
      flattened.push(...groupOptions);
    });
    return flattened;
  }, [groupedOptions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  useEffect(() => {
    if (onSearch) {
      const timeoutId = setTimeout(() => {
        onSearch(searchQuery);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, onSearch]);

  const handleToggleOption = (option: SelectOption) => {
    if (disabled || option.disabled) return;
    
    const isSelected = selectedValues.has(option.value);
    let newValue: any[];
    
    if (isSelected) {
      newValue = value.filter(v => v !== option.value);
    } else {
      if (maxSelected && value.length >= maxSelected && !isSelected) {
        return; // Don't add if max reached
      }
      newValue = [...value, option.value];
    }
    
    onChange(newValue);
  };

  const handleSelectAll = () => {
    const allValues = filteredOptions.filter(opt => !opt.disabled).map(opt => opt.value);
    const allSelected = allValues.every(val => selectedValues.has(val));
    
    if (allSelected) {
      // Deselect all filtered options
      const newValue = value.filter(v => !allValues.includes(v));
      onChange(newValue);
    } else {
      // Select all filtered options
      const newValue = [...new Set([...value, ...allValues])];
      onChange(newValue);
    }
  };

  const handleCreateOption = () => {
    if (!canCreateNew || !onCreateOption) return;
    
    const newOption = onCreateOption(searchQuery);
    handleToggleOption(newOption);
    setSearchQuery('');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev < flattenedOptions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : flattenedOptions.length - 1
        );
        break;
      
      case 'Enter':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < flattenedOptions.length) {
          handleToggleOption(flattenedOptions[focusedIndex]);
        } else if (canCreateNew) {
          handleCreateOption();
        }
        break;
      
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        break;
    }
  };

  const removeOption = (optionValue: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const newValue = value.filter(v => v !== optionValue);
    onChange(newValue);
  };

  const clearAll = (event: React.MouseEvent) => {
    event.stopPropagation();
    onChange([]);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
    >
      {/* Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        className={`
          min-h-[38px] px-3 py-2 border border-gray-300 rounded-md cursor-pointer
          bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
      >
        <div className="flex items-center justify-between min-h-[22px]">
          <div className="flex-1 flex items-center gap-1 flex-wrap">
            {selectedOptions.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              selectedOptions.map(option => (
                <div
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                >
                  {renderTag ? renderTag(option) : (
                    <>
                      <Tag size={12} />
                      <span>{option.label}</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={(e) => removeOption(option.value, e)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-2">
            {selectedOptions.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            )}
            <ChevronDown 
              size={16} 
              className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
            />
          </div>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50"
          style={{ maxHeight: maxHeight + 100 }}
        >
          {/* Search */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <Search size={16} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search options..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                />
              </div>
            </div>
          )}

          {/* Select All */}
          {showSelectAll && filteredOptions.length > 0 && (
            <div className="p-2 border-b border-gray-200">
              <button
                type="button"
                onClick={handleSelectAll}
                className="flex items-center gap-2 w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100"
              >
                <div className="w-4 h-4 flex items-center justify-center">
                  {filteredOptions.filter(opt => !opt.disabled).every(opt => selectedValues.has(opt.value)) ? (
                    <Check size={14} />
                  ) : (
                    <div className="w-2 h-2 bg-gray-400 rounded-sm" />
                  )}
                </div>
                <span className="font-medium">Select All</span>
              </button>
            </div>
          )}

          {/* Options */}
          <div 
            ref={listRef}
            className="overflow-y-auto"
            style={{ maxHeight }}
          >
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                {loadingMessage}
              </div>
            ) : Object.keys(groupedOptions).length === 0 && !canCreateNew ? (
              <div className="p-4 text-center text-gray-500">
                {noOptionsMessage}
              </div>
            ) : (
              <>
                {Object.entries(groupedOptions).map(([group, groupOptions]) => (
                  <div key={group}>
                    {group && groupBy && (
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
                        {group}
                      </div>
                    )}
                    {groupOptions.map((option, index) => {
                      const globalIndex = flattenedOptions.indexOf(option);
                      const isSelected = selectedValues.has(option.value);
                      const isFocused = globalIndex === focusedIndex;
                      
                      return (
                        <button
                          key={`${group}-${option.value}`}
                          type="button"
                          onClick={() => handleToggleOption(option)}
                          disabled={option.disabled}
                          className={`
                            flex items-center gap-2 w-full text-left px-3 py-2 text-sm
                            ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
                            ${isFocused ? 'bg-gray-100' : ''}
                            ${isSelected ? 'bg-blue-50 text-blue-800' : ''}
                          `}
                        >
                          <div className="w-4 h-4 flex items-center justify-center">
                            {isSelected && <Check size={14} />}
                          </div>
                          {renderOption ? renderOption(option) : (
                            <span className="flex-1">{option.label}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                
                {/* Create new option */}
                {canCreateNew && onCreateOption && (
                  <button
                    type="button"
                    onClick={handleCreateOption}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-gray-100 border-t border-gray-200"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <Tag size={14} />
                    </div>
                    <span className="flex-1">Create &quot;{searchQuery}&quot;</span>
                  </button>
                )}
              </>
            )}
          </div>
          
          {/* Footer info */}
          {selectedOptions.length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-200 bg-gray-50">
              {selectedOptions.length} selected
              {maxSelected && ` (max: ${maxSelected})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};