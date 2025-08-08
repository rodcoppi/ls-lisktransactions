/**
 * Iconography System
 * 
 * Consistent icon system with proper sizing, accessibility, and semantic meaning.
 * Uses Lucide React icons with custom wrapper for consistent styling and a11y.
 */

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Icon variants for consistent sizing and styling
const iconVariants = cva("", {
  variants: {
    size: {
      xs: "w-3 h-3",      // 12px
      sm: "w-4 h-4",      // 16px
      base: "w-5 h-5",    // 20px
      lg: "w-6 h-6",      // 24px
      xl: "w-8 h-8",      // 32px
      "2xl": "w-10 h-10", // 40px
      "3xl": "w-12 h-12", // 48px
    },
    variant: {
      default: "text-current",
      muted: "text-muted-foreground",
      primary: "text-primary",
      secondary: "text-secondary",
      success: "text-success",
      warning: "text-warning",
      destructive: "text-destructive",
      info: "text-info",
    },
  },
  defaultVariants: {
    size: "base",
    variant: "default",
  },
});

// Base icon component with accessibility features
export interface IconProps 
  extends React.SVGAttributes<SVGElement>,
    VariantProps<typeof iconVariants> {
  children: React.ReactNode;
  "aria-label"?: string;
  "aria-hidden"?: boolean;
  decorative?: boolean;
}

const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ 
    children, 
    className, 
    size, 
    variant, 
    decorative = false,
    "aria-label": ariaLabel,
    "aria-hidden": ariaHidden,
    ...props 
  }, ref) => {
    // Automatically set aria-hidden for decorative icons
    const isDecorative = decorative || (!ariaLabel && !props["aria-labelledby"]);
    
    return (
      <svg
        ref={ref}
        className={cn(iconVariants({ size, variant }), className)}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden={isDecorative}
        aria-label={ariaLabel}
        role={isDecorative ? "presentation" : "img"}
        {...props}
      >
        {children}
      </svg>
    );
  }
);
Icon.displayName = "Icon";

// Common icon components with consistent styling and accessibility
export const AlertCircleIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </Icon>
  )
);
AlertCircleIcon.displayName = "AlertCircleIcon";

export const CheckCircleIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </Icon>
  )
);
CheckCircleIcon.displayName = "CheckCircleIcon";

export const XCircleIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </Icon>
  )
);
XCircleIcon.displayName = "XCircleIcon";

export const InfoIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </Icon>
  )
);
InfoIcon.displayName = "InfoIcon";

export const LoaderIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  ({ className, ...props }, ref) => (
    <Icon ref={ref} className={cn("animate-spin", className)} {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </Icon>
  )
);
LoaderIcon.displayName = "LoaderIcon";

export const SearchIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </Icon>
  )
);
SearchIcon.displayName = "SearchIcon";

export const XIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  )
);
XIcon.displayName = "XIcon";

export const ChevronDownIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="6,9 12,15 18,9" />
    </Icon>
  )
);
ChevronDownIcon.displayName = "ChevronDownIcon";

export const ChevronUpIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="18,15 12,9 6,15" />
    </Icon>
  )
);
ChevronUpIcon.displayName = "ChevronUpIcon";

export const ChevronLeftIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="15,18 9,12 15,6" />
    </Icon>
  )
);
ChevronLeftIcon.displayName = "ChevronLeftIcon";

export const ChevronRightIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="9,18 15,12 9,6" />
    </Icon>
  )
);
ChevronRightIcon.displayName = "ChevronRightIcon";

export const MenuIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </Icon>
  )
);
MenuIcon.displayName = "MenuIcon";

export const SunIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="M4.93 4.93l1.41 1.41" />
      <path d="M17.66 17.66l1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="M6.34 17.66l-1.41 1.41" />
      <path d="M19.07 4.93l-1.41 1.41" />
    </Icon>
  )
);
SunIcon.displayName = "SunIcon";

export const MoonIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </Icon>
  )
);
MoonIcon.displayName = "MoonIcon";

export const MonitorIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </Icon>
  )
);
MonitorIcon.displayName = "MonitorIcon";

export const UsersIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  )
);
UsersIcon.displayName = "UsersIcon";

export const DollarSignIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </Icon>
  )
);
DollarSignIcon.displayName = "DollarSignIcon";

export const TrendingUpIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
      <polyline points="16,7 22,7 22,13" />
    </Icon>
  )
);
TrendingUpIcon.displayName = "TrendingUpIcon";

export const TrendingDownIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <polyline points="22,17 13.5,8.5 8.5,13.5 2,7" />
      <polyline points="16,17 22,17 22,11" />
    </Icon>
  )
);
TrendingDownIcon.displayName = "TrendingDownIcon";

export const MailIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </Icon>
  )
);
MailIcon.displayName = "MailIcon";

export const PhoneIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Icon>
  )
);
PhoneIcon.displayName = "PhoneIcon";

export const HomeIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </Icon>
  )
);
HomeIcon.displayName = "HomeIcon";

export const SettingsIcon = React.forwardRef<SVGSVGElement, Omit<IconProps, "children">>(
  (props, ref) => (
    <Icon ref={ref} {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1m17.5-3.5l-4.24 4.24M6.74 17.26l-4.24-4.24m0-6.52l4.24 4.24m10.52 0l4.24-4.24" />
    </Icon>
  )
);
SettingsIcon.displayName = "SettingsIcon";

// Icon wrapper with semantic meaning for better accessibility
interface SemanticIconProps extends IconProps {
  semantic?: "success" | "warning" | "error" | "info";
}

export const SemanticIcon = React.forwardRef<SVGSVGElement, SemanticIconProps>(
  ({ semantic, variant, "aria-label": ariaLabel, ...props }, ref) => {
    const semanticIcons = {
      success: CheckCircleIcon,
      warning: AlertCircleIcon,
      error: XCircleIcon,
      info: InfoIcon,
    };

    const semanticLabels = {
      success: "Success",
      warning: "Warning", 
      error: "Error",
      info: "Information",
    };

    if (semantic) {
      const SemanticIconComponent = semanticIcons[semantic];
      return (
        <SemanticIconComponent
          ref={ref}
          variant={variant || semantic}
          aria-label={ariaLabel || semanticLabels[semantic]}
          {...props}
        />
      );
    }

    return <Icon ref={ref} variant={variant} aria-label={ariaLabel} {...props} />;
  }
);
SemanticIcon.displayName = "SemanticIcon";

// Export all icons and utilities
export { Icon, iconVariants };

// Icon size utilities for consistent usage
export const iconSizes = {
  xs: "w-3 h-3",      // 12px
  sm: "w-4 h-4",      // 16px
  base: "w-5 h-5",    // 20px
  lg: "w-6 h-6",      // 24px
  xl: "w-8 h-8",      // 32px
  "2xl": "w-10 h-10", // 40px
  "3xl": "w-12 h-12", // 48px
} as const;

export type IconSize = keyof typeof iconSizes;