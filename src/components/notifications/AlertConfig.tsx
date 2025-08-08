/**
 * Alert Configuration Component
 * Comprehensive system for configuring custom alerts and thresholds
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  AlertTriangle,
  CheckCircle,
  Bell,
  Settings,
  Copy,
  Play,
  Pause,
  Activity,
  TrendingUp,
  Shield,
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import {
  AlertRule,
  AlertCondition,
  AlertType,
  AlertFrequency,
  NotificationChannel,
  NotificationPriority,
  NotificationType
} from '@/lib/notifications/types';

interface AlertConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

interface AlertFormData {
  name: string;
  description: string;
  alertType: AlertType;
  conditions: AlertCondition[];
  severity: NotificationPriority;
  frequency: AlertFrequency;
  channels: NotificationChannel[];
  cooldownPeriod: number;
  emailRecipients: string[];
  webhookUrl: string;
  enabled: boolean;
}

// Mock data - in real implementation, this would come from API
const mockAlertRules: AlertRule[] = [
  {
    id: 'alert_1',
    name: 'High Transaction Volume',
    description: 'Alert when transaction volume exceeds normal levels',
    enabled: true,
    alertType: AlertType.TRANSACTION_VOLUME,
    conditions: [
      {
        id: 'cond_1',
        name: 'Volume Threshold',
        metric: 'transactions.volume.hourly',
        operator: 'gt',
        threshold: 10000,
        duration: 300000, // 5 minutes
        aggregation: 'sum',
        timeWindow: 3600000, // 1 hour
      }
    ],
    severity: NotificationPriority.HIGH,
    frequency: AlertFrequency.IMMEDIATE,
    channels: [NotificationChannel.TOAST, NotificationChannel.EMAIL],
    cooldownPeriod: 1800000, // 30 minutes
    emailRecipients: ['admin@example.com'],
    lastTriggered: Date.now() - 3600000,
    triggerCount: 5,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    createdBy: 'admin',
  },
  {
    id: 'alert_2',
    name: 'Network Connectivity Issues',
    description: 'Monitor for network connectivity problems',
    enabled: true,
    alertType: AlertType.NETWORK_ISSUES,
    conditions: [
      {
        id: 'cond_2',
        name: 'Connection Failures',
        metric: 'network.connection.failures',
        operator: 'gt',
        threshold: 5,
        duration: 300000,
        aggregation: 'count',
        timeWindow: 600000, // 10 minutes
      }
    ],
    severity: NotificationPriority.URGENT,
    frequency: AlertFrequency.IMMEDIATE,
    channels: [NotificationChannel.TOAST, NotificationChannel.PUSH, NotificationChannel.EMAIL],
    cooldownPeriod: 600000, // 10 minutes
    emailRecipients: ['ops@example.com', 'admin@example.com'],
    triggerCount: 2,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 86400000,
    createdBy: 'ops',
  },
];

const defaultFormData: AlertFormData = {
  name: '',
  description: '',
  alertType: AlertType.CUSTOM,
  conditions: [
    {
      id: 'new_condition',
      name: '',
      metric: '',
      operator: 'gt',
      threshold: 0,
      duration: 300000,
      aggregation: 'avg',
      timeWindow: 3600000,
    }
  ],
  severity: NotificationPriority.NORMAL,
  frequency: AlertFrequency.IMMEDIATE,
  channels: [NotificationChannel.TOAST],
  cooldownPeriod: 1800000,
  emailRecipients: [],
  webhookUrl: '',
  enabled: true,
};

export const AlertConfig: React.FC<AlertConfigProps> = ({ isOpen, onClose }) => {
  const [alertRules, setAlertRules] = useState<AlertRule[]>(mockAlertRules);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AlertFormData>(defaultFormData);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AlertType | 'all'>('all');
  const [filterEnabled, setFilterEnabled] = useState<boolean | 'all'>('all');
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [testingRule, setTestingRule] = useState<string | null>(null);

  const filteredRules = alertRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || rule.alertType === filterType;
    const matchesEnabled = filterEnabled === 'all' || rule.enabled === filterEnabled;
    
    return matchesSearch && matchesType && matchesEnabled;
  });

  const handleCreateAlert = useCallback(() => {
    setSelectedRule(null);
    setFormData(defaultFormData);
    setIsEditing(true);
  }, []);

  const handleEditAlert = useCallback((rule: AlertRule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      alertType: rule.alertType,
      conditions: rule.conditions,
      severity: rule.severity,
      frequency: rule.frequency,
      channels: rule.channels,
      cooldownPeriod: rule.cooldownPeriod,
      emailRecipients: rule.emailRecipients || [],
      webhookUrl: rule.webhookUrl || '',
      enabled: rule.enabled,
    });
    setIsEditing(true);
  }, []);

  const handleSaveAlert = useCallback(async () => {
    try {
      if (selectedRule) {
        // Update existing rule
        const updatedRule: AlertRule = {
          ...selectedRule,
          ...formData,
          updatedAt: Date.now(),
        };
        
        setAlertRules(prev => prev.map(rule => 
          rule.id === selectedRule.id ? updatedRule : rule
        ));
      } else {
        // Create new rule
        const newRule: AlertRule = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...formData,
          triggerCount: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'current_user', // Would come from auth context
        };
        
        setAlertRules(prev => [newRule, ...prev]);
      }
      
      setIsEditing(false);
      setSelectedRule(null);
    } catch (error) {
      console.error('Failed to save alert rule:', error);
    }
  }, [selectedRule, formData]);

  const handleDeleteAlert = useCallback(async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this alert rule?')) {
      setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
    }
  }, []);

  const handleToggleEnabled = useCallback(async (ruleId: string) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled, updatedAt: Date.now() } : rule
    ));
  }, []);

  const handleTestAlert = useCallback(async (ruleId: string) => {
    setTestingRule(ruleId);
    
    try {
      // Simulate testing the alert rule
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success message
      alert('Alert test completed successfully!');
    } catch (error) {
      console.error('Alert test failed:', error);
      alert('Alert test failed. Please check the configuration.');
    } finally {
      setTestingRule(null);
    }
  }, []);

  const handleDuplicateAlert = useCallback((rule: AlertRule) => {
    const duplicatedRule: AlertRule = {
      ...rule,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: `${rule.name} (Copy)`,
      enabled: false,
      triggerCount: 0,
      lastTriggered: undefined,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    setAlertRules(prev => [duplicatedRule, ...prev]);
  }, []);

  const handleAddCondition = useCallback(() => {
    const newCondition: AlertCondition = {
      id: `cond_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      metric: '',
      operator: 'gt',
      threshold: 0,
      duration: 300000,
      aggregation: 'avg',
      timeWindow: 3600000,
    };
    
    setFormData(prev => ({
      ...prev,
      conditions: [...prev.conditions, newCondition]
    }));
  }, []);

  const handleRemoveCondition = useCallback((conditionId: string) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.filter(c => c.id !== conditionId)
    }));
  }, []);

  const handleConditionChange = useCallback((conditionId: string, field: keyof AlertCondition, value: any) => {
    setFormData(prev => ({
      ...prev,
      conditions: prev.conditions.map(c => 
        c.id === conditionId ? { ...c, [field]: value } : c
      )
    }));
  }, []);

  const toggleRuleExpansion = useCallback((ruleId: string) => {
    setExpandedRules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ruleId)) {
        newSet.delete(ruleId);
      } else {
        newSet.add(ruleId);
      }
      return newSet;
    });
  }, []);

  const getAlertTypeIcon = (alertType: AlertType) => {
    switch (alertType) {
      case AlertType.TRANSACTION_VOLUME: return <TrendingUp className="h-4 w-4" />;
      case AlertType.NETWORK_ISSUES: return <Activity className="h-4 w-4" />;
      case AlertType.PRICE_CHANGES: return <TrendingUp className="h-4 w-4" />;
      case AlertType.SYSTEM_ERROR: return <AlertTriangle className="h-4 w-4" />;
      case AlertType.PERFORMANCE: return <Zap className="h-4 w-4" />;
      case AlertType.SECURITY: return <Shield className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.LOW: return 'text-gray-500';
      case NotificationPriority.NORMAL: return 'text-blue-500';
      case NotificationPriority.HIGH: return 'text-orange-500';
      case NotificationPriority.URGENT: return 'text-red-500';
      default: return 'text-gray-500';
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
      <div className="absolute right-0 top-0 h-full w-full max-w-6xl bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex h-full">
          {/* Rules List */}
          <div className="flex-1 border-r border-gray-200 dark:border-gray-700">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Settings className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Alert Configuration
                    </h2>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCreateAlert}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Plus className="h-4 w-4" />
                      <span>New Alert</span>
                    </button>
                    <button
                      onClick={onClose}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Search and Filters */}
                <div className="mt-4 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search alert rules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex space-x-2">
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as AlertType | 'all')}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Types</option>
                      {Object.values(AlertType).map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                      ))}
                    </select>
                    
                    <select
                      value={filterEnabled.toString()}
                      onChange={(e) => setFilterEnabled(e.target.value === 'all' ? 'all' : e.target.value === 'true')}
                      className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">All Status</option>
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rules List */}
              <div className="flex-1 overflow-y-auto">
                {filteredRules.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm || filterType !== 'all' || filterEnabled !== 'all'
                        ? 'No alert rules match your filters'
                        : 'No alert rules configured yet'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredRules.map(rule => (
                      <div key={rule.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              {getAlertTypeIcon(rule.alertType)}
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {rule.name}
                              </h3>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                rule.enabled 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                              }`}>
                                {rule.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                              <span className={`text-xs font-medium ${getPriorityColor(rule.severity)}`}>
                                {rule.severity.toUpperCase()}
                              </span>
                            </div>
                            
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {rule.description}
                            </p>
                            
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                              <span>Triggered {rule.triggerCount} times</span>
                              {rule.lastTriggered && (
                                <span>Last: {new Date(rule.lastTriggered).toLocaleString()}</span>
                              )}
                              <span>Cooldown: {Math.floor(rule.cooldownPeriod / 60000)}m</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 ml-4">
                            <button
                              onClick={() => toggleRuleExpansion(rule.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Toggle details"
                            >
                              {expandedRules.has(rule.id) ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleTestAlert(rule.id)}
                              disabled={testingRule === rule.id}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                              title="Test alert"
                            >
                              <Play className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => handleToggleEnabled(rule.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title={rule.enabled ? 'Disable' : 'Enable'}
                            >
                              {rule.enabled ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleEditAlert(rule)}
                              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                              title="Edit"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            
                            <div className="relative group">
                              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                              
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                <button
                                  onClick={() => handleDuplicateAlert(rule)}
                                  className="w-full px-3 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                  <Copy className="h-3 w-3" />
                                  <span>Duplicate</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteAlert(rule.id)}
                                  className="w-full px-3 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Details */}
                        {expandedRules.has(rule.id) && (
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                              Conditions ({rule.conditions.length})
                            </h4>
                            <div className="space-y-2">
                              {rule.conditions.map(condition => (
                                <div key={condition.id} className="text-xs text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">{condition.name || condition.metric}</span>
                                  {' '}{condition.operator}{' '}
                                  <span className="font-medium">{condition.threshold}</span>
                                  {condition.duration && (
                                    <span> for {Math.floor(condition.duration / 60000)}m</span>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>Channels: {rule.channels.join(', ')}</span>
                                <span>Frequency: {rule.frequency}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Rule Editor */}
          {isEditing && (
            <div className="w-1/2 flex flex-col">
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
                  </h3>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSaveAlert}
                      className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Basic Information
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Alert Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter alert name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe when this alert should trigger"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Alert Type
                        </label>
                        <select
                          value={formData.alertType}
                          onChange={(e) => setFormData(prev => ({ ...prev, alertType: e.target.value as AlertType }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.values(AlertType).map(type => (
                            <option key={type} value={type}>
                              {type.replace('_', ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Priority
                        </label>
                        <select
                          value={formData.severity}
                          onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value as NotificationPriority }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.values(NotificationPriority).map(priority => (
                            <option key={priority} value={priority}>
                              {priority.toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Conditions
                    </h4>
                    <button
                      onClick={handleAddCondition}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-300 hover:border-blue-400 rounded"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add</span>
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {formData.conditions.map((condition, index) => (
                      <div key={condition.id} className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Condition {index + 1}
                          </span>
                          {formData.conditions.length > 1 && (
                            <button
                              onClick={() => handleRemoveCondition(condition.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={condition.name}
                            onChange={(e) => handleConditionChange(condition.id, 'name', e.target.value)}
                            placeholder="Condition name"
                            className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                          />
                          
                          <div className="grid grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={condition.metric}
                              onChange={(e) => handleConditionChange(condition.id, 'metric', e.target.value)}
                              placeholder="metric.path"
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                            />
                            
                            <select
                              value={condition.operator}
                              onChange={(e) => handleConditionChange(condition.id, 'operator', e.target.value)}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="gt">&gt;</option>
                              <option value="gte">&ge;</option>
                              <option value="lt">&lt;</option>
                              <option value="lte">&le;</option>
                              <option value="eq">=</option>
                              <option value="ne">≠</option>
                              <option value="contains">contains</option>
                              <option value="regex">regex</option>
                            </select>
                            
                            <input
                              type="number"
                              value={condition.threshold}
                              onChange={(e) => handleConditionChange(condition.id, 'threshold', parseFloat(e.target.value) || 0)}
                              placeholder="Threshold"
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Settings */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    Notification Settings
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Channels
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.values(NotificationChannel).map(channel => (
                          <label key={channel} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={formData.channels.includes(channel)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  channels: checked
                                    ? [...prev.channels, channel]
                                    : prev.channels.filter(c => c !== channel)
                                }));
                              }}
                              className="h-3 w-3 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-700 dark:text-gray-300">
                              {channel}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Frequency
                        </label>
                        <select
                          value={formData.frequency}
                          onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value as AlertFrequency }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {Object.values(AlertFrequency).map(freq => (
                            <option key={freq} value={freq}>
                              {freq.replace('_', ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Cooldown (minutes)
                        </label>
                        <input
                          type="number"
                          value={Math.floor(formData.cooldownPeriod / 60000)}
                          onChange={(e) => setFormData(prev => ({ ...prev, cooldownPeriod: (parseInt(e.target.value) || 0) * 60000 }))}
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.enabled}
                          onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Enable this alert rule
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};