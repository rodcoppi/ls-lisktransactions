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
  
  const peakHour = hours.reduce((max, current) => 
    current.count > max.count ? current : max, hours[0]
  );
  
  const maxCount = Math.max(...hours.map(h => h.count));
  const chartHeight = 120; // pixels
  
  return (
    <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            📊 Hourly Activity - {dateFormatted}
          </h2>
          <div className="flex items-center gap-4">
            <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-3 py-1 text-sm text-emerald-400 font-medium">
              Complete 24h data (UTC)
            </div>
            <span className="text-gray-300 font-medium">
              {totalTx.toLocaleString()} tx total
            </span>
          </div>
        </div>
        
        {/* Peak indicator */}
        <div className="mt-4 sm:mt-0 bg-white/10 border border-white/20 rounded-lg px-4 py-2">
          <div className="text-sm text-gray-400">Peak Hour</div>
          <div className="text-lg font-bold text-emerald-400">
            {peakHour.count.toLocaleString()} tx @ {peakHour.hour.toString().padStart(2, '0')}h
          </div>
        </div>
      </div>
      
      {/* Bar Chart */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute -left-12 top-0 h-full flex flex-col justify-between text-xs text-gray-400">
          <span>{maxCount.toLocaleString()}</span>
          <span>{Math.round(maxCount / 2).toLocaleString()}</span>
          <span>0</span>
        </div>
        
        {/* Chart container */}
        <div 
          className="flex items-end justify-between gap-1 bg-black/20 rounded-lg p-4 relative"
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
                className="relative flex-1 flex flex-col items-center cursor-pointer transition-all duration-200 hover:scale-105"
                onMouseEnter={() => setHoveredHour(hour)}
                onMouseLeave={() => setHoveredHour(null)}
              >
                {/* Tooltip */}
                {hoveredHour === hour && (
                  <div className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap z-10">
                    {hour.toString().padStart(2, '0')}:00–{hour.toString().padStart(2, '0')}:59 UTC • {count.toLocaleString()} tx
                  </div>
                )}
                
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-200 ${
                    isZero 
                      ? 'bg-gray-600/40 border border-gray-500/50' // Gray for zeros
                      : isPeak
                      ? 'bg-emerald-400 border-2 border-emerald-300 shadow-lg shadow-emerald-400/30' // Peak highlight
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
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-lg"></div>
                  </div>
                )}
                
                {/* Hour label */}
                <div className={`text-xs mt-2 transition-colors ${
                  hoveredHour === hour ? 'text-emerald-400' : 'text-gray-500'
                }`}>
                  {hour.toString().padStart(2, '0')}h
                </div>
              </div>
            );
          })}
        </div>
        
        {/* X-axis line */}
        <div className="w-full h-px bg-gray-600 mt-2"></div>
      </div>
      
      {/* Summary stats */}
      <div className="flex flex-wrap gap-4 mt-6 pt-6 border-t border-white/10">
        <div className="bg-black/20 rounded-lg px-4 py-2">
          <div className="text-sm text-gray-400">Active Hours</div>
          <div className="text-lg font-semibold text-white">
            {hours.filter(h => h.count > 0).length}/24
          </div>
        </div>
        <div className="bg-black/20 rounded-lg px-4 py-2">
          <div className="text-sm text-gray-400">Avg per Hour</div>
          <div className="text-lg font-semibold text-white">
            {Math.round(totalTx / 24).toLocaleString()}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg px-4 py-2">
          <div className="text-sm text-gray-400">Peak vs Avg</div>
          <div className="text-lg font-semibold text-emerald-400">
            {totalTx > 0 ? `${Math.round((peakHour.count / (totalTx / 24)) * 100)}%` : '0%'}
          </div>
        </div>
      </div>
    </div>
  );
}