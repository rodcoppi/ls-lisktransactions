"use client";

interface DailyTrendProps {
  dailyData: { [date: string]: number };
  dailyStatus: { [date: string]: string };
  dateRange: string[];
}

export default function DailyTrend({ dailyData, dailyStatus, dateRange }: DailyTrendProps) {
  // Generate complete 7-day range starting from first date
  const generateComplete7Days = () => {
    if (dateRange.length === 0) return [];
    
    const firstDate = new Date(`${dateRange[0]}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    const complete7Days: Array<{
      date: string;
      count: number;
      status: string;
      isFuture: boolean;
    }> = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(firstDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      // Determine if date is future or today (pending until next midnight)
      const isFuture = date >= today;
      
      complete7Days.push({
        date: dateKey,
        count: isFuture ? 0 : (dailyData[dateKey] || 0),
        status: isFuture ? 'pending' : (dailyStatus[dateKey] || 'unknown'),
        isFuture
      });
    }
    
    return complete7Days;
  };

  const complete7Days = generateComplete7Days();
  
  // Calculate last week data for comparison
  const calculateLastWeekData = () => {
    if (dateRange.length === 0) return { total: 0, variation: 0 };
    
    const firstDate = new Date(`${dateRange[0]}T00:00:00Z`);
    let lastWeekTotal = 0;
    
    // Get data from 7 days before the current 7-day period
    for (let i = -7; i < 0; i++) {
      const date = new Date(firstDate);
      date.setUTCDate(date.getUTCDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      lastWeekTotal += dailyData[dateKey] || 0;
    }
    
    const currentWeekTotal = complete7Days.filter(d => !d.isFuture).reduce((sum, d) => sum + d.count, 0);
    const variation = lastWeekTotal > 0 ? ((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;
    
    return { total: lastWeekTotal, variation };
  };

  const lastWeekData = calculateLastWeekData();
  
  // Calculate variations
  const processedData = complete7Days.map((item, index) => {
    const prevCount = index > 0 ? complete7Days[index - 1].count : item.count;
    const variation = (prevCount > 0 && !item.isFuture) ? ((item.count - prevCount) / prevCount) * 100 : 0;
    
    return {
      ...item,
      variation: index === 0 || item.isFuture ? 0 : variation
    };
  });
  
  const maxCount = Math.max(...processedData.map(d => d.count));
  const chartHeight = 100;
  
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
  
  // Format variation badge
  const formatVariation = (variation: number): { text: string; color: string } => {
    if (Math.abs(variation) < 1) return { text: '±0%', color: 'bg-gray-600 text-gray-300' };
    const sign = variation > 0 ? '+' : '';
    const color = variation > 0 ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100';
    return { text: `${sign}${variation.toFixed(0)}%`, color };
  };
  
  // Status badge colors
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'complete': return 'bg-emerald-600 text-emerald-100';
      case 'partial': return 'bg-amber-600 text-amber-100';
      case 'pending': return 'bg-blue-600 text-blue-100';
      case 'system issue (fixed)': return 'bg-orange-600 text-orange-100';
      case 'unknown': return 'bg-gray-600 text-gray-300';
      default: return 'bg-gray-600 text-gray-300';
    }
  };
  
  return (
    <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">
          📈 7-Day Trend Analysis
        </h2>
        <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-3 py-1 text-sm text-emerald-400 font-medium">
          Daily progression with variation tracking
        </div>
      </div>
      
      {/* Chart */}
      <div className="relative mb-6">
        <div className="flex items-end justify-between gap-2" style={{ height: chartHeight + 20 }}>
          {processedData.map((item, index) => {
            const heightPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
            const barHeight = (heightPercent / 100) * chartHeight;
            
            return (
              <div key={item.date} className="flex-1 flex flex-col items-center">
                {/* Bar */}
                <div
                  className={`w-full rounded-t-sm transition-all duration-300 ${
                    item.isFuture
                      ? 'bg-slate-600 border-2 border-dashed border-slate-500'
                      : item.status === 'complete' 
                      ? 'bg-emerald-500 hover:bg-emerald-400' 
                      : item.status === 'partial'
                      ? 'bg-amber-500 hover:bg-amber-400'
                      : item.status === 'system issue (fixed)'
                      ? 'bg-orange-500 hover:bg-orange-400'
                      : 'bg-gray-500 hover:bg-gray-400'
                  }`}
                  style={{ 
                    height: Math.max(barHeight, item.isFuture ? 8 : 4),
                    minHeight: item.isFuture ? '8px' : '4px'
                  }}
                />
                
                {/* Date label */}
                <div className="text-xs text-gray-400 mt-2 text-center">
                  {formatDate(item.date)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Detailed cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {processedData.map((item) => {
          const variationBadge = formatVariation(item.variation);
          
          return (
            <div 
              key={item.date} 
              className={`bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 transition-all duration-300 text-center sm:text-left ${
                item.isFuture 
                  ? 'opacity-60 hover:opacity-80' 
                  : 'hover:bg-slate-800/60 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/10'
              }`}
            >
              {/* Date only - Centered on mobile */}
              <div className="mb-3">
                <div className="text-sm font-semibold text-slate-300">
                  {formatDate(item.date)}
                </div>
              </div>
              
              {/* Count or Pending message - Centered on mobile */}
              {item.isFuture ? (
                <div className="text-lg font-medium text-slate-500 mb-3 italic">
                  Pending
                </div>
              ) : (
                <div className="text-xl font-bold text-white mb-3">
                  {item.count.toLocaleString()}
                </div>
              )}
              
              {/* Variation badge or status - Centered on mobile */}
              <div className="flex justify-center sm:justify-start">
                {item.isFuture ? (
                  <div className="inline-flex px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-slate-600 text-slate-300">
                    Not completed
                  </div>
                ) : (
                  item.variation !== 0 && (
                    <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${variationBadge.color}`}>
                      {variationBadge.text} vs prev
                    </div>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8 pt-6 border-t border-slate-700/50">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Total Week</div>
          <div className="text-2xl font-bold text-white">
            {processedData.filter(d => !d.isFuture).reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </div>
          {lastWeekData.variation !== 0 && (
            <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap mt-2 ${
              lastWeekData.variation > 0 ? 'bg-green-600 text-green-100' : 'bg-red-600 text-red-100'
            }`}>
              {lastWeekData.variation > 0 ? '+' : ''}{lastWeekData.variation.toFixed(0)}% vs last
            </div>
          )}
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Total Last Week</div>
          <div className="text-2xl font-bold text-slate-400">
            {lastWeekData.total.toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Daily Average</div>
          <div className="text-2xl font-bold text-emerald-400">
            {(() => {
              const activeDays = processedData.filter(d => !d.isFuture && d.count > 0);
              const total = processedData.filter(d => !d.isFuture).reduce((sum, d) => sum + d.count, 0);
              return activeDays.length > 0 ? Math.round(total / activeDays.length).toLocaleString() : '0';
            })()}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Best Day</div>
          <div className="text-2xl font-bold text-emerald-400">
            {Math.max(...processedData.filter(d => !d.isFuture).map(d => d.count)).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Completed</div>
          <div className="text-2xl font-bold text-white">
            {processedData.filter(d => !d.isFuture && d.count > 0).length}/{processedData.filter(d => !d.isFuture).length}
          </div>
        </div>
      </div>
    </div>
  );
}