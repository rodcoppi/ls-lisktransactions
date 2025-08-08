/**
 * Chart Theme System
 * Comprehensive theming system for charts with dark/light mode support
 */

export interface ChartTheme {
  name: string;
  colors: {
    primary: string[];
    secondary: string[];
    accent: string[];
    neutral: string[];
    semantic: {
      success: string;
      warning: string;
      error: string;
      info: string;
    };
  };
  background: {
    primary: string;
    secondary: string;
    grid: string;
    tooltip: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };
  stroke: {
    primary: string;
    secondary: string;
    grid: string;
    axis: string;
  };
  gradients: {
    primary: {
      start: string;
      end: string;
    };
    secondary: {
      start: string;
      end: string;
    };
    success: {
      start: string;
      end: string;
    };
    warning: {
      start: string;
      end: string;
    };
  };
  shadows: {
    tooltip: string;
    card: string;
    focus: string;
  };
  opacity: {
    area: number;
    hover: number;
    disabled: number;
    grid: number;
  };
}

// Lisk-branded color palettes
const LISK_COLORS = {
  primary: ['#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
  secondary: ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'],
  accent: ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef'],
  neutral: ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'],
};

const SEMANTIC_COLORS = {
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

// Light theme configuration
export const lightTheme: ChartTheme = {
  name: 'light',
  colors: {
    primary: LISK_COLORS.primary,
    secondary: LISK_COLORS.secondary,
    accent: LISK_COLORS.accent,
    neutral: LISK_COLORS.neutral,
    semantic: SEMANTIC_COLORS,
  },
  background: {
    primary: '#ffffff',
    secondary: '#f8fafc',
    grid: '#f1f5f9',
    tooltip: '#ffffff',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
    muted: '#64748b',
    inverse: '#ffffff',
  },
  stroke: {
    primary: '#e2e8f0',
    secondary: '#cbd5e1',
    grid: '#e5e7eb',
    axis: '#9ca3af',
  },
  gradients: {
    primary: {
      start: '#0ea5e9',
      end: '#0ea5e933',
    },
    secondary: {
      start: '#06b6d4',
      end: '#06b6d433',
    },
    success: {
      start: '#22c55e',
      end: '#22c55e33',
    },
    warning: {
      start: '#f59e0b',
      end: '#f59e0b33',
    },
  },
  shadows: {
    tooltip: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    focus: '0 0 0 3px rgb(59 130 246 / 0.3)',
  },
  opacity: {
    area: 0.6,
    hover: 0.8,
    disabled: 0.3,
    grid: 0.5,
  },
};

// Dark theme configuration
export const darkTheme: ChartTheme = {
  name: 'dark',
  colors: {
    primary: ['#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc'],
    secondary: ['#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75'],
    accent: ['#fbbf24', '#fb923c', '#f87171', '#f472b6', '#e879f9'],
    neutral: ['#9ca3af', '#6b7280', '#4b5563', '#374151', '#1f2937'],
    semantic: {
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
    },
  },
  background: {
    primary: '#0f172a',
    secondary: '#1e293b',
    grid: '#334155',
    tooltip: '#1f2937',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#cbd5e1',
    muted: '#94a3b8',
    inverse: '#0f172a',
  },
  stroke: {
    primary: '#475569',
    secondary: '#64748b',
    grid: '#374151',
    axis: '#6b7280',
  },
  gradients: {
    primary: {
      start: '#38bdf8',
      end: '#38bdf833',
    },
    secondary: {
      start: '#22d3ee',
      end: '#22d3ee33',
    },
    success: {
      start: '#34d399',
      end: '#34d39933',
    },
    warning: {
      start: '#fbbf24',
      end: '#fbbf2433',
    },
  },
  shadows: {
    tooltip: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
    card: '0 1px 3px 0 rgb(0 0 0 / 0.3)',
    focus: '0 0 0 3px rgb(96 165 250 / 0.3)',
  },
  opacity: {
    area: 0.4,
    hover: 0.7,
    disabled: 0.2,
    grid: 0.3,
  },
};

// High contrast theme for accessibility
export const highContrastTheme: ChartTheme = {
  name: 'high-contrast',
  colors: {
    primary: ['#000000', '#ffffff', '#ffff00', '#ff0000', '#00ff00'],
    secondary: ['#0000ff', '#800080', '#ffa500', '#008000', '#800000'],
    accent: ['#ff1493', '#00bfff', '#32cd32', '#ffd700', '#ff6347'],
    neutral: ['#808080', '#c0c0c0', '#696969', '#a9a9a9', '#dcdcdc'],
    semantic: {
      success: '#00ff00',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#00bfff',
    },
  },
  background: {
    primary: '#ffffff',
    secondary: '#f0f0f0',
    grid: '#e0e0e0',
    tooltip: '#ffffff',
  },
  text: {
    primary: '#000000',
    secondary: '#333333',
    muted: '#666666',
    inverse: '#ffffff',
  },
  stroke: {
    primary: '#000000',
    secondary: '#333333',
    grid: '#999999',
    axis: '#666666',
  },
  gradients: {
    primary: {
      start: '#000000',
      end: '#00000033',
    },
    secondary: {
      start: '#0000ff',
      end: '#0000ff33',
    },
    success: {
      start: '#00ff00',
      end: '#00ff0033',
    },
    warning: {
      start: '#ffff00',
      end: '#ffff0033',
    },
  },
  shadows: {
    tooltip: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
    card: '0 2px 4px 0 rgb(0 0 0 / 0.3)',
    focus: '0 0 0 4px #ff0000',
  },
  opacity: {
    area: 0.8,
    hover: 1,
    disabled: 0.5,
    grid: 0.8,
  },
};

// Theme registry
export const themes = {
  light: lightTheme,
  dark: darkTheme,
  'high-contrast': highContrastTheme,
} as const;

export type ThemeName = keyof typeof themes;

// Theme utilities
export const getTheme = (themeName: ThemeName = 'light'): ChartTheme => {
  return themes[themeName] || lightTheme;
};

export const getColorPalette = (theme: ChartTheme, type: 'primary' | 'secondary' | 'accent' = 'primary') => {
  return theme.colors[type];
};

export const getGradientId = (theme: ChartTheme, type: keyof ChartTheme['gradients']) => {
  return `gradient-${theme.name}-${type}`;
};

// Generate CSS custom properties for theme integration
export const generateThemeCSS = (theme: ChartTheme): Record<string, string> => {
  return {
    '--chart-bg-primary': theme.background.primary,
    '--chart-bg-secondary': theme.background.secondary,
    '--chart-bg-tooltip': theme.background.tooltip,
    '--chart-text-primary': theme.text.primary,
    '--chart-text-secondary': theme.text.secondary,
    '--chart-text-muted': theme.text.muted,
    '--chart-stroke-primary': theme.stroke.primary,
    '--chart-stroke-grid': theme.stroke.grid,
    '--chart-color-primary': theme.colors.primary[0],
    '--chart-color-secondary': theme.colors.secondary[0],
    '--chart-color-success': theme.colors.semantic.success,
    '--chart-color-warning': theme.colors.semantic.warning,
    '--chart-color-error': theme.colors.semantic.error,
    '--chart-shadow-tooltip': theme.shadows.tooltip,
    '--chart-shadow-card': theme.shadows.card,
  };
};

// Color interpolation utility for smooth color transitions
export const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + factor * (rgb2.r - rgb1.r));
  const g = Math.round(rgb1.g + factor * (rgb2.g - rgb1.g));
  const b = Math.round(rgb1.b + factor * (rgb2.b - rgb1.b));
  
  return `rgb(${r}, ${g}, ${b})`;
};

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

// Generate accessible color combinations
export const getAccessibleColorPair = (theme: ChartTheme, backgroundColor: string) => {
  // Simple contrast ratio calculation (WCAG AA compliance)
  const isLightBackground = backgroundColor === theme.background.primary;
  return isLightBackground ? theme.text.primary : theme.text.inverse;
};