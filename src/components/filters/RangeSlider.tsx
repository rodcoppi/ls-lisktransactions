'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Minus } from 'lucide-react';

interface RangeSliderProps {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  step?: number;
  disabled?: boolean;
  className?: string;
  formatValue?: (value: number) => string;
  showLabels?: boolean;
  showTooltip?: boolean;
  marks?: { value: number; label?: string }[];
  color?: 'blue' | 'green' | 'red' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
}

export const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  disabled = false,
  className = '',
  formatValue = (val) => val.toString(),
  showLabels = true,
  showTooltip = false,
  marks = [],
  color = 'blue',
  size = 'md',
  orientation = 'horizontal'
}) => {
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const [showTooltips, setShowTooltips] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Ensure values are within bounds and properly ordered
  const clampedValue: [number, number] = [
    Math.max(min, Math.min(value[0], value[1])),
    Math.min(max, Math.max(value[0], value[1]))
  ];

  // Calculate percentages for positioning
  const minPercent = ((clampedValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((clampedValue[1] - min) / (max - min)) * 100;

  // Size configurations
  const sizeConfig = {
    sm: { track: 4, thumb: 16 },
    md: { track: 6, thumb: 20 },
    lg: { track: 8, thumb: 24 }
  };

  const { track: trackSize, thumb: thumbSize } = sizeConfig[size];

  // Color configurations
  const colorConfig = {
    blue: 'bg-blue-500 hover:bg-blue-600 focus:bg-blue-600',
    green: 'bg-green-500 hover:bg-green-600 focus:bg-green-600',
    red: 'bg-red-500 hover:bg-red-600 focus:bg-red-600',
    purple: 'bg-purple-500 hover:bg-purple-600 focus:bg-purple-600',
    gray: 'bg-gray-500 hover:bg-gray-600 focus:bg-gray-600'
  };

  const getValueFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!sliderRef.current) return min;

    const rect = sliderRef.current.getBoundingClientRect();
    let percentage;

    if (orientation === 'horizontal') {
      percentage = (clientX - rect.left) / rect.width;
    } else {
      percentage = 1 - (clientY - rect.top) / rect.height;
    }

    percentage = Math.max(0, Math.min(1, percentage));
    const rawValue = min + percentage * (max - min);
    return Math.round(rawValue / step) * step;
  }, [min, max, step, orientation]);

  const handleMouseDown = (thumbType: 'min' | 'max') => (event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    setIsDragging(thumbType);
    setShowTooltips(true);
  };

  const handleTouchStart = (thumbType: 'min' | 'max') => (event: React.TouchEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    setIsDragging(thumbType);
    setShowTooltips(true);
  };

  const handleTrackClick = (event: React.MouseEvent) => {
    if (disabled || isDragging) return;

    const newValue = getValueFromPosition(event.clientX, event.clientY);
    const [minVal, maxVal] = clampedValue;
    
    // Determine which thumb to move based on which is closer
    const minDistance = Math.abs(newValue - minVal);
    const maxDistance = Math.abs(newValue - maxVal);
    
    if (minDistance < maxDistance) {
      onChange([newValue, maxVal]);
    } else {
      onChange([minVal, newValue]);
    }
  };

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const newValue = getValueFromPosition(event.clientX, event.clientY);
      const [minVal, maxVal] = clampedValue;

      if (isDragging === 'min') {
        onChange([Math.min(newValue, maxVal), maxVal]);
      } else {
        onChange([minVal, Math.max(newValue, minVal)]);
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isDragging) return;

      event.preventDefault();
      const touch = event.touches[0];
      const newValue = getValueFromPosition(touch.clientX, touch.clientY);
      const [minVal, maxVal] = clampedValue;

      if (isDragging === 'min') {
        onChange([Math.min(newValue, maxVal), maxVal]);
      } else {
        onChange([minVal, Math.max(newValue, minVal)]);
      }
    };

    const handleEnd = () => {
      setIsDragging(null);
      setShowTooltips(showTooltip);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, getValueFromPosition, clampedValue, onChange, showTooltip]);

  const handleKeyDown = (thumbType: 'min' | 'max') => (event: React.KeyboardEvent) => {
    if (disabled) return;

    let delta = 0;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        delta = -step;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        delta = step;
        break;
      case 'PageDown':
        delta = -step * 10;
        break;
      case 'PageUp':
        delta = step * 10;
        break;
      case 'Home':
        delta = min - clampedValue[thumbType === 'min' ? 0 : 1];
        break;
      case 'End':
        delta = max - clampedValue[thumbType === 'min' ? 0 : 1];
        break;
      default:
        return;
    }

    event.preventDefault();
    const [minVal, maxVal] = clampedValue;
    const currentValue = thumbType === 'min' ? minVal : maxVal;
    const newValue = Math.max(min, Math.min(max, currentValue + delta));

    if (thumbType === 'min') {
      onChange([Math.min(newValue, maxVal), maxVal]);
    } else {
      onChange([minVal, Math.max(newValue, minVal)]);
    }
  };

  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`relative ${className}`}>
      {/* Labels */}
      {showLabels && (
        <div className={`flex ${isHorizontal ? 'justify-between' : 'flex-col justify-between h-full'} mb-2 text-sm text-gray-600`}>
          <span>{formatValue(clampedValue[0])}</span>
          <span>{formatValue(clampedValue[1])}</span>
        </div>
      )}

      {/* Slider container */}
      <div
        ref={sliderRef}
        className={`
          relative cursor-pointer select-none
          ${isHorizontal ? 'w-full h-6' : 'h-48 w-6'}
          ${disabled ? 'cursor-not-allowed opacity-50' : ''}
        `}
        onClick={handleTrackClick}
      >
        {/* Track */}
        <div
          className={`
            absolute bg-gray-300 rounded-full
            ${isHorizontal 
              ? `h-${trackSize/4} top-1/2 transform -translate-y-1/2 w-full` 
              : `w-${trackSize/4} left-1/2 transform -translate-x-1/2 h-full`
            }
          `}
        />

        {/* Active range */}
        <div
          className={`
            absolute rounded-full transition-all
            ${colorConfig[color].split(' ')[0]}
            ${isHorizontal 
              ? `h-${trackSize/4} top-1/2 transform -translate-y-1/2` 
              : `w-${trackSize/4} left-1/2 transform -translate-x-1/2`
            }
          `}
          style={
            isHorizontal
              ? {
                  left: `${minPercent}%`,
                  width: `${maxPercent - minPercent}%`
                }
              : {
                  bottom: `${minPercent}%`,
                  height: `${maxPercent - minPercent}%`
                }
          }
        />

        {/* Marks */}
        {marks.map((mark) => {
          const percent = ((mark.value - min) / (max - min)) * 100;
          return (
            <div
              key={mark.value}
              className={`
                absolute bg-gray-400 
                ${isHorizontal 
                  ? 'w-0.5 h-3 top-1/2 transform -translate-y-1/2 -translate-x-0.5' 
                  : 'h-0.5 w-3 left-1/2 transform -translate-x-1/2 -translate-y-0.5'
                }
              `}
              style={
                isHorizontal
                  ? { left: `${percent}%` }
                  : { bottom: `${percent}%` }
              }
            >
              {mark.label && (
                <span
                  className={`
                    absolute text-xs text-gray-500 whitespace-nowrap
                    ${isHorizontal 
                      ? 'top-4 left-1/2 transform -translate-x-1/2' 
                      : 'left-4 top-1/2 transform -translate-y-1/2'
                    }
                  `}
                >
                  {mark.label}
                </span>
              )}
            </div>
          );
        })}

        {/* Min thumb */}
        <div
          className={`
            absolute rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50
            ${colorConfig[color]}
            ${isHorizontal 
              ? `w-${thumbSize/4} h-${thumbSize/4} top-1/2 transform -translate-y-1/2 -translate-x-1/2` 
              : `w-${thumbSize/4} h-${thumbSize/4} left-1/2 transform -translate-x-1/2 -translate-y-1/2`
            }
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
          style={
            isHorizontal
              ? { left: `${minPercent}%` }
              : { bottom: `${minPercent}%` }
          }
          onMouseDown={handleMouseDown('min')}
          onTouchStart={handleTouchStart('min')}
          onKeyDown={handleKeyDown('min')}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clampedValue[0]}
          aria-label="Minimum value"
        >
          {/* Tooltip */}
          {(showTooltips || showTooltip) && (
            <div
              className={`
                absolute bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10
                ${isHorizontal 
                  ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' 
                  : 'right-full mr-2 top-1/2 transform -translate-y-1/2'
                }
              `}
            >
              {formatValue(clampedValue[0])}
              <div
                className={`
                  absolute w-2 h-2 bg-gray-800 transform rotate-45
                  ${isHorizontal 
                    ? 'top-full left-1/2 -translate-x-1/2 -mt-1' 
                    : 'left-full top-1/2 -translate-y-1/2 -ml-1'
                  }
                `}
              />
            </div>
          )}
        </div>

        {/* Max thumb */}
        <div
          className={`
            absolute rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-opacity-50
            ${colorConfig[color]}
            ${isHorizontal 
              ? `w-${thumbSize/4} h-${thumbSize/4} top-1/2 transform -translate-y-1/2 -translate-x-1/2` 
              : `w-${thumbSize/4} h-${thumbSize/4} left-1/2 transform -translate-x-1/2 -translate-y-1/2`
            }
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
          style={
            isHorizontal
              ? { left: `${maxPercent}%` }
              : { bottom: `${maxPercent}%` }
          }
          onMouseDown={handleMouseDown('max')}
          onTouchStart={handleTouchStart('max')}
          onKeyDown={handleKeyDown('max')}
          tabIndex={disabled ? -1 : 0}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={clampedValue[1]}
          aria-label="Maximum value"
        >
          {/* Tooltip */}
          {(showTooltips || showTooltip) && (
            <div
              className={`
                absolute bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-10
                ${isHorizontal 
                  ? 'bottom-full mb-2 left-1/2 transform -translate-x-1/2' 
                  : 'right-full mr-2 top-1/2 transform -translate-y-1/2'
                }
              `}
            >
              {formatValue(clampedValue[1])}
              <div
                className={`
                  absolute w-2 h-2 bg-gray-800 transform rotate-45
                  ${isHorizontal 
                    ? 'top-full left-1/2 -translate-x-1/2 -mt-1' 
                    : 'left-full top-1/2 -translate-y-1/2 -ml-1'
                  }
                `}
              />
            </div>
          )}
        </div>
      </div>

      {/* Range display */}
      <div className="mt-2 text-center text-sm text-gray-600">
        <span>{formatValue(clampedValue[0])}</span>
        <Minus className="inline mx-2" size={12} />
        <span>{formatValue(clampedValue[1])}</span>
      </div>
    </div>
  );
};