'use client';

import React from 'react';
import { Wifi, Users, Zap, Shield, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface NetworkStatsWidgetProps extends WidgetProps {
  showDetails?: boolean;
  refreshInterval?: number;
}

export function NetworkStatsWidget({
  widgetId,
  compact = false,
  showDetails = true,
  refreshInterval = 10000
}: NetworkStatsWidgetProps) {
  const { status, metrics, isHealthy, latency, error } = useConnectionStatus(refreshInterval);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Network Error</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLatencyColor = (ms: number) => {
    if (ms < 100) return 'text-green-600';
    if (ms < 300) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Wifi className={`w-5 h-5 ${isHealthy ? 'text-green-600' : 'text-red-600'}`} />
          {!compact && <span className="font-medium text-gray-900">Network Status</span>}
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isHealthy ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isHealthy ? 'Healthy' : 'Degraded'}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className={`grid gap-4 flex-1 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
        {/* Health Score */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${getHealthColor(metrics?.healthScore || 0).split(' ')[0]}`}>
            {metrics?.healthScore ? Math.round(metrics.healthScore) : '--'}%
          </div>
          <div className="text-xs text-gray-600 mt-1">Health</div>
        </div>

        {/* Active Connections */}
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {metrics?.connections?.activeConnections || 0}
          </div>
          <div className="text-xs text-gray-600 mt-1">Active</div>
        </div>

        {/* Latency */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${getLatencyColor(latency || 0)}`}>
            {latency || '--'}
          </div>
          <div className="text-xs text-gray-600 mt-1">ms</div>
        </div>

        {/* Events/sec */}
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {metrics?.events?.eventsPerSecond || 0}
          </div>
          <div className="text-xs text-gray-600 mt-1">Events/s</div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {!compact && showDetails && metrics && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {/* Connection Details */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Connections</span>
            </div>
            <div className="text-sm font-medium">
              {metrics.connections?.activeConnections || 0} / {metrics.connections?.totalConnections || 0}
            </div>
          </div>

          {/* Queue Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Queue</span>
            </div>
            <div className="text-sm font-medium">
              {metrics.queue?.pending || 0} pending
            </div>
          </div>

          {/* Error Rate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Error Rate</span>
            </div>
            <div className="text-sm font-medium">
              {metrics.errors?.errorRate || 0}/min
            </div>
          </div>

          {/* Performance Metrics */}
          {metrics.latency && (
            <div className="pt-2 border-t border-gray-50">
              <div className="text-xs text-gray-500 mb-2">Latency Distribution</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div className="font-medium text-green-600">{Math.round(metrics.latency.p50 || 0)}ms</div>
                  <div className="text-gray-500">P50</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-yellow-600">{Math.round(metrics.latency.p95 || 0)}ms</div>
                  <div className="text-gray-500">P95</div>
                </div>
                <div className="text-center">
                  <div className="font-medium text-red-600">{Math.round(metrics.latency.p99 || 0)}ms</div>
                  <div className="text-gray-500">P99</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact Status Bar */}
      {compact && (
        <div className="mt-4 flex justify-center space-x-4 text-xs text-gray-600">
          <span>{latency}ms</span>
          <span>•</span>
          <span>{metrics?.connections?.activeConnections || 0} conn</span>
          <span>•</span>
          <span className={isHealthy ? 'text-green-600' : 'text-red-600'}>
            {isHealthy ? 'OK' : 'Error'}
          </span>
        </div>
      )}
    </div>
  );
}