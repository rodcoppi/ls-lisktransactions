"use client";

interface ThirtyDayProgressProps {
  dailyData: { [date: string]: number };
  latestCompleteDate: string;
}

export default function ThirtyDayProgress({ 
  dailyData, 
  latestCompleteDate 
}: ThirtyDayProgressProps) {
  
  // Calcular os últimos 30 dias a partir da data mais recente
  const calculateLast30Days = () => {
    if (!latestCompleteDate) return { dates: [], total: 0, dailyAverage: 0 };
    
    const endDate = new Date(`${latestCompleteDate}T00:00:00Z`);
    const dates: string[] = [];
    let total = 0;
    
    // Coletar últimos 30 dias
    for (let i = 29; i >= 0; i--) {
      const date = new Date(endDate);
      date.setUTCDate(date.getUTCDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dates.push(dateKey);
      
      const txCount = dailyData[dateKey] || 0;
      total += txCount;
    }
    
    const activeDays = dates.filter(date => dailyData[date] > 0).length;
    const dailyAverage = activeDays > 0 ? total / activeDays : 0;
    
    return { dates, total, dailyAverage, activeDays };
  };

  const current30Days = calculateLast30Days();
  
  // Calcular período anterior (dias 31-60)
  const calculatePrevious30Days = () => {
    if (!latestCompleteDate) return { total: 0 };
    
    const endDate = new Date(`${latestCompleteDate}T00:00:00Z`);
    let total = 0;
    
    // Período anterior: dias 31-60 atrás
    for (let i = 59; i >= 30; i--) {
      const date = new Date(endDate);
      date.setUTCDate(date.getUTCDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      
      const txCount = dailyData[dateKey] || 0;
      total += txCount;
    }
    
    return { total };
  };

  const previous30Days = calculatePrevious30Days();
  const periodVariation = previous30Days.total > 0 
    ? ((current30Days.total - previous30Days.total) / previous30Days.total) * 100 
    : 0;

  // Formatear período de datas
  const formatPeriod = (): string => {
    if (current30Days.dates.length === 0) return 'No data';
    const startDate = new Date(`${current30Days.dates[0]}T00:00:00Z`);
    const endDate = new Date(`${current30Days.dates[current30Days.dates.length - 1]}T00:00:00Z`);
    
    return `${startDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit',
      timeZone: 'UTC'
    })} - ${endDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit',
      timeZone: 'UTC' 
    })}`;
  };


  return (
    <div className="bg-slate-800/20 backdrop-blur-sm border border-slate-700/30 rounded-2xl p-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-xl font-medium text-white mb-2">30-Day Rolling Period</h2>
        <div className="text-sm text-slate-400">
          {formatPeriod()} • Last 30 days of activity
        </div>
      </div>

      {/* Main metrics - Simple */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current 30-day total */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">30-Day Total</div>
          <div className="text-3xl font-bold text-emerald-400 mb-2">
            {current30Days.total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            {current30Days.activeDays || 0} active days
          </div>
        </div>

        {/* Daily average */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">Daily Average</div>
          <div className="text-3xl font-bold text-white mb-2">
            {Math.round(current30Days.dailyAverage).toLocaleString()}
          </div>
          <div className="text-xs text-gray-400">
            Per active day
          </div>
        </div>

        {/* Period comparison */}
        <div className="bg-black/20 border border-white/10 rounded-xl p-6">
          <div className="text-sm text-gray-400 mb-2">vs Previous 30 Days</div>
          <div className={`text-3xl font-bold mb-2 ${
            periodVariation > 0 ? 'text-green-400' : 
            periodVariation < 0 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {periodVariation > 0 ? '+' : ''}{periodVariation.toFixed(0)}%
          </div>
          <div className="text-xs text-gray-400">
            Previous: {previous30Days.total.toLocaleString()}
          </div>
        </div>
      </div>


      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Peak Day</div>
          <div className="text-2xl font-bold text-emerald-400">
            {Math.max(...current30Days.dates.map(date => dailyData[date] || 0)).toLocaleString()}
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Active Days</div>
          <div className="text-2xl font-bold text-white">
            {current30Days.activeDays || 0}/30
          </div>
        </div>
        <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl px-5 py-4 text-center">
          <div className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Period Type</div>
          <div className="text-xl font-bold text-slate-300">
            Rolling
          </div>
        </div>
      </div>
    </div>
  );
}