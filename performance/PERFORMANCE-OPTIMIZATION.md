# Performance Optimization Strategies

## Overview

This document outlines comprehensive performance optimization strategies for the
scalable dashboard system, covering frontend optimization, backend performance,
database tuning, caching strategies, and infrastructure optimizations.

## Frontend Performance Optimization

### 1. React Performance Optimization

#### Component Optimization

```typescript
// /src/presentation/components/optimized/MemoizedChart.tsx
import React, { memo, useMemo, useCallback } from 'react';

interface ChartProps {
  data: ChartData[];
  config: ChartConfig;
  onDataPointClick: (point: DataPoint) => void;
}

export const MemoizedChart = memo<ChartProps>(({ data, config, onDataPointClick }) => {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      formattedValue: formatValue(item.value, config.format),
      color: getColorByValue(item.value, config.colorScale)
    }));
  }, [data, config.format, config.colorScale]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleDataPointClick = useCallback((point: DataPoint) => {
    onDataPointClick?.(point);
  }, [onDataPointClick]);

  // Memoize chart configuration to prevent Recharts re-initialization
  const chartConfig = useMemo(() => ({
    margin: config.margin,
    animationDuration: config.animations ? 750 : 0,
    theme: config.theme
  }), [config.margin, config.animations, config.theme]);

  return (
    <ResponsiveContainer>
      <LineChart data={processedData} {...chartConfig}>
        {/* Chart elements */}
      </LineChart>
    </ResponsiveContainer>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for shallow comparison optimization
  return (
    prevProps.data === nextProps.data &&
    prevProps.config.format === nextProps.config.format &&
    prevProps.config.theme === nextProps.config.theme &&
    prevProps.onDataPointClick === nextProps.onDataPointClick
  );
});
```

#### Virtual Scrolling for Large Datasets

```typescript
// /src/presentation/components/VirtualizedList.tsx
import { FixedSizeList as List } from 'react-window';

interface VirtualizedListProps {
  items: any[];
  itemHeight: number;
  height: number;
  renderItem: ({ index, style }: { index: number; style: CSSProperties }) => React.ReactNode;
}

export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  items,
  itemHeight,
  height,
  renderItem
}) => {
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
      overscanCount={5} // Pre-render 5 items above/below viewport
    >
      {renderItem}
    </List>
  );
};

// Usage in dashboard components
export const MetricsTable: React.FC<MetricsTableProps> = ({ metrics }) => {
  const renderRow = useCallback(({ index, style }) => (
    <div style={style}>
      <MetricRow metric={metrics[index]} />
    </div>
  ), [metrics]);

  return (
    <VirtualizedList
      items={metrics}
      itemHeight={50}
      height={400}
      renderItem={renderRow}
    />
  );
};
```

### 2. Code Splitting and Lazy Loading

#### Route-based Code Splitting

```typescript
// /src/app/layout.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load dashboard components
const DashboardView = dynamic(() => import('@/components/DashboardView'), {
  loading: () => <DashboardSkeleton />,
  ssr: false // Disable SSR for heavy interactive components
});

const AnalyticsView = dynamic(() => import('@/components/AnalyticsView'), {
  loading: () => <AnalyticsSkeleton />
});

// Component-level lazy loading
const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<AppSkeleton />}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
```

#### Dynamic Chart Loading

```typescript
// /src/presentation/hooks/useDynamicChart.ts
export function useDynamicChart(chartType: ChartType) {
  const [ChartComponent, setChartComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadChart = async () => {
      try {
        setLoading(true);

        const chartModule = await import(`@/components/charts/${chartType}Chart`);
        setChartComponent(() => chartModule.default);
        setError(null);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    loadChart();
  }, [chartType]);

  return { ChartComponent, loading, error };
}
```

### 3. Asset Optimization

#### Image Optimization

```typescript
// next.config.js
const nextConfig = {
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
    dangerouslyAllowSVG: false
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['recharts', 'lodash']
  }
};
```

#### Bundle Optimization

```typescript
// webpack.config.js (custom optimizations)
const config = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          maxSize: 244000, // ~240KB
        },
        charts: {
          test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
          name: 'charts',
          chunks: 'all',
          priority: 10
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true,
          maxSize: 244000
        }
      }
    },
    usedExports: true,
    sideEffects: false
  }
};
```

## Backend Performance Optimization

### 1. API Route Optimization

#### Response Caching

```typescript
// /src/app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

const responseCache = new LRUCache<string, any>({
  max: 1000,
  ttl: 1000 * 60 * 5 // 5 minutes
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cacheKey = `metrics:${searchParams.toString()}`;

  // Check cache first
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'HIT'
      }
    });
  }

  try {
    const metricsService = new MetricsService();
    const data = await metricsService.getMetrics({
      startTime: new Date(searchParams.get('start') || ''),
      endTime: new Date(searchParams.get('end') || ''),
      metricIds: searchParams.getAll('metricId'),
      aggregation: searchParams.get('aggregation') || 'avg'
    });

    // Cache the response
    responseCache.set(cacheKey, data);

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    });
  } catch (error) {
    console.error('Metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### Request Batching

```typescript
// /src/application/services/BatchingService.ts
export class BatchingService {
  private requestQueue: Map<string, QueuedRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private batchSize: number = 10,
    private batchTimeout: number = 100
  ) {}

  async batchRequest<T>(
    batchKey: string,
    request: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        request,
        resolve,
        reject,
        timestamp: Date.now()
      };

      // Add to queue
      if (!this.requestQueue.has(batchKey)) {
        this.requestQueue.set(batchKey, []);
      }
      this.requestQueue.get(batchKey)!.push(queuedRequest);

      // Process batch if size limit reached
      const queue = this.requestQueue.get(batchKey)!;
      if (queue.length >= this.batchSize) {
        this.processBatch(batchKey);
        return;
      }

      // Set timeout for batch processing
      if (!this.batchTimers.has(batchKey)) {
        const timer = setTimeout(() => {
          this.processBatch(batchKey);
        }, this.batchTimeout);

        this.batchTimers.set(batchKey, timer);
      }
    });
  }

  private async processBatch(batchKey: string): Promise<void> {
    const queue = this.requestQueue.get(batchKey) || [];
    if (queue.length === 0) return;

    // Clear timer and queue
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
    this.requestQueue.delete(batchKey);

    // Execute all requests in parallel
    const results = await Promise.allSettled(
      queue.map(item => item.request())
    );

    // Resolve/reject individual promises
    results.forEach((result, index) => {
      const queuedRequest = queue[index];
      if (result.status === 'fulfilled') {
        queuedRequest.resolve(result.value);
      } else {
        queuedRequest.reject(result.reason);
      }
    });
  }
}
```

### 2. Database Query Optimization

#### Query Performance Monitoring

```typescript
// /src/infrastructure/database/QueryMonitor.ts
export class QueryMonitor {
  private slowQueryThreshold: number = 1000; // 1 second

  async executeQuery<T>(
    query: string,
    params: any[],
    connection: DatabaseConnection
  ): Promise<T> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(query, params);

    try {
      const result = await connection.query(query, params);
      const duration = Date.now() - startTime;

      // Log slow queries
      if (duration > this.slowQueryThreshold) {
        console.warn('Slow query detected', {
          queryId,
          duration,
          query: this.sanitizeQuery(query),
          params: params.length
        });
      }

      // Update metrics
      this.updateQueryMetrics(queryId, duration, true);

      return result.rows;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.updateQueryMetrics(queryId, duration, false);
      throw error;
    }
  }

  private updateQueryMetrics(queryId: string, duration: number, success: boolean): void {
    // Send metrics to monitoring system
    const metrics = {
      'database.query.duration': duration,
      'database.query.success': success ? 1 : 0,
      'database.query.error': success ? 0 : 1
    };

    // Implementation depends on monitoring system (Prometheus, DataDog, etc.)
  }
}
```

#### Connection Pool Optimization

```typescript
// /src/infrastructure/database/ConnectionPool.ts
import { Pool, PoolConfig } from 'pg';

export class OptimizedConnectionPool {
  private pool: Pool;
  private metrics: PoolMetrics;

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      ...config,
      // Optimized settings
      max: 20, // Maximum connections
      min: 5,  // Minimum connections
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 2000, // Connection timeout
      maxUses: 7500, // Rotate connections after 7500 uses
      allowExitOnIdle: true
    });

    this.metrics = new PoolMetrics();
    this.setupMonitoring();
  }

  async query<T>(text: string, params?: any[]): Promise<T> {
    const client = await this.pool.connect();
    const startTime = Date.now();

    try {
      this.metrics.recordConnectionAcquired();
      const result = await client.query(text, params);

      const duration = Date.now() - startTime;
      this.metrics.recordQuerySuccess(duration);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.metrics.recordQueryError(duration);
      throw error;
    } finally {
      client.release();
      this.metrics.recordConnectionReleased();
    }
  }

  private setupMonitoring(): void {
    // Monitor pool health every 30 seconds
    setInterval(() => {
      const totalCount = this.pool.totalCount;
      const idleCount = this.pool.idleCount;
      const waitingCount = this.pool.waitingCount;

      console.log('Pool metrics:', {
        totalCount,
        idleCount,
        waitingCount,
        activeCount: totalCount - idleCount
      });

      // Alert if pool is under pressure
      if (waitingCount > 5) {
        console.warn('Database pool under pressure', {
          totalCount,
          idleCount,
          waitingCount
        });
      }
    }, 30000);
  }
}
```

### 3. Caching Implementation

#### Multi-Level Cache Manager

```typescript
// /src/infrastructure/cache/MultiLevelCache.ts
export class MultiLevelCache {
  private l1Cache: LRUCache<string, any>; // Memory cache
  private l2Cache: Redis; // Redis cache
  private metrics: CacheMetrics;

  constructor(
    private config: CacheConfig,
    redisConnection: Redis
  ) {
    this.l1Cache = new LRUCache({
      max: config.l1MaxItems || 1000,
      ttl: config.l1TTL || 1000 * 60 * 5 // 5 minutes
    });

    this.l2Cache = redisConnection;
    this.metrics = new CacheMetrics();
  }

  async get<T>(key: string): Promise<T | null> {
    // Try L1 cache first
    const l1Value = this.l1Cache.get(key);
    if (l1Value !== undefined) {
      this.metrics.recordHit('l1');
      return l1Value;
    }

    // Try L2 cache (Redis)
    try {
      const l2Value = await this.l2Cache.get(key);
      if (l2Value !== null) {
        const parsed = JSON.parse(l2Value);

        // Populate L1 cache
        this.l1Cache.set(key, parsed);

        this.metrics.recordHit('l2');
        return parsed;
      }
    } catch (error) {
      console.error('Redis cache error:', error);
      this.metrics.recordError('l2');
    }

    this.metrics.recordMiss();
    return null;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    // Set in L1 cache
    this.l1Cache.set(key, value, { ttl: ttl || this.config.l1TTL });

    // Set in L2 cache (Redis)
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.l2Cache.setex(key, Math.ceil(ttl / 1000), serialized);
      } else {
        await this.l2Cache.set(key, serialized);
      }
    } catch (error) {
      console.error('Redis cache set error:', error);
      this.metrics.recordError('l2');
    }
  }

  async invalidate(pattern: string): Promise<void> {
    // Invalidate L1 cache entries matching pattern
    this.l1Cache.forEach((value, key) => {
      if (key.includes(pattern)) {
        this.l1Cache.delete(key);
      }
    });

    // Invalidate L2 cache entries
    try {
      const keys = await this.l2Cache.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.l2Cache.del(...keys);
      }
    } catch (error) {
      console.error('Redis cache invalidation error:', error);
    }
  }

  getMetrics(): CacheStats {
    return {
      l1: {
        size: this.l1Cache.size,
        hits: this.metrics.l1Hits,
        misses: this.metrics.misses,
        hitRate: this.metrics.l1Hits / (this.metrics.l1Hits + this.metrics.misses)
      },
      l2: {
        hits: this.metrics.l2Hits,
        errors: this.metrics.l2Errors,
        hitRate: this.metrics.l2Hits / (this.metrics.l2Hits + this.metrics.misses)
      }
    };
  }
}
```

#### Smart Cache Warming

```typescript
// /src/application/services/CacheWarmingService.ts
export class CacheWarmingService {
  constructor(
    private cacheManager: MultiLevelCache,
    private metricsService: MetricsService
  ) {}

  async warmCriticalPaths(): Promise<void> {
    const criticalQueries = [
      // Most frequently accessed metrics
      { metricId: 'system.cpu', timeRange: '1h' },
      { metricId: 'system.memory', timeRange: '1h' },
      { metricId: 'app.requests_per_second', timeRange: '1h' },

      // Dashboard defaults
      { metricId: 'app.error_rate', timeRange: '24h' },
      { metricId: 'app.response_time', timeRange: '24h' }
    ];

    const warmingPromises = criticalQueries.map(async (query) => {
      try {
        const cacheKey = `metrics:${query.metricId}:${query.timeRange}`;
        const cached = await this.cacheManager.get(cacheKey);

        if (!cached) {
          // Pre-load data
          const data = await this.metricsService.getMetrics(query);
          await this.cacheManager.set(cacheKey, data, 1000 * 60 * 15); // 15 minutes

          console.log(`Warmed cache for ${query.metricId}`);
        }
      } catch (error) {
        console.error(`Failed to warm cache for ${query.metricId}:`, error);
      }
    });

    await Promise.allSettled(warmingPromises);
  }

  // Schedule cache warming
  startPeriodicWarming(): void {
    // Warm cache every 10 minutes
    setInterval(() => {
      this.warmCriticalPaths().catch(console.error);
    }, 1000 * 60 * 10);

    // Initial warming
    this.warmCriticalPaths().catch(console.error);
  }
}
```

## Database Performance Optimization

### 1. TimescaleDB Specific Optimizations

#### Compression Configuration

```sql
-- Optimize compression for different data types
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'metric_id, device_id',
  timescaledb.compress_orderby = 'time DESC, value',
  timescaledb.compress_chunk_time_interval = INTERVAL '1 day'
);

-- Custom compression policies by data frequency
SELECT add_compression_policy('high_frequency_metrics', INTERVAL '2 hours');
SELECT add_compression_policy('low_frequency_metrics', INTERVAL '1 day');
SELECT add_compression_policy('batch_processed_metrics', INTERVAL '12 hours');
```

#### Intelligent Partitioning

```sql
-- Partition by time with optimal chunk intervals
SELECT set_chunk_time_interval('metrics', INTERVAL '4 hours');
SELECT set_chunk_time_interval('aggregated_metrics', INTERVAL '1 day');

-- Space partitioning for multi-tenant scenarios
SELECT set_number_partitions('metrics', 4, 'device_id');
```

#### Materialized View Optimization

```sql
-- Create optimized continuous aggregates
CREATE MATERIALIZED VIEW metrics_5min
WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
SELECT
  time_bucket('5 minutes', time) AS bucket,
  metric_id,
  device_id,
  AVG(value) as avg_value,
  MIN(value) as min_value,
  MAX(value) as max_value,
  COUNT(*) as sample_count,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value
FROM metrics
GROUP BY bucket, metric_id, device_id;

-- Optimized refresh policy
SELECT add_continuous_aggregate_policy('metrics_5min',
  start_offset => INTERVAL '10 minutes',
  end_offset => INTERVAL '2 minutes',
  schedule_interval => INTERVAL '2 minutes'
);
```

### 2. Query Optimization Techniques

#### Index Strategy

```sql
-- Composite indexes for common query patterns
CREATE INDEX metrics_time_metric_id_idx ON metrics (time DESC, metric_id);
CREATE INDEX metrics_metric_id_time_idx ON metrics (metric_id, time DESC);

-- Partial indexes for specific conditions
CREATE INDEX metrics_high_values_idx ON metrics (time DESC, metric_id)
WHERE value > 1000;

-- Covering indexes to avoid table lookups
CREATE INDEX metrics_dashboard_covering_idx ON metrics (metric_id, time DESC)
INCLUDE (value, tags);

-- GIN indexes for JSONB tag queries
CREATE INDEX metrics_tags_gin_idx ON metrics USING GIN (tags);
CREATE INDEX metrics_tags_specific_gin_idx ON metrics USING GIN ((tags->>'environment'));
```

#### Query Rewriting for Performance

```typescript
// /src/infrastructure/repositories/OptimizedQueries.ts
export class OptimizedQueries {
  // Use prepared statements for frequently executed queries
  private static PREPARED_STATEMENTS = {
    TIME_SERIES_QUERY: `
      SELECT
        time_bucket($1, time) as bucket,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value
      FROM metrics
      WHERE time >= $2 AND time < $3
        AND metric_id = ANY($4)
      GROUP BY bucket, metric_id
      ORDER BY bucket ASC
    `,

    AGGREGATED_QUERY: `
      SELECT
        bucket,
        metric_id,
        avg_value,
        min_value,
        max_value
      FROM metrics_5min
      WHERE bucket >= $1 AND bucket < $2
        AND metric_id = ANY($3)
      ORDER BY bucket ASC, metric_id
    `
  };

  static async getTimeSeriesData(
    db: DatabaseConnection,
    params: TimeSeriesParams
  ): Promise<TimeSeriesData[]> {
    // Choose optimal query based on time range
    const timeRange = params.endTime.getTime() - params.startTime.getTime();
    const useAggregated = timeRange > 24 * 60 * 60 * 1000; // > 24 hours

    const query = useAggregated
      ? this.PREPARED_STATEMENTS.AGGREGATED_QUERY
      : this.PREPARED_STATEMENTS.TIME_SERIES_QUERY;

    const queryParams = [
      params.interval,
      params.startTime,
      params.endTime,
      params.metricIds
    ];

    return await db.query(query, queryParams);
  }

  // Use window functions for complex analytics
  static async getPercentileData(
    db: DatabaseConnection,
    params: PercentileParams
  ): Promise<PercentileData[]> {
    const query = `
      SELECT
        time_bucket($1, time) as bucket,
        metric_id,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99
      FROM metrics
      WHERE time >= $2 AND time < $3
        AND metric_id = ANY($4)
      GROUP BY bucket, metric_id
      ORDER BY bucket ASC
    `;

    return await db.query(query, [
      params.interval,
      params.startTime,
      params.endTime,
      params.metricIds
    ]);
  }
}
```

## Infrastructure Performance

### 1. CDN Configuration

#### Edge Caching Strategy

```typescript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Cache static assets aggressively
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2)$/)) {
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      response = await fetch(request);

      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year
        headers.set('Vary', 'Accept-Encoding');

        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });

        await cache.put(request, response.clone());
      }
    }

    return response;
  }

  // Cache API responses with shorter TTL
  if (url.pathname.startsWith('/api/')) {
    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      response = await fetch(request);

      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set('Cache-Control', 'public, s-maxage=300'); // 5 minutes

        response = new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: headers
        });

        await cache.put(request, response.clone());
      }
    }

    return response;
  }

  return fetch(request);
}
```

### 2. Load Balancing Configuration

#### Nginx Configuration

```nginx
# /etc/nginx/sites-available/dashboard
upstream dashboard_backend {
    least_conn;
    server app1:3000 weight=3 max_fails=3 fail_timeout=30s;
    server app2:3000 weight=3 max_fails=3 fail_timeout=30s;
    server app3:3000 weight=2 max_fails=3 fail_timeout=30s;

    # Health check
    keepalive 32;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
limit_req_zone $binary_remote_addr zone=dashboard:10m rate=30r/m;

server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    # SSL configuration
    ssl_certificate /etc/ssl/certs/dashboard.crt;
    ssl_certificate_key /etc/ssl/private/dashboard.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS;
    ssl_prefer_server_ciphers off;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/javascript application/xml+rss
               application/json;

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";

        # Enable compression
        gzip_static on;
    }

    # API endpoints
    location /api/ {
        limit_req zone=api burst=20 nodelay;

        proxy_pass http://dashboard_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts
        proxy_connect_timeout 5s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffering
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;

        # Health checks
        proxy_next_upstream error timeout http_502 http_503 http_504;
    }

    # Dashboard pages
    location / {
        limit_req zone=dashboard burst=10 nodelay;

        proxy_pass http://dashboard_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket upgrade
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

## Monitoring and Performance Metrics

### 1. Performance Monitoring Setup

#### Application Performance Monitoring

```typescript
// /src/infrastructure/monitoring/PerformanceMonitor.ts
export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  startTiming(operation: string): PerformanceTimer {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return {
      end: () => {
        const duration = performance.now() - startTime;
        const endMemory = process.memoryUsage();
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

        this.recordMetric(operation, {
          duration,
          memoryUsage: memoryDelta,
          timestamp: new Date()
        });

        return { duration, memoryUsage: memoryDelta };
      }
    };
  }

  recordMetric(operation: string, metric: PerformanceMetric): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const operationMetrics = this.metrics.get(operation)!;
    operationMetrics.push(metric);

    // Keep only last 1000 metrics per operation
    if (operationMetrics.length > 1000) {
      operationMetrics.shift();
    }

    // Alert on performance degradation
    this.checkPerformanceThresholds(operation, metric);
  }

  private checkPerformanceThresholds(operation: string, metric: PerformanceMetric): void {
    const thresholds = {
      'database.query': { duration: 1000, memory: 50 * 1024 * 1024 },
      'api.request': { duration: 500, memory: 10 * 1024 * 1024 },
      'chart.render': { duration: 2000, memory: 100 * 1024 * 1024 }
    };

    const threshold = thresholds[operation];
    if (!threshold) return;

    if (metric.duration > threshold.duration) {
      console.warn(`Slow ${operation}: ${metric.duration}ms`);
    }

    if (metric.memoryUsage > threshold.memory) {
      console.warn(`High memory usage in ${operation}: ${metric.memoryUsage} bytes`);
    }
  }

  getMetricsSummary(operation: string): MetricsSummary | null {
    const metrics = this.metrics.get(operation);
    if (!metrics || metrics.length === 0) return null;

    const durations = metrics.map(m => m.duration);
    const memoryUsages = metrics.map(m => m.memoryUsage);

    return {
      operation,
      count: metrics.length,
      duration: {
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        p95: this.percentile(durations, 0.95)
      },
      memory: {
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length,
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        p95: this.percentile(memoryUsages, 0.95)
      }
    };
  }

  private percentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile) - 1;
    return sorted[index];
  }
}

// Usage in application
const performanceMonitor = new PerformanceMonitor();

export async function getMetricsWithMonitoring(params: any) {
  const timer = performanceMonitor.startTiming('metrics.fetch');

  try {
    const result = await metricsService.getMetrics(params);
    const { duration, memoryUsage } = timer.end();

    console.log(`Metrics fetch completed in ${duration}ms, used ${memoryUsage} bytes`);
    return result;
  } catch (error) {
    timer.end();
    throw error;
  }
}
```

This comprehensive performance optimization strategy provides a multi-layered
approach to ensuring the dashboard system maintains excellent performance as it
scales from prototype to enterprise-level usage.
