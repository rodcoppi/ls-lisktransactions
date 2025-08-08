'use client';

import React, { useState, useMemo } from 'react';
import { Activity, ArrowUpRight, ArrowDownLeft, Clock, Filter } from 'lucide-react';
import { useRealtimeTransactionCount } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface ActivityFeedWidgetProps extends WidgetProps {
  maxItems?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
}

interface ActivityItem {
  id: string;
  type: 'transaction' | 'block' | 'event' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  value?: number;
  status: 'success' | 'pending' | 'failed' | 'warning';
  metadata?: Record<string, any>;
}

export function ActivityFeedWidget({
  widgetId,
  compact = false,
  maxItems = 20,
  showFilters = true,
  autoRefresh = true
}: ActivityFeedWidgetProps) {
  const { history, isConnected, error } = useRealtimeTransactionCount();
  const [typeFilter, setTypeFilter] = useState<ActivityItem['type'] | 'all'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Generate activity items from transaction history and mock data
  const activityItems = useMemo(() => {
    const items: ActivityItem[] = [];
    
    // Add transaction updates from history
    if (history && history.length > 0) {
      history.slice(-10).forEach((item, index) => {
        const change = index > 0 ? item.count - history[index - 1].count : 0;
        if (change !== 0) {
          items.push({
            id: `tx-${item.timestamp}`,
            type: 'transaction',
            title: change > 0 ? 'Transactions Increased' : 'Transaction Activity',
            description: `Count changed by ${Math.abs(change)} transactions`,
            timestamp: item.timestamp,
            value: change,
            status: change > 0 ? 'success' : 'pending',
            metadata: { count: item.count, change }
          });
        }
      });
    }

    // Add mock activity for demonstration
    const mockActivities: Omit<ActivityItem, 'id'>[] = [
      {
        type: 'block',
        title: 'New Block Mined',
        description: 'Block #1,234,567 added to chain',
        timestamp: new Date(Date.now() - Math.random() * 300000).toISOString(),
        status: 'success',
        metadata: { blockNumber: 1234567, transactions: 45 }
      },
      {
        type: 'event',
        title: 'Network Sync Complete',
        description: 'Full blockchain synchronization finished',
        timestamp: new Date(Date.now() - Math.random() * 600000).toISOString(),
        status: 'success'
      },
      {
        type: 'alert',
        title: 'High Memory Usage',
        description: 'System memory usage exceeded 85%',
        timestamp: new Date(Date.now() - Math.random() * 900000).toISOString(),
        status: 'warning',
        metadata: { memoryUsage: 87.3 }
      },
      {
        type: 'transaction',
        title: 'Large Transaction Detected',
        description: 'Transaction with value > 1000 LSK',
        timestamp: new Date(Date.now() - Math.random() * 1200000).toISOString(),
        status: 'success',
        value: 1500.5,
        metadata: { amount: 1500.5, from: '0x123...', to: '0x456...' }
      }
    ];

    mockActivities.forEach((activity, index) => {
      items.push({
        ...activity,
        id: `mock-${index}-${Date.now()}`
      });
    });

    // Sort by timestamp (newest first)
    return items
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxItems);
  }, [history, maxItems]);

  // Filter items by type
  const filteredItems = activityItems.filter(item =>
    typeFilter === 'all' || item.type === typeFilter
  );

  const getActivityIcon = (type: ActivityItem['type'], status: ActivityItem['status']) => {
    const baseClasses = "w-4 h-4";
    
    switch (type) {
      case 'transaction':
        return status === 'success' 
          ? <ArrowUpRight className={`${baseClasses} text-green-600`} />
          : <ArrowDownLeft className={`${baseClasses} text-blue-600`} />;
      case 'block':
        return <div className={`${baseClasses} bg-blue-600 rounded-sm`} />;
      case 'event':
        return <Activity className={`${baseClasses} text-purple-600`} />;
      case 'alert':
        return <Clock className={`${baseClasses} text-orange-600`} />;
      default:
        return <Activity className={`${baseClasses} text-gray-600`} />;
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      case 'warning':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimestamp = (timestamp: string, compact: boolean) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return compact ? `${minutes}m` : `${minutes} min ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return compact ? `${hours}h` : `${hours} hr ago`;
    }
    
    // More than a day
    return compact 
      ? date.toLocaleDateString([], { month: 'short', day: 'numeric' })
      : date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <Activity className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Activity Feed Error</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-gray-700" />
          {!compact && <span className="font-medium text-gray-900">Activity Feed</span>}
        </div>
        
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          
          {showFilters && !compact && (
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-32">
                  {(['all', 'transaction', 'block', 'event', 'alert'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setTypeFilter(type);
                        setIsFilterOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-50 capitalize ${
                        typeFilter === type ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredItems.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
            </div>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(item.type, item.status)}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {item.title}
                    </p>
                    <p className={`text-xs text-gray-600 mt-1 ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {item.description}
                    </p>
                    
                    {/* Metadata */}
                    {!compact && item.metadata && (
                      <div className="mt-2 text-xs text-gray-500">
                        {Object.entries(item.metadata).slice(0, 2).map(([key, value]) => (
                          <span key={key} className="mr-3">
                            {key}: {typeof value === 'number' ? value.toLocaleString() : String(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Value */}
                  {item.value !== undefined && (
                    <div className={`text-sm font-medium ${getStatusColor(item.status)} ml-2`}>
                      {item.value > 0 ? '+' : ''}{item.value.toLocaleString()}
                    </div>
                  )}
                </div>
                
                {/* Timestamp and Status */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(item.timestamp, compact)}
                  </span>
                  <span className={`text-xs capitalize px-2 py-1 rounded-full ${
                    item.status === 'success' ? 'bg-green-100 text-green-700' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    item.status === 'failed' ? 'bg-red-100 text-red-700' :
                    item.status === 'warning' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Activity Summary */}
      {!compact && activityItems.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            {(['transaction', 'block', 'event', 'alert'] as const).map((type) => {
              const count = activityItems.filter(a => a.type === type).length;
              return (
                <div key={type} className="flex flex-col items-center">
                  {getActivityIcon(type, 'success')}
                  <span className="mt-1 font-medium">{count}</span>
                  <span className="capitalize text-gray-500">{type}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}