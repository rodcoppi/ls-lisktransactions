# ADR-003: Multi-Layer Caching Strategy

**Status**: Accepted  
**Date**: 2025-08-06  
**Deciders**: Architecture Team

## Context

The dashboard system needs to handle high-frequency data requests with low
latency. A comprehensive caching strategy is essential for performance and
scalability.

## Decision

We will implement a 5-layer caching strategy:

### Layer 1: Browser Cache

- **Static Assets**: 1 year TTL with cache busting
- **Service Worker**: Cache critical app shell and assets
- **IndexedDB**: User preferences and offline data
- **Memory Cache**: Component state and computed values

### Layer 2: CDN Cache (Edge)

- **Static Assets**: Aggressive caching with versioning
- **API Responses**: 5-minute TTL for dynamic content
- **Chart Images**: 1-hour TTL for generated visualizations

### Layer 3: Application Memory Cache

```typescript
const cache = new LRU({
  max: 1000,           // Maximum 1000 entries
  ttl: 1000 * 60 * 15  // 15-minute TTL
})
```

### Layer 4: Redis Distributed Cache

- **Session Data**: User sessions and authentication
- **Computed Aggregations**: 1-hour TTL for expensive calculations
- **Real-time Data**: 5-minute TTL for live metrics
- **Query Results**: Cached database query results

### Layer 5: Database Cache

- **PostgreSQL Buffer Cache**: Automatic query result caching
- **TimescaleDB Chunk Cache**: Time-series data chunks
- **Materialized Views**: Pre-computed aggregations

## Cache Invalidation Strategy

### Time-based Expiration

- Different TTLs based on data volatility
- Sliding expiration for frequently accessed data

### Event-based Invalidation

```typescript
enum CacheInvalidationEvent {
  METRICS_UPDATED = 'cache.invalidate.metrics',
  USER_PREFERENCES_CHANGED = 'cache.invalidate.preferences',
  SYSTEM_CONFIG_UPDATED = 'cache.invalidate.config'
}
```

### Cache Warming

- Proactive cache population for predicted requests
- Background refresh of critical data

## Cache Key Strategy

### Hierarchical Keys

```
dashboard:user:{userId}:metrics:{metricType}:{timeRange}
dashboard:global:aggregations:{type}:{period}
dashboard:config:charts:{chartId}
```

### Cache Tags

- Enable bulk invalidation by tags
- Group related cache entries

## Alternatives Considered

### Option 1: Single Redis Cache

**Rejected**: Single point of failure, doesn't utilize browser caching benefits

### Option 2: Database-only Caching

**Rejected**: Insufficient for real-time dashboard requirements

### Option 3: No Caching

**Rejected**: Unacceptable performance for dashboard use case

## Consequences

### Positive

- **Performance**: Dramatic reduction in response times
- **Scalability**: Reduced database load and improved throughput
- **User Experience**: Faster page loads and real-time updates
- **Cost Efficiency**: Reduced database and compute resource usage

### Negative

- **Complexity**: Multiple caching layers require careful management
- **Consistency**: Cache invalidation complexity increases
- **Memory Usage**: Significant memory requirements across layers
- **Debugging**: Harder to debug issues across multiple cache layers

### Monitoring Requirements

- Cache hit rates for each layer
- Memory usage and eviction rates
- Cache invalidation frequency
- Performance impact metrics

### Implementation Guidelines

1. Cache-aside pattern for application caches
2. Write-through for critical data
3. Circuit breaker pattern for cache failures
4. Comprehensive cache monitoring and alerting
5. Cache warming strategies for critical paths
