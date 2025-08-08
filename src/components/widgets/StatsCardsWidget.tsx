'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Users, Zap, DollarSign, Activity, Database, Clock } from 'lucide-react';
import { useRealtimeDashboard, useConnectionStatus } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface StatsCardsWidgetProps extends WidgetProps {
  layout?: 'grid' | 'row';
  showTrends?: boolean;
  cardCount?: number;
}

interface StatCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ReactNode;
  color: string;
  description?: string;
}

export function StatsCardsWidget({
  widgetId,
  compact = false,
  layout = 'grid',
  showTrends = true,
  cardCount = 6
}: StatsCardsWidgetProps) {
  const { stats, isConnected, error: dashboardError } = useRealtimeDashboard();
  const { metrics, error: connectionError } = useConnectionStatus();

  const error = dashboardError || connectionError;

  // Generate stat cards from available data
  const statCards: StatCard[] = [
    {
      id: 'total-transactions',
      title: 'Total Transactions',
      value: stats?.totalTransactions?.toLocaleString() || '---',
      change: 5.2,
      changeType: 'increase',
      icon: <Database className="w-5 h-5" />,
      color: 'text-blue-600',
      description: 'All time transactions'
    },
    {
      id: 'active-connections',
      title: 'Active Connections',
      value: metrics?.connections?.activeConnections || 0,
      change: -2.1,
      changeType: 'decrease',
      icon: <Users className="w-5 h-5" />,
      color: 'text-green-600',
      description: 'Current active connections'
    },
    {
      id: 'events-per-second',
      title: 'Events/Second',
      value: metrics?.events?.eventsPerSecond || 0,
      change: 12.5,
      changeType: 'increase',
      icon: <Zap className="w-5 h-5" />,
      color: 'text-yellow-600',
      description: 'Real-time event processing'
    },
    {
      id: 'health-score',
      title: 'System Health',
      value: `${metrics?.healthScore ? Math.round(metrics.healthScore) : 100}%`,
      change: 0.8,
      changeType: 'increase',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-emerald-600',
      description: 'Overall system performance'
    },
    {
      id: 'avg-latency',
      title: 'Avg Latency',
      value: `${metrics?.latency?.p50 ? Math.round(metrics.latency.p50) : 0}ms`,
      change: -15.3,
      changeType: 'decrease',
      icon: <Clock className="w-5 h-5" />,
      color: 'text-purple-600',
      description: 'P50 response time'
    },
    {
      id: 'queue-pending',
      title: 'Queue Pending',
      value: metrics?.queue?.pending || 0,
      change: -8.7,
      changeType: 'decrease',
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-orange-600',
      description: 'Pending queue items'
    }
  ].slice(0, cardCount);

  const getTrendIcon = (changeType: StatCard['changeType'], change?: number) => {
    if (!showTrends || change === undefined) return null;
    
    if (changeType === 'increase') {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (changeType === 'decrease') {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    }
    return null;
  };

  const getTrendColor = (changeType: StatCard['changeType']) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <Activity className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Stats Error</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      {/* Cards Grid/Row */}
      <div className={`h-full ${
        layout === 'row' 
          ? 'flex space-x-4 overflow-x-auto' 
          : compact 
            ? 'grid grid-cols-2 gap-3'
            : 'grid grid-cols-2 lg:grid-cols-3 gap-4'
      }`}>
        {statCards.map((card) => (
          <div
            key={card.id}
            className={`bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 transition-all duration-200 hover:shadow-md hover:scale-105 ${
              layout === 'row' ? 'flex-shrink-0 w-48' : ''
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg bg-gray-100 ${card.color}`}>
                {card.icon}
              </div>
              
              {showTrends && card.change !== undefined && (
                <div className={`flex items-center space-x-1 text-sm ${getTrendColor(card.changeType)}`}>
                  {getTrendIcon(card.changeType, card.change)}
                  <span className="font-medium">
                    {card.change > 0 ? '+' : ''}{card.change.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Card Content */}
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-gray-600 line-clamp-1">
                {card.title}
              </h3>
              
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              
              {!compact && card.description && (
                <p className="text-xs text-gray-500 line-clamp-2">
                  {card.description}
                </p>
              )}
            </div>

            {/* Connection Status Indicator */}
            {!compact && (
              <div className="flex items-center justify-end mt-3">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Status */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-gray-600">
                {isConnected ? 'All systems operational' : 'Connection issues detected'}
              </span>
            </div>
            
            <span className="text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}