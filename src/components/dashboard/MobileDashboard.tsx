'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, X, ChevronLeft, ChevronRight, Search, Bell } from 'lucide-react';
import { useDashboardLayout } from '@/hooks/use-dashboard-layout';
import { WidgetContainer } from '../widgets/WidgetContainer';
import { TransactionCountWidget } from '../widgets/TransactionCountWidget';
import { NetworkStatsWidget } from '../widgets/NetworkStatsWidget';
import { TransactionChartWidget } from '../widgets/TransactionChartWidget';
import { AlertsWidget } from '../widgets/AlertsWidget';
import { ActivityFeedWidget } from '../widgets/ActivityFeedWidget';
import { StatsCardsWidget } from '../widgets/StatsCardsWidget';
import { MobileBottomSheet } from './MobileBottomSheet';
import { SwipeGestureDetector } from './SwipeGestureDetector';
import type { DashboardConfig, Widget } from '@/lib/dashboard/types';

interface MobileDashboardProps {
  userId?: string;
  initialConfig?: DashboardConfig;
  className?: string;
}

export function MobileDashboard({ userId = 'default', initialConfig, className = '' }: MobileDashboardProps) {
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

  const [currentWidgetIndex, setCurrentWidgetIndex] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [bottomSheetContent, setBottomSheetContent] = useState<'settings' | 'widgets' | 'notifications'>('widgets');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const pullToRefreshThreshold = 80;

  // Handle swipe gestures between widgets
  const handleSwipe = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (direction === 'left' && currentWidgetIndex < config.widgets.length - 1) {
      setCurrentWidgetIndex(prev => prev + 1);
    } else if (direction === 'right' && currentWidgetIndex > 0) {
      setCurrentWidgetIndex(prev => prev - 1);
    } else if (direction === 'up') {
      setShowBottomSheet(true);
      setBottomSheetContent('widgets');
    }
  }, [currentWidgetIndex, config.widgets.length]);

  // Pull to refresh implementation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!scrollRef.current) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;
    
    // Only trigger pull-to-refresh at top of scroll
    if (scrollRef.current.scrollTop === 0 && deltaY > 0) {
      const pullDistance = Math.min(deltaY * 0.5, pullToRefreshThreshold);
      
      if (pullDistance > 10) {
        // Add visual feedback for pull to refresh
        scrollRef.current.style.transform = `translateY(${Math.min(pullDistance, pullToRefreshThreshold)}px)`;
        
        if (pullDistance >= pullToRefreshThreshold && !isRefreshing) {
          // Trigger haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!scrollRef.current) return;
    
    const currentTransform = scrollRef.current.style.transform;
    const pullDistance = parseFloat(currentTransform.match(/translateY\(([^)]+)px\)/)?.[1] || '0');
    
    scrollRef.current.style.transform = '';
    
    if (pullDistance >= pullToRefreshThreshold && !isRefreshing) {
      setIsRefreshing(true);
      
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false);
        // Trigger data refresh here
      }, 1500);
    }
  };

  // Handle device orientation changes
  useEffect(() => {
    const handleOrientationChange = () => {
      // Force re-render on orientation change
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo(0, 0);
        }
      }, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);
    return () => window.removeEventListener('orientationchange', handleOrientationChange);
  }, []);

  // Render individual widget
  const renderWidget = (widget: Widget, index: number) => {
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
      <div
        key={widget.id}
        className={`w-full h-full transition-opacity duration-300 ${
          index === currentWidgetIndex ? 'opacity-100' : 'opacity-0 absolute inset-0'
        }`}
      >
        <WidgetContainer
          widget={widget}
          layoutItem={{ i: widget.id, x: 0, y: 0, w: 1, h: 1 }}
          onRemove={() => removeWidget(widget.id)}
          isDraggable={false}
          isResizable={false}
        >
          <WidgetComponent 
            {...widget.props} 
            widgetId={widget.id}
            compact={true}
          />
        </WidgetContainer>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 bg-gray-50">
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
    <div className={`relative h-screen bg-gray-50 overflow-hidden ${className}`}>
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setShowSidebar(true)}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <Menu className="w-6 h-6 text-gray-700" />
        </button>
        
        <div className="flex-1 text-center">
          <h1 className="text-lg font-semibold text-gray-900">{config.name}</h1>
          <div className="flex items-center justify-center mt-1">
            {config.widgets.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentWidgetIndex(index)}
                className={`w-2 h-2 rounded-full mx-1 transition-colors ${
                  index === currentWidgetIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={() => {
            setShowBottomSheet(true);
            setBottomSheetContent('notifications');
          }}
          className="p-2 hover:bg-gray-100 rounded-md relative"
        >
          <Bell className="w-6 h-6 text-gray-700" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </button>
      </header>

      {/* Pull to Refresh Indicator */}
      {isRefreshing && (
        <div className="absolute top-16 left-0 right-0 z-20 flex justify-center">
          <div className="bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Refreshing...</span>
          </div>
        </div>
      )}

      {/* Main Content - Swipeable Widget Container */}
      <div className="flex-1 relative">
        <SwipeGestureDetector onSwipe={handleSwipe}>
          <div
            ref={scrollRef}
            className="h-full overflow-y-auto overscroll-y-contain"
            style={{ scrollBehavior: 'smooth' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="p-4 h-full relative">
              {config.widgets.map((widget, index) => renderWidget(widget, index))}
            </div>
          </div>
        </SwipeGestureDetector>
      </div>

      {/* Navigation Controls */}
      <div className="absolute bottom-safe left-4 right-4 flex justify-between items-center py-4">
        <button
          onClick={() => setCurrentWidgetIndex(Math.max(0, currentWidgetIndex - 1))}
          disabled={currentWidgetIndex === 0}
          className={`p-3 rounded-full bg-white shadow-lg ${
            currentWidgetIndex === 0 ? 'opacity-50' : 'hover:bg-gray-50'
          }`}
        >
          <ChevronLeft className="w-6 h-6 text-gray-700" />
        </button>
        
        <button
          onClick={() => {
            setShowBottomSheet(true);
            setBottomSheetContent('widgets');
          }}
          className="px-6 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <span className="text-sm font-medium">Widgets</span>
        </button>
        
        <button
          onClick={() => setCurrentWidgetIndex(Math.min(config.widgets.length - 1, currentWidgetIndex + 1))}
          disabled={currentWidgetIndex === config.widgets.length - 1}
          className={`p-3 rounded-full bg-white shadow-lg ${
            currentWidgetIndex === config.widgets.length - 1 ? 'opacity-50' : 'hover:bg-gray-50'
          }`}
        >
          <ChevronRight className="w-6 h-6 text-gray-700" />
        </button>
      </div>

      {/* Mobile Sidebar */}
      {showSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSidebar(false)}
          />
          <div className="fixed top-0 left-0 bottom-0 w-80 bg-white z-50 transform transition-transform">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 hover:bg-gray-100 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <button
                onClick={() => {
                  setShowSidebar(false);
                  setShowBottomSheet(true);
                  setBottomSheetContent('settings');
                }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg"
              >
                Dashboard Settings
              </button>
              
              <button
                onClick={() => {
                  resetToDefaults();
                  setShowSidebar(false);
                }}
                className="w-full text-left p-3 hover:bg-gray-50 rounded-lg text-red-600"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </>
      )}

      {/* Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showBottomSheet}
        onClose={() => setShowBottomSheet(false)}
        content={bottomSheetContent}
        config={config}
        onConfigChange={updateConfig}
        onAddWidget={addWidget}
        notifications={notifications}
      />
    </div>
  );
}