# High-Performance Chart System

Enterprise-grade chart visualization system built with React and Recharts,
optimized for 60 FPS performance with large datasets.

## Features

### Performance Optimizations

- **60 FPS rendering** with 10,000+ data points
- **Intelligent data decimation** using Largest-Triangle-Three-Buckets (LTTB)
  algorithm
- **Canvas rendering** for datasets exceeding 1,000 points
- **Memory optimization** with automatic cleanup and caching
- **Virtual scrolling** support for large datasets
- **Debounced interactions** to prevent performance degradation

### Chart Components

#### 1. LineChart

High-performance time series visualization with advanced interactions.

```tsx
import { LineChart } from '@/components/charts';

<LineChart
  data={timeSeriesData}
  xAxisKey="timestamp"
  yAxisKey="value"
  title="Transaction Activity"
  enableZoom={true}
  enablePan={true}
  enableBrush={true}
  smoothCurve={true}
  height={400}
  responsive={true}
  animate={true}
  exportEnabled={true}
/>
```

**Features:**

- Zoom and pan functionality
- Brush selection for time range filtering
- Crosshair cursor with data details
- Multiple line series support
- Smooth curve interpolation

#### 2. AreaChart

Volume analysis with beautiful gradient fills and stacking support.

```tsx
import { AreaChart } from '@/components/charts';

<AreaChart
  data={volumeData}
  areas={[
    { dataKey: 'incoming', color: '#10b981', gradient: true },
    { dataKey: 'outgoing', color: '#ef4444', gradient: true }
  ]}
  title="Volume Analysis"
  stacked={true}
  normalized={false}
  height={350}
/>
```

**Features:**

- Stacked and normalized modes
- Custom gradient fills
- Area selection and highlighting
- Volume comparison tools

#### 3. BarChart

Responsive bar charts for period comparisons with horizontal/vertical layouts.

```tsx
import { BarChart } from '@/components/charts';

<BarChart
  data={comparisonData}
  xAxisKey="period"
  yAxisKey="current"
  title="Monthly Comparison"
  orientation="vertical"
  showComparison={true}
  barRadius={6}
  height={400}
/>
```

**Features:**

- Vertical and horizontal orientations
- Comparison mode with change indicators
- Custom bar styling and radius
- Grouped and stacked configurations

#### 4. ComposedChart

Multi-metric analysis with mixed chart types and dual Y-axes.

```tsx
import { ComposedChart } from '@/components/charts';

<ComposedChart
  data={multiMetricData}
  components={[
    { type: 'line', dataKey: 'primary', yAxisId: 'left' },
    { type: 'bar', dataKey: 'secondary', yAxisId: 'right' },
    { type: 'area', dataKey: 'tertiary', yAxisId: 'left' }
  ]}
  enableDualYAxis={true}
  title="Multi-Metric Dashboard"
  height={450}
/>
```

**Features:**

- Mixed chart types (line, bar, area)
- Dual Y-axis support
- Component visibility controls
- Interactive metric selection

#### 5. PieChart

Interactive pie and donut charts for categorical data distribution.

```tsx
import { PieChart } from '@/components/charts';

<PieChart
  data={distributionData}
  valueKey="value"
  labelKey="category"
  title="Distribution Analysis"
  donut={true}
  innerRadius={60}
  showLabels={true}
  height={350}
/>
```

**Features:**

- Standard pie and donut modes
- Interactive segment selection
- Custom labels and values
- Mobile-responsive legend

## Theme System

### Built-in Themes

- **Light Theme:** Clean, professional styling
- **Dark Theme:** Modern dark interface
- **High Contrast:** Accessibility-focused design

```tsx
import { useChartTheme } from '@/components/charts';

const { theme, isDark } = useChartTheme('dark');
```

### Custom Themes

Create custom themes with the theme interface:

```tsx
import { ChartTheme } from '@/components/charts';

const customTheme: ChartTheme = {
  name: 'custom',
  colors: {
    primary: ['#your-colors'],
    // ... theme configuration
  },
  // ... other theme properties
};
```

## Performance Hooks

### useChartPerformance

Monitor chart performance metrics and auto-optimization.

```tsx
import { useChartPerformance } from '@/components/charts';

const {
  metrics,
  isOptimized,
  shouldUseCanvas,
  shouldDecimateData
} = useChartPerformance(dataPointCount);
```

### useOptimizedChartData

Automatically optimize data for rendering performance.

```tsx
import { useOptimizedChartData } from '@/components/charts';

const {
  data: optimizedData,
  isDecimated,
  performanceMetrics
} = useOptimizedChartData(rawData, {
  enableDecimation: true,
  maxDataPoints: 1000
});
```

### useResponsiveChart

Handle responsive design and breakpoint detection.

```tsx
import { useResponsiveChart } from '@/components/charts';

const {
  containerRef,
  dimensions,
  breakpoint,
  isMobile
} = useResponsiveChart();
```

## Accessibility Features

### Screen Reader Support

- Comprehensive ARIA labels and descriptions
- Semantic markup for assistive technologies
- Keyboard navigation support

### High Contrast Mode

- Automatic high contrast theme detection
- Enhanced color contrast ratios
- Bold stroke widths and fonts

### Mobile Responsiveness

- Touch-friendly interactions
- Adaptive layouts for small screens
- Simplified mobile interfaces

## Export Functionality

### Supported Formats

- **PNG:** High-quality raster images
- **SVG:** Vector graphics for scalability
- **PDF:** Document-ready exports

```tsx
import { useChartExport } from '@/components/charts';

const { exportChart, isExporting } = useChartExport();

await exportChart(chartRef, {
  format: 'png',
  width: 1920,
  height: 1080,
  filename: 'my-chart'
});
```

## Data Processing Utilities

### Data Decimation

Reduce large datasets while preserving visual accuracy:

```tsx
import { decimateData } from '@/components/charts';

const decimatedData = decimateData(
  largeDataset,
  1000, // target points
  'lttb' // algorithm
);
```

### Time Series Aggregation

Group data by time intervals:

```tsx
import { aggregateByTimeInterval } from '@/components/charts';

const aggregatedData = aggregateByTimeInterval(
  timeSeriesData,
  3600000, // 1 hour in ms
  'avg' // aggregation method
);
```

### Data Validation

Validate chart data before rendering:

```tsx
import { validateChartData } from '@/components/charts';

const { isValid, errors } = validateChartData(chartData);
```

## Configuration

### Performance Settings

Customize performance thresholds:

```tsx
import { CHART_PERFORMANCE_CONFIG } from '@/components/charts';

// Canvas rendering threshold
CHART_PERFORMANCE_CONFIG.CANVAS_THRESHOLD; // 1000 points

// Animation duration
CHART_PERFORMANCE_CONFIG.ANIMATION_DURATION; // 300ms

// Debounce delay
CHART_PERFORMANCE_CONFIG.DEBOUNCE_DELAY; // 250ms
```

### Responsive Breakpoints

Configure responsive behavior:

```tsx
import { CHART_BREAKPOINTS } from '@/components/charts';

// Breakpoint values
CHART_BREAKPOINTS.xs; // 320px
CHART_BREAKPOINTS.sm; // 640px
CHART_BREAKPOINTS.md; // 768px
// ... etc
```

## Advanced Usage

### Custom Data Processing Pipeline

```tsx
import {
  processTimeSeriesData,
  decimateData,
  applyMovingAverage,
  removeOutliers
} from '@/components/charts';

const processedData = removeOutliers(
  applyMovingAverage(
    decimateData(
      processTimeSeriesData(rawData),
      1000
    ),
    5 // window size
  )
);
```

### Performance Monitoring

```tsx
import { measureChartPerformance } from '@/components/charts';

const metrics = measureChartPerformance(
  () => {
    // Chart rendering operation
  },
  dataPointCount
);

console.log(`Render time: ${metrics.renderTime}ms`);
console.log(`Frame rate: ${metrics.frameRate} FPS`);
```

### Virtual Scrolling for Large Lists

```tsx
import { useVirtualScrolling } from '@/components/charts';

const {
  scrollElementRef,
  visibleItems,
  totalHeight,
  handleScroll
} = useVirtualScrolling(
  largeDataset,
  400, // viewport height
  20   // item height
);
```

## Best Practices

### Performance

1. **Enable decimation** for datasets > 1,000 points
2. **Use canvas rendering** for datasets > 10,000 points
3. **Debounce user interactions** to prevent performance issues
4. **Monitor memory usage** and clean up references

### Accessibility

1. **Provide descriptive titles** and subtitles for all charts
2. **Use high contrast themes** when appropriate
3. **Test with keyboard navigation**
4. **Ensure mobile compatibility**

### Data Quality

1. **Validate data** before rendering
2. **Handle null/undefined values** appropriately
3. **Sort time series data** by timestamp
4. **Remove outliers** when necessary

## Troubleshooting

### Common Issues

#### Poor Performance

- **Cause:** Too many data points without optimization
- **Solution:** Enable decimation or canvas rendering

#### Memory Leaks

- **Cause:** References not cleaned up properly
- **Solution:** Use provided hooks and cleanup utilities

#### Layout Issues

- **Cause:** Container size not properly calculated
- **Solution:** Use `useResponsiveChart` hook

#### Theme Not Applied

- **Cause:** Theme context not properly configured
- **Solution:** Wrap components with theme provider

### Debug Mode

Enable debug logging for performance monitoring:

```tsx
// Set in development environment
window.CHART_DEBUG = true;
```

## License

This chart system is part of the Lisk Counter Dashboard project and follows the
project's licensing terms.
