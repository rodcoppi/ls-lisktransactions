'use client';

import React, { useState } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, X, Filter } from 'lucide-react';
import { useRealtimeAlerts } from '@/hooks/use-realtime';
import type { WidgetProps } from '@/lib/dashboard/types';

interface AlertsWidgetProps extends WidgetProps {
  maxAlerts?: number;
  showFilters?: boolean;
  autoClose?: boolean;
}

type AlertSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export function AlertsWidget({
  widgetId,
  compact = false,
  maxAlerts = 10,
  showFilters = true,
  autoClose = true
}: AlertsWidgetProps) {
  const { alerts, latestAlert, clearAlert, clearAllAlerts, error } = useRealtimeAlerts();
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Filter alerts by severity
  const filteredAlerts = alerts.filter(alert => 
    severityFilter === 'all' || alert.severity === severityFilter
  ).slice(0, maxAlerts);

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'medium':
        return <Bell className="w-4 h-4 text-yellow-600" />;
      case 'low':
        return <Info className="w-4 h-4 text-blue-600" />;
      case 'info':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50 text-red-800';
      case 'high':
        return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50 text-yellow-800';
      case 'low':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      case 'info':
        return 'border-green-500 bg-green-50 text-green-800';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  const getUnreadCount = () => {
    return alerts.filter(alert => !alert.read).length;
  };

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-red-600">
          <Bell className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Alerts Error</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-700" />
          {!compact && <span className="font-medium text-gray-900">Alerts</span>}
          {getUnreadCount() > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {getUnreadCount()}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {showFilters && !compact && (
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="p-1 text-gray-500 hover:text-gray-700"
              >
                <Filter className="w-4 h-4" />
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1 min-w-24">
                  {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => (
                    <button
                      key={severity}
                      onClick={() => {
                        setSeverityFilter(severity);
                        setIsFilterOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1 text-sm hover:bg-gray-50 capitalize ${
                        severityFilter === severity ? 'bg-blue-50 text-blue-700' : ''
                      }`}
                    >
                      {severity}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {alerts.length > 0 && (
            <button
              onClick={clearAllAlerts}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Clear all alerts"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Latest Alert (if not compact) */}
      {!compact && latestAlert && (
        <div className={`p-3 rounded-lg border-l-4 mb-4 ${getSeverityColor(latestAlert.severity)}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {getSeverityIcon(latestAlert.severity)}
              <div>
                <p className="font-medium text-sm">{latestAlert.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {new Date(latestAlert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => clearAlert(latestAlert.id)}
              className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {severityFilter === 'all' ? 'No alerts' : `No ${severityFilter} alerts`}
              </p>
            </div>
          </div>
        ) : (
          filteredAlerts.map((alert, index) => (
            <div
              key={alert.id || index}
              className={`p-3 rounded-lg border-l-4 transition-all duration-200 ${
                getSeverityColor(alert.severity)
              } ${alert.read ? 'opacity-75' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 flex-1">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${compact ? 'line-clamp-1' : 'line-clamp-2'}`}>
                      {alert.message}
                    </p>
                    {!compact && (
                      <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                        <span>{new Date(alert.timestamp).toLocaleString()}</span>
                        <span className="capitalize font-medium">{alert.severity}</span>
                      </div>
                    )}
                    {compact && (
                      <p className="text-xs opacity-75 mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
                
                {autoClose && (
                  <button
                    onClick={() => clearAlert(alert.id)}
                    className="p-1 hover:bg-white hover:bg-opacity-50 rounded flex-shrink-0"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Alert Summary */}
      {!compact && alerts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {(['critical', 'high', 'medium', 'low', 'info'] as const).map((severity) => {
              const count = alerts.filter(a => a.severity === severity).length;
              return (
                <div key={severity} className="flex flex-col items-center">
                  {getSeverityIcon(severity)}
                  <span className="mt-1 font-medium">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}