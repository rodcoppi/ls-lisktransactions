/**
 * Notification Preferences Component
 * User-friendly interface for managing notification preferences and consent
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Bell,
  Mail,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
  Clock,
  Shield,
  CheckCircle,
  AlertTriangle,
  Info,
  Save,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Moon,
  Sun,
} from 'lucide-react';
import {
  NotificationPreferences,
  NotificationChannel,
  NotificationType,
  AlertType,
  AlertFrequency,
} from '@/lib/notifications/types';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
}

// Mock default preferences - in real implementation, this would come from API
const mockDefaultPreferences: NotificationPreferences = {
  userId: 'user_1',
  enabledChannels: [NotificationChannel.TOAST, NotificationChannel.EMAIL],
  quietHours: {
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
  },
  emailFrequency: AlertFrequency.BATCHED_HOURLY,
  soundEnabled: true,
  pushEnabled: false,
  emailEnabled: true,
  desktopEnabled: false,
  typePreferences: {
    [NotificationType.INFO]: true,
    [NotificationType.SUCCESS]: true,
    [NotificationType.WARNING]: true,
    [NotificationType.ERROR]: true,
    [NotificationType.CRITICAL]: true,
  },
  alertTypePreferences: {
    [AlertType.TRANSACTION_VOLUME]: true,
    [AlertType.NETWORK_ISSUES]: true,
    [AlertType.PRICE_CHANGES]: true,
    [AlertType.SYSTEM_ERROR]: true,
    [AlertType.PERFORMANCE]: true,
    [AlertType.SECURITY]: true,
    [AlertType.CUSTOM]: true,
  },
  updatedAt: Date.now(),
};

export const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  isOpen,
  onClose,
  userId = 'user_1',
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>(mockDefaultPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'types' | 'schedule'>('general');
  const [testingSound, setTestingSound] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, userId]);

  const loadPreferences = async () => {
    try {
      // In real implementation, this would fetch from API
      // const response = await fetch(`/api/notifications/preferences?userId=${userId}`);
      // const data = await response.json();
      // setPreferences(data.data);
      setPreferences({ ...mockDefaultPreferences, userId });
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    
    try {
      // In real implementation, this would save to API
      // const response = await fetch('/api/notifications/preferences', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     action: 'update',
      //     userId,
      //     preferences,
      //   }),
      // });
      
      // if (!response.ok) throw new Error('Failed to save preferences');
      
      console.log('Saving preferences:', preferences);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    if (confirm('Reset all preferences to default values?')) {
      setPreferences({ ...mockDefaultPreferences, userId });
      setHasChanges(true);
    }
  };

  const updatePreference = useCallback((key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
      updatedAt: Date.now(),
    }));
    setHasChanges(true);
  }, []);

  const toggleChannel = useCallback((channel: NotificationChannel) => {
    setPreferences(prev => {
      const enabledChannels = prev.enabledChannels.includes(channel)
        ? prev.enabledChannels.filter(c => c !== channel)
        : [...prev.enabledChannels, channel];
      
      return {
        ...prev,
        enabledChannels,
        updatedAt: Date.now(),
      };
    });
    setHasChanges(true);
  }, []);

  const toggleNotificationType = useCallback((type: NotificationType) => {
    setPreferences(prev => ({
      ...prev,
      typePreferences: {
        ...prev.typePreferences,
        [type]: !prev.typePreferences[type],
      },
      updatedAt: Date.now(),
    }));
    setHasChanges(true);
  }, []);

  const toggleAlertType = useCallback((type: AlertType) => {
    setPreferences(prev => ({
      ...prev,
      alertTypePreferences: {
        ...prev.alertTypePreferences,
        [type]: !prev.alertTypePreferences[type],
      },
      updatedAt: Date.now(),
    }));
    setHasChanges(true);
  }, []);

  const testSound = async () => {
    setTestingSound(true);
    
    try {
      // Play a test sound
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      await audio.play();
    } catch (error) {
      console.error('Failed to play test sound:', error);
    } finally {
      setTimeout(() => setTestingSound(false), 1000);
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case NotificationChannel.TOAST: return <Bell className="h-4 w-4" />;
      case NotificationChannel.EMAIL: return <Mail className="h-4 w-4" />;
      case NotificationChannel.PUSH: return <Smartphone className="h-4 w-4" />;
      case NotificationChannel.DESKTOP: return <Monitor className="h-4 w-4" />;
      case NotificationChannel.WEBHOOK: return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS: return <CheckCircle className="h-4 w-4 text-green-500" />;
      case NotificationType.WARNING: return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case NotificationType.ERROR: 
      case NotificationType.CRITICAL: return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Notification Preferences
                </h2>
              </div>
              
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                )}
                
                <button
                  onClick={resetToDefaults}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Reset to defaults"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'general', label: 'General', icon: Settings },
                  { id: 'channels', label: 'Channels', icon: Bell },
                  { id: 'types', label: 'Types', icon: Info },
                  { id: 'schedule', label: 'Schedule', icon: Clock },
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    General Settings
                  </h3>
                  
                  {/* Sound Settings */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {preferences.soundEnabled ? (
                          <Volume2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <VolumeX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        )}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Sound Notifications
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Play sounds for important notifications
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={testSound}
                          disabled={!preferences.soundEnabled || testingSound}
                          className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {testingSound ? 'Playing...' : 'Test'}
                        </button>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={preferences.soundEnabled}
                            onChange={(e) => updatePreference('soundEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Email Frequency */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Mail className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            Email Frequency
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            How often to receive email notifications
                          </p>
                        </div>
                      </div>
                      
                      <select
                        value={preferences.emailFrequency}
                        onChange={(e) => updatePreference('emailFrequency', e.target.value)}
                        className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={AlertFrequency.IMMEDIATE}>Immediate</option>
                        <option value={AlertFrequency.BATCHED_5MIN}>Every 5 minutes</option>
                        <option value={AlertFrequency.BATCHED_15MIN}>Every 15 minutes</option>
                        <option value={AlertFrequency.BATCHED_HOURLY}>Hourly</option>
                        <option value={AlertFrequency.DAILY_DIGEST}>Daily digest</option>
                        <option value={AlertFrequency.WEEKLY_DIGEST}>Weekly digest</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Consent Management */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Privacy & Consent
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Smartphone className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Push Notifications</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Allow browser push notifications</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.pushEnabled}
                          onChange={(e) => updatePreference('pushEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Monitor className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <div>
                          <span className="font-medium text-gray-900 dark:text-white">Desktop Notifications</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Show system desktop notifications</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={preferences.desktopEnabled}
                          onChange={(e) => updatePreference('desktopEnabled', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'channels' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Notification Channels
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Choose how you want to receive notifications
                  </p>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {Object.values(NotificationChannel).map(channel => (
                      <div
                        key={channel}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          preferences.enabledChannels.includes(channel)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        onClick={() => toggleChannel(channel)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getChannelIcon(channel)}
                            <div>
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {channel.replace('_', ' ').toUpperCase()}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {getChannelDescription(channel)}
                              </p>
                            </div>
                          </div>
                          
                          <input
                            type="checkbox"
                            checked={preferences.enabledChannels.includes(channel)}
                            readOnly
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'types' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Notification Types
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Message Types
                      </h4>
                      <div className="space-y-2">
                        {Object.values(NotificationType).map(type => (
                          <div key={type} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              {getTypeIcon(type)}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {type.toUpperCase()}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={preferences.typePreferences[type]}
                                onChange={() => toggleNotificationType(type)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                        Alert Categories
                      </h4>
                      <div className="space-y-2">
                        {Object.values(AlertType).map(type => (
                          <div key={type} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <Shield className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              <span className="font-medium text-gray-900 dark:text-white">
                                {type.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={preferences.alertTypePreferences[type]}
                                onChange={() => toggleAlertType(type)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Quiet Hours
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Set times when you don't want to receive notifications
                  </p>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHours?.start || '22:00'}
                          onChange={(e) => updatePreference('quietHours', {
                            ...preferences.quietHours,
                            start: e.target.value,
                          })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={preferences.quietHours?.end || '08:00'}
                          onChange={(e) => updatePreference('quietHours', {
                            ...preferences.quietHours,
                            end: e.target.value,
                          })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timezone
                        </label>
                        <select
                          value={preferences.quietHours?.timezone || 'UTC'}
                          onChange={(e) => updatePreference('quietHours', {
                            ...preferences.quietHours,
                            timezone: e.target.value,
                          })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="UTC">UTC</option>
                          <option value="America/New_York">Eastern Time</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                          <option value="Europe/London">London</option>
                          <option value="Europe/Paris">Paris</option>
                          <option value="Asia/Tokyo">Tokyo</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm text-blue-800 dark:text-blue-200">
                          <p className="font-medium">Quiet hours active</p>
                          <p>
                            Notifications will be muted from {preferences.quietHours?.start} to {preferences.quietHours?.end} 
                            ({preferences.quietHours?.timezone})
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {hasChanges && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You have unsaved changes
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={loadPreferences}
                    className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={savePreferences}
                    disabled={saving}
                    className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getChannelDescription(channel: NotificationChannel): string {
  switch (channel) {
    case NotificationChannel.TOAST: 
      return 'In-app popup notifications';
    case NotificationChannel.EMAIL: 
      return 'Email notifications to your inbox';
    case NotificationChannel.PUSH: 
      return 'Browser push notifications';
    case NotificationChannel.DESKTOP: 
      return 'System desktop notifications';
    case NotificationChannel.WEBHOOK: 
      return 'External webhook integrations';
    case NotificationChannel.SOUND: 
      return 'Audio notification sounds';
    default: 
      return 'Notification delivery channel';
  }
}