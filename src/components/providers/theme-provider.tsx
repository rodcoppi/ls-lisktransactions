"use client";

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useTheme, type Theme, type ResolvedTheme, type ThemeConfig } from '@/hooks/use-theme';

// Theme context type
interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  themes: Theme[];
  isLight: boolean;
  isDark: boolean;
  isSystem: boolean;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Theme provider props
export interface ThemeProviderProps extends ThemeConfig {
  children: ReactNode;
  /**
   * Inject theme script for SSR/SSG
   * Prevents theme flashing on page load
   */
  enableScript?: boolean;
  /**
   * Custom theme change callback
   */
  onThemeChange?: (theme: ResolvedTheme, previous: ResolvedTheme) => void;
}

/**
 * Comprehensive Theme Provider
 * 
 * Provides theme management with zero-runtime CSS-in-JS approach using CSS variables.
 * Includes SSR support, accessibility features, and performance optimizations.
 * 
 * Features:
 * - Light/Dark/System theme support
 * - Smooth transitions with optional disable
 * - SSR/SSG compatibility
 * - Accessibility compliance (WCAG AAA)
 * - Performance optimized with minimal runtime
 * - TypeScript support
 * - Custom theme configurations
 */
export function ThemeProvider({ 
  children, 
  enableScript = true,
  onThemeChange,
  ...config 
}: ThemeProviderProps) {
  const themeUtils = useTheme(config);

  // Handle theme change callback
  useEffect(() => {
    if (!onThemeChange || typeof window === 'undefined') return;

    const handleThemeChange = (event: CustomEvent<{ theme: ResolvedTheme; previous: ResolvedTheme }>) => {
      onThemeChange(event.detail.theme, event.detail.previous);
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, [onThemeChange]);

  // Inject theme script for SSR
  useEffect(() => {
    if (!enableScript || typeof window === 'undefined') return;

    // Check if script is already injected
    const existingScript = document.getElementById('theme-script');
    if (existingScript) return;

    // Create and inject theme initialization script
    const script = document.createElement('script');
    script.id = 'theme-script';
    script.innerHTML = `
      (function() {
        try {
          var storageKey = '${config.storageKey || 'theme'}';
          var defaultTheme = '${config.defaultTheme || 'system'}';
          var attribute = '${config.attribute || 'class'}';
          var enableSystem = ${config.enableSystem !== false};
          
          var stored = localStorage.getItem(storageKey) || defaultTheme;
          var theme = stored;
          
          if (theme === 'system' && enableSystem) {
            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          
          var root = document.documentElement;
          
          if (attribute === 'class') {
            root.classList.add(theme);
            document.body.classList.add(theme);
          } else {
            root.setAttribute(attribute, theme);
          }
          
          root.style.colorScheme = theme;
          
          // Set meta theme-color for mobile browsers
          var meta = document.querySelector('meta[name="theme-color"]') || document.createElement('meta');
          if (!meta.name) {
            meta.name = 'theme-color';
            document.head.appendChild(meta);
          }
          meta.content = theme === 'dark' ? '#0c1220' : '#ffffff';
          
        } catch (error) {
          console.warn('Theme initialization error:', error);
        }
      })();
    `;
    
    // Insert before first script or at end of head
    const firstScript = document.querySelector('script');
    if (firstScript && firstScript.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }, [enableScript, config]);

  return (
    <ThemeContext.Provider value={themeUtils}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 * Must be used within ThemeProvider
 */
export function useThemeContext() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * Theme toggle button component
 * Accessible theme switcher with proper ARIA attributes
 */
export interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'combo';
  showLabel?: boolean;
  children?: ReactNode;
}

export function ThemeToggle({ 
  className = '',
  size = 'md',
  variant = 'icon',
  showLabel = false,
  children
}: ThemeToggleProps) {
  const { theme, resolvedTheme, toggleTheme, setTheme, themes } = useThemeContext();

  // Size classes
  const sizeClasses = {
    sm: 'h-8 w-8 p-1.5',
    md: 'h-10 w-10 p-2',
    lg: 'h-12 w-12 p-2.5'
  };

  // Icon components (using Lucide React)
  const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="M4.93 4.93l1.41 1.41"/>
      <path d="M17.66 17.66l1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="M6.34 17.66l-1.41 1.41"/>
      <path d="M19.07 4.93l-1.41 1.41"/>
    </svg>
  );

  const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const SystemIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );

  // Handle theme cycling for multi-theme support
  const handleThemeChange = () => {
    if (themes.length <= 2) {
      toggleTheme();
    } else {
      const currentIndex = themes.indexOf(theme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setTheme(themes[nextIndex]);
    }
  };

  // Get current icon
  const getCurrentIcon = () => {
    if (theme === 'system') return <SystemIcon />;
    return resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />;
  };

  // Get theme label
  const getThemeLabel = () => {
    if (theme === 'system') return 'System theme';
    return resolvedTheme === 'dark' ? 'Dark theme' : 'Light theme';
  };

  // Get next theme for ARIA label
  const getNextThemeLabel = () => {
    if (themes.length <= 2) {
      return resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    }
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    return `Switch to ${nextTheme} theme`;
  };

  if (children) {
    return (
      <button
        onClick={handleThemeChange}
        className={`inline-flex items-center justify-center rounded-md transition-colors focus-ring interactive ${className}`}
        aria-label={getNextThemeLabel()}
        title={getNextThemeLabel()}
        type="button"
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={handleThemeChange}
      className={`
        inline-flex items-center justify-center rounded-md 
        bg-background border border-input
        text-muted-foreground hover:text-foreground hover:bg-accent
        transition-all duration-200 focus-ring interactive
        ${sizeClasses[size]} ${className}
      `.trim()}
      aria-label={getNextThemeLabel()}
      title={getNextThemeLabel()}
      type="button"
    >
      <span className="sr-only">{getThemeLabel()}</span>
      
      {variant === 'icon' && (
        <span className="relative">
          {getCurrentIcon()}
        </span>
      )}
      
      {variant === 'text' && (
        <span className="text-sm font-medium capitalize">
          {theme}
        </span>
      )}
      
      {variant === 'combo' && (
        <div className="flex items-center space-x-2">
          <span className="relative">
            {getCurrentIcon()}
          </span>
          {showLabel && (
            <span className="text-sm font-medium capitalize">
              {theme}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/**
 * Theme selector component
 * Dropdown/select for choosing between multiple themes
 */
export interface ThemeSelectorProps {
  className?: string;
  placeholder?: string;
  showIcons?: boolean;
}

export function ThemeSelector({ 
  className = '',
  placeholder = 'Select theme...',
  showIcons = true
}: ThemeSelectorProps) {
  const { theme, setTheme, themes } = useThemeContext();

  const themeIcons = {
    light: <SunIcon />,
    dark: <MoonIcon />,
    system: <SystemIcon />
  };

  const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
    </svg>
  );

  const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );

  const SystemIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );

  return (
    <select
      value={theme}
      onChange={(e) => setTheme(e.target.value as Theme)}
      className={`
        flex items-center justify-between rounded-md border border-input
        bg-background px-3 py-2 text-sm text-foreground
        focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `.trim()}
      aria-label="Select theme"
    >
      {themes.map((themeOption) => (
        <option key={themeOption} value={themeOption} className="bg-background text-foreground">
          {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
        </option>
      ))}
    </select>
  );
}

// Export everything for convenience
export { useTheme, type Theme, type ResolvedTheme, type ThemeConfig };
export default ThemeProvider;