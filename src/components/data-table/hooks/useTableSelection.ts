'use client';

import { useCallback, useMemo } from 'react';
import { Row, RowSelectionState } from '../types';

interface UseTableSelectionOptions<T> {
  rows: Row<T>[];
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  enableMultiRowSelection?: boolean;
  enableSubRowSelection?: boolean;
  getRowId?: (row: T, index: number) => string;
}

export function useTableSelection<T>({
  rows,
  rowSelection,
  onRowSelectionChange,
  enableMultiRowSelection = true,
  enableSubRowSelection = false,
  getRowId,
}: UseTableSelectionOptions<T>) {
  
  // Get selected rows
  const selectedRows = useMemo(() => {
    return rows.filter(row => rowSelection[row.id]);
  }, [rows, rowSelection]);

  // Get selected row count
  const selectedRowCount = useMemo(() => {
    return Object.values(rowSelection).filter(Boolean).length;
  }, [rowSelection]);

  // Check if all rows are selected
  const isAllRowsSelected = useMemo(() => {
    return rows.length > 0 && rows.every(row => rowSelection[row.id]);
  }, [rows, rowSelection]);

  // Check if some (but not all) rows are selected
  const isSomeRowsSelected = useMemo(() => {
    const selectedCount = selectedRowCount;
    return selectedCount > 0 && selectedCount < rows.length;
  }, [selectedRowCount, rows.length]);

  // Check if all visible page rows are selected
  const isAllPageRowsSelected = useMemo(() => {
    return rows.length > 0 && rows.every(row => rowSelection[row.id]);
  }, [rows, rowSelection]);

  // Check if some (but not all) page rows are selected
  const isSomePageRowsSelected = useMemo(() => {
    const pageSelectedCount = rows.filter(row => rowSelection[row.id]).length;
    return pageSelectedCount > 0 && pageSelectedCount < rows.length;
  }, [rows, rowSelection]);

  // Toggle selection for a specific row
  const toggleRowSelection = useCallback((rowId: string, value?: boolean) => {
    const newSelection = { ...rowSelection };
    
    if (value !== undefined) {
      if (value) {
        newSelection[rowId] = true;
      } else {
        delete newSelection[rowId];
      }
    } else {
      if (newSelection[rowId]) {
        delete newSelection[rowId];
      } else {
        newSelection[rowId] = true;
      }
    }

    // Handle sub-row selection
    if (enableSubRowSelection) {
      const row = rows.find(r => r.id === rowId);
      if (row && row.subRows.length > 0) {
        const isSelected = newSelection[rowId];
        row.subRows.forEach(subRow => {
          if (isSelected) {
            newSelection[subRow.id] = true;
          } else {
            delete newSelection[subRow.id];
          }
        });
      }
    }

    onRowSelectionChange(newSelection);
  }, [rowSelection, onRowSelectionChange, rows, enableSubRowSelection]);

  // Toggle all rows selection
  const toggleAllRowsSelection = useCallback((value?: boolean) => {
    if (!enableMultiRowSelection) return;

    let newSelection: RowSelectionState = {};

    if (value !== undefined) {
      if (value) {
        rows.forEach(row => {
          newSelection[row.id] = true;
        });
      }
      // If value is false, newSelection remains empty
    } else {
      // Toggle based on current state
      if (!isAllRowsSelected) {
        rows.forEach(row => {
          newSelection[row.id] = true;
        });
      }
      // If all are selected, newSelection remains empty (deselect all)
    }

    onRowSelectionChange(newSelection);
  }, [enableMultiRowSelection, rows, isAllRowsSelected, onRowSelectionChange]);

  // Toggle all page rows selection
  const toggleAllPageRowsSelection = useCallback((value?: boolean) => {
    if (!enableMultiRowSelection) return;

    let newSelection = { ...rowSelection };

    if (value !== undefined) {
      if (value) {
        rows.forEach(row => {
          newSelection[row.id] = true;
        });
      } else {
        rows.forEach(row => {
          delete newSelection[row.id];
        });
      }
    } else {
      // Toggle based on current page state
      if (!isAllPageRowsSelected) {
        rows.forEach(row => {
          newSelection[row.id] = true;
        });
      } else {
        rows.forEach(row => {
          delete newSelection[row.id];
        });
      }
    }

    onRowSelectionChange(newSelection);
  }, [enableMultiRowSelection, rows, isAllPageRowsSelected, rowSelection, onRowSelectionChange]);

  // Select rows by indices
  const selectRows = useCallback((indices: number[], selected = true) => {
    if (!enableMultiRowSelection && indices.length > 1) return;

    const newSelection = { ...rowSelection };

    indices.forEach(index => {
      if (index >= 0 && index < rows.length) {
        const rowId = rows[index].id;
        if (selected) {
          newSelection[rowId] = true;
        } else {
          delete newSelection[rowId];
        }
      }
    });

    onRowSelectionChange(newSelection);
  }, [enableMultiRowSelection, rowSelection, rows, onRowSelectionChange]);

  // Select rows by range
  const selectRowRange = useCallback((startIndex: number, endIndex: number, selected = true) => {
    if (!enableMultiRowSelection) return;

    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    const indices = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    
    selectRows(indices, selected);
  }, [enableMultiRowSelection, selectRows]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    onRowSelectionChange({});
  }, [onRowSelectionChange]);

  // Invert selection
  const invertSelection = useCallback(() => {
    if (!enableMultiRowSelection) return;

    const newSelection: RowSelectionState = {};
    
    rows.forEach(row => {
      if (!rowSelection[row.id]) {
        newSelection[row.id] = true;
      }
    });

    onRowSelectionChange(newSelection);
  }, [enableMultiRowSelection, rows, rowSelection, onRowSelectionChange]);

  // Select rows matching a predicate
  const selectRowsWhere = useCallback((predicate: (row: Row<T>) => boolean, selected = true) => {
    if (!enableMultiRowSelection && selected) return;

    const newSelection = { ...rowSelection };
    
    rows.forEach(row => {
      if (predicate(row)) {
        if (selected) {
          newSelection[row.id] = true;
        } else {
          delete newSelection[row.id];
        }
      }
    });

    onRowSelectionChange(newSelection);
  }, [enableMultiRowSelection, rowSelection, rows, onRowSelectionChange]);

  // Get selected row data
  const getSelectedRowData = useCallback(() => {
    return selectedRows.map(row => row.original);
  }, [selectedRows]);

  // Check if a specific row is selected
  const isRowSelected = useCallback((rowId: string) => {
    return Boolean(rowSelection[rowId]);
  }, [rowSelection]);

  // Get selection info for accessibility
  const getSelectionInfo = useCallback(() => {
    return {
      selectedCount: selectedRowCount,
      totalCount: rows.length,
      isAllSelected: isAllRowsSelected,
      isSomeSelected: isSomeRowsSelected,
      selectedRows: selectedRows,
      selectedData: getSelectedRowData(),
    };
  }, [
    selectedRowCount,
    rows.length,
    isAllRowsSelected,
    isSomeRowsSelected,
    selectedRows,
    getSelectedRowData,
  ]);

  // Keyboard selection handlers
  const handleKeyboardSelection = useCallback((event: KeyboardEvent, currentRowIndex: number) => {
    const { key, shiftKey, ctrlKey, metaKey } = event;
    const isCommandKey = ctrlKey || metaKey;

    switch (key) {
      case ' ':
      case 'Spacebar':
        event.preventDefault();
        if (currentRowIndex >= 0 && currentRowIndex < rows.length) {
          const currentRow = rows[currentRowIndex];
          toggleRowSelection(currentRow.id);
        }
        break;

      case 'a':
        if (isCommandKey && enableMultiRowSelection) {
          event.preventDefault();
          toggleAllRowsSelection(true);
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (currentRowIndex >= 0 && currentRowIndex < rows.length) {
          const currentRow = rows[currentRowIndex];
          
          if (shiftKey && enableMultiRowSelection) {
            // Select range from last selected to current
            const lastSelectedIndex = rows.findIndex(row => rowSelection[row.id]);
            if (lastSelectedIndex !== -1) {
              selectRowRange(lastSelectedIndex, currentRowIndex);
            }
          } else {
            toggleRowSelection(currentRow.id);
          }
        }
        break;
    }
  }, [
    rows,
    toggleRowSelection,
    toggleAllRowsSelection,
    enableMultiRowSelection,
    selectRowRange,
    rowSelection,
  ]);

  return {
    // State
    selectedRows,
    selectedRowCount,
    isAllRowsSelected,
    isSomeRowsSelected,
    isAllPageRowsSelected,
    isSomePageRowsSelected,
    
    // Actions
    toggleRowSelection,
    toggleAllRowsSelection,
    toggleAllPageRowsSelection,
    selectRows,
    selectRowRange,
    clearSelection,
    invertSelection,
    selectRowsWhere,
    
    // Utilities
    getSelectedRowData,
    isRowSelected,
    getSelectionInfo,
    handleKeyboardSelection,
  };
}