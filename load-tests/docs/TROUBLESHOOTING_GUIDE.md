# Load Testing Troubleshooting Guide

This guide provides solutions for common issues encountered during load testing
operations.

## Table of Contents

1. [Common Issues and Solutions](#common-issues-and-solutions)
2. [Error Messages and Fixes](#error-messages-and-fixes)
3. [Performance Issues](#performance-issues)
4. [Infrastructure Problems](#infrastructure-problems)
5. [Test Configuration Issues](#test-configuration-issues)
6. [Monitoring and Reporting Issues](#monitoring-and-reporting-issues)
7. [Emergency Procedures](#emergency-procedures)

## Common Issues and Solutions

### Test Won't Start

**Symptom**: Load test fails to initialize or times out during startup

**Common Causes & Solutions**:

1. **Application Not Running**

   ```bash
   # Check if app is running
   curl -f http://localhost:3000/api/health || echo "App not responding"

   # Start the application
   npm run dev
   # or
   docker-compose up -d
   ```

2. **Database Connection Issues**

   ```bash
   # Test database connectivity
   psql -h localhost -U username -d database_name -c "SELECT 1;"

   # Check connection pool status
   psql -c "SELECT count(*) FROM pg_stat_activity;"
   ```

3. **Port Conflicts**

   ```bash
   # Check what's using port 3000
   lsof -i :3000

   # Kill conflicting processes
   kill -9 $(lsof -t -i:3000)
   ```

4. **Environment Variables Missing**

   ```bash
   # Check required environment variables
   echo $LOAD_TEST_TARGET_URL
   echo $DATABASE_URL
   echo $REDIS_URL

   # Set missing variables
   export LOAD_TEST_TARGET_URL=http://localhost:3000
   ```

### High Error Rates During Tests

**Symptom**: Error rates > 5% during load testing

**Diagnostic Steps**:

1. **Check Application Logs**

   ```bash
   # View real-time logs
   tail -f logs/application.log

   # Search for errors
   grep -i "error\|exception\|fail" logs/application.log
   ```

2. **Analyze Error Types**

   ```bash
   # View K6 error breakdown
   jq '.aggregate.error_rate' load-tests/reports/json/latest-results.json

   # Check HTTP status codes
   grep "status:" load-tests/reports/logs/current-test.log | sort | uniq -c
   ```

**Common Error Solutions**:

- **Connection Timeouts**: Increase timeout values or reduce concurrent users
- **5xx Errors**: Check server resources and application logs
- **4xx Errors**: Verify test data and authentication tokens
- **Database Errors**: Check connection limits and query performance

### Tests Running Slowly

**Symptom**: Tests take much longer than expected or appear to hang

**Diagnostic Commands**:

```bash
# Check system resources
top
htop
docker stats

# Monitor network activity
netstat -i
iftop

# Check database performance
psql -c "SELECT query, state, query_start FROM pg_stat_activity WHERE state = 'active';"
```

**Solutions**:

1. **Reduce Concurrent Load**

   ```javascript
   // In K6 configuration
   export let options = {
     stages: [
       { duration: '5m', target: 1000 },  // Reduced from 10000
     ]
   }
   ```

2. **Optimize Database Queries**

   ```bash
   # Enable slow query logging
   psql -c "ALTER SYSTEM SET log_min_duration_statement = 1000;"

   # Restart PostgreSQL to apply changes
   sudo systemctl restart postgresql
   ```

3. **Scale Infrastructure**
   ```bash
   # Increase Docker resources
   docker-compose -f docker-compose.loadtest.yml up --scale app=3
   ```

### Memory Issues

**Symptom**: Out of memory errors or system becomes unresponsive

**Immediate Actions**:

```bash
# Stop all tests immediately
pkill -f k6
pkill -f artillery

# Check memory usage
free -h
docker stats --no-stream

# Clear cache if safe to do so
sync && echo 3 > /proc/sys/vm/drop_caches
```

**Prevention**:

```bash
# Set memory limits for Docker containers
docker run -m 512m k6/k6 run script.js

# Monitor memory usage during tests
watch -n 1 'free -m'
```

## Error Messages and Fixes

### K6 Specific Errors

**"connection refused"**

```bash
# Solution: Verify target application is running
curl http://localhost:3000/api/health

# Check if port is correct
netstat -tulpn | grep :3000
```

**"certificate verify failed"**

```bash
# For development/testing only - ignore SSL errors
export K6_INSECURE_SKIP_TLS_VERIFY=true

# Or fix in script
export let options = {
  insecureSkipTLSVerify: true,
}
```

**"context deadline exceeded"**

```bash
# Increase timeout in test configuration
export let options = {
  thresholds: {
    http_req_duration: ['p(95)<30000'], // 30 seconds
  }
}
```

### Artillery Specific Errors

**"ECONNREFUSED"**

```yaml
# Check target URL in Artillery config
config:
  target: 'http://localhost:3000' # Ensure correct URL
  timeout: 30 # Increase timeout
```

**"too many open files"**

```bash
# Increase file descriptor limits
ulimit -n 65536

# Make permanent in /etc/security/limits.conf
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

### Database Errors

**"too many connections"**

```bash
# Check current connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Increase connection limit (requires restart)
psql -c "ALTER SYSTEM SET max_connections = 200;"
sudo systemctl restart postgresql

# Or optimize connection pooling
# Set in environment
export DATABASE_MAX_CONNECTIONS=50
```

**"deadlock detected"**

```bash
# Enable deadlock logging
psql -c "ALTER SYSTEM SET log_lock_waits = on;"
psql -c "ALTER SYSTEM SET deadlock_timeout = '1s';"

# Review and optimize queries causing deadlocks
psql -c "SELECT query FROM pg_stat_activity WHERE wait_event = 'Lock';"
```

### Redis Errors

**"CLUSTERDOWN"**

```bash
# Check cluster status
redis-cli cluster info

# Fix cluster issues
redis-cli --cluster fix 127.0.0.1:7000

# Reset cluster if necessary
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002
```

**"OOM command not allowed"**

```bash
# Check Redis memory usage
redis-cli info memory

# Increase memory limit or enable eviction
redis-cli config set maxmemory-policy allkeys-lru
redis-cli config set maxmemory 1gb
```

## Performance Issues

### Response Times Too High

**Diagnostic Steps**:

```bash
# Check application performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/stats

# Monitor database query performance
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
redis-cli --latency-history -h localhost -p 6379
```

**Solutions**:

1. **Database Optimization**

   ```sql
   -- Add missing indexes
   EXPLAIN ANALYZE SELECT * FROM transactions WHERE timestamp > NOW() - INTERVAL '1 hour';

   -- Optimize slow queries
   CREATE INDEX CONCURRENTLY idx_transactions_timestamp ON transactions(timestamp);
   ```

2. **Caching Improvements**

   ```bash
   # Check cache hit rates
   redis-cli info stats | grep keyspace

   # Warm up cache before testing
   curl http://localhost:3000/api/warm-cache
   ```

3. **Connection Pool Tuning**
   ```javascript
   // In database configuration
   const pool = new Pool({
     max: 20,                    // Maximum pool size
     idleTimeoutMillis: 30000,   // Close idle connections
     connectionTimeoutMillis: 2000, // Connection timeout
   })
   ```

### Throughput Lower Than Expected

**Check Resource Utilization**:

```bash
# CPU usage by process
ps aux --sort=-%cpu | head -10

# I/O usage
iotop -o

# Network throughput
iftop -i eth0
```

**Optimization Steps**:

1. **Horizontal Scaling**

   ```bash
   # Scale application instances
   docker-compose up --scale app=3

   # Validate load balancing
   for i in {1..10}; do curl -s http://localhost:3000/api/health | jq '.instance'; done
   ```

2. **Database Read Replicas**
   ```bash
   # Test read replica performance
   psql -h read-replica -c "SELECT count(*) FROM transactions;"
   ```

## Infrastructure Problems

### Docker Issues

**Container Won't Start**

```bash
# Check Docker logs
docker-compose logs app

# Rebuild containers
docker-compose build --no-cache

# Reset Docker environment
docker-compose down -v
docker system prune -a
docker-compose up -d
```

**Resource Constraints**

```bash
# Check Docker resource usage
docker stats

# Increase Docker memory limits
# Edit docker-compose.yml
services:
  app:
    mem_limit: 2g
    cpus: 2.0
```

### Monitoring Stack Issues

**Prometheus Not Collecting Metrics**

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:3000/metrics

# Check Prometheus config
docker exec prometheus cat /etc/prometheus/prometheus.yml
```

**Grafana Dashboard Issues**

```bash
# Check Grafana logs
docker-compose logs grafana

# Reset Grafana data
docker-compose down
docker volume rm lisk-counter_grafana-data
docker-compose up -d
```

## Test Configuration Issues

### Incorrect Test Results

**Validate Test Configuration**:

```bash
# Check K6 configuration
cat load-tests/k6/config.js

# Validate Artillery config
artillery validate load-tests/artillery/sustained/endurance-test.yml

# Test with minimal load first
export LOAD_TEST_USERS=10
npm run load-test:basic
```

### SLA Thresholds Not Met

**Review and Adjust Thresholds**:

```javascript
// In K6 configuration - make more realistic
export let options = {
  thresholds: {
    http_req_duration: ['p(95)<500'],  // Increased from 200ms
    http_req_failed: ['rate<0.05'],    // Increased from 1%
  }
}
```

**Validate SLA Requirements**:

```bash
# Generate SLA report
node load-tests/utils/benchmarks/performance-validator.js

# Check historical performance
grep "p95" load-tests/reports/logs/performance-*.log
```

## Emergency Procedures

### System Overload

**Immediate Actions**:

```bash
# Stop all load tests
pkill -f k6 && pkill -f artillery

# Check system status
top
df -h
free -m

# Stop non-essential services
docker-compose stop monitoring
```

**Recovery Steps**:

```bash
# Restart core services
docker-compose restart app database redis

# Verify system health
curl http://localhost:3000/api/health

# Resume monitoring
docker-compose start monitoring
```

### Data Corruption Concerns

**Immediate Response**:

```bash
# Stop all tests immediately
npm run load-test:docker-stop

# Check database integrity
psql -c "SELECT pg_database_size('lisk_counter');"

# Verify Redis data
redis-cli dbsize
```

**Recovery Actions**:

```bash
# Restore from backup if needed
pg_restore -d lisk_counter /backup/database.dump

# Clear test data
psql -c "DELETE FROM transactions WHERE created_at > '2023-01-01' AND test_data = true;"

# Restart with minimal load
export LOAD_TEST_USERS=50
npm run load-test:basic
```

### Complete System Failure

**Emergency Contacts**:

- DevOps Team: [contact info]
- Database Administrator: [contact info]
- Application Owner: [contact info]

**Recovery Checklist**:

- [ ] Document failure time and symptoms
- [ ] Stop all load testing immediately
- [ ] Check system logs and resource usage
- [ ] Verify data integrity
- [ ] Restore from backups if necessary
- [ ] Run smoke tests before resuming
- [ ] Update incident documentation

## Getting Help

### Log Collection for Support

**Gather Essential Information**:

```bash
# Create support bundle
mkdir -p /tmp/load-test-logs
cp -r load-tests/reports/logs/ /tmp/load-test-logs/
docker-compose logs > /tmp/load-test-logs/docker-logs.txt
tar -czf load-test-support-$(date +%Y%m%d).tar.gz /tmp/load-test-logs/
```

### Contact Information

- **Load Testing Issues**: Check GitHub Issues
- **Infrastructure Problems**: DevOps Team
- **Application Performance**: Development Team
- **Database Issues**: DBA Team

### Additional Resources

- K6 Documentation: https://k6.io/docs/
- Artillery Documentation: https://artillery.io/docs/
- Prometheus Monitoring: https://prometheus.io/docs/
- Grafana Dashboards: https://grafana.com/docs/

---

Remember: Always test fixes in a safe environment before applying to production
load tests.
