'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Settings, Bell, Palette, Smartphone } from 'lucide-react';
import type { DashboardConfig, Widget } from '@/lib/dashboard/types';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  content: 'settings' | 'widgets' | 'notifications';
  config: DashboardConfig;
  onConfigChange: (config: Partial<DashboardConfig>) => void;
  onAddWidget: (type: Widget['type'], props?: Record<string, any>) => void;
  notifications: any[];
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  content,
  config,
  onConfigChange,
  onAddWidget,
  notifications
}: MobileBottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);

  // Handle drag to close
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setDragStartY(e.touches[0].clientY);
    
    if (sheetRef.current) {
      const rect = sheetRef.current.getBoundingClientRect();
      setSheetHeight(rect.height);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !sheetRef.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartY;
    
    // Only allow dragging down
    if (deltaY > 0) {
      const translateY = Math.min(deltaY, sheetHeight * 0.5);
      sheetRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging || !sheetRef.current) return;

    const currentY = e.changedTouches[0].clientY;
    const deltaY = currentY - dragStartY;
    
    // Close if dragged down more than 1/3 of the sheet height
    if (deltaY > sheetHeight * 0.3) {
      onClose();
    } else {
      // Snap back to position
      sheetRef.current.style.transform = '';
    }
    
    setIsDragging(false);
    setDragStartY(0);
  };

  // Reset transform when sheet closes
  useEffect(() => {
    if (!isOpen && sheetRef.current) {
      sheetRef.current.style.transform = '';
    }
  }, [isOpen]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const renderSettingsContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          Dashboard Settings
        </h3>
        
        {/* Dashboard Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dashboard Name
          </label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onConfigChange({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Settings Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Auto Refresh</span>
              <p className="text-xs text-gray-500">Automatically refresh data</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.settings.autoRefresh}
                onChange={(e) => onConfigChange({
                  settings: { ...config.settings, autoRefresh: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700">Push Notifications</span>
              <p className="text-xs text-gray-500">Receive system alerts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.settings.pushNotifications}
                onChange={(e) => onConfigChange({
                  settings: { ...config.settings, pushNotifications: e.target.checked }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Theme Selection */}
      <div>
        <h4 className="text-md font-medium mb-3 flex items-center">
          <Palette className="w-4 h-4 mr-2" />
          Theme
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'light', name: 'Light', bg: 'bg-white', border: 'border-gray-300' },
            { id: 'dark', name: 'Dark', bg: 'bg-gray-900', border: 'border-gray-700' },
            { id: 'blue', name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-300' },
            { id: 'green', name: 'Green', bg: 'bg-green-50', border: 'border-green-300' }
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => onConfigChange({
                theme: { ...config.theme, id: theme.id, name: theme.name }
              })}
              className={`p-3 rounded-lg border-2 text-center ${
                config.theme.id === theme.id ? 'border-blue-500' : theme.border
              }`}
            >
              <div className={`w-full h-8 rounded mb-2 ${theme.bg} ${theme.border} border`} />
              <span className="text-sm">{theme.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderWidgetsContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          Add Widgets
        </h3>
        
        <div className="grid grid-cols-1 gap-3">
          {[
            { 
              type: 'transaction-count', 
              name: 'Transaction Counter', 
              description: 'Live transaction count with trends',
              icon: '📊'
            },
            { 
              type: 'network-stats', 
              name: 'Network Stats', 
              description: 'System health and performance',
              icon: '📈'
            },
            { 
              type: 'transaction-chart', 
              name: 'Activity Chart', 
              description: 'Historical transaction data',
              icon: '📉'
            },
            { 
              type: 'alerts', 
              name: 'System Alerts', 
              description: 'Important notifications',
              icon: '🚨'
            },
            { 
              type: 'activity-feed', 
              name: 'Activity Feed', 
              description: 'Recent system events',
              icon: '📋'
            },
            { 
              type: 'stats-cards', 
              name: 'Key Metrics', 
              description: 'Important KPI overview',
              icon: '💼'
            }
          ].map((widget) => (
            <button
              key={widget.type}
              onClick={() => {
                onAddWidget(widget.type as Widget['type'], { title: widget.name });
                onClose();
              }}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
            >
              <span className="text-2xl mr-4">{widget.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{widget.name}</div>
                <div className="text-sm text-gray-600">{widget.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderNotificationsContent = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Notifications
          {notifications.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {notifications.length}
            </span>
          )}
        </h3>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{notification.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notification.body}</div>
                <div className="text-xs text-gray-500 mt-2">
                  {new Date(notification.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 max-h-[80vh] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4">
          <div className="flex items-center space-x-2">
            {content === 'settings' && <Settings className="w-5 h-5 text-gray-600" />}
            {content === 'widgets' && <Plus className="w-5 h-5 text-gray-600" />}
            {content === 'notifications' && <Bell className="w-5 h-5 text-gray-600" />}
            <h2 className="text-lg font-semibold capitalize">{content}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 pb-8 overflow-y-auto max-h-96">
          {content === 'settings' && renderSettingsContent()}
          {content === 'widgets' && renderWidgetsContent()}
          {content === 'notifications' && renderNotificationsContent()}
        </div>
      </div>
    </>
  );
}