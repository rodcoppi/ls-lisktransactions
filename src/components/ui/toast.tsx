"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Toast types
export type ToastType = "default" | "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type?: ToastType;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Toast context
interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

// Toast variants
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all theme-transition",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        success:
          "border-success/50 bg-success/10 text-success-foreground [&>svg]:text-success",
        error:
          "border-destructive/50 bg-destructive/10 text-destructive-foreground [&>svg]:text-destructive",
        warning:
          "border-warning/50 bg-warning/10 text-warning-foreground [&>svg]:text-warning",
        info: "border-info/50 bg-info/10 text-info-foreground [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

// Toast provider
export interface ToastProviderProps {
  children: React.ReactNode;
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top-center" | "bottom-center";
  maxToasts?: number;
  defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  position = "bottom-right",
  maxToasts = 5,
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const timeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addToast = React.useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast: Toast = {
        ...toast,
        id,
        duration: toast.duration ?? defaultDuration,
        type: toast.type ?? "default",
      };

      setToasts((prevToasts) => {
        const updatedToasts = [newToast, ...prevToasts];
        // Limit the number of toasts
        if (updatedToasts.length > maxToasts) {
          const removedToast = updatedToasts.pop();
          if (removedToast) {
            const timeout = timeoutsRef.current.get(removedToast.id);
            if (timeout) {
              clearTimeout(timeout);
              timeoutsRef.current.delete(removedToast.id);
            }
          }
        }
        return updatedToasts;
      });

      // Auto-remove toast after duration (if not persistent)
      if (!toast.persistent && (toast.duration ?? defaultDuration) > 0) {
        const timeout = setTimeout(() => {
          removeToast(id);
        }, toast.duration ?? defaultDuration);
        timeoutsRef.current.set(id, timeout);
      }

      return id;
    },
    [defaultDuration, maxToasts]
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  const removeAllToasts = React.useCallback(() => {
    setToasts([]);
    timeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  const contextValue = React.useMemo(
    () => ({
      toasts,
      addToast,
      removeToast,
      removeAllToasts,
    }),
    [toasts, addToast, removeToast, removeAllToasts]
  );

  // Position classes
  const positionClasses = {
    "top-left": "top-0 left-0",
    "top-right": "top-0 right-0",
    "top-center": "top-0 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
    "bottom-center": "bottom-0 left-1/2 -translate-x-1/2",
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div
            className={cn(
              "fixed z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:top-0 sm:max-w-[420px] sm:flex-col",
              positionClasses[position]
            )}
          >
            {toasts.map((toast) => (
              <ToastComponent
                key={toast.id}
                toast={toast}
                onClose={() => removeToast(toast.id)}
              />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
};

// Individual toast component
interface ToastComponentProps {
  toast: Toast;
  onClose: () => void;
}

const ToastComponent: React.FC<ToastComponentProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isRemoving, setIsRemoving] = React.useState(false);

  // Animation on mount
  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Handle close with animation
  const handleClose = () => {
    setIsRemoving(true);
    setTimeout(onClose, 200);
  };

  // Icons for different toast types
  const getIcon = () => {
    switch (toast.type) {
      case "success":
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20,6 9,17 4,12" />
          </svg>
        );
      case "error":
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        );
      case "warning":
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case "info":
        return (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        toastVariants({ variant: toast.type }),
        "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
        "transition-all duration-200 ease-in-out",
        isVisible 
          ? "opacity-100 translate-y-0 scale-100" 
          : "opacity-0 translate-y-2 scale-95",
        isRemoving && "opacity-0 translate-x-full scale-95"
      )}
      style={{
        transform: isVisible && !isRemoving ? "translateY(0) scale(1)" : undefined,
      }}
    >
      <div className="grid gap-1">
        {toast.title && (
          <div className="text-sm font-semibold flex items-center gap-2">
            {getIcon()}
            {toast.title}
          </div>
        )}
        {toast.description && (
          <div className="text-sm opacity-90 text-pretty">
            {toast.description}
          </div>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
            className="mt-2 inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={handleClose}
        className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
        aria-label="Close toast"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};

// Toast helper functions
export const toast = {
  success: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    // This will be implemented by the provider
    console.log("Success toast:", message, options);
  },
  error: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    console.log("Error toast:", message, options);
  },
  warning: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    console.log("Warning toast:", message, options);
  },
  info: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    console.log("Info toast:", message, options);
  },
  default: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) => {
    console.log("Default toast:", message, options);
  },
};

// Hook to create toast helper functions with access to context
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return React.useMemo(
    () => ({
      success: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) =>
        addToast({ description: message, type: "success", ...options }),
      error: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) =>
        addToast({ description: message, type: "error", ...options }),
      warning: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) =>
        addToast({ description: message, type: "warning", ...options }),
      info: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) =>
        addToast({ description: message, type: "info", ...options }),
      default: (message: string, options?: Partial<Omit<Toast, "id" | "type">>) =>
        addToast({ description: message, type: "default", ...options }),
      custom: (toast: Omit<Toast, "id">) => addToast(toast),
    }),
    [addToast]
  );
};

export { toastVariants };