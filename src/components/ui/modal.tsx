"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// Modal context for managing state
interface ModalContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const ModalContext = React.createContext<ModalContextType | undefined>(undefined);

const useModalContext = () => {
  const context = React.useContext(ModalContext);
  if (!context) {
    throw new Error("Modal components must be used within a Modal");
  }
  return context;
};

// Modal variants
const modalVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 theme-transition",
  {
    variants: {
      variant: {
        default: "rounded-lg border-border",
        destructive: "rounded-lg border-destructive/50",
        success: "rounded-lg border-success/50",
        warning: "rounded-lg border-warning/50",
      },
      size: {
        sm: "max-w-sm",
        default: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-[95vw] max-h-[95vh]",
      },
      animation: {
        scale: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
        slide: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-[48%] data-[state=open]:slide-in-from-bottom-[48%]",
        fade: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      animation: "scale",
    },
  }
);

const overlayVariants = cva(
  "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-200",
  {
    variants: {
      animation: {
        default: "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      },
    },
    defaultVariants: {
      animation: "default",
    },
  }
);

// Main Modal component
export interface ModalProps extends VariantProps<typeof modalVariants> {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  modal?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  children,
  open: controlledOpen,
  onOpenChange,
  defaultOpen = false,
  modal = true,
  ...props
}) => {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = onOpenChange || setUncontrolledOpen;

  const contextValue = React.useMemo(
    () => ({ open, setOpen }),
    [open, setOpen]
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

// Modal trigger button
export interface ModalTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const ModalTrigger = React.forwardRef<HTMLButtonElement, ModalTriggerProps>(
  ({ onClick, asChild, children, ...props }, ref) => {
    const { setOpen } = useModalContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(true);
      onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: handleClick,
        ref,
        ...props,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
ModalTrigger.displayName = "ModalTrigger";

// Modal content with overlay
export interface ModalContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants> {
  overlayProps?: React.HTMLAttributes<HTMLDivElement>;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const ModalContent = React.forwardRef<HTMLDivElement, ModalContentProps>(
  ({
    className,
    children,
    variant,
    size,
    animation,
    overlayProps,
    closeOnOutsideClick = true,
    closeOnEscape = true,
    showCloseButton = true,
    ...props
  }, ref) => {
    const { open, setOpen } = useModalContext();
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Handle escape key
    React.useEffect(() => {
      if (!closeOnEscape || !open) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [closeOnEscape, open, setOpen]);

    // Handle outside click
    const handleOverlayClick = (e: React.MouseEvent) => {
      if (!closeOnOutsideClick) return;
      if (contentRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };

    // Focus management
    React.useEffect(() => {
      if (!open) return;

      const previouslyFocused = document.activeElement as HTMLElement;
      const focusableElements = contentRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements && focusableElements.length > 0) {
        (focusableElements[0] as HTMLElement).focus();
      }

      return () => {
        previouslyFocused?.focus();
      };
    }, [open]);

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (open) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "unset";
      }

      return () => {
        document.body.style.overflow = "unset";
      };
    }, [open]);

    if (!open) return null;

    const modalContent = (
      <>
        {/* Overlay */}
        <div
          className={cn(overlayVariants())}
          onClick={handleOverlayClick}
          data-state={open ? "open" : "closed"}
          {...overlayProps}
        />
        
        {/* Modal content */}
        <div
          ref={ref}
          className={cn(modalVariants({ variant, size, animation, className }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
          data-state={open ? "open" : "closed"}
          {...props}
        >
          <div ref={contentRef}>
            {showCloseButton && (
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                aria-label="Close modal"
              >
                <svg
                  width="24"
                  height="24"
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
            )}
            {children}
          </div>
        </div>
      </>
    );

    return typeof document !== "undefined"
      ? createPortal(modalContent, document.body)
      : null;
  }
);
ModalContent.displayName = "ModalContent";

// Modal header
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left",
        className
      )}
      {...props}
    />
  )
);
ModalHeader.displayName = "ModalHeader";

// Modal title
export interface ModalTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const ModalTitle = React.forwardRef<HTMLHeadingElement, ModalTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      id="modal-title"
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-balance",
        className
      )}
      {...props}
    />
  )
);
ModalTitle.displayName = "ModalTitle";

// Modal description
export interface ModalDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  ModalDescriptionProps
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    id="modal-description"
    className={cn("text-sm text-muted-foreground text-pretty", className)}
    {...props}
  />
));
ModalDescription.displayName = "ModalDescription";

// Modal body
export interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("py-4", className)}
      {...props}
    />
  )
);
ModalBody.displayName = "ModalBody";

// Modal footer
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  )
);
ModalFooter.displayName = "ModalFooter";

// Modal close button
export interface ModalCloseProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const ModalClose = React.forwardRef<HTMLButtonElement, ModalCloseProps>(
  ({ onClick, asChild, children, ...props }, ref) => {
    const { setOpen } = useModalContext();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      setOpen(false);
      onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        onClick: handleClick,
        ref,
        ...props,
      });
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);
ModalClose.displayName = "ModalClose";

// Confirmation modal helper
export interface ConfirmationModalProps extends Omit<ModalProps, 'children'> {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalContentProps['variant'];
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  onConfirm,
  onCancel,
  loading = false,
  ...modalProps
}) => {
  const handleConfirm = () => {
    onConfirm();
    modalProps.onOpenChange?.(false);
  };

  const handleCancel = () => {
    onCancel?.();
    modalProps.onOpenChange?.(false);
  };

  return (
    <Modal {...modalProps}>
      <ModalContent variant={variant}>
        <ModalHeader>
          <ModalTitle>{title}</ModalTitle>
          <ModalDescription>{description}</ModalDescription>
        </ModalHeader>
        <ModalFooter className="gap-2">
          <button
            onClick={handleCancel}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
              variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {loading && (
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {confirmText}
          </button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalClose,
  ConfirmationModal,
  modalVariants,
  overlayVariants,
};