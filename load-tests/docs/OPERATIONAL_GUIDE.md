# Load Testing Operational Guide

This comprehensive guide covers operational procedures for running, monitoring,
and interpreting load tests in production environments.

## Table of Contents

1. [Pre-Test Checklist](#pre-test-checklist)
2. [Test Execution Procedures](#test-execution-procedures)
3. [Monitoring and Alerting](#monitoring-and-alerting)
4. [Results Interpretation](#results-interpretation)
5. [Incident Response](#incident-response)
6. [Maintenance and Optimization](#maintenance-and-optimization)
7. [Scaling and Capacity Planning](#scaling-and-capacity-planning)

## Pre-Test Checklist

### System Preparation

- [ ] Application is running and healthy
- [ ] Database connections are stable
- [ ] Redis cluster is operational
- [ ] Monitoring stack is running (Prometheus, Grafana)
- [ ] Sufficient system resources available
- [ ] Backup and recovery procedures in place
- [ ] Stakeholders notified of test schedule

### Environment Validation

```bash
# Check application health
curl http://localhost:3000/api/health

# Verify database connectivity
npm run aggregation:monitor

# Check Redis cluster status
redis-cli cluster info

# Validate monitoring stack
curl http://localhost:9090/api/v1/query?query=up
```

### Test Configuration Review

```bash
# Review test parameters
cat load-tests/k6/config.js

# Validate SLA thresholds
grep -r "thresholds" load-tests/

# Check resource limits
docker stats
```

## Test Execution Procedures

### Standard Test Sequence

1. **Smoke Test (5 minutes)**

   ```bash
   npm run load-test:basic
   ```

   - Validates basic functionality
   - 50 concurrent users
   - Quick health check

2. **Progressive Load Test (20 minutes)**

   ```bash
   npm run load-test:progressive
   ```

   - Gradual user ramp-up
   - Identifies breaking points
   - 1 to 15,000 users

3. **Stress Test (15 minutes)**

   ```bash
   npm run load-test:api
   ```

   - Maximum load validation
   - 10,000+ concurrent users
   - API endpoint testing

4. **Specialized Tests**

   ```bash
   # WebSocket performance
   npm run load-test:websocket

   # Database performance
   npm run load-test:database

   # Long-term stability
   npm run load-test:endurance
   ```

### Docker-Based Execution

For isolated testing environments:

```bash
# Start full testing infrastructure
npm run load-test:docker

# Monitor in real-time
docker-compose -f docker-compose.loadtest.yml logs -f k6 artillery

# Scale testing resources
docker-compose -f docker-compose.loadtest.yml up --scale k6=3
```

### CI/CD Integration

Automated testing via GitHub Actions:

```yaml
# Triggered on:
# - Manual workflow dispatch
# - Scheduled runs (daily at 2 AM)
# - Before production deployments

# Test stages:
# 1. Smoke tests (required)
# 2. Load tests (required)
# 3. Endurance tests (optional)
# 4. Report generation
```

## Monitoring and Alerting

### Key Metrics Dashboard

Access Grafana at http://localhost:3001:

**Performance Metrics:**

- Response time percentiles (P50, P95, P99)
- Request rate and throughput
- Error rate and types
- Database query performance
- Cache hit ratios

**System Metrics:**

- CPU and memory utilization
- Network I/O and bandwidth
- Disk utilization and latency
- Connection pool status

**Business Metrics:**

- Transaction processing rate
- User session metrics
- API endpoint usage
- Geographic distribution

### Alert Thresholds

Prometheus alerts are configured for:

```yaml
# SLA Violations
- alert: HighResponseTime
  expr: http_request_duration_seconds{quantile="0.95"} > 0.2

- alert: HighErrorRate
  expr: rate(http_requests_total{status!~"2.."}[5m]) > 0.01

# System Issues
- alert: DatabaseSlowQueries
  expr: pg_stat_activity_max_tx_duration > 50000

- alert: CacheMissRate
  expr:
    redis_keyspace_hits_total / (redis_keyspace_hits_total +
    redis_keyspace_misses_total) < 0.9

# Infrastructure
- alert: HighMemoryUsage
  expr:
    (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.85

- alert: DiskSpaceLow
  expr: (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) > 0.85
```

### Real-Time Monitoring Commands

```bash
# Watch test progress
tail -f load-tests/reports/logs/current-test.log

# Monitor system resources
watch -n 1 'docker stats --no-stream'

# Check database performance
watch -n 5 'psql -c "SELECT * FROM pg_stat_activity WHERE state = '\''active'\'';"'

# Monitor Redis performance
watch -n 2 'redis-cli info stats'
```

## Results Interpretation

### Performance Analysis

**Response Time Analysis:**

```bash
# View P95 response times
jq '.aggregate.p95' load-tests/reports/json/latest-results.json

# Check error distribution
jq '.aggregate.error_rate' load-tests/reports/json/latest-results.json

# Database performance metrics
grep "database_query_duration_p95" load-tests/reports/logs/performance.log
```

**Throughput Analysis:**

- **Target**: 1M+ requests per day (≈12 RPS sustained)
- **Peak Capacity**: 10,000+ concurrent users
- **Acceptable Degradation**: <10% performance loss under 80% capacity

**SLA Compliance:**

```bash
# Generate SLA report
node load-tests/utils/benchmarks/performance-validator.js

# Check compliance status
cat load-tests/reports/sla-compliance.json
```

### Bottleneck Identification

**Common Bottlenecks:**

1. **Database Connection Limits**
   - Symptoms: Connection timeout errors
   - Solution: Increase connection pool size
   - Monitor: `pg_stat_activity` row count

2. **Redis Memory Exhaustion**
   - Symptoms: Cache miss rate increase
   - Solution: Implement LRU eviction, scale cluster
   - Monitor: `redis_memory_used_bytes`

3. **CPU Saturation**
   - Symptoms: High response times, timeouts
   - Solution: Horizontal scaling, code optimization
   - Monitor: Node CPU metrics

4. **Network Bandwidth**
   - Symptoms: Slow data transfer, timeouts
   - Solution: CDN implementation, compression
   - Monitor: Network I/O metrics

### Capacity Planning

**Scaling Triggers:**

- P95 response time > 150ms (Warning)
- P95 response time > 200ms (Critical - Scale up)
- Error rate > 0.5% (Warning)
- Error rate > 1% (Critical - Investigate)
- CPU utilization > 70% (Plan scaling)
- Memory utilization > 80% (Scale up)

**Scaling Actions:**

```bash
# Horizontal scaling simulation
node load-tests/utils/scalability/horizontal-scaling-test.js

# Database scaling test
node load-tests/utils/scalability/redis-cluster-test.js

# Auto-scaling validation
kubectl scale deployment lisk-counter --replicas=5
```

## Incident Response

### During Load Tests

**High Error Rate (>5%):**

1. Check application logs immediately
2. Verify database connectivity
3. Monitor system resources
4. Consider stopping test if critical

**System Overload:**

1. Reduce concurrent users by 50%
2. Check for memory leaks
3. Restart services if necessary
4. Review resource allocation

**Complete Failure:**

1. Stop all load tests immediately
2. Check system status and logs
3. Verify data integrity
4. Document incident for post-mortem

### Post-Test Analysis

**Performance Regression:**

1. Compare with baseline metrics
2. Identify specific degraded endpoints
3. Review recent code changes
4. Run targeted regression tests

**SLA Violations:**

1. Document violations with timestamps
2. Analyze contributing factors
3. Create improvement action plan
4. Schedule follow-up tests

## Maintenance and Optimization

### Regular Maintenance Tasks

**Daily:**

- Review automated test results
- Check monitoring alerts
- Validate system health metrics

**Weekly:**

- Clean up old test reports
- Update test configurations
- Review performance trends
- Update capacity planning models

**Monthly:**

- Full system performance review
- Test configuration optimization
- Infrastructure capacity assessment
- Stakeholder reporting

### Test Environment Maintenance

```bash
# Clean up test data
npm run load-test:clean

# Update test dependencies
npm update && docker-compose pull

# Rebuild test images
docker-compose -f docker-compose.loadtest.yml build --no-cache

# Archive old reports
find load-tests/reports -name "*.json" -mtime +30 -delete
```

### Configuration Tuning

**K6 Optimization:**

```javascript
// Adjust for high-load scenarios
export let options = {
  stages: [
    { duration: '2m', target: 2000 },   // Faster ramp-up
    { duration: '5m', target: 10000 },  // Reduced plateau
    { duration: '1m', target: 0 },      // Quick ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'],   // Stricter SLA
  }
}
```

**Artillery Optimization:**

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 300
      arrivalRate: 50
      maxVusers: 5000 # Reduced for stability
  processor: './custom-functions.js'
```

## Scaling and Capacity Planning

### Horizontal Scaling Validation

```bash
# Test auto-scaling triggers
node load-tests/utils/scalability/horizontal-scaling-test.js

# Validate load distribution
curl -s http://localhost:3000/api/health | jq '.instance_id'

# Monitor scaling events
kubectl get events --sort-by=.metadata.creationTimestamp
```

### Database Scaling

```bash
# Connection pool optimization
node load-tests/k6/database/performance-test.js

# Read replica performance
node load-tests/scenarios/database-scaling.js

# Connection limit testing
for i in {1..100}; do psql -c "SELECT 1;" & done
```

### Redis Cluster Scaling

```bash
# Cluster performance under load
node load-tests/utils/scalability/redis-cluster-test.js

# Memory usage optimization
redis-cli --bigkeys

# Cluster rebalancing
redis-cli --cluster rebalance 127.0.0.1:7000
```

## Best Practices

### Test Design

- Start with smoke tests before full load
- Use realistic data and user patterns
- Test edge cases and failure scenarios
- Implement proper cleanup procedures

### Monitoring

- Set up comprehensive alerting
- Monitor both technical and business metrics
- Use correlation analysis for root cause
- Document all incidents and resolutions

### Operations

- Run tests in isolated environments
- Maintain test data integrity
- Regular backup of configurations
- Keep detailed operational logs

### Reporting

- Generate automated reports
- Include trend analysis
- Provide actionable recommendations
- Share results with stakeholders

---

For additional support or questions, refer to the troubleshooting section or
consult the development team.
