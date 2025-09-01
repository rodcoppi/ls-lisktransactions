"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Analytics() {
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [dailyAverage, setDailyAverage] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        
        // Fetch total from blockchain
        const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
        const response = await fetch(`https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/counters`);
        const data = await response.json();
        
        const total = parseInt(data.transactions_count) || 0;
        setTotalTransactions(total);
        
        // Calculate days since launch (August 4, 2025)
        const launchDate = new Date('2025-08-04');
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - launchDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Calculate average (total / (days - 1))
        const average = diffDays > 1 ? Math.round(total / (diffDays - 1)) : 0;
        setDailyAverage(average);
        
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#05202E] to-[#041924] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#05202E] via-[#041924] to-[#05202E] text-gray-200">
      <div className="max-w-4xl mx-auto p-3 sm:p-6">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-white mb-2">
            📊 Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-400 mb-6">
            Real-time blockchain statistics
          </p>
          
          <Link 
            href="/"
            className="inline-flex items-center gap-2 bg-white/10 text-gray-200 px-4 py-2 rounded-lg text-sm font-medium border border-white/20 transition-all hover:bg-white/15"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Main Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
          
          {/* Total Transactions */}
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="text-sm text-slate-400 mb-3 font-medium tracking-wider uppercase">
              Total Transactions
            </div>
            <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-white to-emerald-400 bg-clip-text text-transparent leading-none">
              {totalTransactions.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 mt-3">
              Live from blockchain
            </div>
          </div>

          {/* Daily Average */}
          <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-950/30 backdrop-blur-sm border border-emerald-700/30 rounded-xl p-6 sm:p-8 text-center shadow-2xl">
            <div className="text-sm text-emerald-400 mb-3 font-medium tracking-wider uppercase">
              Daily Average
            </div>
            <div className="text-4xl sm:text-5xl font-bold text-emerald-400 leading-none">
              {dailyAverage.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400/60 mt-3">
              Per day (excl. launch)
            </div>
          </div>

        </div>

        {/* Info Box */}
        <div className="mt-12 max-w-2xl mx-auto">
          <div className="bg-blue-400/10 border border-blue-400/30 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-blue-400 text-sm font-medium">Live Data</span>
            </div>
            <p className="text-xs text-blue-400/80">
              Statistics calculated from August 4, 2025 launch date
            </p>
            <p className="text-xs text-blue-400/60 mt-1">
              Updates every 5 minutes • Direct from blockchain
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}