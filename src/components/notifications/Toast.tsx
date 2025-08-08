/**
 * Toast Notification System
 * Enterprise-grade toast notifications with multiple severity levels
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  X, 
  ExternalLink,
  Clock
} from 'lucide-react';
import { 
  ToastNotification, 
  NotificationType, 
  ToastPosition, 
  NotificationAction 
} from '@/lib/notifications/types';

interface ToastContextType {
  showToast: (toast: Omit<ToastNotification, 'id' | 'timestamp' | 'channels'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
  toasts: ToastNotification[];
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultPosition?: ToastPosition;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultPosition = ToastPosition.TOP_RIGHT,
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const showToast = useCallback((toast: Omit<ToastNotification, 'id' | 'timestamp' | 'channels'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastNotification = {
      id,
      timestamp: Date.now(),
      channels: ['toast' as any],
      duration: toast.duration || defaultDuration,
      position: toast.position || defaultPosition,
      autoClose: toast.autoClose !== false,
      dismissButton: toast.dismissButton !== false,
      ...toast,
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit the number of toasts
      if (updated.length > maxToasts) {
        return updated.slice(-maxToasts);
      }
      return updated;
    });

    // Auto-remove toast if autoClose is enabled
    if (newToast.autoClose && newToast.duration) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  }, [maxToasts, defaultPosition, defaultDuration]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, removeAllToasts, toasts }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

interface ToastContainerProps {
  toasts: ToastNotification[];
  onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  // Group toasts by position
  const toastsByPosition = toasts.reduce((acc, toast) => {
    const position = toast.position || ToastPosition.TOP_RIGHT;
    if (!acc[position]) {
      acc[position] = [];
    }
    acc[position].push(toast);
    return acc;
  }, {} as Record<ToastPosition, ToastNotification[]>);

  return (
    <>
      {Object.entries(toastsByPosition).map(([position, positionToasts]) => (
        <div
          key={position}
          className={`fixed z-50 pointer-events-none ${getPositionClasses(position as ToastPosition)}`}
          role="region"
          aria-label="Notifications"
        >
          <div className="space-y-2">
            {positionToasts.map(toast => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
};

interface ToastItemProps {
  toast: ToastNotification;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = useCallback(() => {
    setIsRemoving(true);
    setTimeout(() => onRemove(toast.id), 300); // Wait for exit animation
  }, [toast.id, onRemove]);

  const handleActionClick = useCallback((action: NotificationAction) => {
    if (action.callback) {
      action.callback();
    } else if (action.url) {
      window.open(action.url, '_blank');
    }
    handleRemove();
  }, [handleRemove]);

  return (
    <div
      className={`
        pointer-events-auto transform transition-all duration-300 ease-in-out
        ${isVisible && !isRemoving 
          ? 'translate-x-0 opacity-100 scale-100' 
          : getTransformClasses(toast.position || ToastPosition.TOP_RIGHT)
        }
      `}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`
          max-w-sm w-full rounded-lg shadow-lg border backdrop-blur-sm
          ${getTypeClasses(toast.type)}
        `}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getTypeIcon(toast.type)}
            </div>
            
            <div className="ml-3 flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium">
                    {toast.title}
                  </h3>
                  <div className="mt-1 text-sm opacity-90">
                    {toast.message}
                  </div>
                </div>
                
                {toast.dismissButton && (
                  <button
                    onClick={handleRemove}
                    className="ml-4 inline-flex text-sm opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Action button */}
              {toast.actionButton && (
                <div className="mt-3">
                  <button
                    onClick={() => handleActionClick(toast.actionButton!)}
                    className="inline-flex items-center text-sm font-medium underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
                  >
                    {toast.actionButton.title}
                    {toast.actionButton.url && (
                      <ExternalLink className="ml-1 h-3 w-3" />
                    )}
                  </button>
                </div>
              )}

              {/* Progress bar for auto-close */}
              {toast.autoClose && toast.duration && (
                <ToastProgressBar duration={toast.duration} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ToastProgressBarProps {
  duration: number;
}

const ToastProgressBar: React.FC<ToastProgressBarProps> = ({ duration }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const interval = 50; // Update every 50ms
    const decrement = (100 * interval) / duration;
    
    const timer = setInterval(() => {
      setProgress(prev => Math.max(0, prev - decrement));
    }, interval);

    return () => clearInterval(timer);
  }, [duration]);

  return (
    <div className="mt-3 h-1 bg-black/10 rounded-full overflow-hidden">
      <div
        className="h-full bg-current transition-all duration-75 ease-linear"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

// Helper functions
function getTypeIcon(type: NotificationType): JSX.Element {
  const iconProps = { className: "h-5 w-5" };
  
  switch (type) {
    case NotificationType.SUCCESS:
      return <CheckCircle {...iconProps} className="h-5 w-5 text-green-600" />;
    case NotificationType.ERROR:
    case NotificationType.CRITICAL:
      return <AlertCircle {...iconProps} className="h-5 w-5 text-red-600" />;
    case NotificationType.WARNING:
      return <AlertTriangle {...iconProps} className="h-5 w-5 text-amber-600" />;
    case NotificationType.INFO:
    default:
      return <Info {...iconProps} className="h-5 w-5 text-blue-600" />;
  }
}

function getTypeClasses(type: NotificationType): string {
  switch (type) {
    case NotificationType.SUCCESS:
      return 'bg-green-50/95 border-green-200 text-green-900 dark:bg-green-950/95 dark:border-green-800 dark:text-green-100';
    case NotificationType.ERROR:
    case NotificationType.CRITICAL:
      return 'bg-red-50/95 border-red-200 text-red-900 dark:bg-red-950/95 dark:border-red-800 dark:text-red-100';
    case NotificationType.WARNING:
      return 'bg-amber-50/95 border-amber-200 text-amber-900 dark:bg-amber-950/95 dark:border-amber-800 dark:text-amber-100';
    case NotificationType.INFO:
    default:
      return 'bg-blue-50/95 border-blue-200 text-blue-900 dark:bg-blue-950/95 dark:border-blue-800 dark:text-blue-100';
  }
}

function getPositionClasses(position: ToastPosition): string {
  switch (position) {
    case ToastPosition.TOP_LEFT:
      return 'top-4 left-4';
    case ToastPosition.TOP_CENTER:
      return 'top-4 left-1/2 transform -translate-x-1/2';
    case ToastPosition.TOP_RIGHT:
      return 'top-4 right-4';
    case ToastPosition.BOTTOM_LEFT:
      return 'bottom-4 left-4';
    case ToastPosition.BOTTOM_CENTER:
      return 'bottom-4 left-1/2 transform -translate-x-1/2';
    case ToastPosition.BOTTOM_RIGHT:
      return 'bottom-4 right-4';
    default:
      return 'top-4 right-4';
  }
}

function getTransformClasses(position: ToastPosition): string {
  if (position.includes('left')) {
    return 'opacity-0 scale-95 -translate-x-full';
  } else if (position.includes('right')) {
    return 'opacity-0 scale-95 translate-x-full';
  } else if (position.includes('top')) {
    return 'opacity-0 scale-95 -translate-y-full';
  } else {
    return 'opacity-0 scale-95 translate-y-full';
  }
}

// Utility function for programmatic usage
export const toast = {
  success: (title: string, message: string, options?: Partial<ToastNotification>) => {
    // This would be used with a global toast context
    console.log('Success toast:', { title, message, options });
  },
  error: (title: string, message: string, options?: Partial<ToastNotification>) => {
    console.log('Error toast:', { title, message, options });
  },
  warning: (title: string, message: string, options?: Partial<ToastNotification>) => {
    console.log('Warning toast:', { title, message, options });
  },
  info: (title: string, message: string, options?: Partial<ToastNotification>) => {
    console.log('Info toast:', { title, message, options });
  },
};