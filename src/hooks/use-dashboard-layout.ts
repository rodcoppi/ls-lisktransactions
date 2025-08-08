'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardConfig, LayoutItem, Widget, SyncStatus } from '@/lib/dashboard/types';
import { defaultDashboardConfig, createDefaultLayout } from '@/lib/dashboard/defaults';
import { DashboardStorage } from '@/lib/dashboard/storage';
import { DashboardTemplates } from '@/lib/dashboard/templates';

interface UseDashboardLayoutReturn {
  layout: LayoutItem[];
  config: DashboardConfig;
  updateLayout: (newLayout: LayoutItem[]) => void;
  updateConfig: (newConfig: Partial<DashboardConfig>) => void;
  addWidget: (type: Widget['type'], props?: Record<string, any>) => void;
  removeWidget: (widgetId: string) => void;
  duplicateWidget: (widgetId: string) => void;
  resetToDefaults: () => void;
  loadTemplate: (templateName: string) => void;
  exportConfig: () => string;
  importConfig: (configData: string) => Promise<boolean>;
  isLoading: boolean;
  error: Error | null;
  syncStatus: SyncStatus;
  hasUnsavedChanges: boolean;
  saveChanges: () => Promise<void>;
}

export function useDashboardLayout(
  userId: string,
  initialConfig?: DashboardConfig
): UseDashboardLayoutReturn {
  const [config, setConfig] = useState<DashboardConfig>(
    initialConfig || defaultDashboardConfig
  );
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const storageRef = useRef(new DashboardStorage(userId));
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedConfigRef = useRef<string>('');

  // Initialize dashboard layout
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setSyncStatus('syncing');
        
        // Try to load saved configuration
        const savedConfig = await storageRef.current.loadConfig();
        
        if (savedConfig) {
          setConfig(savedConfig);
          setLayout(savedConfig.layout || createDefaultLayout(savedConfig.widgets));
        } else {
          // Use default configuration
          const defaultConfig = defaultDashboardConfig;
          setConfig(defaultConfig);
          setLayout(createDefaultLayout(defaultConfig.widgets));
        }
        
        setSyncStatus('synced');
        lastSavedConfigRef.current = JSON.stringify(config);
      } catch (err) {
        console.error('Failed to initialize dashboard:', err);
        setError(err instanceof Error ? err : new Error('Failed to initialize dashboard'));
        setSyncStatus('error');
        
        // Fall back to default configuration
        const defaultConfig = defaultDashboardConfig;
        setConfig(defaultConfig);
        setLayout(createDefaultLayout(defaultConfig.widgets));
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [userId]);

  // Auto-save changes
  useEffect(() => {
    const currentConfigString = JSON.stringify({ config, layout });
    
    if (currentConfigString !== lastSavedConfigRef.current && !isLoading) {
      setHasUnsavedChanges(true);
      setSyncStatus('pending');
      
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new auto-save timeout
      autoSaveTimeoutRef.current = setTimeout(async () => {
        await saveChanges();
      }, 2000); // Auto-save after 2 seconds of inactivity
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [config, layout, isLoading]);

  // Save changes function
  const saveChanges = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      
      const configToSave: DashboardConfig = {
        ...config,
        layout: layout,
        lastModified: new Date().toISOString()
      };
      
      await storageRef.current.saveConfig(configToSave);
      
      lastSavedConfigRef.current = JSON.stringify({ config: configToSave, layout });
      setHasUnsavedChanges(false);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to save dashboard config:', err);
      setSyncStatus('error');
      setError(err instanceof Error ? err : new Error('Failed to save configuration'));
    }
  }, [config, layout]);

  // Update layout
  const updateLayout = useCallback((newLayout: LayoutItem[]) => {
    setLayout(newLayout);
    setError(null);
  }, []);

  // Update config
  const updateConfig = useCallback((newConfig: Partial<DashboardConfig>) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig,
      lastModified: new Date().toISOString()
    }));
    setError(null);
  }, []);

  // Add widget
  const addWidget = useCallback((type: Widget['type'], props: Record<string, any> = {}) => {
    const newWidget: Widget = {
      id: `${type}-${Date.now()}`,
      type,
      title: props.title || type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      props,
      aspectRatio: getDefaultAspectRatio(type)
    };
    
    const newLayoutItem: LayoutItem = {
      i: newWidget.id,
      x: 0,
      y: 0,
      w: getDefaultSize(type).w,
      h: getDefaultSize(type).h,
      minW: getMinSize(type).w,
      minH: getMinSize(type).h,
      maxW: getMaxSize(type).w,
      maxH: getMaxSize(type).h
    };
    
    // Find optimal position
    const optimalPosition = findOptimalPosition(layout, newLayoutItem);
    newLayoutItem.x = optimalPosition.x;
    newLayoutItem.y = optimalPosition.y;
    
    setConfig(prevConfig => ({
      ...prevConfig,
      widgets: [...prevConfig.widgets, newWidget],
      lastModified: new Date().toISOString()
    }));
    
    setLayout(prevLayout => [...prevLayout, newLayoutItem]);
    setError(null);
  }, [layout]);

  // Remove widget
  const removeWidget = useCallback((widgetId: string) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      widgets: prevConfig.widgets.filter(w => w.id !== widgetId),
      lastModified: new Date().toISOString()
    }));
    
    setLayout(prevLayout => prevLayout.filter(item => item.i !== widgetId));
    setError(null);
  }, []);

  // Duplicate widget
  const duplicateWidget = useCallback((widgetId: string) => {
    const widget = config.widgets.find(w => w.id === widgetId);
    const layoutItem = layout.find(item => item.i === widgetId);
    
    if (!widget || !layoutItem) return;
    
    const newWidget: Widget = {
      ...widget,
      id: `${widget.type}-${Date.now()}`,
      title: `${widget.title} (Copy)`
    };
    
    const newLayoutItem: LayoutItem = {
      ...layoutItem,
      i: newWidget.id,
      x: layoutItem.x + layoutItem.w,
      y: layoutItem.y
    };
    
    setConfig(prevConfig => ({
      ...prevConfig,
      widgets: [...prevConfig.widgets, newWidget],
      lastModified: new Date().toISOString()
    }));
    
    setLayout(prevLayout => [...prevLayout, newLayoutItem]);
    setError(null);
  }, [config.widgets, layout]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    const defaultConfig = defaultDashboardConfig;
    setConfig(defaultConfig);
    setLayout(createDefaultLayout(defaultConfig.widgets));
    setError(null);
  }, []);

  // Load template
  const loadTemplate = useCallback((templateName: string) => {
    const template = DashboardTemplates.getTemplate(templateName);
    if (template) {
      setConfig(template);
      setLayout(template.layout || createDefaultLayout(template.widgets));
      setError(null);
    }
  }, []);

  // Export configuration
  const exportConfig = useCallback(() => {
    const exportData = {
      ...config,
      layout,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(exportData, null, 2);
  }, [config, layout]);

  // Import configuration
  const importConfig = useCallback(async (configData: string): Promise<boolean> => {
    try {
      const importedData = JSON.parse(configData);
      
      // Validate imported data
      if (!importedData.widgets || !Array.isArray(importedData.widgets)) {
        throw new Error('Invalid configuration format');
      }
      
      // Create new configuration
      const newConfig: DashboardConfig = {
        ...defaultDashboardConfig,
        ...importedData,
        id: config.id, // Preserve current config ID
        userId: config.userId, // Preserve current user ID
        lastModified: new Date().toISOString()
      };
      
      const newLayout = importedData.layout || createDefaultLayout(newConfig.widgets);
      
      setConfig(newConfig);
      setLayout(newLayout);
      setError(null);
      
      return true;
    } catch (err) {
      console.error('Failed to import configuration:', err);
      setError(err instanceof Error ? err : new Error('Failed to import configuration'));
      return false;
    }
  }, [config.id, config.userId]);

  return {
    layout,
    config,
    updateLayout,
    updateConfig,
    addWidget,
    removeWidget,
    duplicateWidget,
    resetToDefaults,
    loadTemplate,
    exportConfig,
    importConfig,
    isLoading,
    error,
    syncStatus,
    hasUnsavedChanges,
    saveChanges
  };
}

// Helper functions
function getDefaultAspectRatio(type: Widget['type']): number | undefined {
  const aspectRatios: Record<Widget['type'], number | undefined> = {
    'transaction-count': undefined,
    'network-stats': undefined,
    'transaction-chart': 16 / 9,
    'alerts': undefined,
    'activity-feed': undefined,
    'stats-cards': undefined
  };
  return aspectRatios[type];
}

function getDefaultSize(type: Widget['type']): { w: number; h: number } {
  const sizes: Record<Widget['type'], { w: number; h: number }> = {
    'transaction-count': { w: 3, h: 2 },
    'network-stats': { w: 4, h: 3 },
    'transaction-chart': { w: 6, h: 4 },
    'alerts': { w: 4, h: 3 },
    'activity-feed': { w: 4, h: 5 },
    'stats-cards': { w: 6, h: 2 }
  };
  return sizes[type] || { w: 3, h: 2 };
}

function getMinSize(type: Widget['type']): { w: number; h: number } {
  const minSizes: Record<Widget['type'], { w: number; h: number }> = {
    'transaction-count': { w: 2, h: 1 },
    'network-stats': { w: 3, h: 2 },
    'transaction-chart': { w: 4, h: 3 },
    'alerts': { w: 3, h: 2 },
    'activity-feed': { w: 3, h: 3 },
    'stats-cards': { w: 4, h: 1 }
  };
  return minSizes[type] || { w: 2, h: 1 };
}

function getMaxSize(type: Widget['type']): { w: number; h: number } {
  const maxSizes: Record<Widget['type'], { w: number; h: number }> = {
    'transaction-count': { w: 6, h: 4 },
    'network-stats': { w: 8, h: 6 },
    'transaction-chart': { w: 12, h: 8 },
    'alerts': { w: 8, h: 6 },
    'activity-feed': { w: 6, h: 8 },
    'stats-cards': { w: 12, h: 4 }
  };
  return maxSizes[type] || { w: 12, h: 8 };
}

function findOptimalPosition(
  layout: LayoutItem[],
  newItem: LayoutItem
): { x: number; y: number } {
  const cols = 12;
  let bestPosition = { x: 0, y: 0 };
  let minY = 0;

  // Try to find the best position by checking each possible location
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x <= cols - newItem.w; x++) {
      const testItem = { ...newItem, x, y };
      
      // Check if this position conflicts with existing items
      const hasCollision = layout.some(item =>
        !(testItem.x >= item.x + item.w ||
          testItem.x + testItem.w <= item.x ||
          testItem.y >= item.y + item.h ||
          testItem.y + testItem.h <= item.y)
      );
      
      if (!hasCollision) {
        return { x, y };
      }
    }
  }
  
  // If no empty space found, place at the bottom
  const maxY = Math.max(0, ...layout.map(item => item.y + item.h));
  return { x: 0, y: maxY };
}