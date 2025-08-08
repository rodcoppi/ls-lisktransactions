'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Row } from '../types';

interface UseTableKeyboardOptions<T> {
  rows: Row<T>[];
  onRowSelect?: (row: Row<T>) => void;
  onRowActivate?: (row: Row<T>) => void;
  scrollToIndex?: (index: number) => void;
  enableMultiSelect?: boolean;
  enableTypeAhead?: boolean;
}

export function useTableKeyboard<T>({
  rows,
  onRowSelect,
  onRowActivate,
  scrollToIndex,
  enableMultiSelect = true,
  enableTypeAhead = true,
}: UseTableKeyboardOptions<T>) {
  const focusedRowIndex = useRef<number>(0);
  const typeAheadBuffer = useRef<string>('');
  const typeAheadTimeout = useRef<NodeJS.Timeout>();

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, ctrlKey, shiftKey, metaKey } = event;
    const isCommandKey = ctrlKey || metaKey;
    
    switch (key) {
      case 'ArrowDown':
        event.preventDefault();
        if (focusedRowIndex.current < rows.length - 1) {
          focusedRowIndex.current += 1;
          scrollToIndex?.(focusedRowIndex.current);
          
          if (shiftKey && enableMultiSelect) {
            // Extend selection
            onRowSelect?.(rows[focusedRowIndex.current]);
          }
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (focusedRowIndex.current > 0) {
          focusedRowIndex.current -= 1;
          scrollToIndex?.(focusedRowIndex.current);
          
          if (shiftKey && enableMultiSelect) {
            // Extend selection
            onRowSelect?.(rows[focusedRowIndex.current]);
          }
        }
        break;

      case 'PageDown':
        event.preventDefault();
        const nextPageIndex = Math.min(rows.length - 1, focusedRowIndex.current + 10);
        focusedRowIndex.current = nextPageIndex;
        scrollToIndex?.(focusedRowIndex.current);
        break;

      case 'PageUp':
        event.preventDefault();
        const prevPageIndex = Math.max(0, focusedRowIndex.current - 10);
        focusedRowIndex.current = prevPageIndex;
        scrollToIndex?.(focusedRowIndex.current);
        break;

      case 'Home':
        event.preventDefault();
        focusedRowIndex.current = 0;
        scrollToIndex?.(focusedRowIndex.current);
        if (isCommandKey) {
          // Ctrl/Cmd + Home: Select all from current to top
          // Implementation depends on selection strategy
        }
        break;

      case 'End':
        event.preventDefault();
        focusedRowIndex.current = rows.length - 1;
        scrollToIndex?.(focusedRowIndex.current);
        if (isCommandKey) {
          // Ctrl/Cmd + End: Select all from current to bottom
          // Implementation depends on selection strategy
        }
        break;

      case ' ':
      case 'Spacebar':
        event.preventDefault();
        if (focusedRowIndex.current < rows.length) {
          onRowSelect?.(rows[focusedRowIndex.current]);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (focusedRowIndex.current < rows.length) {
          onRowActivate?.(rows[focusedRowIndex.current]);
        }
        break;

      case 'a':
        if (isCommandKey && enableMultiSelect) {
          event.preventDefault();
          // Select all rows
          rows.forEach(row => onRowSelect?.(row));
        }
        break;

      case 'Escape':
        // Clear selection or close any open dialogs
        event.preventDefault();
        break;

      default:
        // Handle type-ahead search
        if (enableTypeAhead && key.length === 1 && !isCommandKey) {
          handleTypeAhead(key);
        }
        break;
    }
  }, [rows, onRowSelect, onRowActivate, scrollToIndex, enableMultiSelect, enableTypeAhead]);

  // Type-ahead search functionality
  const handleTypeAhead = useCallback((char: string) => {
    // Clear existing timeout
    if (typeAheadTimeout.current) {
      clearTimeout(typeAheadTimeout.current);
    }

    // Add character to buffer
    typeAheadBuffer.current += char.toLowerCase();

    // Find matching row
    const startIndex = focusedRowIndex.current;
    const searchTerm = typeAheadBuffer.current;
    
    for (let i = 0; i < rows.length; i++) {
      const index = (startIndex + i) % rows.length;
      const row = rows[index];
      
      // Search in the first string column or converted value
      const searchableValue = getSearchableValue(row);
      if (searchableValue.toLowerCase().startsWith(searchTerm)) {
        focusedRowIndex.current = index;
        scrollToIndex?.(index);
        break;
      }
    }

    // Clear buffer after timeout
    typeAheadTimeout.current = setTimeout(() => {
      typeAheadBuffer.current = '';
    }, 1000);
  }, [rows, scrollToIndex]);

  // Get searchable value from row (first string column or converted value)
  const getSearchableValue = useCallback((row: Row<T>): string => {
    const cells = row.getAllCells();
    
    // Find the first cell with a string value
    for (const cell of cells) {
      const value = cell.getValue();
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    
    // Fallback to first non-null value converted to string
    for (const cell of cells) {
      const value = cell.getValue();
      if (value != null) {
        return String(value);
      }
    }
    
    return '';
  }, []);

  // Set up keyboard event listeners
  useEffect(() => {
    const handleKeyDownEvent = (event: KeyboardEvent) => {
      // Only handle if focus is within the table
      const activeElement = document.activeElement;
      const tableElement = activeElement?.closest('[role="grid"]');
      
      if (tableElement) {
        handleKeyDown(event);
      }
    };

    document.addEventListener('keydown', handleKeyDownEvent);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDownEvent);
      
      if (typeAheadTimeout.current) {
        clearTimeout(typeAheadTimeout.current);
      }
    };
  }, [handleKeyDown]);

  // Focus management
  const focusRow = useCallback((index: number) => {
    if (index >= 0 && index < rows.length) {
      focusedRowIndex.current = index;
      scrollToIndex?.(index);
    }
  }, [rows.length, scrollToIndex]);

  const getFocusedRowIndex = useCallback(() => {
    return focusedRowIndex.current;
  }, []);

  const getFocusedRow = useCallback(() => {
    return rows[focusedRowIndex.current] || null;
  }, [rows]);

  return {
    focusRow,
    getFocusedRowIndex,
    getFocusedRow,
    handleKeyDown,
  };
}

// Hook for managing table focus
export function useTableFocus() {
  const tableRef = useRef<HTMLDivElement>(null);
  const focusedCellRef = useRef<{ rowIndex: number; columnIndex: number }>({ rowIndex: 0, columnIndex: 0 });

  const focusTable = useCallback(() => {
    if (tableRef.current) {
      tableRef.current.focus();
    }
  }, []);

  const focusCell = useCallback((rowIndex: number, columnIndex: number) => {
    focusedCellRef.current = { rowIndex, columnIndex };
    
    // Find and focus the specific cell
    if (tableRef.current) {
      const cell = tableRef.current.querySelector(
        `[role="row"]:nth-child(${rowIndex + 1}) [role="gridcell"]:nth-child(${columnIndex + 1})`
      );
      
      if (cell instanceof HTMLElement) {
        cell.focus();
      }
    }
  }, []);

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right', totalRows: number, totalColumns: number) => {
    const { rowIndex, columnIndex } = focusedCellRef.current;
    
    let newRowIndex = rowIndex;
    let newColumnIndex = columnIndex;
    
    switch (direction) {
      case 'up':
        newRowIndex = Math.max(0, rowIndex - 1);
        break;
      case 'down':
        newRowIndex = Math.min(totalRows - 1, rowIndex + 1);
        break;
      case 'left':
        newColumnIndex = Math.max(0, columnIndex - 1);
        break;
      case 'right':
        newColumnIndex = Math.min(totalColumns - 1, columnIndex + 1);
        break;
    }
    
    if (newRowIndex !== rowIndex || newColumnIndex !== columnIndex) {
      focusCell(newRowIndex, newColumnIndex);
    }
  }, [focusCell]);

  const getCurrentFocus = useCallback(() => {
    return focusedCellRef.current;
  }, []);

  return {
    tableRef,
    focusTable,
    focusCell,
    moveFocus,
    getCurrentFocus,
  };
}