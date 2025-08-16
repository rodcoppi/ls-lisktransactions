"use client";

import { useState } from 'react';

interface HourlyBarChartProps {
  hourlyData: { [key: number]: number };
  date: string;
  dateFormatted: string;
  totalTx: number;
}

export default function HourlyBarChart({ hourlyData, date, dateFormatted, totalTx }: HourlyBarChartProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  
  // Convert to array format and find peak
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourlyData[hour] || 0
  }));
  
  const peakHour = hours.length > 0 ? hours.reduce((max, current) => 
    current.count > max.count ? current : max, hours[0]
  ) : { hour: 0, count: 0 };
  
  const maxCount = hours.length > 0 ? Math.max(...hours.map(h => h.count)) : 1;
  const chartHeight = 280; // pixels - made taller as requested
  
  return (
    <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-4 sm:p-8 rounded-xl shadow-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <div>
          <h2 className="text-lg sm:text-2xl font-semibold text-white mb-2">
            📊 Hourly Activity - {dateFormatted}
          </h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-2 py-1 sm:px-3 text-xs sm:text-sm text-emerald-400 font-medium">
              Complete 24h data (UTC)
            </div>
            <span className="text-gray-300 font-medium text-sm sm:text-base">
              {totalTx.toLocaleString()} tx total
            </span>
          </div>
        </div>
        
        {/* Peak indicator */}
        <div className="mt-4 sm:mt-0 bg-white/10 border border-white/20 rounded-lg px-3 py-2 sm:px-4">
          <div className="text-xs sm:text-sm text-gray-400">Peak Hour</div>
          <div className="text-sm sm:text-lg font-bold text-emerald-400">
            {peakHour.count.toLocaleString()} tx @ {peakHour.hour.toString().padStart(2, '0')}h
          </div>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="relative overflow-hidden">
        {/* Y-axis labels */}
        <div className="absolute -left-8 sm:-left-12 top-0 h-full flex flex-col justify-between text-xs text-gray-400 z-10">
          <span className="text-[10px] sm:text-xs">{maxCount.toLocaleString()}</span>
          <span className="text-[10px] sm:text-xs">{Math.round(maxCount / 2).toLocaleString()}</span>
          <span className="text-[10px] sm:text-xs">0</span>
        </div>
        
        {/* Chart container */}
        <div 
          className="flex items-end justify-between gap-px sm:gap-1 bg-black/20 rounded-lg p-2 sm:p-4 relative ml-6 sm:ml-0 overflow-hidden"
          style={{ height: chartHeight + 40 }}
        >
          {hours.map(({ hour, count }) => {
            const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const barHeight = (heightPercent / 100) * chartHeight;
            const isPeak = hour === peakHour.hour;
            const isZero = count === 0;
            
            return (
              <div
                key={hour}
                className="relative flex-1 flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-105 min-w-0"
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Tooltip */}
                {hoveredHour === hour && (
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2 rounded-lg whitespace-nowrap z-20">
                    {hour.toString().padStart(2, '0')}:00 • {count.toLocaleString()} tx
                  </div>
                )}
                
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isZero 
                      ? 'bg-gray-600/40 border border-gray-500/50' // Gray for zeros
                      : isPeak
                      ? 'bg-emerald-400 border border-emerald-300 shadow-lg shadow-emerald-400/30' // Peak highlight
                      : hoveredHour === hour
                      ? 'bg-emerald-300'
                      : 'bg-emerald-500/80'
                  }`}
                  style={{ 
                    height: Math.max(barHeight, isZero ? 2 : 4), // Minimum height for zeros
                    minHeight: isZero ? '2px' : '4px'
                  }}
                />
                
                {/* Peak dot/label */}
                {isPeak && (
                  <div className="absolute -top-6 sm:-top-8 left-1/2 transform -translate-x-1/2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-400 rounded-full shadow-lg"></div>
                  </div>
                )}
                
                {/* Hour label - All hours visible */}
                <div className={`text-[8px] sm:text-xs mt-1 sm:mt-2 transition-colors ${
                  hoveredHour === hour ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {hour.toString().padStart(2, '0')}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* X-axis line */}
        <div className="w-full h-px bg-gray-600 mt-2"></div>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-700/50">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg sm:rounded-xl px-2 py-3 sm:px-5 sm:py-4 text-center">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-2 font-medium uppercase tracking-wider">Active Hours</div>
          <div className="text-lg sm:text-2xl font-bold text-white">
            {hours.filter(h => h.count > 0).length}/24
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg sm:rounded-xl px-2 py-3 sm:px-5 sm:py-4 text-center">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-2 font-medium uppercase tracking-wider">Avg per Hour</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400">
            {Math.round(totalTx / 24).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg sm:rounded-xl px-2 py-3 sm:px-5 sm:py-4 text-center">
          <div className="text-[10px] sm:text-xs text-slate-400 mb-1 sm:mb-2 font-medium uppercase tracking-wider">Peak vs Avg</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400">
            {totalTx > 0 ? `${Math.round((peakHour.count / (totalTx / 24)) * 100)}%` : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
}