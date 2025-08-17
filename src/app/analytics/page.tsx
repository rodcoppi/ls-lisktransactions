"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface HistoricalData {
  date: string;
  totalTransactions: number;
  dailyCount: number;
  hourlyData: { [key: number]: number };
  timestamp: string;
  weeklyTotal: number;
  monthlyTotal: number;
  avgTxsPerDay: number;
  peakHour: { hour: number; count: number };
  status: string;
}

interface HistoricalAnalytics {
  totalDays: number;
  totalTransactions: number;
  averageDailyTxs: number;
  peakDay: { date: string; count: number };
  mostActiveHour: { hour: number; avgCount: number };
  weeklyGrowthRate: number;
  consistency: number;
}

export default function AdvancedAnalytics() {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [analytics, setAnalytics] = useState<HistoricalAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | 'all'>('30d');

  const fetchHistoricalData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (selectedPeriod === '7d') {
        params.append('days', '7');
      } else if (selectedPeriod === '30d') {
        params.append('days', '30');
      }
      
      params.append('analytics', 'true');
      
      const response = await fetch(`/api/historical-data?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data && Array.isArray(result.data)) {
        setHistoricalData(result.data);
        setAnalytics(result.analytics || null);
      } else {
        console.warn('No historical data available:', result);
        setHistoricalData([]);
        setAnalytics(null);
      }
    } catch (error) {
      console.error('Failed to fetch historical data:', error);
      // Set empty data to prevent undefined errors
      setHistoricalData([]);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  const calculateWeekOverWeek = () => {
    if (historicalData.length < 14) return null;
    
    const thisWeekData = historicalData.slice(-7);
    const lastWeekData = historicalData.slice(-14, -7);
    
    const thisWeekTotal = thisWeekData.reduce((sum, day) => sum + day.dailyCount, 0);
    const lastWeekTotal = lastWeekData.reduce((sum, day) => sum + day.dailyCount, 0);
    
    const change = lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;
    
    return { thisWeekTotal, lastWeekTotal, change };
  };

  const weekOverWeek = calculateWeekOverWeek();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#041924] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading Advanced Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05202E] via-[#041924] to-[#05202E] text-gray-200">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        
        {/* Navigation Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-slate-800 border border-gray-600 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
                🧠 Advanced Analytics
              </h1>
              <p className="text-sm sm:text-base text-gray-400">Deep insights from historical transaction data</p>
              <div className="mt-2 inline-flex items-center gap-2 bg-blue-400/10 border border-blue-400/30 rounded-lg px-3 py-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span className="text-blue-400 text-xs sm:text-sm font-medium">
                  Historical data available from August 7, 2025
                </span>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Link 
                href="/"
                className="bg-white/10 text-gray-200 px-3 py-2 sm:px-4 rounded-lg text-sm font-medium border border-white/20 transition-all hover:bg-white/15 inline-flex items-center gap-2"
              >
                <span className="text-xs sm:text-sm">←</span>
                <span className="hidden xs:inline">Back to Dashboard</span>
                <span className="xs:hidden">Dashboard</span>
              </Link>
            </div>
          </div>
          
          {/* Period Selector - Mobile Stack */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
              <button
                onClick={() => setSelectedPeriod('7d')}
                className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedPeriod === '7d'
                    ? 'bg-emerald-400 text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="sm:hidden">7D</span>
                <span className="hidden sm:inline">Last 7 Days</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('30d')}
                className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedPeriod === '30d'
                    ? 'bg-emerald-400 text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="sm:hidden">30D</span>
                <span className="hidden sm:inline">Last 30 Days</span>
              </button>
              <button
                onClick={() => setSelectedPeriod('all')}
                className={`px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  selectedPeriod === 'all'
                    ? 'bg-emerald-400 text-black'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                <span className="sm:hidden">ALL</span>
                <span className="hidden sm:inline">All Time</span>
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Overview - Mobile Grid */}
        {analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-6">
              <div className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2 font-medium">Days Tracked</div>
              <div className="text-xl sm:text-3xl font-bold text-emerald-400 leading-none">
                {analytics.totalDays || 0}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">Historical snapshots</div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-6">
              <div className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2 font-medium">Total Tracked</div>
              <div className="text-xl sm:text-3xl font-bold text-white leading-none">
                {(analytics.totalTransactions || 0).toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">All transactions</div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-6">
              <div className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2 font-medium">Daily Average</div>
              <div className="text-xl sm:text-3xl font-bold text-blue-400 leading-none">
                {Math.round(analytics.averageDailyTxs || 0).toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">Per tracked day</div>
            </div>

            <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-6">
              <div className="text-xs sm:text-sm text-slate-400 mb-1 sm:mb-2 font-medium">Consistency</div>
              <div className="text-xl sm:text-3xl font-bold text-purple-400 leading-none">
                {((analytics.consistency || 0) * 100).toFixed(0)}%
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 mt-1">Activity regularity</div>
            </div>

          </div>
        ) : (
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 text-center">
            <div className="text-sm sm:text-base text-gray-400">
              {historicalData.length === 0 
                ? "📊 No historical data available yet. Data collection starts automatically." 
                : "📊 Loading analytics..."}
            </div>
          </div>
        )}

        {/* Week over Week Comparison - Mobile Layout */}
        {weekOverWeek && (
          <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg sm:rounded-xl p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">📊 Week-over-Week Analysis</h3>
            
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-6">
              <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">This Week</div>
                <div className="text-lg sm:text-2xl font-bold text-emerald-400 leading-none">
                  {weekOverWeek.thisWeekTotal.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">Last Week</div>
                <div className="text-lg sm:text-2xl font-bold text-gray-300 leading-none">
                  {weekOverWeek.lastWeekTotal.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center">
                <div className="text-xs sm:text-sm text-gray-400 mb-1">Change</div>
                <div className={`text-lg sm:text-2xl font-bold leading-none ${
                  weekOverWeek.change > 0 ? 'text-green-400' : 
                  weekOverWeek.change < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {weekOverWeek.change > 0 ? '+' : ''}{weekOverWeek.change.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Peak Performance Analysis - Mobile Stacked */}
        {analytics && analytics.peakDay && analytics.mostActiveHour && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
            
            {/* Peak Day Analysis - Mobile Optimized */}
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">🚀 Peak Performance</h3>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">Best Day</div>
                  <div className="text-sm sm:text-lg font-bold text-emerald-400">
                    {new Date(analytics.peakDay.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                      timeZone: 'UTC'
                    })}
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white mt-1 leading-none">
                    {(analytics.peakDay.count || 0).toLocaleString()} transactions
                  </div>
                </div>
                
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">Most Active Hour</div>
                  <div className="text-sm sm:text-lg font-bold text-blue-400">
                    {analytics.mostActiveHour.hour || 0}:00 UTC
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-white mt-1 leading-none">
                    {Math.round(analytics.mostActiveHour.avgCount || 0).toLocaleString()} avg/hour
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Analysis - Mobile Optimized */}
            <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">📈 Growth Trends</h3>
              
              <div className="space-y-3 sm:space-y-4">
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">Weekly Growth Rate</div>
                  <div className={`text-2xl sm:text-3xl font-bold leading-none ${
                    (analytics.weeklyGrowthRate || 0) > 0 ? 'text-green-400' : 
                    (analytics.weeklyGrowthRate || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {(analytics.weeklyGrowthRate || 0) > 0 ? '+' : ''}{(analytics.weeklyGrowthRate || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Average week-over-week</div>
                </div>
                
                <div className="bg-black/20 border border-white/10 rounded-lg p-3 sm:p-4 text-center sm:text-left">
                  <div className="text-xs sm:text-sm text-gray-400 mb-1">Data Coverage</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-400 leading-none">
                    {historicalData.length} days
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Historical snapshots available</div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Historical Timeline - Mobile Optimized */}
        <div className="bg-slate-800/20 border border-slate-700/30 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <h3 className="text-lg sm:text-xl font-medium text-white mb-3 sm:mb-4">📅 Historical Timeline</h3>
          
          {historicalData.length > 0 ? (
            <div className="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
              {historicalData.slice().reverse().map((day) => (
                <div key={day.date} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-black/20 border border-white/5 rounded-lg p-3 gap-2 sm:gap-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-300 min-w-0">
                      {new Date(day.date + 'T00:00:00Z').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      day.status === 'complete' 
                        ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/30'
                        : day.status === 'system_issue'
                        ? 'bg-orange-400/20 text-orange-400 border border-orange-400/30'
                        : 'bg-gray-400/20 text-gray-400 border border-gray-400/30'
                    }`}>
                      {day.status === 'system_issue' ? 'system issue (fixed)' : day.status || 'unknown'}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                    <div className="text-gray-300">
                      <span className="text-white font-semibold">{(day.dailyCount || 0).toLocaleString()}</span> txs
                    </div>
                    <div className="text-gray-400 text-xs sm:text-sm">
                      {day.peakHour?.count > 0 
                        ? `Peak: ${day.peakHour.hour}:00 (${day.peakHour.count})`
                        : 'Peak: No hourly data'
                      }
                    </div>
                    <div className="text-gray-500 text-xs">
                      {day.status === 'complete' ? 'Complete day' : day.status || 'Unknown'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-8 text-gray-400">
              <div className="text-3xl sm:text-4xl mb-2">📊</div>
              <div className="text-base sm:text-lg">No Historical Data Available</div>
              <div className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                Historical data collection starts automatically.<br/>
                Check back after 24 hours for the first data snapshot.
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}