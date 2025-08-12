"use client";

interface MonthlyMTDProps {
  monthlyData: { [month: string]: number };
  currentMonth: string;
  completeDays: number;
}

export default function MonthlyMTD({ monthlyData, currentMonth, completeDays }: MonthlyMTDProps) {
  const currentTotal = monthlyData[currentMonth] || 0;
  const dailyAverage = completeDays > 0 ? currentTotal / completeDays : 0;
  
  // Get previous months for comparison
  const months = Object.keys(monthlyData).sort().reverse();
  const currentIndex = months.indexOf(currentMonth);
  const prevMonth = currentIndex < months.length - 1 ? months[currentIndex + 1] : null;
  const prevTotal = prevMonth ? monthlyData[prevMonth] : 0;
  
  // Calculate projection and variation
  const daysInMonth = 31; // Simplified - could be more precise
  const projectedTotal = Math.round(dailyAverage * daysInMonth);
  const monthVariation = prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
  
  // Format month name
  const formatMonth = (monthStr: string): string => {
    const date = new Date(`${monthStr}-01T00:00:00Z`);
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric',
      timeZone: 'UTC'
    });
  };
  
  // Calculate progress through month
  const today = new Date();
  const currentDay = today.getUTCDate();
  const progressPercent = (currentDay / daysInMonth) * 100;
  
  return (
    <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10 mb-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white mb-2">
          📊 {formatMonth(currentMonth)} Progress
        </h2>
        <div className="flex items-center gap-4">
          <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-3 py-1 text-sm text-emerald-400 font-medium">
            Month-to-Date Analysis
          </div>
          <div className="text-sm text-gray-400">
            Day {currentDay}/{daysInMonth} • {progressPercent.toFixed(0)}% through month
          </div>
        </div>
      </div>
      
      {/* Main metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* MTD Total */}
        <div className="bg-gradient-to-br from-emerald-400/10 to-emerald-400/5 border border-emerald-400/30 rounded-xl p-6">
          <div className="text-sm text-emerald-300 mb-2">Month-to-Date Total</div>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {currentTotal.toLocaleString()}
          </div>
          <div className="text-xs text-emerald-300">
            Based on {completeDays} complete days
          </div>
        </div>
        
        {/* Daily Average */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Daily Average</div>
          <div className="text-3xl font-bold text-white mb-2">
            {Math.round(dailyAverage).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            MTD total ÷ {completeDays} complete days
          </div>
        </div>
        
        {/* Projected Total */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Month Projection</div>
          <div className="text-3xl font-bold text-blue-400 mb-2">
            {projectedTotal.toLocaleString()}
          </div>
          <div className="text-xs text-blue-300">
            If pace continues ({Math.round(dailyAverage)}/day)
          </div>
        </div>
      </div>
      
      {/* Progress visualization */}
      <div className="bg-black/30 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Month Progress</h3>
          <div className="text-sm text-gray-400">
            {currentDay} of {daysInMonth} days
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-3 rounded-full transition-all duration-300"
            style={{ width: `${Math.min(progressPercent, 100)}%` }}
          />
        </div>
        
        {/* Cumulative line representation */}
        <div className="grid grid-cols-31 gap-px">
          {Array.from({ length: 31 }, (_, day) => {
            const dayNum = day + 1;
            const isPast = dayNum <= currentDay;
            const estimatedTx = isPast ? Math.round(dailyAverage) : 0;
            
            return (
              <div
                key={day}
                className={`h-2 rounded-sm ${
                  isPast 
                    ? 'bg-emerald-500' 
                    : 'bg-gray-600'
                }`}
                title={`Day ${dayNum}: ${isPast ? '~' + estimatedTx.toLocaleString() + ' tx' : 'Future'}`}
              />
            );
          })}
        </div>
      </div>
      
      {/* Comparison with previous months */}
      {prevMonth && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Month comparison */}
          <div className="bg-black/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">vs Previous Month</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-400">{formatMonth(prevMonth)}</div>
                <div className="text-2xl font-bold text-gray-300">
                  {prevTotal.toLocaleString()}
                </div>
              </div>
              <div className={`px-3 py-2 rounded-lg font-semibold ${
                monthVariation > 0 
                  ? 'bg-green-600/20 text-green-400 border border-green-500/30'
                  : monthVariation < 0
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                  : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
              }`}>
                {monthVariation > 0 ? '+' : ''}{monthVariation.toFixed(0)}%
              </div>
            </div>
          </div>
          
          {/* Run rate */}
          <div className="bg-black/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Current Run Rate</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Daily pace:</span>
                <span className="text-white font-semibold">{Math.round(dailyAverage).toLocaleString()} tx</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Weekly pace:</span>
                <span className="text-white font-semibold">{Math.round(dailyAverage * 7).toLocaleString()} tx</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monthly pace:</span>
                <span className="text-blue-400 font-semibold">{projectedTotal.toLocaleString()} tx</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}