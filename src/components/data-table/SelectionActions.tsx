'use client';

import React, { useState } from 'react';
import { 
  Check, 
  ChevronDown, 
  Download, 
  Trash2, 
  Edit, 
  Copy, 
  Archive,
  MoreHorizontal,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Row,
  BulkAction,
  TableAction,
  RowSelectionState,
  ExportFormat,
} from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SelectionActionsProps<T> {
  selectedRows: Row<T>[];
  totalRows: number;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
  bulkActions?: BulkAction<T>[];
  onExport?: (format: ExportFormat, selectedOnly: boolean) => void;
  onSelectAll?: () => void;
  onClearSelection?: () => void;
  onInvertSelection?: () => void;
  className?: string;
}

export function SelectionActions<T>({
  selectedRows,
  totalRows,
  rowSelection,
  onRowSelectionChange,
  bulkActions = [],
  onExport,
  onSelectAll,
  onClearSelection,
  onInvertSelection,
  className,
}: SelectionActionsProps<T>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedCount = selectedRows.length;
  const isAllSelected = selectedCount === totalRows && totalRows > 0;
  const isSomeSelected = selectedCount > 0 && selectedCount < totalRows;

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className={cn(
      'selection-actions flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4',
      className
    )}>
      {/* Selection Info */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className={cn(
            'w-5 h-5 rounded border-2 transition-colors',
            isAllSelected ? 'bg-primary border-primary' : 
            isSomeSelected ? 'bg-primary/50 border-primary' : 'border-border'
          )}>
            {isAllSelected && (
              <Check className="w-3 h-3 text-primary-foreground m-0.5" />
            )}
            {isSomeSelected && !isAllSelected && (
              <div className="w-3 h-3 bg-primary rounded-sm m-0.5" />
            )}
          </div>
          
          <span className="text-sm font-medium">
            {selectedCount} of {totalRows} selected
          </span>
        </div>
        
        {/* Quick selection actions */}
        <div className="flex items-center space-x-1">
          {!isAllSelected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="h-6 px-2 text-xs"
            >
              Select all
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onInvertSelection}
            className="h-6 px-2 text-xs"
          >
            Invert
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 px-2 text-xs"
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        {/* Primary bulk actions */}
        {bulkActions.slice(0, 3).map(action => (
          <Button
            key={action.id}
            variant={action.variant || 'default'}
            size="sm"
            onClick={() => action.action(selectedRows)}
            disabled={action.disabled}
            className="h-8"
          >
            {action.icon}
            <span className="ml-1 hidden sm:inline">{action.label}</span>
          </Button>
        ))}

        {/* Export dropdown */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Download className="w-4 h-4" />
                <span className="ml-1 hidden sm:inline">Export</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Selected</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onExport('csv', true)}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('json', true)}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('excel', true)}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf', true)}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* More actions dropdown */}
        {bulkActions.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>More Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {bulkActions.slice(3).map(action => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={() => action.action(selectedRows)}
                  disabled={action.disabled}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Close selection */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// Row actions menu component
interface RowActionsMenuProps<T> {
  row: Row<T>;
  actions: TableAction<T>[];
  trigger?: React.ReactNode;
}

export function RowActionsMenu<T>({
  row,
  actions,
  trigger,
}: RowActionsMenuProps<T>) {
  const visibleActions = actions.filter(action => 
    action.visible ? action.visible(row) : true
  );

  if (visibleActions.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="w-4 h-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleActions.map((action, index) => (
          <React.Fragment key={action.id}>
            <DropdownMenuItem
              onClick={() => action.action(row)}
              disabled={action.disabled?.(row)}
              className={cn(
                action.variant === 'destructive' && 'text-destructive focus:text-destructive'
              )}
            >
              {action.icon}
              <span className="ml-2">{action.label}</span>
            </DropdownMenuItem>
            {index < visibleActions.length - 1 && action.variant === 'destructive' && (
              <DropdownMenuSeparator />
            )}
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Bulk actions toolbar
interface BulkActionsToolbarProps<T> {
  actions: BulkAction<T>[];
  selectedRows: Row<T>[];
  onExecute: (actionId: string, rows: Row<T>[]) => void;
  maxVisible?: number;
}

export function BulkActionsToolbar<T>({
  actions,
  selectedRows,
  onExecute,
  maxVisible = 4,
}: BulkActionsToolbarProps<T>) {
  const visibleActions = actions.slice(0, maxVisible);
  const hiddenActions = actions.slice(maxVisible);

  return (
    <div className="flex items-center space-x-2">
      {visibleActions.map(action => (
        <Button
          key={action.id}
          variant={action.variant || 'default'}
          size="sm"
          onClick={() => onExecute(action.id, selectedRows)}
          disabled={action.disabled}
          className="h-8"
        >
          {action.icon}
          <span className="ml-1 hidden sm:inline">{action.label}</span>
        </Button>
      ))}
      
      {hiddenActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <MoreHorizontal className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {hiddenActions.map(action => (
              <DropdownMenuItem
                key={action.id}
                onClick={() => onExecute(action.id, selectedRows)}
                disabled={action.disabled}
              >
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Default bulk actions
export const defaultBulkActions: BulkAction[] = [
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'destructive',
    action: (rows) => {
      console.log('Delete rows:', rows.map(r => r.id));
    },
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: <Edit className="w-4 h-4" />,
    action: (rows) => {
      console.log('Edit rows:', rows.map(r => r.id));
    },
  },
  {
    id: 'copy',
    label: 'Copy',
    icon: <Copy className="w-4 h-4" />,
    action: (rows) => {
      const data = rows.map(row => 
        row.getAllCells().reduce((acc, cell) => ({
          ...acc,
          [cell.column.accessorKey]: cell.getValue(),
        }), {})
      );
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    },
  },
  {
    id: 'archive',
    label: 'Archive',
    icon: <Archive className="w-4 h-4" />,
    action: (rows) => {
      console.log('Archive rows:', rows.map(r => r.id));
    },
  },
];

// Default row actions
export const defaultRowActions: TableAction[] = [
  {
    id: 'view',
    label: 'View Details',
    icon: <div className="w-4 h-4">👁️</div>,
    action: (row) => {
      console.log('View row:', row.id);
    },
  },
  {
    id: 'edit',
    label: 'Edit',
    icon: <Edit className="w-4 h-4" />,
    action: (row) => {
      console.log('Edit row:', row.id);
    },
  },
  {
    id: 'copy',
    label: 'Copy',
    icon: <Copy className="w-4 h-4" />,
    action: (row) => {
      const data = row.getAllCells().reduce((acc, cell) => ({
        ...acc,
        [cell.column.accessorKey]: cell.getValue(),
      }), {});
      navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    },
  },
  {
    id: 'delete',
    label: 'Delete',
    icon: <Trash2 className="w-4 h-4" />,
    variant: 'destructive',
    action: (row) => {
      console.log('Delete row:', row.id);
    },
  },
];

// Selection checkbox component
interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  className,
  disabled = false,
  'aria-label': ariaLabel,
}: SelectionCheckboxProps) {
  return (
    <button
      className={cn(
        'w-5 h-5 rounded border-2 border-border transition-all duration-200',
        'hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
        checked && 'bg-primary border-primary',
        indeterminate && 'bg-primary/50 border-primary',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-checked={indeterminate ? 'mixed' : checked}
      role="checkbox"
    >
      {checked && !indeterminate && (
        <Check className="w-3 h-3 text-primary-foreground m-0.5" />
      )}
      {indeterminate && (
        <div className="w-3 h-3 bg-primary rounded-sm m-0.5" />
      )}
    </button>
  );
}