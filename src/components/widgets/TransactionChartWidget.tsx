'use client';

import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { useRealtimeTransactionCount } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface TransactionChartWidgetProps extends WidgetProps {
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  chartType?: 'line' | 'bar' | 'area';
  showControls?: boolean;
}

interface DataPoint {
  timestamp: string;
  count: number;
  label: string;
}

export function TransactionChartWidget({
  widgetId,
  compact = false,
  timeRange: initialTimeRange = 'hour',
  chartType: initialChartType = 'line',
  showControls = true
}: TransactionChartWidgetProps) {
  const { history, isConnected, error } = useRealtimeTransactionCount();
  const [timeRange, setTimeRange] = useState(initialTimeRange);
  const [chartType, setChartType] = useState(initialChartType);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Process data based on time range
  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    let filteredData = history;
    let groupInterval = 1; // minutes

    switch (timeRange) {
      case 'hour':
        // Last hour, group by 1 minute
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        filteredData = history.filter(item => new Date(item.timestamp) > hourAgo);
        groupInterval = 1;
        break;
      case 'day':
        // Last day, group by 15 minutes
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        filteredData = history.filter(item => new Date(item.timestamp) > dayAgo);
        groupInterval = 15;
        break;
      case 'week':
        // Last week, group by 2 hours
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredData = history.filter(item => new Date(item.timestamp) > weekAgo);
        groupInterval = 120;
        break;
      case 'month':
        // Last month, group by 6 hours
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredData = history.filter(item => new Date(item.timestamp) > monthAgo);
        groupInterval = 360;
        break;
    }

    // Group data by interval
    const grouped: Record<string, DataPoint> = {};
    
    filteredData.forEach(item => {
      const date = new Date(item.timestamp);
      const intervalStart = new Date(
        Math.floor(date.getTime() / (groupInterval * 60 * 1000)) * (groupInterval * 60 * 1000)
      );
      
      const key = intervalStart.toISOString();
      if (!grouped[key]) {
        grouped[key] = {
          timestamp: key,
          count: 0,
          label: formatTimeLabel(intervalStart, timeRange)
        };
      }
      
      grouped[key].count += item.count;
    });

    return Object.values(grouped).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [history, timeRange]);

  const formatTimeLabel = (date: Date, range: string): string => {
    switch (range) {
      case 'hour':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'day':
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      case 'week':
        return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit' });
      case 'month':
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      default:
        return date.toLocaleString();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <BarChart3 className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Chart Error</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          {!compact && <span className="font-medium text-gray-900">Transaction Chart</span>}
        </div>
        
        {showControls && !compact && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className={`p-1 text-gray-500 hover:text-gray-700 ${isRefreshing ? 'animate-spin' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Time Range Controls */}
      {showControls && !compact && (
        <div className="flex items-center space-x-2 mb-4">
          {(['hour', 'day', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs rounded-full capitalize ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="flex-1 relative">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No data available</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-end space-x-1 px-2">
            {chartType === 'bar' && chartData.map((point, index) => {
              const height = (point.count / maxCount) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-blue-500 min-h-0.5 rounded-t-sm transition-all duration-300 hover:bg-blue-600"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${point.count} transactions at ${point.label}`}
                />
              );
            })}
            
            {chartType === 'line' && (
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <path
                  d={`M ${chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10;
                    const y = 190 - (point.count / maxCount) * 180;
                    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }).join(' ')}`}
                  stroke="#3B82F6"
                  strokeWidth="2"
                  fill="none"
                  className="transition-all duration-300"
                />
                {chartData.map((point, index) => {
                  const x = (index / (chartData.length - 1)) * 380 + 10;
                  const y = 190 - (point.count / maxCount) * 180;
                  return (
                    <circle
                      key={index}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="#3B82F6"
                      className="hover:r-4 transition-all duration-200"
                    >
                      <title>{`${point.count} transactions at ${point.label}`}</title>
                    </circle>
                  );
                })}
              </svg>
            )}

            {chartType === 'area' && (
              <svg className="w-full h-full" viewBox="0 0 400 200">
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 10 190 ${chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 380 + 10;
                    const y = 190 - (point.count / maxCount) * 180;
                    return `L ${x} ${y}`;
                  }).join(' ')} L 390 190 Z`}
                  fill="url(#areaGradient)"
                  stroke="#3B82F6"
                  strokeWidth="2"
                />
              </svg>
            )}
          </div>
        )}

        {/* Connection Status */}
        <div className="absolute top-2 right-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Stats Summary */}
      {!compact && chartData.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-green-600">
                {Math.max(...chartData.map(d => d.count))}
              </div>
              <div className="text-xs text-gray-500">Peak</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {Math.round(chartData.reduce((sum, d) => sum + d.count, 0) / chartData.length)}
              </div>
              <div className="text-xs text-gray-500">Average</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">
                {chartData.reduce((sum, d) => sum + d.count, 0)}
              </div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}