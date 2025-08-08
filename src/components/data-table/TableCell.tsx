'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Cell, Column, Row, CellProps } from './types';

interface TableCellComponentProps<T> {
  cell: Cell<T>;
  className?: string;
  onClick?: (cell: Cell<T>, event: React.MouseEvent) => void;
}

export function TableCell<T>({
  cell,
  className,
  onClick,
}: TableCellComponentProps<T>) {
  const column = cell.column;
  const value = cell.getValue();

  const handleClick = (event: React.MouseEvent) => {
    onClick?.(cell, event);
  };

  // Get cell size from column sizing
  const size = column.size || 150;

  // Render custom cell if provided
  const renderCell = () => {
    if (column.cell) {
      return column.cell({
        getValue: () => value,
        row: cell.row,
        column,
        cell,
        table: {} as any, // This will be provided by the parent table
      });
    }

    // Default cell rendering based on value type
    return <DefaultCellRenderer value={value} column={column} />;
  };

  return (
    <div
      className={cn(
        'flex items-center px-3 py-2 text-sm',
        'border-r border-border last:border-r-0',
        'overflow-hidden',
        column.align === 'center' && 'justify-center text-center',
        column.align === 'right' && 'justify-end text-right',
        className
      )}
      style={{
        width: size,
        minWidth: size,
        maxWidth: size,
      }}
      onClick={handleClick}
      role="gridcell"
      title={String(value)}
    >
      {renderCell()}
    </div>
  );
}

// Default cell renderer for different value types
function DefaultCellRenderer<T>({ value, column }: { value: any; column: Column<T> }) {
  // Handle null/undefined values
  if (value == null) {
    return <span className="text-muted-foreground italic">—</span>;
  }

  // Boolean values
  if (typeof value === 'boolean') {
    return (
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
        value ? 'bg-success/10 text-success-700' : 'bg-error/10 text-error-700'
      )}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  // Number values
  if (typeof value === 'number') {
    return (
      <span className="font-mono tabular-nums">
        {value.toLocaleString()}
      </span>
    );
  }

  // Date values
  if (value instanceof Date) {
    return (
      <span className="font-mono">
        {value.toLocaleDateString()}
      </span>
    );
  }

  // Array values
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    
    if (value.length <= 3) {
      return <span>{value.join(', ')}</span>;
    }
    
    return (
      <span title={value.join(', ')}>
        {value.slice(0, 2).join(', ')}, +{value.length - 2} more
      </span>
    );
  }

  // Object values
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    
    return (
      <span className="text-muted-foreground" title={JSON.stringify(value)}>
        Object ({keys.length} keys)
      </span>
    );
  }

  // String values (default)
  const stringValue = String(value);
  
  // Truncate long strings
  if (stringValue.length > 50) {
    return (
      <span className="truncate" title={stringValue}>
        {stringValue.slice(0, 47)}...
      </span>
    );
  }

  return <span className="truncate">{stringValue}</span>;
}

// Specialized cell components
export function NumericCell({
  value,
  format = 'number',
  precision = 2,
  currency = 'USD',
  className,
}: {
  value: number;
  format?: 'number' | 'currency' | 'percentage';
  precision?: number;
  currency?: string;
  className?: string;
}) {
  const formatValue = () => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value);
      
      case 'percentage':
        return new Intl.NumberFormat('en-US', {
          style: 'percent',
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value / 100);
      
      default:
        return new Intl.NumberFormat('en-US', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision,
        }).format(value);
    }
  };

  return (
    <span className={cn(
      'font-mono tabular-nums',
      value > 0 && 'text-success-600',
      value < 0 && 'text-error-600',
      className
    )}>
      {formatValue()}
    </span>
  );
}

export function DateCell({
  value,
  format = 'short',
  showTime = false,
  className,
}: {
  value: Date;
  format?: 'short' | 'long' | 'iso';
  showTime?: boolean;
  className?: string;
}) {
  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (format) {
      case 'long':
        options.dateStyle = 'full';
        break;
      case 'iso':
        return value.toISOString().split('T')[0];
      default:
        options.dateStyle = 'short';
    }
    
    if (showTime) {
      options.timeStyle = 'short';
    }
    
    return value.toLocaleDateString('en-US', options);
  };

  const now = new Date();
  const diffInDays = Math.floor((now.getTime() - value.getTime()) / (1000 * 60 * 60 * 24));
  
  const getRelativeClass = () => {
    if (diffInDays === 0) return 'text-primary';
    if (diffInDays < 7) return 'text-warning-600';
    if (diffInDays > 30) return 'text-muted-foreground';
    return '';
  };

  return (
    <span className={cn(
      'font-mono',
      getRelativeClass(),
      className
    )} title={value.toISOString()}>
      {formatDate()}
    </span>
  );
}

export function StatusCell({
  status,
  variant = 'default',
  className,
}: {
  status: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-success/10 text-success-700 border-success/20';
      case 'warning':
        return 'bg-warning/10 text-warning-700 border-warning/20';
      case 'error':
        return 'bg-error/10 text-error-700 border-error/20';
      case 'info':
        return 'bg-lisk/10 text-lisk-700 border-lisk/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
      getVariantStyles(),
      className
    )}>
      {status}
    </span>
  );
}

export function ImageCell({
  src,
  alt,
  size = 'sm',
  className,
}: {
  src: string;
  alt?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  const getSizeStyles = () => {
    switch (size) {
      case 'xs':
        return 'w-6 h-6';
      case 'md':
        return 'w-12 h-12';
      default:
        return 'w-8 h-8';
    }
  };

  return (
    <img
      src={src}
      alt={alt || 'Image'}
      className={cn(
        'rounded-md object-cover',
        getSizeStyles(),
        className
      )}
      loading="lazy"
    />
  );
}

export function LinkCell({
  href,
  children,
  external = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        'text-primary hover:text-primary/80 underline-offset-2 hover:underline',
        className
      )}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </a>
  );
}

export function ProgressCell({
  value,
  max = 100,
  showValue = true,
  color = 'primary',
  className,
}: {
  value: number;
  max?: number;
  showValue?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const getColorStyles = () => {
    switch (color) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className="flex-1 bg-muted rounded-full h-2">
        <div
          className={cn('h-full rounded-full transition-all duration-300', getColorStyles())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showValue && (
        <span className="text-xs font-mono tabular-nums min-w-[3ch]">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
}

export function TagsCell({
  tags,
  maxVisible = 3,
  className,
}: {
  tags: string[];
  maxVisible?: number;
  className?: string;
}) {
  if (!tags || tags.length === 0) {
    return <span className="text-muted-foreground italic">No tags</span>;
  }

  const visibleTags = tags.slice(0, maxVisible);
  const remainingCount = Math.max(0, tags.length - maxVisible);

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {visibleTags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
        >
          {tag}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted/50 text-muted-foreground"
          title={tags.slice(maxVisible).join(', ')}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  );
}