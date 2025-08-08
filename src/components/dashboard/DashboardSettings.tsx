'use client';

import React, { useState } from 'react';
import { X, Palette, Monitor, Smartphone, Download, Upload, RotateCcw, Save } from 'lucide-react';
import type { DashboardConfig } from '@/lib/dashboard/types';

interface DashboardSettingsProps {
  config: DashboardConfig;
  onConfigChange: (config: Partial<DashboardConfig>) => void;
  onClose: () => void;
  onReset: () => void;
  onExport?: () => string;
  onImport?: (data: string) => Promise<boolean>;
}

export function DashboardSettings({
  config,
  onConfigChange,
  onClose,
  onReset,
  onExport,
  onImport
}: DashboardSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'performance' | 'import-export'>('general');
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');

  const themes = [
    { id: 'light', name: 'Light', preview: 'bg-white border-gray-200' },
    { id: 'dark', name: 'Dark', preview: 'bg-gray-900 border-gray-700' },
    { id: 'blue', name: 'Blue', preview: 'bg-blue-50 border-blue-200' },
    { id: 'green', name: 'Green', preview: 'bg-green-50 border-green-200' }
  ];

  const handleExport = () => {
    if (onExport) {
      const data = onExport();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImport = async () => {
    if (!onImport || !importData.trim()) return;
    
    try {
      setImportError('');
      const success = await onImport(importData);
      if (success) {
        setImportData('');
        onClose();
      } else {
        setImportError('Failed to import configuration');
      }
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Import failed');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setImportData(content);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Dashboard Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-md text-gray-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'general', name: 'General', icon: Monitor },
              { id: 'theme', name: 'Theme', icon: Palette },
              { id: 'performance', name: 'Performance', icon: Smartphone },
              { id: 'import-export', name: 'Import/Export', icon: Download }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 text-sm font-medium ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Dashboard Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={config.name}
                  onChange={(e) => onConfigChange({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter dashboard name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={config.description || ''}
                  onChange={(e) => onConfigChange({ description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter dashboard description"
                />
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Display Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Auto Refresh</label>
                    <p className="text-sm text-gray-500">Automatically refresh data</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.autoRefresh}
                    onChange={(e) => onConfigChange({
                      settings: { ...config.settings, autoRefresh: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Enable Animations</label>
                    <p className="text-sm text-gray-500">Show animated transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.enableAnimations}
                    onChange={(e) => onConfigChange({
                      settings: { ...config.settings, enableAnimations: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Compact Mode</label>
                    <p className="text-sm text-gray-500">Show widgets in compact layout</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.compactMode}
                    onChange={(e) => onConfigChange({
                      settings: { ...config.settings, compactMode: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Color Theme</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {themes.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => onConfigChange({
                        theme: { ...config.theme, id: theme.id, name: theme.name }
                      })}
                      className={`p-4 rounded-lg border-2 text-center transition-colors ${
                        config.theme.id === theme.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-full h-16 rounded-md mb-2 border ${theme.preview}`} />
                      <p className="text-sm font-medium">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Colors */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Colors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Primary Color
                    </label>
                    <input
                      type="color"
                      value={config.theme.colors.primary}
                      onChange={(e) => onConfigChange({
                        theme: {
                          ...config.theme,
                          colors: { ...config.theme.colors, primary: e.target.value }
                        }
                      })}
                      className="w-full h-10 rounded-md border border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <input
                      type="color"
                      value={config.theme.colors.accent}
                      onChange={(e) => onConfigChange({
                        theme: {
                          ...config.theme,
                          colors: { ...config.theme.colors, accent: e.target.value }
                        }
                      })}
                      className="w-full h-10 rounded-md border border-gray-300"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Performance Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Performance Mode</label>
                    <p className="text-sm text-gray-500">Optimize for better performance</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.performanceMode}
                    onChange={(e) => onConfigChange({
                      settings: { ...config.settings, performanceMode: e.target.checked }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Refresh Interval (seconds)
                  </label>
                  <select
                    value={config.settings.refreshInterval}
                    onChange={(e) => onConfigChange({
                      settings: { ...config.settings, refreshInterval: parseInt(e.target.value) }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={1000}>1 second</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={30000}>30 seconds</option>
                    <option value={60000}>1 minute</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Accessibility</h3>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reduced Motion</label>
                    <p className="text-sm text-gray-500">Reduce animations and transitions</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.accessibility.reducedMotion}
                    onChange={(e) => onConfigChange({
                      settings: {
                        ...config.settings,
                        accessibility: { ...config.settings.accessibility, reducedMotion: e.target.checked }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-700">High Contrast</label>
                    <p className="text-sm text-gray-500">Use high contrast colors</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.settings.accessibility.highContrast}
                    onChange={(e) => onConfigChange({
                      settings: {
                        ...config.settings,
                        accessibility: { ...config.settings.accessibility, highContrast: e.target.checked }
                      }
                    })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'import-export' && (
            <div className="space-y-6">
              {/* Export */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Export Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Export your dashboard configuration to backup or share with others.
                </p>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Configuration</span>
                </button>
              </div>

              {/* Import */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Import Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Import a dashboard configuration from a JSON file or paste the configuration data.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload File
                    </label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileImport}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>

                  <div className="text-center text-sm text-gray-500">or</div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Paste Configuration Data
                    </label>
                    <textarea
                      value={importData}
                      onChange={(e) => setImportData(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                      placeholder="Paste your dashboard configuration JSON here..."
                    />
                  </div>

                  {importError && (
                    <div className="text-red-600 text-sm">{importError}</div>
                  )}

                  <button
                    onClick={handleImport}
                    disabled={!importData.trim()}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Import Configuration</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={onReset}
            className="flex items-center space-x-2 px-4 py-2 text-red-600 border border-red-600 rounded-md hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}