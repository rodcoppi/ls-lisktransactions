'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useRealtimeTransactionCount } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface TransactionCountWidgetProps extends WidgetProps {
  showTrend?: boolean;
  showHistory?: boolean;
  refreshInterval?: number;
}

export function TransactionCountWidget({
  widgetId,
  compact = false,
  showTrend = true,
  showHistory = true,
  refreshInterval = 5000
}: TransactionCountWidgetProps) {
  const { count, history, trend, isConnected, error, lastUpdate } = useRealtimeTransactionCount(refreshInterval);
  const [previousCount, setPreviousCount] = useState(0);
  const [countChange, setCountChange] = useState(0);

  // Track count changes for animation
  useEffect(() => {
    if (count !== previousCount) {
      setCountChange(count - previousCount);
      setPreviousCount(count);
      
      // Reset change indicator after animation
      const timer = setTimeout(() => setCountChange(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [count, previousCount]);

  // Calculate trend data
  const getTrendData = () => {
    if (!history || history.length < 2) return { direction: 'stable', percentage: 0 };
    
    const recent = history.slice(-10);
    const older = history.slice(-20, -10);
    
    if (older.length === 0) return { direction: 'stable', percentage: 0 };
    
    const recentAvg = recent.reduce((sum, item) => sum + item.count, 0) / recent.length;
    const olderAvg = older.reduce((sum, item) => sum + item.count, 0) / older.length;
    
    const percentage = ((recentAvg - olderAvg) / olderAvg) * 100;
    const direction = percentage > 5 ? 'up' : percentage < -5 ? 'down' : 'stable';
    
    return { direction, percentage: Math.abs(percentage) };
  };

  const trendData = getTrendData();

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Connection Error</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Main Count Display */}
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="relative">
          <div className={`text-4xl md:text-6xl font-bold text-blue-600 transition-all duration-500 ${
            countChange > 0 ? 'animate-pulse' : ''
          }`}>
            {count.toLocaleString()}
          </div>
          
          {/* Change Indicator */}
          {countChange !== 0 && (
            <div className={`absolute -top-2 -right-2 text-sm font-medium px-2 py-1 rounded-full transition-all duration-2000 ${
              countChange > 0 
                ? 'bg-green-100 text-green-700 animate-bounce' 
                : 'bg-red-100 text-red-700'
            }`}>
              {countChange > 0 ? '+' : ''}{countChange}
            </div>
          )}
        </div>
        
        {!compact && (
          <p className="text-gray-600 text-sm mt-2">
            Live Transaction Count
          </p>
        )}
      </div>

      {/* Trend and Status */}
      {!compact && showTrend && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            {trendData.direction === 'up' && (
              <>
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  +{trendData.percentage.toFixed(1)}%
                </span>
              </>
            )}
            {trendData.direction === 'down' && (
              <>
                <TrendingDown className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">
                  -{trendData.percentage.toFixed(1)}%
                </span>
              </>
            )}
            {trendData.direction === 'stable' && (
              <span className="text-sm text-gray-500">Stable</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      )}

      {/* Mini History Chart */}
      {!compact && showHistory && history.length > 0 && (
        <div className="mt-4">
          <div className="h-12 flex items-end space-x-1">
            {history.slice(-20).map((item, index) => {
              const maxCount = Math.max(...history.map(h => h.count));
              const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
              const isRecent = index >= history.length - 5;
              
              return (
                <div
                  key={index}
                  className={`flex-1 min-h-0.5 transition-all duration-300 ${
                    isRecent ? 'bg-blue-500' : 'bg-blue-300'
                  }`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${item.count} at ${new Date(item.timestamp).toLocaleTimeString()}`}
                />
              );
            })}
          </div>
          <div className="text-xs text-gray-500 mt-1 text-center">
            Last 20 updates
          </div>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="mt-2 text-center">
          <span className="text-xs text-gray-400">
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}