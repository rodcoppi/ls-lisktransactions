/**
 * Notification Center Component
 * Comprehensive notification management hub with history and controls
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Bell, 
  BellRing, 
  Settings, 
  X, 
  Check, 
  CheckAll, 
  Trash2, 
  Search, 
  Filter, 
  Clock, 
  AlertCircle,
  Info,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Archive,
  Bookmark,
  BookmarkCheck,
  Volume2,
  VolumeX,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  NotificationHistory, 
  NotificationType, 
  NotificationPriority,
  AlertType,
  NotificationChannel 
} from '@/lib/notifications/types';
import { formatDistanceToNow } from 'date-fns';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

interface FilterState {
  types: NotificationType[];
  priorities: NotificationPriority[];
  read: 'all' | 'read' | 'unread';
  dateRange: 'today' | 'week' | 'month' | 'all';
  search: string;
}

// Mock data - in real implementation, this would come from API
const mockNotifications: NotificationHistory[] = [
  {
    id: '1',
    notificationId: 'notif_1',
    userId: 'user_1',
    title: 'Transaction Volume Alert',
    message: 'Transaction volume has exceeded 10,000 LSK in the last hour',
    type: NotificationType.WARNING,
    priority: NotificationPriority.HIGH,
    isRead: false,
    createdAt: Date.now() - 5 * 60 * 1000, // 5 minutes ago
    metadata: { alertType: AlertType.TRANSACTION_VOLUME }
  },
  {
    id: '2',
    notificationId: 'notif_2',
    userId: 'user_1',
    title: 'Network Issue Resolved',
    message: 'The network connectivity issue has been resolved',
    type: NotificationType.SUCCESS,
    priority: NotificationPriority.NORMAL,
    isRead: false,
    createdAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
    metadata: { alertType: AlertType.NETWORK_ISSUES }
  },
  {
    id: '3',
    notificationId: 'notif_3',
    userId: 'user_1',
    title: 'Price Alert',
    message: 'LSK price has dropped below $1.50',
    type: NotificationType.ERROR,
    priority: NotificationPriority.HIGH,
    isRead: true,
    readAt: Date.now() - 20 * 60 * 1000,
    createdAt: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    metadata: { alertType: AlertType.PRICE_CHANGES, price: 1.45 }
  },
  {
    id: '4',
    notificationId: 'notif_4',
    userId: 'user_1',
    title: 'System Performance',
    message: 'Dashboard performance has improved by 25%',
    type: NotificationType.INFO,
    priority: NotificationPriority.LOW,
    isRead: true,
    readAt: Date.now() - 45 * 60 * 1000,
    createdAt: Date.now() - 60 * 60 * 1000, // 1 hour ago
    metadata: { alertType: AlertType.PERFORMANCE }
  }
];

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
}) => {
  const [notifications, setNotifications] = useState<NotificationHistory[]>(mockNotifications);
  const [filter, setFilter] = useState<FilterState>({
    types: [],
    priorities: [],
    read: 'all',
    dateRange: 'all',
    search: '',
  });
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.isRead).length, 
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Type filter
      if (filter.types.length > 0 && !filter.types.includes(notification.type)) {
        return false;
      }

      // Priority filter
      if (filter.priorities.length > 0 && !filter.priorities.includes(notification.priority)) {
        return false;
      }

      // Read status filter
      if (filter.read === 'read' && !notification.isRead) return false;
      if (filter.read === 'unread' && notification.isRead) return false;

      // Date range filter
      const now = Date.now();
      const notificationAge = now - notification.createdAt;
      
      switch (filter.dateRange) {
        case 'today':
          if (notificationAge > 24 * 60 * 60 * 1000) return false;
          break;
        case 'week':
          if (notificationAge > 7 * 24 * 60 * 60 * 1000) return false;
          break;
        case 'month':
          if (notificationAge > 30 * 24 * 60 * 60 * 1000) return false;
          break;
      }

      // Search filter
      if (filter.search && !notification.title.toLowerCase().includes(filter.search.toLowerCase()) &&
          !notification.message.toLowerCase().includes(filter.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [notifications, filter]);

  const handleMarkAsRead = useCallback((notificationIds?: string[]) => {
    const idsToUpdate = notificationIds || Array.from(selectedNotifications);
    
    setNotifications(prev => 
      prev.map(notification => 
        idsToUpdate.includes(notification.id)
          ? { ...notification, isRead: true, readAt: Date.now() }
          : notification
      )
    );

    if (!notificationIds) {
      setSelectedNotifications(new Set());
    }
  }, [selectedNotifications]);

  const handleMarkAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({
        ...notification,
        isRead: true,
        readAt: notification.readAt || Date.now(),
      }))
    );
    setSelectedNotifications(new Set());
  }, []);

  const handleDelete = useCallback((notificationIds?: string[]) => {
    const idsToDelete = notificationIds || Array.from(selectedNotifications);
    
    setNotifications(prev => 
      prev.filter(notification => !idsToDelete.includes(notification.id))
    );

    if (!notificationIds) {
      setSelectedNotifications(new Set());
    }
  }, [selectedNotifications]);

  const handleSelectAll = useCallback(() => {
    const allIds = new Set(filteredNotifications.map(n => n.id));
    setSelectedNotifications(allIds);
  }, [filteredNotifications]);

  const handleClearSelection = useCallback(() => {
    setSelectedNotifications(new Set());
  }, []);

  const handleToggleSelection = useCallback((notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  }, []);

  const handleNotificationClick = useCallback((notification: NotificationHistory) => {
    if (!notification.isRead) {
      handleMarkAsRead([notification.id]);
    }
  }, [handleMarkAsRead]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Bell className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h2>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4" />
                  ) : (
                    <VolumeX className="h-4 w-4" />
                  )}
                </button>
                
                <button
                  onClick={onOpenSettings}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Notification settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
                
                <button
                  onClick={onClose}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="mt-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={filter.search}
                  onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                  {isFilterOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <CheckAll className="h-4 w-4" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Filters Panel */}
          {isFilterOpen && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 space-y-3">
              {/* Type Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Type
                </label>
                <div className="flex flex-wrap gap-1">
                  {Object.values(NotificationType).map(type => (
                    <button
                      key={type}
                      onClick={() => setFilter(prev => ({
                        ...prev,
                        types: prev.types.includes(type)
                          ? prev.types.filter(t => t !== type)
                          : [...prev.types, type]
                      }))}
                      className={`px-2 py-1 text-xs rounded-full border ${
                        filter.types.includes(type)
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Read Status Filter */}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Status
                </label>
                <div className="flex space-x-2">
                  {(['all', 'read', 'unread'] as const).map(status => (
                    <button
                      key={status}
                      onClick={() => setFilter(prev => ({ ...prev, read: status }))}
                      className={`px-3 py-1 text-xs rounded-full border ${
                        filter.read === status
                          ? 'bg-blue-100 border-blue-300 text-blue-800'
                          : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <div className="border-b border-gray-200 dark:border-gray-700 p-3 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-800 dark:text-blue-200">
                  {selectedNotifications.size} selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleMarkAsRead()}
                    className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete()}
                    className="p-1 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleClearSelection}
                    className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Clear selection"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {filter.search || filter.types.length > 0 || filter.read !== 'all'
                    ? 'No notifications match your filters'
                    : 'No notifications yet'
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    isSelected={selectedNotifications.has(notification.id)}
                    onToggleSelection={handleToggleSelection}
                    onClick={handleNotificationClick}
                    onMarkAsRead={() => handleMarkAsRead([notification.id])}
                    onDelete={() => handleDelete([notification.id])}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{filteredNotifications.length} notifications</span>
              <button
                onClick={handleSelectAll}
                className="hover:text-gray-700 dark:hover:text-gray-200"
              >
                Select all
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NotificationItemProps {
  notification: NotificationHistory;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onClick: (notification: NotificationHistory) => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  isSelected,
  onToggleSelection,
  onClick,
  onMarkAsRead,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);

  const getTypeIcon = () => {
    switch (notification.type) {
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case NotificationType.ERROR:
      case NotificationType.CRITICAL:
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getPriorityIndicator = () => {
    if (notification.priority === NotificationPriority.HIGH || notification.priority === NotificationPriority.URGENT) {
      return <div className="absolute left-0 top-0 h-full w-1 bg-red-500 rounded-l" />;
    }
    return null;
  };

  return (
    <div
      className={`relative p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {getPriorityIndicator()}
      
      <div className="flex items-start space-x-3">
        {/* Selection checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelection(notification.id)}
          className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />

        {/* Type icon */}
        <div className="flex-shrink-0 mt-1">
          {getTypeIcon()}
        </div>

        {/* Content */}
        <div 
          className="flex-1 cursor-pointer"
          onClick={() => onClick(notification)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-sm font-medium ${
                notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-white font-semibold'
              }`}>
                {notification.title}
                {!notification.isRead && (
                  <span className="ml-2 h-2 w-2 bg-blue-500 rounded-full inline-block" />
                )}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {notification.message}
              </p>
              <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(notification.createdAt, { addSuffix: true })}</span>
                {notification.readAt && (
                  <>
                    <span>•</span>
                    <Eye className="h-3 w-3" />
                    <span>Read {formatDistanceToNow(notification.readAt, { addSuffix: true })}</span>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center space-x-1 ml-2">
                {!notification.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead();
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};