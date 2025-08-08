# ADR-005: TimescaleDB for Time-Series Data

**Status**: Accepted  
**Date**: 2025-08-06  
**Deciders**: Architecture Team

## Context

The dashboard system needs to store and efficiently query large volumes of
time-series metric data. The solution must support:

- High-frequency data ingestion (thousands of metrics per second)
- Fast time-range queries for dashboard visualizations
- Automatic data compression and retention policies
- Real-time aggregations and analytics

## Decision

We will use **TimescaleDB** as an extension to PostgreSQL for time-series data
storage and management.

### TimescaleDB Implementation

#### Hypertables

```sql
-- Main metrics table
CREATE TABLE metrics (
  time TIMESTAMPTZ NOT NULL,
  metric_id INTEGER NOT NULL,
  value DOUBLE PRECISION NOT NULL,
  tags JSONB,
  metadata JSONB
);

-- Convert to hypertable (time-based partitioning)
SELECT create_hypertable('metrics', 'time');
```

#### Compression Policies

```sql
-- Compress data older than 7 days
SELECT add_compression_policy('metrics', INTERVAL '7 days');

-- Custom compression settings
ALTER TABLE metrics SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'metric_id',
  timescaledb.compress_orderby = 'time DESC'
);
```

#### Retention Policies

```sql
-- Automatically drop data older than 2 years
SELECT add_retention_policy('metrics', INTERVAL '2 years');

-- Tiered retention (different policies per metric type)
SELECT add_retention_policy('high_frequency_metrics', INTERVAL '30 days');
SELECT add_retention_policy('daily_aggregates', INTERVAL '5 years');
```

#### Continuous Aggregates

```sql
-- Pre-computed hourly aggregations
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', time) AS hour,
  metric_id,
  AVG(value) as avg_value,
  MAX(value) as max_value,
  MIN(value) as min_value,
  COUNT(*) as data_points
FROM metrics
GROUP BY hour, metric_id;

-- Refresh policy
SELECT add_continuous_aggregate_policy('metrics_hourly',
  start_offset => INTERVAL '1 day',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');
```

### Indexing Strategy

#### Primary Indexes

```sql
-- Time-based index (automatically created by hypertable)
-- Space-partitioned index for metric queries
CREATE INDEX ON metrics (metric_id, time DESC);

-- JSONB indexes for tag queries
CREATE INDEX ON metrics USING GIN (tags);
CREATE INDEX ON metrics USING GIN (metadata);
```

#### Specialized Indexes

```sql
-- Covering index for common dashboard queries
CREATE INDEX metrics_dashboard_idx ON metrics (metric_id, time DESC)
INCLUDE (value, tags);

-- Partial indexes for specific metric types
CREATE INDEX metrics_error_rate_idx ON metrics (time DESC)
WHERE metric_id = 'error_rate';
```

### Query Optimization

#### Time-Bucket Queries

```sql
-- Efficient time-based aggregations
SELECT
  time_bucket('5 minutes', time) as bucket,
  AVG(value) as avg_value
FROM metrics
WHERE time >= NOW() - INTERVAL '1 hour'
  AND metric_id = $1
GROUP BY bucket
ORDER BY bucket;
```

#### Parallel Query Processing

```sql
-- Enable parallel workers for large aggregations
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.1;
SET parallel_setup_cost = 1000;
```

## Alternatives Considered

### Option 1: InfluxDB

```
Pros: Purpose-built for time-series, excellent performance
Cons: Additional technology, limited SQL support, operational complexity
```

**Rejected**: Adds operational complexity and learning curve

### Option 2: Regular PostgreSQL

```
Pros: Familiar technology, existing expertise
Cons: Poor time-series performance, manual partitioning required
```

**Rejected**: Insufficient performance for large-scale time-series data

### Option 3: Cassandra

```
Pros: Excellent write performance, horizontal scaling
Cons: Complex operations, eventual consistency, limited query flexibility
```

**Rejected**: Operational complexity outweighs benefits

### Option 4: MongoDB with Time-Series Collections

```
Pros: Flexible schema, good aggregation framework
Cons: Less mature time-series features, complex scaling
```

**Rejected**: Less mature time-series optimization

## Implementation Strategy

### Data Ingestion Pipeline

```typescript
class MetricsIngestionService {
  async batchInsert(metrics: Metric[]): Promise<void> {
    const query = `
      INSERT INTO metrics (time, metric_id, value, tags, metadata)
      SELECT * FROM unnest($1::metrics_type[])
    `;

    await this.db.query(query, [metrics]);
  }

  async streamInsert(metricsStream: ReadableStream<Metric>): Promise<void> {
    // Use COPY command for high-throughput ingestion
  }
}
```

### Query Service

```typescript
class TimeSeriesQueryService {
  async getTimeSeriesData(params: TimeSeriesParams): Promise<TimeSeriesData[]> {
    const query = `
      SELECT
        time_bucket($1, time) as bucket,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value
      FROM metrics
      WHERE time BETWEEN $2 AND $3
        AND metric_id = $4
      GROUP BY bucket
      ORDER BY bucket
    `;

    return this.db.query(query, [
      params.interval,
      params.startTime,
      params.endTime,
      params.metricId
    ]);
  }
}
```

## Performance Optimizations

### Batch Operations

- Use COPY command for bulk inserts
- Batch multiple metrics in single transactions
- Async processing for non-critical operations

### Memory Management

```sql
-- Optimize memory usage for large queries
SET work_mem = '256MB';
SET shared_buffers = '2GB';
SET effective_cache_size = '8GB';
```

### Connection Pooling

```typescript
// Use connection pooling for database connections
const pool = new Pool({
  host: 'localhost',
  database: 'dashboard',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Consequences

### Positive

- **Performance**: Excellent time-series query performance
- **Scalability**: Automatic partitioning and compression
- **SQL Compatibility**: Familiar PostgreSQL syntax and tools
- **Operational Simplicity**: Extension to existing PostgreSQL knowledge
- **Advanced Features**: Continuous aggregates and automated policies
- **Data Compression**: Significant storage savings over time

### Negative

- **Learning Curve**: Team needs to learn TimescaleDB-specific features
- **Extension Dependency**: Requires TimescaleDB extension installation
- **Memory Usage**: Can be memory-intensive for complex queries
- **Write Amplification**: Compression can impact write performance

### Monitoring Requirements

- Query performance metrics
- Compression ratios and effectiveness
- Chunk utilization and pruning
- Memory usage patterns
- Connection pool metrics

### Operational Guidelines

1. Regular maintenance of continuous aggregates
2. Monitor and tune compression policies
3. Implement proper backup strategies for time-series data
4. Use appropriate chunk intervals based on data patterns
5. Regular VACUUM and ANALYZE operations
