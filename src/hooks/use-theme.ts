"use client";

import { useEffect, useState, useCallback } from 'react';

// Theme types
export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Theme configuration
export interface ThemeConfig {
  attribute?: string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
  themes?: string[];
  value?: Partial<Record<string, string>>;
}

// Default configuration
const defaultConfig: Required<ThemeConfig> = {
  attribute: 'class',
  defaultTheme: 'system',
  enableSystem: true,
  disableTransitionOnChange: false,
  storageKey: 'theme',
  themes: ['light', 'dark'],
  value: {}
};

/**
 * Custom hook for managing theme state with smooth transitions
 * Supports light/dark mode with system preference detection
 * Includes accessibility features and performance optimizations
 */
export function useTheme(config: ThemeConfig = {}) {
  const {
    attribute,
    defaultTheme,
    enableSystem,
    disableTransitionOnChange,
    storageKey,
    themes,
    value
  } = { ...defaultConfig, ...config };

  // State management
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');

  // Check if we're in a browser environment
  const isClient = typeof window !== 'undefined';

  // Media query for system theme detection
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (!isClient) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, [isClient]);

  // Get stored theme from localStorage
  const getStoredTheme = useCallback((): Theme => {
    if (!isClient) return defaultTheme;
    try {
      const stored = localStorage.getItem(storageKey);
      return (stored && themes.includes(stored)) ? stored as Theme : defaultTheme;
    } catch (error) {
      console.warn('Failed to access localStorage for theme:', error);
      return defaultTheme;
    }
  }, [isClient, storageKey, themes, defaultTheme]);

  // Store theme in localStorage
  const storeTheme = useCallback((theme: Theme) => {
    if (!isClient) return;
    try {
      localStorage.setItem(storageKey, theme);
    } catch (error) {
      console.warn('Failed to store theme in localStorage:', error);
    }
  }, [isClient, storageKey]);

  // Disable transitions temporarily to prevent flash
  const disableTransitions = useCallback(() => {
    if (!isClient || !disableTransitionOnChange) return;

    const style = document.createElement('style');
    style.innerHTML = `
      *,
      *::before,
      *::after {
        transition-duration: 0.01ms !important;
        transition-delay: 0.01ms !important;
        animation-duration: 0.01ms !important;
        animation-delay: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    `;
    
    document.head.appendChild(style);

    // Re-enable transitions after a brief delay
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.head.removeChild(style);
      });
    });
  }, [isClient, disableTransitionOnChange]);

  // Apply theme to DOM
  const applyTheme = useCallback((newTheme: ResolvedTheme) => {
    if (!isClient) return;

    const root = document.documentElement;
    const body = document.body;

    // Remove existing theme classes
    themes.forEach(t => {
      root.classList.remove(t);
      if (attribute === 'class') {
        body.classList.remove(t);
      }
    });

    // Add new theme class or attribute
    if (attribute === 'class') {
      root.classList.add(newTheme);
      body.classList.add(newTheme);
    } else {
      root.setAttribute(attribute, value[newTheme] || newTheme);
    }

    // Set color-scheme for browser UI
    root.style.colorScheme = newTheme;

    // Update meta theme-color for mobile browsers
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    
    // Set appropriate theme color based on current theme
    const themeColors = {
      light: '#ffffff',
      dark: '#0c1220'
    };
    metaThemeColor.setAttribute('content', themeColors[newTheme]);

    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('theme-change', {
      detail: { theme: newTheme, previous: resolvedTheme }
    }));

  }, [isClient, themes, attribute, value, resolvedTheme]);

  // Set theme function
  const setTheme = useCallback((newTheme: Theme) => {
    disableTransitions();
    
    setThemeState(newTheme);
    storeTheme(newTheme);

    let resolved: ResolvedTheme;
    if (newTheme === 'system' && enableSystem) {
      resolved = systemTheme;
    } else {
      resolved = newTheme as ResolvedTheme;
    }

    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [disableTransitions, storeTheme, enableSystem, systemTheme, applyTheme]);

  // Toggle between light and dark themes
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // System theme change handler
  useEffect(() => {
    if (!isClient || !enableSystem) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      const newSystemTheme = e.matches ? 'dark' : 'light';
      setSystemTheme(newSystemTheme);

      // If current theme is 'system', update resolved theme
      if (theme === 'system') {
        setResolvedTheme(newSystemTheme);
        applyTheme(newSystemTheme);
      }
    };

    // Set initial system theme
    const initialSystemTheme = getSystemTheme();
    setSystemTheme(initialSystemTheme);

    // Listen for system theme changes
    mediaQuery.addListener(handleSystemThemeChange);

    return () => {
      mediaQuery.removeListener(handleSystemThemeChange);
    };
  }, [isClient, enableSystem, theme, getSystemTheme, applyTheme]);

  // Initialize theme on mount
  useEffect(() => {
    if (!isClient) return;

    const storedTheme = getStoredTheme();
    const currentSystemTheme = getSystemTheme();
    
    setThemeState(storedTheme);
    setSystemTheme(currentSystemTheme);

    let resolved: ResolvedTheme;
    if (storedTheme === 'system' && enableSystem) {
      resolved = currentSystemTheme;
    } else {
      resolved = storedTheme as ResolvedTheme;
    }

    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [isClient, getStoredTheme, getSystemTheme, enableSystem, applyTheme]);

  // Force color scheme update for SSR
  useEffect(() => {
    if (!isClient) return;
    
    // Ensure color scheme is set correctly on hydration
    document.documentElement.style.colorScheme = resolvedTheme;
  }, [isClient, resolvedTheme]);

  return {
    theme,
    resolvedTheme,
    systemTheme,
    setTheme,
    toggleTheme,
    themes: themes as Theme[],
    // Utility functions
    isLight: resolvedTheme === 'light',
    isDark: resolvedTheme === 'dark',
    isSystem: theme === 'system',
  } as const;
}

/**
 * Hook to listen for theme changes from other components
 */
export function useThemeChangeListener(callback: (theme: ResolvedTheme, previous: ResolvedTheme) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleThemeChange = (event: CustomEvent<{ theme: ResolvedTheme; previous: ResolvedTheme }>) => {
      callback(event.detail.theme, event.detail.previous);
    };

    window.addEventListener('theme-change', handleThemeChange as EventListener);
    return () => {
      window.removeEventListener('theme-change', handleThemeChange as EventListener);
    };
  }, [callback]);
}

/**
 * Hook to get the preferred color scheme for CSS-in-JS solutions
 */
export function useColorScheme() {
  const { resolvedTheme } = useTheme();
  
  return {
    colorScheme: resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
    // CSS custom properties object
    cssVariables: {
      '--color-scheme': resolvedTheme,
    }
  } as const;
}

/**
 * SSR-safe theme detection utility
 */
export function getThemeScript(config: ThemeConfig = {}) {
  const { 
    attribute = 'class',
    defaultTheme = 'system',
    storageKey = 'theme',
    enableSystem = true
  } = config;

  return `
    (function() {
      try {
        var stored = localStorage.getItem('${storageKey}') || '${defaultTheme}';
        var theme = stored;
        
        if (theme === 'system' && ${enableSystem}) {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        
        var root = document.documentElement;
        
        if ('${attribute}' === 'class') {
          root.classList.add(theme);
          document.body.classList.add(theme);
        } else {
          root.setAttribute('${attribute}', theme);
        }
        
        root.style.colorScheme = theme;
        
        // Set meta theme-color
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'theme-color';
          document.head.appendChild(meta);
        }
        meta.content = theme === 'dark' ? '#0c1220' : '#ffffff';
        
      } catch (error) {
        console.warn('Theme initialization error:', error);
      }
    })();
  `;
}