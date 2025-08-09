"use client";

import { useEffect, useState, useCallback } from "react";

interface ContractAnalysis {
  // Precise date-based data
  latestCompleteDate?: string;
  latestCompleteDateFormatted?: string;
  weeklyPeriod?: string;
  monthlyPeriod?: string;
  
  // Numerical data with precise calculations
  latestDayTxs?: number;
  weeklyTxs?: number;
  monthlyTxs?: number;
  
  // Chart data
  hourlyData: { [key: number]: number };
  dailyData: { [key: string]: number };
  weeklyData?: { [key: string]: number };
  monthlyData: { [key: string]: number };
  
  // Legacy fields (for compatibility)
  todayTxs: number;
  thisWeekTxs: number;
  lastWeekTxs?: number;
  thisMonthTxs: number;
  
  // Metadata
  totalDaysActive: number;
  totalMonthsActive?: number;
  avgTxsPerDay: number;
  avgTxsPerMonth: number;
  peakDay?: { day: string; count: number };
  peakHour?: { hour: number; count: number };
  lastTxTime?: string;
  deploymentDate?: string;
}

interface ContractData {
  totalTransactions: number;
  analysis: ContractAnalysis;
  lastUpdate: string;
  schemaVersion?: string;
}

// UTC helper for consistent date handling
const asUTCDate = (key: string): Date => new Date(`${key}T00:00:00Z`);

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Dashboard() {
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);

  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const isProduction = process.env.NODE_ENV === 'production';

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      // Use V2 API with abort signal
      const response = await fetch('/api/contract-data-v2', { signal });
      const data = await response.json();
      
      if (data.totalTransactions === 0 && data.error) {
        if (!isProduction) {
          // In development, show progress and allow polling
          setFetchProgress('🔄 Fetching historical transactions in development mode...');
          return null; // Trigger polling
        } else {
          // In production, just inform user
          setFetchProgress('📊 Data is being prepared. Please check back in a few minutes.');
          setLoading(false);
          return;
        }
      }
      
      setContractData(data);
      setFetchProgress(null);
      setLoading(false);
      
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      setError('Error loading data: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setLoading(false);
    }
  }, [isProduction]);

  useEffect(() => {
    const abortController = new AbortController();
    
    const initData = async () => {
      const result = await fetchData(abortController.signal);
      
      // Only start polling in development if data is not ready
      if (result === null && !isProduction) {
        let pollAttempts = 0;
        const maxAttempts = 10; // Reduced for development
        
        const poll = async () => {
          if (abortController.signal.aborted) return;
          
          pollAttempts++;
          console.log(`📡 Dev poll attempt ${pollAttempts}/${maxAttempts}`);
          
          try {
            const pollResponse = await fetch('/api/contract-data-v2', { 
              signal: abortController.signal 
            });
            const pollData = await pollResponse.json();
            
            if (pollData.totalTransactions > 0) {
              console.log('✅ Cache ready! Found transactions:', pollData.totalTransactions);
              setContractData(pollData);
              setFetchProgress(null);
              setLoading(false);
              return;
            }
            
            if (pollAttempts < maxAttempts) {
              const delay = Math.min(5000 + (pollAttempts * 2000), 15000);
              setTimeout(poll, delay);
            } else {
              setFetchProgress('⏰ Taking longer than expected. Please refresh the page.');
              setLoading(false);
            }
            
          } catch (pollError) {
            if (pollError instanceof Error && pollError.name === 'AbortError') {
              return;
            }
            console.error('Polling error:', pollError);
            setFetchProgress('❌ Error during polling. Please refresh the page.');
            setLoading(false);
          }
        };
        
        // Start polling after 3 seconds in dev
        setTimeout(poll, 3000);
      }
    };
    
    initData();
    
    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [fetchData, isProduction]);

  const analysis = contractData?.analysis;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#041924] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading LuckySea contract data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#041924]">
        <div className="text-center text-red-400">
          <h2 className="text-xl font-bold mb-2">Error!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05202E] via-[#041924] to-[#05202E] text-gray-200 relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute top-[15%] right-[20%] w-48 h-48 bg-gradient-radial from-emerald-400/5 to-transparent rounded-full animate-float-slow"></div>
      <div className="absolute bottom-[25%] left-[15%] w-36 h-36 bg-gradient-radial from-slate-600/20 to-transparent rounded-full animate-float-reverse"></div>
      
      <div className="max-w-6xl mx-auto p-6 relative z-10">
        {/* Header */}
        <div className="mb-12 p-12 bg-slate-800 border border-gray-600 rounded-xl">
          <div></div>
          
          {/* Logos */}
          <div className="flex items-center justify-center gap-6 mb-6 relative z-20">
            <svg width="80" height="28" viewBox="0 0 114 40" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M71.1139 18.063H64.4346V39.6471H71.1139V18.063Z"></path>
              <path d="M87.6884 27.794C86.7201 27.3527 85.5011 26.9209 84.0344 26.5083C83.2598 26.2606 82.609 26.0384 82.082 25.8448C81.555 25.6511 81.1392 25.4225 80.8376 25.159C80.5328 24.8956 80.3804 24.5717 80.3804 24.1844C80.3804 23.8257 80.5455 23.5051 80.8788 23.2289C81.2122 22.9527 81.682 22.813 82.2915 22.813C82.955 22.813 83.4757 23.0194 83.8471 23.4352C84.1296 23.7495 84.3391 24.1305 84.4693 24.5717H91.0344C90.8852 23.2606 90.4534 22.0924 89.7423 21.067C89.009 20.0162 87.9995 19.1908 86.7106 18.5971C85.4249 18.0035 83.9233 17.7051 82.2058 17.7051C80.3804 17.7051 78.8217 17.9749 77.536 18.5146C76.2503 19.0543 75.2788 19.8098 74.628 20.7781C73.9772 21.7463 73.6534 22.8416 73.6534 24.0575C73.6534 25.3876 73.9931 26.4797 74.6693 27.3368C75.3487 28.194 76.1645 28.8606 77.1201 29.3305C78.0757 29.8003 79.2725 30.2702 80.7106 30.7432C81.5138 31.0194 82.1836 31.2702 82.7233 31.4892C83.263 31.7114 83.6915 31.9749 84.009 32.2797C84.3265 32.5844 84.4852 32.9305 84.4852 33.3178C84.4852 33.7336 84.3042 34.086 83.9455 34.3749C83.5868 34.667 83.0471 34.8098 82.3264 34.8098C81.6058 34.8098 80.9614 34.5971 80.4788 34.1654C80.1423 33.867 79.8979 33.4924 79.7423 33.0384H73.1836C73.3296 34.3241 73.7455 35.4765 74.4376 36.4892C75.1836 37.5844 76.228 38.4416 77.5709 39.0638C78.9138 39.686 80.4979 39.9971 82.3233 39.9971C84.2598 39.9971 85.9011 39.7051 87.2439 39.1241C88.5868 38.5432 89.5899 37.7463 90.2534 36.7368C90.9169 35.7273 91.2503 34.5432 91.2503 33.1876C91.2503 31.8321 90.8979 30.6352 90.1931 29.7622C89.4884 28.8892 88.6503 28.2321 87.682 27.7908L87.6884 27.794Z"></path>
              <path d="M51.7809 10.9048L45.1016 18.0635V39.6445H62.4V33.0349H51.7809V10.9048Z"></path>
              <path d="M106.317 28.7715L113.314 18.0635L105.847 18.0603L100.003 27.0381V10.9048L93.3203 18.0635V39.6445H100.003V30.4857L106.393 39.6445H113.866L106.317 28.7715Z"></path>
              <g>
                <path d="M17.543 0.000976562L13.5557 6.55653L26.6033 27.9248L15.6795 39.6454H24.9239L35.0922 28.7534L17.543 0.000976562Z"></path>
                <path d="M13.2581 33.0349L8.49939 27.9237L16.5089 14.7968L12.5121 8.25391L0.000976562 28.7523L10.1692 39.6444H13.5407L19.7216 33.0349H13.2581Z"></path>
              </g>
            </svg>
            <div className="w-1 h-10 bg-gradient-to-b from-transparent via-emerald-400 to-transparent rounded-full shadow-emerald-400/50 shadow-md"></div>
            <img 
              src="https://luckysea.gg/assets/logotipo.svg" 
              alt="LuckySea" 
              className="w-24 h-auto" 
            />
          </div>
          
          {/* Title */}
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-3">
              LuckySea Analytics Dashboard
            </h1>
            <div className="inline-block bg-emerald-400/20 border border-emerald-400/50 rounded-full px-4 py-1 text-sm text-emerald-400 font-medium">
              🌍 All times in UTC timezone
            </div>
          </div>
          
          {/* Status and Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full shadow-emerald-400/50 shadow-sm"></div>
                <span className="text-emerald-400 text-sm font-medium">System Online</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <span className="text-gray-300 text-sm">Pre-loaded historical data</span>
            </div>
            
            <div className="flex gap-3">
              <a 
                href="https://blockscout.lisk.com/address/0xf18485f75551FFCa4011C32a0885ea8C22336840?tab=txs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-emerald-400 text-[#041924] px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-emerald-300 hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
              >
                📈 Live Transactions
              </a>
              <a 
                href="https://blockscout.lisk.com/address/0xf18485f75551FFCa4011C32a0885ea8C22336840?tab=index" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white/10 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium border border-white/20 transition-all hover:bg-white/15 hover:-translate-y-0.5 hover:shadow-lg inline-flex items-center gap-2"
              >
                🔍 Contract Details
              </a>
            </div>
            
            <div className="bg-emerald-400/10 border border-emerald-400/30 rounded-lg px-4 py-2">
              <p className="text-emerald-400 text-sm font-medium">
                📊 Last updated: {contractData?.lastUpdate ? getTimeAgo(contractData.lastUpdate) : 'Loading...'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Historical data • Daily snapshots at 00:00 UTC
              </p>
            </div>
          </div>
          
          <div className="text-center mt-4 pt-4 border-t border-white/10">
            <p className="text-gray-500 text-sm">
              Contract: <code className="bg-emerald-400/10 text-emerald-400 px-2 py-1 rounded text-xs">{CONTRACT_ADDRESS}</code>
            </p>
          </div>
          
          {fetchProgress && (
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg text-center">
              <div className="text-yellow-400 text-sm font-medium">{fetchProgress}</div>
              <div className="w-full h-1 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-emerald-400 animate-progress rounded-full"></div>
              </div>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Transactions - PRIMARY CARD */}
          <div className="bg-gradient-to-br from-emerald-400/10 to-[#041924] p-8 rounded-2xl shadow-2xl border border-emerald-400/40 relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-emerald-400/20 hover:shadow-2xl animate-fade-up">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/5 to-transparent pointer-events-none animate-shimmer"></div>
            <h3 className="text-xl font-semibold text-white mb-3 relative">🎲 Total Transactions</h3>
            <p className="text-3xl font-bold text-emerald-400 relative">
              {contractData?.totalTransactions?.toLocaleString() || 0}
            </p>
          </div>

          {/* Latest Complete Day */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-white/15 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-100">
            <h3 className="text-lg font-semibold text-white mb-2">📊 {analysis?.latestCompleteDateFormatted || 'Loading...'}</h3>
            <p className="text-2xl font-bold text-white">
              {analysis?.latestDayTxs?.toLocaleString() || 0} <span className="text-sm font-normal text-gray-400">transactions</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">Complete 24h data</p>
          </div>

          {/* Weekly Period */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-emerald-400/30 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-200">
            <h3 className="text-lg font-semibold text-white mb-2">📈 7-Day Period</h3>
            <p className="text-2xl font-bold text-white">
              {analysis?.weeklyTxs?.toLocaleString() || 0} <span className="text-sm font-normal text-gray-400">transactions</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">{analysis?.weeklyPeriod || 'Loading period...'}</p>
          </div>

          {/* Monthly Progress */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-emerald-400/30 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-300">
            <h3 className="text-lg font-semibold text-white mb-2">🗓️ Month Progress</h3>
            <p className="text-2xl font-bold text-white">
              {analysis?.monthlyTxs?.toLocaleString() || 0} <span className="text-sm font-normal text-gray-400">transactions</span>
            </p>
            <p className="text-xs text-gray-500 mt-2">{analysis?.monthlyPeriod || 'Loading period...'}</p>
          </div>

          {/* Average per Day */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-emerald-400/30 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-400">
            <h3 className="text-lg font-semibold text-white mb-2">📊 Average per Day</h3>
            <p className="text-2xl font-bold text-emerald-400">
              {analysis?.avgTxsPerDay?.toLocaleString() || 0}
            </p>
          </div>

          {/* Average per Month */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-emerald-400/30 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-500">
            <h3 className="text-lg font-semibold text-white mb-2">📈 Average per Month</h3>
            <p className="text-2xl font-bold text-emerald-400">
              {analysis?.avgTxsPerMonth?.toLocaleString() || 0}
            </p>
          </div>

          {/* Total Days Active */}
          <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-6 rounded-xl shadow-xl border border-emerald-400/30 transition-all hover:-translate-y-1 hover:shadow-2xl animate-fade-up delay-600">
            <h3 className="text-lg font-semibold text-white mb-2">🗓️ Total Days Active</h3>
            <p className="text-2xl font-bold text-white">
              {analysis?.totalDaysActive?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Hourly Activity */}
        <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10 mb-8 animate-fade-up delay-700">
          <h2 className="text-2xl font-semibold mb-6 text-gray-200">
            📈 Hourly Activity - {analysis?.latestCompleteDateFormatted || 'Loading...'} (UTC)
          </h2>
          <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 xl:grid-cols-24 gap-2">
            {Array.from({ length: 24 }, (_, hour) => {
              const count = analysis?.hourlyData?.[hour] || 0;
              return (
                <div 
                  key={hour} 
                  className={`text-center p-3 rounded-lg transition-all hover:scale-105 ${
                    count > 0 
                      ? 'bg-emerald-400/20 border border-emerald-400 shadow-emerald-400/20 shadow-md' 
                      : 'bg-white/5 border border-white/10'
                  }`}
                >
                  <div className="text-xs text-gray-400">{hour}h</div>
                  <div className={`text-sm font-semibold ${count > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10 mb-8 animate-fade-up delay-800">
          <h2 className="text-2xl font-bold mb-6 text-emerald-400 text-shadow-emerald">
            📅 Daily Breakdown (Last 7 days UTC)
          </h2>
          <div className="flex gap-4 overflow-x-auto">
            {Object.keys(analysis?.dailyData || {}).length === 0 ? (
              <div className="w-full text-center p-8 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600">
                <div className="text-yellow-400 text-lg mb-2">⏳ Loading historical data...</div>
                <div className="text-gray-400 text-sm">Daily breakdown will appear here once all transactions are processed</div>
              </div>
            ) : (
              Object.entries(analysis?.dailyData || {})
                .sort(([a], [b]) => asUTCDate(b).getTime() - asUTCDate(a).getTime())
                .slice(0, 7)
                .map(([date, count]) => (
                  <div 
                    key={date} 
                    className="min-w-[140px] text-center p-4 bg-gradient-to-br from-emerald-400/15 to-emerald-400/5 rounded-xl border border-emerald-400/40 shadow-emerald-400/20 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-emerald-400/30 hover:shadow-xl"
                  >
                    <div className="text-sm text-gray-300 mb-1">
                      {asUTCDate(date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit', 
                        timeZone: 'UTC' 
                      })}
                    </div>
                    <div className="text-xl font-bold text-emerald-400">
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="bg-gradient-to-br from-[#041924] to-[#052738] p-8 rounded-xl shadow-xl border border-white/10 animate-fade-up delay-900">
          <h2 className="text-2xl font-bold mb-6 text-emerald-400 text-shadow-emerald">
            📊 Monthly Breakdown (UTC)
          </h2>
          <div className="flex gap-4 overflow-x-auto">
            {Object.keys(analysis?.monthlyData || {}).length === 0 ? (
              <div className="w-full text-center p-8 bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-600">
                <div className="text-yellow-400 text-lg mb-2">⏳ Processing transaction history...</div>
                <div className="text-gray-400 text-sm">Monthly breakdown will show once all historical data is analyzed</div>
              </div>
            ) : (
              Object.entries(analysis?.monthlyData || {})
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, count]) => (
                  <div 
                    key={month} 
                    className="min-w-[180px] text-center p-6 bg-gradient-to-br from-emerald-400/15 to-emerald-400/5 rounded-xl border border-emerald-400/40 shadow-emerald-400/20 shadow-lg backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-emerald-400/30 hover:shadow-xl"
                  >
                    <div className="text-base text-gray-300 mb-2">
                      {asUTCDate(month + '-01').toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric', 
                        timeZone: 'UTC' 
                      })}
                    </div>
                    <div className="text-2xl font-bold text-emerald-400 mb-1">
                      {count.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-300">transactions</div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}