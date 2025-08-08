'use client';

import React from 'react';
import { 
  useRealtimeDashboard, 
  useRealtimeTransactionCount, 
  useRealtimeAlerts,
  useConnectionStatus 
} from '@/hooks/use-realtime';
import { LineChart } from '@/components/charts';

export function RealtimeDashboard() {
  const { stats, isConnected: dashboardConnected, error: dashboardError, retry } = useRealtimeDashboard();
  const { count, history } = useRealtimeTransactionCount();
  const { alerts, latestAlert } = useRealtimeAlerts();
  const { status, metrics, isHealthy, latency } = useConnectionStatus();

  return (
    <div className="space-y-6 p-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-time Dashboard</h2>
        <div className="flex items-center space-x-4">
          <div className={`flex items-center space-x-2 ${isHealthy ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isHealthy ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {latency && (
            <span className="text-sm text-gray-500">
              {latency}ms
            </span>
          )}
          {!dashboardConnected && (
            <button
              onClick={retry}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {dashboardError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 font-medium">Connection Error</p>
          <p className="text-red-600 text-sm">{dashboardError.message}</p>
        </div>
      )}

      {/* Latest Alert */}
      {latestAlert && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-700 font-medium">Alert: {latestAlert.message}</p>
          <p className="text-yellow-600 text-sm">
            Severity: {latestAlert.severity} | {new Date(latestAlert.timestamp).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Transaction Count */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Live Transaction Count</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {count.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {history.length > 0 && `+${history[history.length - 1]?.count - (history[0]?.count || 0)} in session`}
          </p>
        </div>

        {/* Total Transactions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Total Transactions</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {stats?.totalTransactions ? stats.totalTransactions.toLocaleString() : '---'}
          </p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>

        {/* Active Connections */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">Active Connections</h3>
          <p className="text-3xl font-bold text-purple-600 mt-2">
            {metrics?.connections?.activeConnections || 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {metrics?.connections?.totalConnections || 0} total
          </p>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800">System Health</h3>
          <p className="text-3xl font-bold text-emerald-600 mt-2">
            {metrics ? Math.round(metrics.healthScore || 100) : '---'}%
          </p>
          <p className="text-sm text-gray-500 mt-1">Health score</p>
        </div>
      </div>

      {/* Detailed Metrics */}
      {metrics && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Metrics</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Events/sec</p>
              <p className="font-semibold">{metrics.events?.eventsPerSecond || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">Queue Pending</p>
              <p className="font-semibold">{metrics.queue?.pending || 0}</p>
            </div>
            <div>
              <p className="text-gray-600">P99 Latency</p>
              <p className="font-semibold">{Math.round(metrics.latency?.p99 || 0)}ms</p>
            </div>
            <div>
              <p className="text-gray-600">Error Rate</p>
              <p className="font-semibold">{metrics.errors?.errorRate || 0}/min</p>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Chart - Now using high-performance LineChart */}
      {history.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <LineChart
            data={history.map(item => ({
              timestamp: item.timestamp,
              transactions: item.count,
              value: item.count
            }))}
            xAxisKey="timestamp"
            yAxisKey="transactions"
            title="Transaction Count History"
            subtitle="Real-time transaction activity with 60 FPS performance"
            height={300}
            enableZoom={true}
            enablePan={true}
            enableBrush={true}
            enableCrosshair={true}
            smoothCurve={true}
            showGrid={true}
            showTooltip={true}
            showLegend={false}
            animate={true}
            exportEnabled={true}
            responsive={true}
            onDataPointClick={(data, index) => {
              console.log('Transaction data point clicked:', data, index);
            }}
            onZoom={(domain) => {
              console.log('Chart zoomed to domain:', domain);
            }}
            className="w-full"
          />
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Alerts</h3>
          <div className="space-y-2">
            {alerts.slice(-5).map((alert, index) => (
              <div
                key={index}
                className={`p-3 rounded border-l-4 ${
                  alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                  alert.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                  alert.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                  'border-blue-500 bg-blue-50'
                }`}
              >
                <p className="font-medium text-gray-800">{alert.message}</p>
                <p className="text-sm text-gray-600">
                  {alert.severity} • {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}