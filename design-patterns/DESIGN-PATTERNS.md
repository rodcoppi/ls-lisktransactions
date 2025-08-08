# Design Patterns Implementation Guide

## Overview

This document details the implementation of key design patterns in the dashboard
architecture. Each pattern addresses specific architectural concerns and
provides reusable solutions for common problems.

## 1. Repository Pattern

### Purpose

Abstract data access layer to provide a consistent interface for data
operations, enabling testability and maintainability.

### Implementation

#### Interface Definition

```typescript
// /src/domain/repositories/MetricsRepository.ts
export interface MetricsRepository {
  getTimeSeriesData(params: TimeSeriesParams): Promise<TimeSeriesData[]>
  getAggregatedData(params: AggregationParams): Promise<AggregatedData>
  saveMetrics(metrics: Metric[]): Promise<void>
  deleteMetrics(filter: MetricsFilter): Promise<number>
  getMetricsByTags(tags: Record<string, string>): Promise<Metric[]>
}

export interface TimeSeriesParams {
  metricId: string
  startTime: Date
  endTime: Date
  interval: string
  aggregationType: 'avg' | 'sum' | 'min' | 'max' | 'count'
}

export interface AggregationParams {
  metricIds: string[]
  timeRange: TimeRange
  groupBy: string[]
  filters: MetricsFilter[]
}
```

#### PostgreSQL Implementation

```typescript
// /src/infrastructure/repositories/PostgresMetricsRepository.ts
export class PostgresMetricsRepository implements MetricsRepository {
  constructor(
    private db: DatabaseConnection,
    private logger: Logger
  ) {}

  async getTimeSeriesData(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const query = `
      SELECT
        time_bucket($1, time) as timestamp,
        ${this.getAggregationFunction(params.aggregationType)}(value) as value
      FROM metrics
      WHERE metric_id = $2
        AND time BETWEEN $3 AND $4
      GROUP BY timestamp
      ORDER BY timestamp ASC
    `;

    try {
      const result = await this.db.query(query, [
        params.interval,
        params.metricId,
        params.startTime,
        params.endTime
      ]);

      return result.rows.map(row => ({
        timestamp: row.timestamp,
        value: parseFloat(row.value)
      }));
    } catch (error) {
      this.logger.error('Failed to fetch time series data', { params, error });
      throw new RepositoryError('Time series data fetch failed', error);
    }
  }

  async saveMetrics(metrics: Metric[]): Promise<void> {
    const query = `
      INSERT INTO metrics (time, metric_id, value, tags, metadata)
      VALUES ${metrics.map((_, i) => `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`).join(', ')}
      ON CONFLICT (time, metric_id) DO UPDATE SET
        value = EXCLUDED.value,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata
    `;

    const values = metrics.flatMap(metric => [
      metric.timestamp,
      metric.metricId,
      metric.value,
      JSON.stringify(metric.tags || {}),
      JSON.stringify(metric.metadata || {})
    ]);

    try {
      await this.db.query(query, values);
      this.logger.info(`Saved ${metrics.length} metrics`);
    } catch (error) {
      this.logger.error('Failed to save metrics', { metricsCount: metrics.length, error });
      throw new RepositoryError('Metrics save failed', error);
    }
  }

  private getAggregationFunction(type: string): string {
    const functions = {
      'avg': 'AVG',
      'sum': 'SUM',
      'min': 'MIN',
      'max': 'MAX',
      'count': 'COUNT'
    };
    return functions[type] || 'AVG';
  }
}
```

#### In-Memory Implementation (for testing)

```typescript
// /src/infrastructure/repositories/InMemoryMetricsRepository.ts
export class InMemoryMetricsRepository implements MetricsRepository {
  private metrics: Metric[] = []

  async getTimeSeriesData(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const filtered = this.metrics.filter(metric =>
      metric.metricId === params.metricId &&
      metric.timestamp >= params.startTime &&
      metric.timestamp <= params.endTime
    );

    // Group by time intervals and aggregate
    const grouped = new Map<string, number[]>();

    filtered.forEach(metric => {
      const bucket = this.getTimeBucket(metric.timestamp, params.interval);
      if (!grouped.has(bucket)) {
        grouped.set(bucket, []);
      }
      grouped.get(bucket)!.push(metric.value);
    });

    return Array.from(grouped.entries()).map(([bucket, values]) => ({
      timestamp: new Date(bucket),
      value: this.aggregate(values, params.aggregationType)
    })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async saveMetrics(metrics: Metric[]): Promise<void> {
    this.metrics.push(...metrics);
  }

  // Implementation of other interface methods...
}
```

### Usage in Application Layer

```typescript
// /src/application/services/MetricsService.ts
export class MetricsService {
  constructor(
    private metricsRepository: MetricsRepository,
    private cacheService: CacheService
  ) {}

  async getDashboardData(dashboardId: string): Promise<DashboardData> {
    const cacheKey = `dashboard:${dashboardId}`;
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return cached;
    }

    const config = await this.getDashboardConfig(dashboardId);
    const data = await Promise.all(
      config.widgets.map(widget =>
        this.metricsRepository.getTimeSeriesData(widget.queryParams)
      )
    );

    const dashboardData = { config, data };
    await this.cacheService.set(cacheKey, dashboardData, 300); // 5 minutes

    return dashboardData;
  }
}
```

## 2. Strategy Pattern

### Purpose

Enable flexible aggregation algorithms for different data types and use cases
without modifying existing code.

### Implementation

#### Strategy Interface

```typescript
// /src/domain/strategies/AggregationStrategy.ts
export interface AggregationStrategy {
  aggregate(data: RawDataPoint[]): AggregatedData
  getDescription(): string
  getSupportedDataTypes(): DataType[]
}

export interface RawDataPoint {
  timestamp: Date
  value: number
  tags?: Record<string, string>
}

export interface AggregatedData {
  value: number
  confidence?: number
  metadata?: Record<string, any>
}
```

#### Concrete Strategies

```typescript
// /src/domain/strategies/MovingAverageStrategy.ts
export class MovingAverageStrategy implements AggregationStrategy {
  constructor(
    private windowSize: number,
    private weightingFunction?: (index: number) => number
  ) {}

  aggregate(data: RawDataPoint[]): AggregatedData {
    if (data.length === 0) {
      throw new AggregationError('No data points provided');
    }

    const sortedData = data.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    const windowData = sortedData.slice(-this.windowSize);

    let totalValue = 0;
    let totalWeight = 0;

    windowData.forEach((point, index) => {
      const weight = this.weightingFunction
        ? this.weightingFunction(index)
        : 1;

      totalValue += point.value * weight;
      totalWeight += weight;
    });

    const value = totalWeight > 0 ? totalValue / totalWeight : 0;
    const confidence = Math.min(windowData.length / this.windowSize, 1);

    return {
      value,
      confidence,
      metadata: {
        windowSize: this.windowSize,
        dataPoints: windowData.length,
        strategy: 'moving_average'
      }
    };
  }

  getDescription(): string {
    return `Moving Average (window: ${this.windowSize})`;
  }

  getSupportedDataTypes(): DataType[] {
    return [DataType.NUMERIC, DataType.PERCENTAGE];
  }
}

// /src/domain/strategies/PercentileStrategy.ts
export class PercentileStrategy implements AggregationStrategy {
  constructor(private percentile: number) {
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }
  }

  aggregate(data: RawDataPoint[]): AggregatedData {
    if (data.length === 0) {
      throw new AggregationError('No data points provided');
    }

    const sortedValues = data
      .map(point => point.value)
      .sort((a, b) => a - b);

    const index = (this.percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    const value = upper === lower
      ? sortedValues[lower]
      : sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;

    return {
      value,
      confidence: 1,
      metadata: {
        percentile: this.percentile,
        dataPoints: sortedValues.length,
        strategy: 'percentile'
      }
    };
  }

  getDescription(): string {
    return `${this.percentile}th Percentile`;
  }

  getSupportedDataTypes(): DataType[] {
    return [DataType.NUMERIC, DataType.LATENCY, DataType.THROUGHPUT];
  }
}

// /src/domain/strategies/ExponentialSmoothingStrategy.ts
export class ExponentialSmoothingStrategy implements AggregationStrategy {
  constructor(private alpha: number = 0.3) {
    if (alpha < 0 || alpha > 1) {
      throw new Error('Alpha must be between 0 and 1');
    }
  }

  aggregate(data: RawDataPoint[]): AggregatedData {
    if (data.length === 0) {
      throw new AggregationError('No data points provided');
    }

    const sortedData = data.sort((a, b) =>
      a.timestamp.getTime() - b.timestamp.getTime()
    );

    let smoothedValue = sortedData[0].value;

    for (let i = 1; i < sortedData.length; i++) {
      smoothedValue = this.alpha * sortedData[i].value +
                     (1 - this.alpha) * smoothedValue;
    }

    return {
      value: smoothedValue,
      confidence: Math.min(data.length / 10, 1), // More data = higher confidence
      metadata: {
        alpha: this.alpha,
        dataPoints: data.length,
        strategy: 'exponential_smoothing'
      }
    };
  }

  getDescription(): string {
    return `Exponential Smoothing (α=${this.alpha})`;
  }

  getSupportedDataTypes(): DataType[] {
    return [DataType.NUMERIC, DataType.PERCENTAGE, DataType.TREND];
  }
}
```

#### Strategy Context

```typescript
// /src/domain/services/AggregationService.ts
export class AggregationService {
  private strategies = new Map<string, AggregationStrategy>();

  constructor() {
    this.registerDefaultStrategies();
  }

  registerStrategy(name: string, strategy: AggregationStrategy): void {
    this.strategies.set(name, strategy);
  }

  async aggregateData(
    strategyName: string,
    data: RawDataPoint[]
  ): Promise<AggregatedData> {
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Unknown aggregation strategy: ${strategyName}`);
    }

    try {
      return strategy.aggregate(data);
    } catch (error) {
      throw new AggregationError(
        `Aggregation failed with strategy ${strategyName}`,
        error
      );
    }
  }

  getAvailableStrategies(): Array<{name: string, description: string}> {
    return Array.from(this.strategies.entries()).map(([name, strategy]) => ({
      name,
      description: strategy.getDescription()
    }));
  }

  private registerDefaultStrategies(): void {
    this.registerStrategy('moving_average_5', new MovingAverageStrategy(5));
    this.registerStrategy('moving_average_10', new MovingAverageStrategy(10));
    this.registerStrategy('p50', new PercentileStrategy(50));
    this.registerStrategy('p95', new PercentileStrategy(95));
    this.registerStrategy('p99', new PercentileStrategy(99));
    this.registerStrategy('exponential_smooth', new ExponentialSmoothingStrategy(0.3));
  }
}
```

## 3. Observer Pattern

### Purpose

Enable real-time updates across dashboard components by notifying observers of
data changes.

### Implementation

#### Subject Interface

```typescript
// /src/domain/events/Subject.ts
export interface Subject<T> {
  subscribe(observer: Observer<T>): Subscription
  unsubscribe(subscription: Subscription): void
  notify(data: T): void
}

export interface Observer<T> {
  update(data: T): void
  onError?(error: Error): void
  onComplete?(): void
}

export interface Subscription {
  id: string
  unsubscribe(): void
}
```

#### Event Emitter Implementation

```typescript
// /src/infrastructure/events/EventEmitter.ts
export class DashboardEventEmitter<T> implements Subject<T> {
  private observers = new Map<string, Observer<T>>();
  private subscriptionCounter = 0;

  subscribe(observer: Observer<T>): Subscription {
    const id = `sub_${++this.subscriptionCounter}`;
    this.observers.set(id, observer);

    return {
      id,
      unsubscribe: () => this.unsubscribeById(id)
    };
  }

  unsubscribe(subscription: Subscription): void {
    this.unsubscribeById(subscription.id);
  }

  notify(data: T): void {
    this.observers.forEach(observer => {
      try {
        observer.update(data);
      } catch (error) {
        console.error('Observer update failed:', error);
        if (observer.onError) {
          observer.onError(error as Error);
        }
      }
    });
  }

  notifyError(error: Error): void {
    this.observers.forEach(observer => {
      if (observer.onError) {
        observer.onError(error);
      }
    });
  }

  complete(): void {
    this.observers.forEach(observer => {
      if (observer.onComplete) {
        observer.onComplete();
      }
    });
    this.observers.clear();
  }

  private unsubscribeById(id: string): void {
    this.observers.delete(id);
  }

  get observerCount(): number {
    return this.observers.size;
  }
}
```

#### Reactive Data Stream

```typescript
// /src/application/streams/MetricsStream.ts
export class MetricsStream {
  private eventEmitter = new DashboardEventEmitter<MetricUpdate>();
  private webSocketManager: WebSocketManager;
  private isActive = false;

  constructor(webSocketManager: WebSocketManager) {
    this.webSocketManager = webSocketManager;
    this.setupWebSocketHandlers();
  }

  subscribe(observer: Observer<MetricUpdate>): Subscription {
    const subscription = this.eventEmitter.subscribe(observer);

    // Start streaming if this is the first subscriber
    if (this.eventEmitter.observerCount === 1) {
      this.startStreaming();
    }

    return {
      ...subscription,
      unsubscribe: () => {
        this.eventEmitter.unsubscribe(subscription);

        // Stop streaming if no more subscribers
        if (this.eventEmitter.observerCount === 0) {
          this.stopStreaming();
        }
      }
    };
  }

  private startStreaming(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.webSocketManager.connect();
    this.webSocketManager.subscribe('metrics-updates');
  }

  private stopStreaming(): void {
    if (!this.isActive) return;

    this.isActive = false;
    this.webSocketManager.unsubscribe('metrics-updates');
    this.webSocketManager.disconnect();
  }

  private setupWebSocketHandlers(): void {
    this.webSocketManager.on('metrics-update', (data: any) => {
      const metricUpdate: MetricUpdate = {
        metricId: data.metricId,
        value: data.value,
        timestamp: new Date(data.timestamp),
        tags: data.tags
      };

      this.eventEmitter.notify(metricUpdate);
    });

    this.webSocketManager.on('error', (error: Error) => {
      this.eventEmitter.notifyError(error);
    });

    this.webSocketManager.on('disconnect', () => {
      // Attempt to reconnect
      setTimeout(() => {
        if (this.isActive) {
          this.webSocketManager.connect();
        }
      }, 5000);
    });
  }
}
```

#### React Hook Integration

```typescript
// /src/presentation/hooks/useMetricsStream.ts
export function useMetricsStream(metricIds: string[]) {
  const [metrics, setMetrics] = useState<Map<string, MetricUpdate>>(new Map());
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const metricsStream = new MetricsStream(WebSocketManager.getInstance());

    const observer: Observer<MetricUpdate> = {
      update: (metricUpdate) => {
        // Only update if we're interested in this metric
        if (metricIds.includes(metricUpdate.metricId)) {
          setMetrics(prev => new Map(prev.set(metricUpdate.metricId, metricUpdate)));
        }
      },
      onError: (error) => {
        setError(error);
        setIsConnected(false);
      },
      onComplete: () => {
        setIsConnected(false);
      }
    };

    const subscription = metricsStream.subscribe(observer);
    setIsConnected(true);

    return () => {
      subscription.unsubscribe();
      setIsConnected(false);
    };
  }, [metricIds]);

  return {
    metrics: Array.from(metrics.values()),
    error,
    isConnected,
    clearError: () => setError(null)
  };
}
```

## 4. Factory Pattern

### Purpose

Create chart components dynamically based on configuration without tight
coupling to specific chart types.

### Implementation

#### Chart Interface

```typescript
// /src/domain/charts/Chart.ts
export interface Chart {
  render(): React.ReactElement
  updateData(data: ChartData): void
  getConfig(): ChartConfig
  setConfig(config: Partial<ChartConfig>): void
  exportAsImage(): Promise<Blob>
  destroy(): void
}

export interface ChartConfig {
  type: ChartType
  title: string
  width: number
  height: number
  theme: ChartTheme
  animations: boolean
  responsiveBreakpoints: Record<string, Partial<ChartConfig>>
  accessibility: AccessibilityConfig
}

export interface ChartData {
  datasets: Dataset[]
  labels?: string[]
  metadata?: Record<string, any>
}

export enum ChartType {
  LINE = 'line',
  BAR = 'bar',
  AREA = 'area',
  PIE = 'pie',
  HEATMAP = 'heatmap',
  SCATTER = 'scatter',
  GAUGE = 'gauge',
  TREEMAP = 'treemap'
}
```

#### Concrete Chart Implementations

```typescript
// /src/presentation/charts/LineChart.tsx
export class LineChart implements Chart {
  private config: ChartConfig;
  private data: ChartData;
  private componentRef: React.RefObject<HTMLDivElement>;

  constructor(config: ChartConfig, initialData?: ChartData) {
    this.config = { ...defaultLineChartConfig, ...config };
    this.data = initialData || { datasets: [] };
    this.componentRef = React.createRef();
  }

  render(): React.ReactElement {
    return (
      <div ref={this.componentRef} className="chart-container">
        <ResponsiveContainer width={this.config.width} height={this.config.height}>
          <RechartsLineChart
            data={this.transformData()}
            margin={this.config.margin}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={this.formatTimestamp}
            />
            <YAxis tickFormatter={this.formatValue} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {this.data.datasets.map((dataset, index) => (
              <Line
                key={dataset.id || index}
                type="monotone"
                dataKey={dataset.field}
                stroke={dataset.color || this.getDefaultColor(index)}
                strokeWidth={dataset.strokeWidth || 2}
                dot={dataset.showPoints}
                connectNulls={false}
                animationDuration={this.config.animations ? 1000 : 0}
              />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  updateData(data: ChartData): void {
    this.data = data;
    // Trigger re-render through state management or context
    this.forceUpdate();
  }

  async exportAsImage(): Promise<Blob> {
    if (!this.componentRef.current) {
      throw new Error('Chart not rendered');
    }

    const canvas = await html2canvas(this.componentRef.current);
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob!), 'image/png');
    });
  }

  private transformData() {
    // Transform internal data format to Recharts format
    if (this.data.datasets.length === 0) return [];

    const timePoints = new Set<string>();
    this.data.datasets.forEach(dataset => {
      dataset.data.forEach(point => timePoints.add(point.timestamp));
    });

    return Array.from(timePoints).sort().map(timestamp => {
      const point: any = { timestamp };

      this.data.datasets.forEach(dataset => {
        const dataPoint = dataset.data.find(p => p.timestamp === timestamp);
        point[dataset.field] = dataPoint ? dataPoint.value : null;
      });

      return point;
    });
  }
}

// /src/presentation/charts/HeatmapChart.tsx
export class HeatmapChart implements Chart {
  private config: ChartConfig;
  private data: ChartData;

  constructor(config: ChartConfig, initialData?: ChartData) {
    this.config = { ...defaultHeatmapConfig, ...config };
    this.data = initialData || { datasets: [] };
  }

  render(): React.ReactElement {
    return (
      <div className="heatmap-container">
        <svg
          width={this.config.width}
          height={this.config.height}
          className="heatmap-svg"
        >
          {this.renderHeatmapCells()}
          {this.renderAxes()}
          {this.renderColorScale()}
        </svg>
      </div>
    );
  }

  private renderHeatmapCells(): React.ReactNode[] {
    const { datasets } = this.data;
    if (datasets.length === 0) return [];

    const cellData = this.transformToHeatmapData(datasets[0]);
    const colorScale = this.createColorScale(cellData);

    return cellData.map((cell, index) => (
      <rect
        key={index}
        x={cell.x}
        y={cell.y}
        width={cell.width}
        height={cell.height}
        fill={colorScale(cell.value)}
        className="heatmap-cell"
        onMouseEnter={() => this.showTooltip(cell)}
        onMouseLeave={() => this.hideTooltip()}
      />
    ));
  }
}
```

#### Chart Factory

```typescript
// /src/presentation/factories/ChartFactory.ts
export class ChartFactory {
  private static chartConstructors = new Map<ChartType, ChartConstructor>();
  private static defaultConfigs = new Map<ChartType, Partial<ChartConfig>>();

  static registerChart(
    type: ChartType,
    constructor: ChartConstructor,
    defaultConfig?: Partial<ChartConfig>
  ): void {
    this.chartConstructors.set(type, constructor);
    if (defaultConfig) {
      this.defaultConfigs.set(type, defaultConfig);
    }
  }

  static createChart(
    type: ChartType,
    config: Partial<ChartConfig>,
    data?: ChartData
  ): Chart {
    const Constructor = this.chartConstructors.get(type);

    if (!Constructor) {
      throw new Error(`Unsupported chart type: ${type}`);
    }

    const defaultConfig = this.defaultConfigs.get(type) || {};
    const finalConfig: ChartConfig = {
      ...this.getBaseConfig(),
      ...defaultConfig,
      ...config,
      type
    };

    return new Constructor(finalConfig, data);
  }

  static getSupportedTypes(): ChartType[] {
    return Array.from(this.chartConstructors.keys());
  }

  static getDefaultConfig(type: ChartType): Partial<ChartConfig> | undefined {
    return this.defaultConfigs.get(type);
  }

  private static getBaseConfig(): Partial<ChartConfig> {
    return {
      width: 800,
      height: 400,
      theme: ChartTheme.DEFAULT,
      animations: true,
      accessibility: {
        enabled: true,
        description: '',
        keyboardNavigation: true
      }
    };
  }

  // Register default chart types
  static initialize(): void {
    this.registerChart(ChartType.LINE, LineChart, {
      animations: true,
      theme: ChartTheme.DEFAULT
    });

    this.registerChart(ChartType.BAR, BarChart, {
      animations: true,
      theme: ChartTheme.DEFAULT
    });

    this.registerChart(ChartType.HEATMAP, HeatmapChart, {
      animations: false,
      theme: ChartTheme.MINIMAL
    });

    this.registerChart(ChartType.PIE, PieChart, {
      animations: true,
      theme: ChartTheme.COLORFUL
    });
  }
}

// Initialize factory with default charts
ChartFactory.initialize();
```

#### Usage in Components

```typescript
// /src/presentation/components/DashboardWidget.tsx
export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  widgetConfig,
  data
}) => {
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const newChart = ChartFactory.createChart(
        widgetConfig.chartType,
        widgetConfig.chartConfig,
        data
      );

      setChart(newChart);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chart');
    }
  }, [widgetConfig, data]);

  useEffect(() => {
    if (chart && data) {
      chart.updateData(data);
    }
  }, [chart, data]);

  const handleExport = async () => {
    if (!chart) return;

    try {
      const imageBlob = await chart.exportAsImage();
      const url = URL.createObjectURL(imageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${widgetConfig.title || 'chart'}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  if (error) {
    return (
      <div className="widget-error">
        <p>Failed to render chart: {error}</p>
      </div>
    );
  }

  if (!chart) {
    return <div className="widget-loading">Loading chart...</div>;
  }

  return (
    <div className="dashboard-widget">
      <div className="widget-header">
        <h3>{widgetConfig.title}</h3>
        <button onClick={handleExport} className="export-btn">
          Export
        </button>
      </div>
      <div className="widget-content">
        {chart.render()}
      </div>
    </div>
  );
};
```

These design patterns provide a robust foundation for the dashboard
architecture, enabling flexibility, maintainability, and scalability while
following established software engineering principles.
