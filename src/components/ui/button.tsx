import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-target relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md active:shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md active:shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md active:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md active:shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-success text-success-foreground hover:bg-success/90 shadow-sm hover:shadow-md active:shadow-sm",
        warning: "bg-warning text-warning-foreground hover:bg-warning/90 shadow-sm hover:shadow-md active:shadow-sm",
        info: "bg-info text-info-foreground hover:bg-info/90 shadow-sm hover:shadow-md active:shadow-sm",
      },
      size: {
        xs: "h-8 px-3 text-xs",
        sm: "h-9 px-3 text-sm",
        default: "h-10 px-4 py-2",
        lg: "h-11 px-8 text-base",
        xl: "h-12 px-10 text-lg",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      loading: {
        true: "cursor-not-allowed",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
)

// Loading spinner component
const LoadingSpinner = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="animate-spin"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    asChild = false, 
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading;
    
    const buttonContent = (
      <>
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit">
            <LoadingSpinner size={size === 'xs' || size === 'sm' ? 14 : 16} />
            {loadingText && (
              <span className="ml-2 text-sm">{loadingText}</span>
            )}
          </div>
        )}
        
        {/* Button content */}
        <div className={cn("flex items-center gap-2", loading && "invisible")}>
          {leftIcon && !asChild && (
            <span className="[&_svg]:size-4 [&_svg]:shrink-0" aria-hidden="true">
              {leftIcon}
            </span>
          )}
          
          {children && (
            <span className="truncate">
              {children}
            </span>
          )}
          
          {rightIcon && !asChild && (
            <span className="[&_svg]:size-4 [&_svg]:shrink-0" aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </div>
      </>
    )

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-describedby={loading ? `${props.id}-loading` : undefined}
        {...props}
      >
        {asChild ? children : buttonContent}
        
        {/* Screen reader loading announcement */}
        {loading && (
          <span 
            id={`${props.id}-loading`}
            className="sr-only"
            aria-live="polite"
          >
            {loadingText || "Loading..."}
          </span>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

// Button group component for grouping related buttons
export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical'
  size?: ButtonProps['size']
  variant?: ButtonProps['variant']
  attached?: boolean
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, orientation = 'horizontal', attached = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex",
          orientation === 'horizontal' ? "flex-row" : "flex-col",
          attached && orientation === 'horizontal' && "[&>*:not(:first-child)]:ml-[-1px] [&>*:not(:first-child)]:rounded-l-none [&>*:not(:last-child)]:rounded-r-none",
          attached && orientation === 'vertical' && "[&>*:not(:first-child)]:mt-[-1px] [&>*:not(:first-child)]:rounded-t-none [&>*:not(:last-child)]:rounded-b-none",
          !attached && orientation === 'horizontal' && "space-x-2",
          !attached && orientation === 'vertical' && "space-y-2",
          className
        )}
        role="group"
        {...props}
      >
        {children}
      </div>
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

// Icon button component for icon-only buttons with proper accessibility
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon'> {
  icon: React.ReactNode
  'aria-label': string
  tooltip?: string
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, size = "icon", variant = "ghost", children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn("flex-shrink-0", className)}
        size={size}
        variant={variant}
        {...props}
      >
        <span aria-hidden="true">
          {icon}
        </span>
        {children && <span className="sr-only">{children}</span>}
      </Button>
    )
  }
)
IconButton.displayName = "IconButton"

export { Button, ButtonGroup, IconButton, buttonVariants, LoadingSpinner }