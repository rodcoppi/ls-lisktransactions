'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GridLayout } from './GridLayout';
import { DragDropProvider } from './DragDropProvider';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { WidgetContainer } from '../widgets/WidgetContainer';
import { TransactionCountWidget } from '../widgets/TransactionCountWidget';
import { NetworkStatsWidget } from '../widgets/NetworkStatsWidget';
import { TransactionChartWidget } from '../widgets/TransactionChartWidget';
import { AlertsWidget } from '../widgets/AlertsWidget';
import { ActivityFeedWidget } from '../widgets/ActivityFeedWidget';
import { StatsCardsWidget } from '../widgets/StatsCardsWidget';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSettings } from './DashboardSettings';
import { Settings, Plus } from 'lucide-react';
import type { DashboardConfig, Widget, LayoutItem } from '@/lib/dashboard/types';

interface DashboardProps {
  userId?: string;
  initialConfig?: DashboardConfig;
  className?: string;
}

export function Dashboard({ userId = 'default', initialConfig, className = '' }: DashboardProps) {
  const {
    layout,
    config,
    updateLayout,
    updateConfig,
    addWidget,
    removeWidget,
    resetToDefaults,
    isLoading,
    error,
    syncStatus
  } = useDashboardLayout(userId, initialConfig);

  const [showSettings, setShowSettings] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle layout changes from grid
  const handleLayoutChange = useCallback((newLayout: LayoutItem[]) => {
    updateLayout(newLayout);
  }, [updateLayout]);

  // Handle widget resize
  const handleWidgetResize = useCallback((widgetId: string, size: { width: number; height: number }) => {
    const updatedLayout = layout.map(item => 
      item.i === widgetId 
        ? { ...item, w: Math.ceil(size.width / 120), h: Math.ceil(size.height / 120) }
        : item
    );
    updateLayout(updatedLayout);
  }, [layout, updateLayout]);

  // Render individual widget
  const renderWidget = (widget: Widget) => {
    const layoutItem = layout.find(item => item.i === widget.id);
    
    if (!layoutItem) return null;

    let WidgetComponent;
    switch (widget.type) {
      case 'transaction-count':
        WidgetComponent = TransactionCountWidget;
        break;
      case 'network-stats':
        WidgetComponent = NetworkStatsWidget;
        break;
      case 'transaction-chart':
        WidgetComponent = TransactionChartWidget;
        break;
      case 'alerts':
        WidgetComponent = AlertsWidget;
        break;
      case 'activity-feed':
        WidgetComponent = ActivityFeedWidget;
        break;
      case 'stats-cards':
        WidgetComponent = StatsCardsWidget;
        break;
      default:
        return null;
    }

    return (
      <WidgetContainer
        key={widget.id}
        widget={widget}
        layoutItem={layoutItem}
        onResize={(size) => handleWidgetResize(widget.id, size)}
        onRemove={() => removeWidget(widget.id)}
        isDraggable={!isMobile}
      >
        <WidgetComponent 
          {...widget.props} 
          widgetId={widget.id}
          compact={isMobile || layoutItem.h < 3}
        />
      </WidgetContainer>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <div className="text-red-600 text-lg font-semibold mb-2">Dashboard Error</div>
        <div className="text-gray-600 text-center mb-4">{error.message}</div>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Reload Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {/* Dashboard Header */}
      <DashboardHeader
        title={config.name}
        syncStatus={syncStatus}
        onSettingsClick={() => setShowSettings(true)}
        onAddWidgetClick={() => setShowAddWidget(true)}
        isMobile={isMobile}
      />

      {/* Main Dashboard Content */}
      <main className="p-4 sm:p-6">
        <DragDropProvider disabled={isMobile}>
          <GridLayout
            layout={layout}
            onLayoutChange={handleLayoutChange}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={120}
            margin={[16, 16]}
            containerPadding={[0, 0]}
            isDraggable={!isMobile}
            isResizable={!isMobile}
            useCSSTransforms
            preventCollision={false}
            compactType="vertical"
            className="w-full"
          >
            {config.widgets.map(renderWidget)}
          </GridLayout>
        </DragDropProvider>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <DashboardSettings
          config={config}
          onConfigChange={updateConfig}
          onClose={() => setShowSettings(false)}
          onReset={resetToDefaults}
        />
      )}

      {/* Add Widget Modal */}
      {showAddWidget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Add Widget</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { type: 'transaction-count', name: 'Transaction Counter', description: 'Real-time transaction count' },
                { type: 'network-stats', name: 'Network Statistics', description: 'Network health metrics' },
                { type: 'transaction-chart', name: 'Transaction Chart', description: 'Historical transaction data' },
                { type: 'alerts', name: 'Alerts Panel', description: 'System alerts and notifications' },
                { type: 'activity-feed', name: 'Activity Feed', description: 'Recent blockchain activity' },
                { type: 'stats-cards', name: 'Statistics Cards', description: 'Key performance indicators' }
              ].map((widgetType) => (
                <button
                  key={widgetType.type}
                  onClick={() => {
                    addWidget(widgetType.type as Widget['type'], {
                      title: widgetType.name
                    });
                    setShowAddWidget(false);
                  }}
                  className="text-left p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{widgetType.name}</div>
                  <div className="text-sm text-gray-600">{widgetType.description}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddWidget(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Export default for lazy loading
export default Dashboard;