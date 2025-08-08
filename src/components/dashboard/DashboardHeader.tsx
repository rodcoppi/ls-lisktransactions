'use client';

import React, { useRef } from 'react';
import { Settings, Plus, Wifi, WifiOff, Sync, Download, Upload, Menu, Share } from 'lucide-react';
import { DashboardImportExport } from '@/lib/dashboard/importExport';
import type { SyncStatus, DashboardConfig } from '@/lib/dashboard/types';

interface DashboardHeaderProps {
  title: string;
  syncStatus: SyncStatus;
  config: DashboardConfig;
  onSettingsClick: () => void;
  onAddWidgetClick: () => void;
  onConfigChange: (config: Partial<DashboardConfig>) => void;
  isMobile?: boolean;
  onMenuClick?: () => void;
  showExportImport?: boolean;
}

export function DashboardHeader({
  title,
  syncStatus,
  config,
  onSettingsClick,
  onAddWidgetClick,
  onConfigChange,
  isMobile = false,
  onMenuClick,
  showExportImport = true
}: DashboardHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle export
  const handleExport = async () => {
    try {
      await DashboardImportExport.downloadConfig(config);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export dashboard configuration');
    }
  };

  // Handle import
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await DashboardImportExport.importFromFile(file, config);
      
      if (result.success && result.config) {
        onConfigChange(result.config);
        alert('Dashboard configuration imported successfully!');
      } else {
        alert(`Import failed: ${result.errors?.join(', ') || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import dashboard configuration');
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle share
  const handleShare = async () => {
    try {
      const shareUrl = await DashboardImportExport.createShareableUrl(config, window.location.origin);
      
      if (navigator.share) {
        await navigator.share({
          title: `${config.name} - Dashboard Configuration`,
          text: 'Check out this dashboard configuration',
          url: shareUrl
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        alert('Share URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Share failed:', error);
      alert('Failed to create share URL');
    }
  };
  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <Sync className="w-4 h-4 animate-spin text-blue-600" />;
      case 'synced':
        return <Wifi className="w-4 h-4 text-green-600" />;
      case 'error':
        return <WifiOff className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Sync className="w-4 h-4 text-yellow-600" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSyncText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'synced':
        return 'All changes saved';
      case 'error':
        return 'Sync failed';
      case 'pending':
        return 'Saving changes...';
      default:
        return 'Offline';
    }
  };

  const getSyncColor = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-600 bg-blue-50';
      case 'synced':
        return 'text-green-600 bg-green-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-gray-100 rounded-md text-gray-600"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {title}
            </h1>
            
            {/* Sync Status */}
            <div className={`flex items-center space-x-2 mt-1 px-2 py-1 rounded-full text-xs font-medium ${getSyncColor()}`}>
              {getSyncIcon()}
              {!isMobile && <span>{getSyncText()}</span>}
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Export/Import/Share (Desktop only) */}
          {showExportImport && !isMobile && (
            <>
              <button
                onClick={handleShare}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Share dashboard configuration"
              >
                <Share className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleExport}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Export dashboard configuration"
              >
                <Download className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleImport}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Import dashboard configuration"
              >
                <Upload className="w-5 h-5" />
              </button>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}

          {/* Add Widget Button */}
          <button
            onClick={onAddWidgetClick}
            className={`flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${
              isMobile ? 'px-2' : ''
            }`}
            title="Add widget"
          >
            <Plus className="w-5 h-5" />
            {!isMobile && <span className="text-sm font-medium">Add Widget</span>}
          </button>

          {/* Settings Button */}
          <button
            onClick={onSettingsClick}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Dashboard settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Actions Bar */}
      {isMobile && showExportImport && (
        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-100">
          <span className="text-sm text-gray-600 flex-1">Quick Actions:</span>
          
          <button
            onClick={handleShare}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded-md"
          >
            <Share className="w-4 h-4" />
            <span>Share</span>
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={handleImport}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-green-600 hover:bg-green-50 rounded-md"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}
    </header>
  );
}