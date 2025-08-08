/**
 * High-Performance Chart Components
 * Enterprise-grade chart system with 60 FPS performance
 */

// Chart Components
export { LineChart } from './LineChart';
export { AreaChart } from './AreaChart';
export { BarChart } from './BarChart';
export { ComposedChart } from './ComposedChart';
export { PieChart } from './PieChart';

// Hooks
export {
  useChartPerformance,
  useResponsiveChart,
  useOptimizedChartData,
  useChartTheme,
  useDebouncedValue,
  useChartDataCache,
  useChartAnimation,
  useVirtualScrolling,
  useChartExport
} from './hooks';

// Utilities
export {
  processTimeSeriesData,
  decimateData,
  aggregateByTimeInterval,
  applyMovingAverage,
  removeOutliers,
  measureChartPerformance,
  validateChartData,
  optimizeDataForRendering,
  calculateResponsiveDimensions,
  generateColorPalette,
  formatDataForExport
} from './utils';

// Themes
export {
  lightTheme,
  darkTheme,
  highContrastTheme,
  themes,
  getTheme,
  getColorPalette,
  getGradientId,
  generateThemeCSS,
  interpolateColor,
  getAccessibleColorPair,
  type ThemeName,
  type ChartTheme
} from './themes';

// Configuration
export {
  CHART_PERFORMANCE_CONFIG,
  CHART_BREAKPOINTS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  CHART_MARGINS,
  GRID_CONFIG,
  TOOLTIP_CONFIG,
  LEGEND_CONFIG,
  EXPORT_CONFIG,
  PERFORMANCE_THRESHOLDS,
  DEFAULT_CHART_PROPS,
  A11Y_CONFIG,
  DATA_PROCESSING_CONFIG
} from '../../lib/chart-config';