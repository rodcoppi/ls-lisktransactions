import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 theme-transition",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-md hover:shadow-lg",
        outlined: "border-2 border-border shadow-none",
        ghost: "border-transparent shadow-none",
        interactive: "cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.98]",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      loading: {
        true: "animate-pulse cursor-not-allowed",
        false: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      loading: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, loading, asChild, ...props }, ref) => {
    const Comp = asChild ? "div" : "div"
    
    return (
      <Comp
        ref={ref}
        className={cn(cardVariants({ variant, size, loading, className }))}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight text-balance",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground text-pretty", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

// Loading skeleton card
export interface CardSkeletonProps {
  className?: string
  lines?: number
  showFooter?: boolean
}

const CardSkeleton = React.forwardRef<HTMLDivElement, CardSkeletonProps>(
  ({ className, lines = 3, showFooter = false }, ref) => (
    <Card ref={ref} className={cn("animate-pulse", className)} loading>
      <CardHeader>
        <div className="h-6 bg-muted rounded-md w-3/4 mb-2" />
        <div className="h-4 bg-muted rounded-md w-1/2" />
      </CardHeader>
      <CardContent>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-4 bg-muted rounded-md mb-2",
              i === lines - 1 ? "w-2/3" : "w-full"
            )}
          />
        ))}
      </CardContent>
      {showFooter && (
        <CardFooter>
          <div className="h-8 bg-muted rounded-md w-20" />
        </CardFooter>
      )}
    </Card>
  )
)
CardSkeleton.displayName = "CardSkeleton"

// Stats card component
export interface StatsCardProps extends Omit<CardProps, 'variant'> {
  title: string
  value: string | number
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  icon?: React.ReactNode
  loading?: boolean
}

const StatsCard = React.forwardRef<HTMLDivElement, StatsCardProps>(
  ({ 
    title, 
    value, 
    description, 
    trend, 
    icon, 
    loading = false, 
    className, 
    ...props 
  }, ref) => {
    if (loading) {
      return <CardSkeleton ref={ref} className={className} lines={2} />
    }

    return (
      <Card ref={ref} className={cn("p-6", className)} {...props}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>
            <p className="text-3xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">
                {description}
              </p>
            )}
            {trend && (
              <div className="flex items-center mt-2">
                <span
                  className={cn(
                    "text-sm font-medium",
                    trend.isPositive ? "text-success" : "text-destructive"
                  )}
                >
                  {trend.isPositive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  vs last period
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 ml-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary [&_svg]:w-6 [&_svg]:h-6">
                {icon}
              </div>
            </div>
          )}
        </div>
      </Card>
    )
  }
)
StatsCard.displayName = "StatsCard"

// Interactive card for clickable items
export interface InteractiveCardProps extends CardProps {
  href?: string
  onClick?: () => void
  disabled?: boolean
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ href, onClick, disabled, className, children, ...props }, ref) => {
    const isClickable = !!(href || onClick) && !disabled;
    
    const handleClick = () => {
      if (disabled) return;
      if (href && typeof window !== 'undefined') {
        window.location.href = href;
      } else if (onClick) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <Card
        ref={ref}
        className={cn(
          isClickable && "cursor-pointer hover:shadow-md hover:border-primary/50 active:scale-[0.98] transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        tabIndex={isClickable ? 0 : undefined}
        role={isClickable ? "button" : undefined}
        aria-disabled={disabled}
        {...props}
      >
        {children}
      </Card>
    )
  }
)
InteractiveCard.displayName = "InteractiveCard"

export { 
  Card, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  CardSkeleton,
  StatsCard,
  InteractiveCard,
  cardVariants
}