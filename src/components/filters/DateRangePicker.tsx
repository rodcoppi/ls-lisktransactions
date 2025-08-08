'use client';

import React, { useState, useRef, useEffect } from 'react';
import { format, isToday, isYesterday, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, isBefore, isAfter } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import { DateRange, DatePreset } from './types';

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showTime?: boolean;
  minDate?: Date;
  maxDate?: Date;
  presets?: DatePreset[];
  allowSingleDate?: boolean;
  onClose?: () => void;
}

const defaultPresets: DatePreset[] = [
  {
    id: 'today',
    label: 'Today',
    shortcut: 'T',
    getValue: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date())
    })
  },
  {
    id: 'yesterday',
    label: 'Yesterday',
    shortcut: 'Y',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 1)),
      to: endOfDay(subDays(new Date(), 1))
    })
  },
  {
    id: 'last7days',
    label: 'Last 7 days',
    shortcut: '7',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date())
    })
  },
  {
    id: 'last30days',
    label: 'Last 30 days',
    shortcut: '3',
    getValue: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date())
    })
  },
  {
    id: 'thisweek',
    label: 'This week',
    shortcut: 'W',
    getValue: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date())
    })
  },
  {
    id: 'lastweek',
    label: 'Last week',
    shortcut: 'L',
    getValue: () => ({
      from: startOfWeek(subWeeks(new Date(), 1)),
      to: endOfWeek(subWeeks(new Date(), 1))
    })
  },
  {
    id: 'thismonth',
    label: 'This month',
    shortcut: 'M',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date())
    })
  },
  {
    id: 'lastmonth',
    label: 'Last month',
    shortcut: 'P',
    getValue: () => ({
      from: startOfMonth(subMonths(new Date(), 1)),
      to: endOfMonth(subMonths(new Date(), 1))
    })
  }
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date range',
  disabled = false,
  className = '',
  showTime = false,
  minDate,
  maxDate,
  presets = defaultPresets,
  allowSingleDate = false,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value.from || new Date());
  const [selectingRange, setSelectingRange] = useState<'from' | 'to' | null>(null);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [timeInputs, setTimeInputs] = useState({
    fromTime: value.from ? format(value.from, 'HH:mm') : '00:00',
    toTime: value.to ? format(value.to, 'HH:mm') : '23:59'
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
      
      // Handle preset shortcuts
      if (isOpen && event.altKey) {
        const preset = presets.find(p => p.shortcut?.toLowerCase() === event.key.toLowerCase());
        if (preset) {
          event.preventDefault();
          handlePresetSelect(preset);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, presets]);

  const handleClose = () => {
    setIsOpen(false);
    setSelectingRange(null);
    setHoveredDate(null);
    onClose?.();
  };

  const handlePresetSelect = (preset: DatePreset) => {
    const range = preset.getValue();
    onChange(range);
    if (!allowSingleDate || (range.from && range.to)) {
      handleClose();
    }
  };

  const formatDisplayValue = () => {
    if (!value.from && !value.to) return '';
    
    if (value.from && !value.to) {
      return format(value.from, showTime ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy');
    }
    
    if (value.from && value.to) {
      const fromStr = format(value.from, showTime ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy');
      const toStr = format(value.to, showTime ? 'MMM dd, yyyy HH:mm' : 'MMM dd, yyyy');
      
      if (format(value.from, 'yyyy-MM-dd') === format(value.to, 'yyyy-MM-dd')) {
        if (showTime) {
          return `${format(value.from, 'MMM dd, yyyy')} ${format(value.from, 'HH:mm')} - ${format(value.to, 'HH:mm')}`;
        }
        return format(value.from, 'MMM dd, yyyy');
      }
      
      return `${fromStr} - ${toStr}`;
    }
    
    return '';
  };

  const getDaysInMonth = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const days = [];
    
    // Add previous month's trailing days
    const startWeekDay = start.getDay();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const day = new Date(start);
      day.setDate(day.getDate() - i - 1);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Add current month's days
    for (let i = 1; i <= end.getDate(); i++) {
      const day = new Date(start);
      day.setDate(i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // Add next month's leading days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(end);
      day.setDate(day.getDate() + i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  };

  const handleDateClick = (date: Date) => {
    if (disabled) return;
    
    if (minDate && isBefore(date, minDate)) return;
    if (maxDate && isAfter(date, maxDate)) return;

    const newDate = new Date(date);
    
    if (showTime) {
      if (!selectingRange) {
        const [hours, minutes] = timeInputs.fromTime.split(':').map(Number);
        newDate.setHours(hours, minutes, 0, 0);
        onChange({ from: newDate, to: null });
        setSelectingRange('to');
      } else if (selectingRange === 'to') {
        const [hours, minutes] = timeInputs.toTime.split(':').map(Number);
        newDate.setHours(hours, minutes, 59, 999);
        
        if (value.from && isBefore(newDate, value.from)) {
          onChange({ from: newDate, to: value.from });
        } else {
          onChange({ from: value.from, to: newDate });
        }
        setSelectingRange(null);
        if (!allowSingleDate) handleClose();
      }
    } else {
      if (!value.from || (value.from && value.to) || selectingRange === null) {
        const startOfDateDay = startOfDay(newDate);
        onChange({ from: startOfDateDay, to: allowSingleDate ? null : endOfDay(newDate) });
        setSelectingRange(allowSingleDate ? 'to' : null);
      } else if (selectingRange === 'to') {
        const endOfDateDay = endOfDay(newDate);
        
        if (isBefore(endOfDateDay, value.from)) {
          onChange({ from: startOfDay(newDate), to: endOfDay(value.from) });
        } else {
          onChange({ from: value.from, to: endOfDateDay });
        }
        setSelectingRange(null);
        handleClose();
      }
    }
  };

  const handleTimeChange = (type: 'from' | 'to', time: string) => {
    setTimeInputs(prev => ({ ...prev, [`${type}Time`]: time }));
    
    if (value[type]) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(value[type]!);
      newDate.setHours(hours, minutes, type === 'to' ? 59 : 0, type === 'to' ? 999 : 0);
      
      onChange({
        ...value,
        [type]: newDate
      });
    }
  };

  const isDateInRange = (date: Date) => {
    if (!value.from || !value.to) return false;
    return date >= value.from && date <= value.to;
  };

  const isDateRangeStart = (date: Date) => {
    return value.from && format(date, 'yyyy-MM-dd') === format(value.from, 'yyyy-MM-dd');
  };

  const isDateRangeEnd = (date: Date) => {
    return value.to && format(date, 'yyyy-MM-dd') === format(value.to, 'yyyy-MM-dd');
  };

  const isDateHovered = (date: Date) => {
    if (!hoveredDate || !value.from || value.to) return false;
    const start = value.from;
    const end = hoveredDate;
    return date >= (isBefore(start, end) ? start : end) && date <= (isBefore(start, end) ? end : start);
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        ref={inputRef}
        className={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer
          bg-white hover:border-gray-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200
          ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-100' : ''}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <Calendar size={16} className="text-gray-500" />
        <input
          type="text"
          value={formatDisplayValue()}
          placeholder={placeholder}
          readOnly
          disabled={disabled}
          className="flex-1 bg-transparent outline-none cursor-pointer"
        />
        {(value.from || value.to) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange({ from: null, to: null });
            }}
            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-[320px] max-w-[800px]">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Presets */}
            <div className="lg:w-48 border-b lg:border-b-0 lg:border-r border-gray-200 pb-4 lg:pb-0 lg:pr-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Select</h3>
              <div className="space-y-1">
                {presets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handlePresetSelect(preset)}
                    className="w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-100 text-gray-700"
                  >
                    <div className="flex justify-between items-center">
                      <span>{preset.label}</span>
                      {preset.shortcut && (
                        <span className="text-xs text-gray-400">Alt+{preset.shortcut}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() - 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft size={16} />
                </button>
                
                <h3 className="text-sm font-medium">
                  {format(currentMonth, 'MMMM yyyy')}
                </h3>
                
                <button
                  type="button"
                  onClick={() => {
                    const newMonth = new Date(currentMonth);
                    newMonth.setMonth(newMonth.getMonth() + 1);
                    setCurrentMonth(newMonth);
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Week headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="text-xs text-gray-500 text-center py-1 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-1">
                {days.map(({ date, isCurrentMonth }, index) => {
                  const isDisabled = (minDate && isBefore(date, minDate)) || (maxDate && isAfter(date, maxDate));
                  const isSelected = isDateRangeStart(date) || isDateRangeEnd(date);
                  const isInRange = isDateInRange(date);
                  const isHovered = isDateHovered(date);
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleDateClick(date)}
                      onMouseEnter={() => setHoveredDate(date)}
                      onMouseLeave={() => setHoveredDate(null)}
                      disabled={isDisabled}
                      className={`
                        w-8 h-8 text-xs rounded flex items-center justify-center transition-colors
                        ${!isCurrentMonth ? 'text-gray-400' : ''}
                        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}
                        ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                        ${isInRange && !isSelected ? 'bg-blue-100 text-blue-800' : ''}
                        ${isHovered && !isSelected && !isInRange ? 'bg-blue-50' : ''}
                        ${isToday && !isSelected ? 'bg-gray-200 font-semibold' : ''}
                      `}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Time inputs */}
              {showTime && (value.from || value.to) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-4">
                    <Clock size={16} className="text-gray-500" />
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={timeInputs.fromTime}
                        onChange={(e) => handleTimeChange('from', e.target.value)}
                        disabled={!value.from}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={timeInputs.toTime}
                        onChange={(e) => handleTimeChange('to', e.target.value)}
                        disabled={!value.to}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};