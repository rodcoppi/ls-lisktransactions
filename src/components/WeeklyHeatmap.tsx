"use client";

import { useState } from 'react';

interface WeeklyHeatmapProps {
  weeklyData: { [date: string]: { [hour: number]: number } };
  dateRange: string[];
}

export default function WeeklyHeatmap({ weeklyData, dateRange }: WeeklyHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{ date: string; hour: number } | null>(null);
  
  // Get all values to calculate color intensity
  const allValues = dateRange.flatMap(date => 
    Array.from({ length: 24 }, (_, hour) => weeklyData[date]?.[hour] || 0)
  );
  const maxValue = Math.max(...allValues);
  
  // Helper to get color intensity - melhorado!
  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-slate-800 border-slate-700';
    const intensity = Math.min(count / maxValue, 1);
    
    if (intensity <= 0.1) return 'bg-emerald-950 border-emerald-900';
    if (intensity <= 0.25) return 'bg-emerald-900 border-emerald-800';
    if (intensity <= 0.5) return 'bg-emerald-700 border-emerald-600';
    if (intensity <= 0.75) return 'bg-emerald-500 border-emerald-400';
    return 'bg-emerald-400 border-emerald-300 shadow-emerald-400/50 shadow-lg';
  };
  
  // Format date for display
  const formatDate = (dateStr: string): string => {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: '2-digit', 
      day: '2-digit',
      timeZone: 'UTC'
    });
  };
  
  return (
    <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">
          🔥 7-Day Activity Heatmap
        </h2>
        <div className="flex items-center justify-between">
          <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-3 py-1 text-sm text-emerald-400 font-medium">
            Hourly patterns (UTC)
          </div>
          <div className="text-sm text-gray-400">
            Peak: <span className="text-emerald-400 font-semibold">{maxValue.toLocaleString()} tx</span>
          </div>
        </div>
      </div>
      
      {/* Heatmap */}
      <div className="relative">
        {/* Hour labels (X-axis) - melhorado */}
        <div className="flex mb-4">
          <div className="w-20"></div> {/* Space for day labels */}
          <div className="flex-1 grid grid-cols-24 gap-1">
            {Array.from({ length: 24 }, (_, hour) => (
              <div 
                key={hour} 
                className="text-xs text-gray-300 text-center font-medium"
              >
                {hour % 6 === 0 ? `${hour.toString().padStart(2, '0')}h` : ''}
              </div>
            ))}
          </div>
        </div>
        
        {/* Heatmap grid - melhorado */}
        <div className="space-y-2">
          {dateRange.slice().reverse().map((date) => ( // Most recent on top
            <div key={date} className="flex items-center gap-2">
              {/* Day label (Y-axis) - melhorado */}
              <div className="w-20 text-sm text-white font-semibold text-right">
                {formatDate(date)}
              </div>
              
              {/* Hour cells - melhorado */}
              <div className="flex-1 grid grid-cols-24 gap-1">
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = weeklyData[date]?.[hour] || 0;
                  const isHovered = hoveredCell?.date === date && hoveredCell?.hour === hour;
                  
                  return (
                    <div
                      key={hour}
                      className={`
                        relative w-full h-6 rounded border transition-all duration-200 cursor-pointer
                        ${getIntensity(count)}
                        ${isHovered ? 'scale-110 z-10 shadow-xl ring-2 ring-emerald-400/50' : 'hover:scale-105 hover:brightness-110'}
                      `}
                      onMouseEnter={() => setHoveredCell({ date, hour })}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      {/* Tooltip melhorado */}
                      {isHovered && (
                        <div className="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-white text-sm px-4 py-3 rounded-xl whitespace-nowrap z-20 border border-slate-600 shadow-2xl">
                          <div className="font-semibold">{formatDate(date)}</div>
                          <div className="text-gray-300">{hour.toString().padStart(2, '0')}:00 - {(hour + 1).toString().padStart(2, '0')}:00 UTC</div>
                          <div className="text-emerald-400 font-bold text-lg">{count.toLocaleString()}</div>
                          <div className="text-xs text-gray-400">transactions</div>
                        </div>
                      )}
                      
                      {/* Mostrar número nas células com mais atividade */}
                      {count > maxValue * 0.6 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-black">
                            {count > 999 ? `${Math.round(count/1000)}k` : count}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        {/* Legend melhorada */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400 font-medium">Activity Level:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Low</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-slate-800 border border-slate-700"></div>
                <div className="w-4 h-4 rounded bg-emerald-950 border border-emerald-900"></div>
                <div className="w-4 h-4 rounded bg-emerald-900 border border-emerald-800"></div>
                <div className="w-4 h-4 rounded bg-emerald-700 border border-emerald-600"></div>
                <div className="w-4 h-4 rounded bg-emerald-500 border border-emerald-400"></div>
                <div className="w-4 h-4 rounded bg-emerald-400 border border-emerald-300"></div>
              </div>
              <span className="text-xs text-gray-500">High</span>
            </div>
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 text-sm">
            <div className="text-gray-400">
              Active cells: <span className="text-white font-semibold">
                {allValues.filter(v => v > 0).length}/{allValues.length}
              </span>
            </div>
            <div className="text-gray-400">
              Total: <span className="text-emerald-400 font-semibold">
                {allValues.reduce((sum, val) => sum + val, 0).toLocaleString()} tx
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}