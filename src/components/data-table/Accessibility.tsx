'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Row, Column, AccessibilityConfig } from './types';

// ARIA live region for screen readers
export function AriaLiveRegion({ 
  message, 
  politeness = 'polite',
  className 
}: {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  className?: string;
}) {
  return (
    <div
      className={cn('sr-only', className)}
      role="status"
      aria-live={politeness}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

// Screen reader announcements hook
export function useScreenReaderAnnouncements(config: AccessibilityConfig) {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const announce = (message: string, delay = 100) => {
    if (!config.announceUpdates) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set announcement with slight delay for better screen reader pickup
    timeoutRef.current = setTimeout(() => {
      setAnnouncement(message);
      
      // Clear announcement after a moment
      setTimeout(() => {
        setAnnouncement('');
      }, 1000);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { announcement, announce };
}

// Focus management utilities
export function useFocusManagement<T>(
  rows: Row<T>[],
  columns: Column<T>[],
  config: AccessibilityConfig
) {
  const focusedCellRef = useRef({ rowIndex: 0, columnIndex: 0 });
  const tableRef = useRef<HTMLDivElement>(null);

  const focusCell = (rowIndex: number, columnIndex: number) => {
    if (!config.focusManagement) return;
    
    focusedCellRef.current = { rowIndex, columnIndex };
    
    // Find and focus the cell
    if (tableRef.current) {
      const cell = tableRef.current.querySelector(
        `[role="row"]:nth-child(${rowIndex + 1}) [role="gridcell"]:nth-child(${columnIndex + 1})`
      );
      
      if (cell instanceof HTMLElement) {
        cell.focus();
      }
    }
  };

  const moveFocus = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!config.focusManagement) return;
    
    const { rowIndex, columnIndex } = focusedCellRef.current;
    
    switch (direction) {
      case 'up':
        if (rowIndex > 0) focusCell(rowIndex - 1, columnIndex);
        break;
      case 'down':
        if (rowIndex < rows.length - 1) focusCell(rowIndex + 1, columnIndex);
        break;
      case 'left':
        if (columnIndex > 0) focusCell(rowIndex, columnIndex - 1);
        break;
      case 'right':
        if (columnIndex < columns.length - 1) focusCell(rowIndex, columnIndex + 1);
        break;
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!config.enableKeyboardNavigation) return;

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveFocus('up');
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveFocus('down');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveFocus('left');
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveFocus('right');
        break;
      case 'Home':
        event.preventDefault();
        if (event.ctrlKey) {
          focusCell(0, 0);
        } else {
          focusCell(focusedCellRef.current.rowIndex, 0);
        }
        break;
      case 'End':
        event.preventDefault();
        if (event.ctrlKey) {
          focusCell(rows.length - 1, columns.length - 1);
        } else {
          focusCell(focusedCellRef.current.rowIndex, columns.length - 1);
        }
        break;
    }
  };

  return { tableRef, focusCell, moveFocus, handleKeyDown };
}

// ARIA attributes generator
export function generateAriaAttributes<T>(
  row: Row<T>,
  column: Column<T>,
  config: AccessibilityConfig,
  context: {
    rowIndex: number;
    columnIndex: number;
    isSelected?: boolean;
    isExpanded?: boolean;
    sortDirection?: 'asc' | 'desc' | null;
  }
) {
  const { rowIndex, columnIndex, isSelected, isExpanded, sortDirection } = context;
  
  const ariaAttributes: Record<string, any> = {
    role: 'gridcell',
    'aria-rowindex': rowIndex + 1,
    'aria-colindex': columnIndex + 1,
  };

  // Selection state
  if (config.enableScreenReader && isSelected !== undefined) {
    ariaAttributes['aria-selected'] = isSelected;
  }

  // Expansion state
  if (isExpanded !== undefined) {
    ariaAttributes['aria-expanded'] = isExpanded;
  }

  // Sort state for headers
  if (sortDirection !== undefined) {
    ariaAttributes['aria-sort'] = sortDirection === null ? 'none' :
      sortDirection === 'asc' ? 'ascending' : 'descending';
  }

  // Describedby for complex cells
  const cellValue = row.getValue(column.id);
  if (typeof cellValue === 'object' && cellValue !== null) {
    ariaAttributes['aria-describedby'] = `cell-description-${row.id}-${column.id}`;
  }

  return ariaAttributes;
}

// Accessible table description component
export function TableDescription<T>({
  rows,
  columns,
  config,
  className,
}: {
  rows: Row<T>[];
  columns: Column<T>[];
  config: AccessibilityConfig;
  className?: string;
}) {
  if (!config.enableScreenReader) return null;

  return (
    <div className={cn('sr-only', className)}>
      <div>
        Data table with {rows.length} rows and {columns.length} columns.
        {config.enableKeyboardNavigation && 
          ' Use arrow keys to navigate between cells, Space to select rows, and Enter to activate.'}
      </div>
    </div>
  );
}

// Skip to content link
export function SkipToTableLink({ 
  tableId,
  className 
}: { 
  tableId: string;
  className?: string; 
}) {
  return (
    <a
      href={`#${tableId}`}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'bg-primary text-primary-foreground px-4 py-2 rounded-md z-50',
        className
      )}
    >
      Skip to data table
    </a>
  );
}

// High contrast mode detection
export function useHighContrastMode() {
  const [isHighContrast, setIsHighContrast] = useState(false);

  useEffect(() => {
    const checkHighContrast = () => {
      // Check for Windows high contrast mode
      const isHighContrastWindows = window.matchMedia('(-ms-high-contrast: active)').matches;
      
      // Check for prefers-contrast
      const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      setIsHighContrast(isHighContrastWindows || prefersHighContrast);
    };

    checkHighContrast();

    // Listen for changes
    const mediaQuery1 = window.matchMedia('(-ms-high-contrast: active)');
    const mediaQuery2 = window.matchMedia('(prefers-contrast: high)');
    
    const handleChange = () => checkHighContrast();
    
    mediaQuery1.addEventListener('change', handleChange);
    mediaQuery2.addEventListener('change', handleChange);

    return () => {
      mediaQuery1.removeEventListener('change', handleChange);
      mediaQuery2.removeEventListener('change', handleChange);
    };
  }, []);

  return isHighContrast;
}

// Reduced motion detection
export function useReducedMotion() {
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setIsReducedMotion(mediaQuery.matches);
    };

    handleChange(); // Set initial value
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isReducedMotion;
}

// Color contrast utilities
export function getContrastRatio(color1: string, color2: string): number {
  // Simple contrast ratio calculation
  // In a real implementation, you'd want a more robust color parsing library
  
  const getLuminance = (color: string): number => {
    // This is a simplified implementation
    // You'd want to properly parse CSS colors and calculate luminance
    const rgb = color.match(/\d+/g);
    if (!rgb || rgb.length < 3) return 0;
    
    const [r, g, b] = rgb.map(Number);
    const sRGB = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (brighter + 0.05) / (darker + 0.05);
}

// Accessibility validator
export function validateTableAccessibility<T>(
  rows: Row<T>[],
  columns: Column<T>[],
  config: AccessibilityConfig
): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check for basic accessibility requirements
  if (!config.enableScreenReader) {
    warnings.push('Screen reader support is disabled');
  }

  if (!config.enableKeyboardNavigation) {
    warnings.push('Keyboard navigation is disabled');
  }

  if (!config.focusManagement) {
    warnings.push('Focus management is disabled');
  }

  // Check column headers
  columns.forEach((column, index) => {
    if (!column.header) {
      errors.push(`Column ${index} is missing a header`);
    }
  });

  // Check for accessible labels
  if (!config.ariaLabels?.table) {
    warnings.push('Table is missing an accessible label');
  }

  // Check data complexity
  const hasComplexData = rows.some(row =>
    columns.some(col => {
      const value = row.getValue(col.id);
      return typeof value === 'object' && value !== null;
    })
  );

  if (hasComplexData && !config.announceUpdates) {
    warnings.push('Complex data detected but update announcements are disabled');
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

// Default accessibility configuration
export const defaultAccessibilityConfig: AccessibilityConfig = {
  enableKeyboardNavigation: true,
  enableScreenReader: true,
  announceUpdates: true,
  focusManagement: true,
  ariaLabels: {
    table: 'Data table',
    sortButton: 'Sort column',
    filterButton: 'Filter column',
    selectRow: 'Select row',
    selectAllRows: 'Select all rows',
    expandRow: 'Expand row',
    collapseRow: 'Collapse row',
    pagination: 'Table pagination',
    export: 'Export data',
  },
};

// Accessible sort button
export function AccessibleSortButton({
  column,
  sortDirection,
  onSort,
  config,
  className,
}: {
  column: Column<any>;
  sortDirection: 'asc' | 'desc' | null;
  onSort: () => void;
  config: AccessibilityConfig;
  className?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const getAriaLabel = () => {
    const columnName = typeof column.header === 'string' ? column.header : column.accessorKey;
    const currentSort = sortDirection === null ? 'not sorted' :
      sortDirection === 'asc' ? 'sorted ascending' : 'sorted descending';
    
    return `${columnName}, ${currentSort}. Click to ${
      sortDirection === null ? 'sort ascending' :
      sortDirection === 'asc' ? 'sort descending' : 'remove sort'
    }.`;
  };

  return (
    <button
      ref={buttonRef}
      className={cn(
        'text-left font-medium hover:bg-muted/50 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring',
        className
      )}
      onClick={onSort}
      aria-label={getAriaLabel()}
      aria-sort={
        sortDirection === null ? 'none' :
        sortDirection === 'asc' ? 'ascending' : 'descending'
      }
    >
      {typeof column.header === 'string' ? column.header : column.accessorKey}
    </button>
  );
}

// Accessible row component
export function AccessibleRow<T>({
  row,
  rowIndex,
  isSelected,
  onSelect,
  onActivate,
  config,
  children,
  className,
}: {
  row: Row<T>;
  rowIndex: number;
  isSelected: boolean;
  onSelect?: () => void;
  onActivate?: () => void;
  config: AccessibilityConfig;
  children: React.ReactNode;
  className?: string;
}) {
  const getAriaLabel = () => {
    if (!config.enableScreenReader) return undefined;
    
    const selectionState = isSelected ? 'selected' : 'not selected';
    return `Row ${rowIndex + 1}, ${selectionState}`;
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!config.enableKeyboardNavigation) return;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        onSelect?.();
        break;
      case 'Enter':
        event.preventDefault();
        onActivate?.();
        break;
    }
  };

  return (
    <div
      className={cn(
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset',
        className
      )}
      role="row"
      aria-rowindex={rowIndex + 1}
      aria-selected={config.enableScreenReader ? isSelected : undefined}
      aria-label={getAriaLabel()}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  );
}