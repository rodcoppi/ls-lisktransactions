# Load Testing API Reference

This document provides comprehensive reference for all load testing scripts,
configurations, and utilities in the LiskCounter load testing system.

## Table of Contents

1. [NPM Scripts Reference](#npm-scripts-reference)
2. [K6 Scripts API](#k6-scripts-api)
3. [Artillery Configurations](#artillery-configurations)
4. [Utility Functions](#utility-functions)
5. [Configuration Options](#configuration-options)
6. [Environment Variables](#environment-variables)
7. [Docker Commands](#docker-commands)

## NPM Scripts Reference

### Basic Load Testing Commands

#### `npm run load-test:basic`

**Purpose**: Runs smoke tests to verify basic system functionality **Duration**:
~5 minutes **Load**: 50 concurrent users **Use Case**: Quick health check before
major tests

```bash
npm run load-test:basic
# Equivalent to:
node scripts/performance-test.js --test-type smoke
```

#### `npm run load-test:api`

**Purpose**: Comprehensive API stress testing **Duration**: ~15 minutes  
**Load**: Up to 10,000 concurrent users **Use Case**: Validate API performance
under high load

```bash
npm run load-test:api
# Equivalent to:
node scripts/performance-test.js --test-type api_stress
```

#### `npm run load-test:progressive`

**Purpose**: Gradual load increase to identify breaking points **Duration**: ~20
minutes **Load**: 1 to 15,000 users (gradual ramp) **Use Case**: Capacity
planning and bottleneck identification

```bash
npm run load-test:progressive
# Equivalent to:
node scripts/performance-test.js --test-type progressive_load
```

### Specialized Testing Commands

#### `npm run load-test:websocket`

**Purpose**: WebSocket real-time connection testing **Duration**: ~10 minutes
**Load**: 10,000 simultaneous WebSocket connections **Use Case**: Real-time
feature performance validation

```bash
npm run load-test:websocket
# Tests real-time messaging, connection stability, message throughput
```

#### `npm run load-test:database`

**Purpose**: Database performance under concurrent load **Duration**: ~12
minutes **Load**: High-concurrency database operations **Use Case**: Database
bottleneck identification

```bash
npm run load-test:database
# Tests query performance, connection pooling, transaction handling
```

#### `npm run load-test:endurance`

**Purpose**: Long-running stability testing **Duration**: 4+ hours
(configurable) **Load**: Sustained moderate load with periodic spikes **Use
Case**: Memory leak detection, long-term stability

```bash
npm run load-test:endurance
# Warning: Long-running test - plan accordingly
```

### Comprehensive Testing

#### `npm run load-test:comprehensive`

**Purpose**: Executes full test suite in sequence **Duration**: ~2 hours
**Load**: All test types in optimal order **Use Case**: Complete system
validation

```bash
npm run load-test:comprehensive
# Runs: smoke → progressive → api → websocket → database → endurance
```

### Infrastructure Commands

#### `npm run load-test:monitor`

**Purpose**: Starts monitoring infrastructure **Components**: Prometheus,
Grafana, AlertManager **Ports**: 9090 (Prometheus), 3001 (Grafana), 9093
(AlertManager)

```bash
npm run load-test:monitor
# Access Grafana at http://localhost:3001 (admin/admin)
# Access Prometheus at http://localhost:9090
```

#### `npm run load-test:docker`

**Purpose**: Runs complete load testing in Docker environment **Components**:
K6, Artillery, monitoring stack **Use Case**: Isolated testing environment

```bash
npm run load-test:docker
# Starts all containers and monitoring
```

#### `npm run load-test:clean`

**Purpose**: Cleanup test data and Docker resources **Actions**: Removes
reports, prunes Docker system **Use Case**: Maintenance and cleanup

```bash
npm run load-test:clean
# Warning: Deletes all test reports
```

## K6 Scripts API

### Core Configuration (`load-tests/k6/config.js`)

```javascript
// Import configuration
import { loadTestConfig } from './load-tests/k6/config.js'

// Available configurations
const config = {
  // Performance thresholds
  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01'],
    database_query_duration: ['p(95)<50']
  },

  // Test scenarios
  scenarios: {
    smoke_test: { /* ... */ },
    load_test: { /* ... */ },
    stress_test: { /* ... */ }
  },

  // Custom metrics
  customMetrics: {
    transactionProcessingTime: new Trend('transaction_processing_time'),
    cacheHitRate: new Rate('cache_hit_rate'),
    databaseConnections: new Gauge('database_connections')
  }
}
```

### API Stress Test (`load-tests/k6/api/stress-test.js`)

**Entry Point**: `k6 run load-tests/k6/api/stress-test.js`

**Options Configuration**:

```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 1000 },
    { duration: '3m', target: 5000 },
    { duration: '5m', target: 10000 },
    { duration: '2m', target: 0 }
  ],

  thresholds: {
    http_req_duration: ['p(95)<200'],
    http_req_failed: ['rate<0.01']
  }
}
```

**Test Functions**:

- `default()`: Main test execution function
- `setup()`: Initialize test data and authentication
- `teardown()`: Cleanup test data

**Endpoints Tested**:

- `GET /api/stats` - System statistics
- `GET /api/transactions` - Transaction listing
- `POST /api/transactions` - Transaction creation
- `GET /api/blocks` - Block data retrieval
- `GET /api/export/transactions` - Data export

### WebSocket Test (`load-tests/k6/websocket/realtime-test.js`)

**Entry Point**: `k6 run load-tests/k6/websocket/realtime-test.js`

**WebSocket Testing Features**:

```javascript
// Connection patterns
const connectionPatterns = {
  burst_connect: 1000,      // Simultaneous connections
  gradual_connect: 100,     // Connections per second
  sustained_connect: 10000  // Total connections
}

// Message patterns
const messagePatterns = {
  ping_pong: { interval: '1s', size: 64 },
  data_stream: { interval: '100ms', size: 1024 },
  heartbeat: { interval: '30s', size: 32 }
}
```

**Metrics Tracked**:

- Connection establishment time
- Message round-trip time
- Connection stability
- Concurrent connection limits

### Database Performance Test (`load-tests/k6/database/performance-test.js`)

**Entry Point**: `k6 run load-tests/k6/database/performance-test.js`

**Query Types Tested**:

```javascript
const queryTypes = {
  simple_select: 'SELECT * FROM transactions LIMIT 100',
  complex_join: `
    SELECT t.*, b.height
    FROM transactions t
    JOIN blocks b ON t.block_id = b.id
    WHERE t.timestamp > NOW() - INTERVAL '1 hour'
  `,
  aggregation: `
    SELECT DATE_TRUNC('hour', timestamp) as hour,
           COUNT(*), AVG(amount)
    FROM transactions
    WHERE timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY hour
  `,
  write_heavy: 'INSERT INTO transactions (...) VALUES (...)'
}
```

## Artillery Configurations

### Base Configuration (`load-tests/artillery/config/base-config.yml`)

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 300
      arrivalRate: 10
      name: 'Warm up'
    - duration: 600
      arrivalRate: 50
      name: 'Sustained load'

  payload:
    path: './test-data.csv'
    fields:
      - 'userId'
      - 'transactionId'

  plugins:
    metrics-by-endpoint:
      useOnlyRequestNames: true

  processor: './custom-functions.js'
```

### Endurance Test (`load-tests/artillery/sustained/endurance-test.yml`)

**Duration**: 4+ hours **Pattern**: Gradual load increase with periodic spikes

```yaml
config:
  phases:
    # Warm-up phase
    - duration: 300
      arrivalRate: 5
      name: 'Warm up'

    # Gradual ramp-up
    - duration: 3600
      arrivalRate: 10
      rampTo: 50
      name: 'Gradual increase'

    # Sustained load
    - duration: 10800 # 3 hours
      arrivalRate: 50
      name: 'Sustained load'

    # Periodic spikes
    - duration: 300
      arrivalRate: 200
      name: 'Spike test'
```

### Spike Test (`load-tests/artillery/spike/traffic-surge.yml`)

**Purpose**: Sudden traffic increases (20x normal load) **Duration**: 15 minutes
**Pattern**: Immediate spike, sustain, ramp down

```yaml
config:
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Baseline'

    - duration: 1
      arrivalRate: 200 # 20x increase
      name: 'Spike start'

    - duration: 600
      arrivalRate: 200
      name: 'Spike sustained'

    - duration: 300
      arrivalRate: 10
      name: 'Recovery'
```

## Utility Functions

### Performance Validator (`load-tests/utils/benchmarks/performance-validator.js`)

**Usage**:

```javascript
const validator = require('./load-tests/utils/benchmarks/performance-validator.js')

// Validate SLA compliance
const results = validator.validateSLA(testResults)
console.log(`SLA Compliance: ${results.compliant ? 'PASS' : 'FAIL'}`)

// Check specific metrics
const responseTimeCheck = validator.checkResponseTime(testResults.p95, 200)
const errorRateCheck = validator.checkErrorRate(testResults.errorRate, 0.01)
```

**API Methods**:

- `validateSLA(results)`: Complete SLA validation
- `checkResponseTime(p95, threshold)`: Response time validation
- `checkErrorRate(rate, threshold)`: Error rate validation
- `checkThroughput(rps, threshold)`: Throughput validation
- `checkCacheHitRate(rate, threshold)`: Cache performance validation

### Real-Time Monitor (`load-tests/utils/monitors/real-time-monitor.js`)

**Usage**:

```javascript
const monitor = require('./load-tests/utils/monitors/real-time-monitor.js')

// Start monitoring
monitor.start({
  interval: 5000,           // 5 second intervals
  metrics: ['cpu', 'memory', 'network', 'database'],
  alerts: true,
  outputFile: './monitoring.log'
})

// Stop monitoring
monitor.stop()
```

**Monitored Metrics**:

- System resources (CPU, memory, disk)
- Network performance (bandwidth, latency)
- Database performance (connections, query time)
- Application metrics (response time, error rate)
- Redis performance (memory, hit rate)

### Comprehensive Reporter (`load-tests/utils/reporters/comprehensive-reporter.js`)

**Usage**:

```javascript
const reporter = require('./load-tests/utils/reporters/comprehensive-reporter.js')

// Generate HTML report
await reporter.generateHTMLReport(testResults, './reports/html/report.html')

// Generate JSON report
await reporter.generateJSONReport(testResults, './reports/json/report.json')

// Generate executive summary
const summary = reporter.generateExecutiveSummary(testResults)
```

**Report Types**:

- **HTML Reports**: Visual charts and graphs
- **JSON Reports**: Machine-readable data
- **CSV Reports**: Spreadsheet-compatible data
- **Executive Summaries**: High-level business metrics

## Configuration Options

### Environment-Specific Configurations

**Development Environment**:

```javascript
// load-tests/config/development.js
module.exports = {
  targetUrl: 'http://localhost:3000',
  databaseUrl: 'postgresql://dev:dev@localhost:5432/lisk_counter_dev',
  redisUrl: 'redis://localhost:6379',

  limits: {
    maxUsers: 1000,
    maxDuration: '10m',
    timeoutMs: 10000
  },

  thresholds: {
    responseTime: 500,    // More lenient for dev
    errorRate: 0.05       // 5% error rate acceptable
  }
}
```

**Production Environment**:

```javascript
// load-tests/config/production.js
module.exports = {
  targetUrl: process.env.PROD_URL,
  databaseUrl: process.env.PROD_DB_URL,
  redisUrl: process.env.PROD_REDIS_URL,

  limits: {
    maxUsers: 15000,
    maxDuration: '2h',
    timeoutMs: 30000
  },

  thresholds: {
    responseTime: 200,    // Strict SLA
    errorRate: 0.01       // 1% error rate max
  }
}
```

### Test Scenario Configurations

**Scenario Options**:

```javascript
const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 50,
    duration: '5m'
  },

  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 100 },
      { duration: '10m', target: 100 },
      { duration: '5m', target: 0 }
    ]
  },

  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 1000 },
      { duration: '3m', target: 5000 },
      { duration: '5m', target: 10000 },
      { duration: '2m', target: 0 }
    ]
  }
}
```

## Environment Variables

### Required Variables

```bash
# Application target
export LOAD_TEST_TARGET_URL="http://localhost:3000"

# Database connection
export LOAD_TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# Redis connection
export LOAD_TEST_REDIS_URL="redis://localhost:6379"

# Authentication
export LOAD_TEST_API_KEY="your-api-key"
export LOAD_TEST_JWT_SECRET="your-jwt-secret"
```

### Optional Variables

```bash
# Test configuration
export LOAD_TEST_DURATION="15m"
export LOAD_TEST_MAX_USERS="10000"
export LOAD_TEST_RAMP_DURATION="5m"

# Output configuration
export LOAD_TEST_REPORTS_DIR="./load-tests/reports"
export LOAD_TEST_LOG_LEVEL="info"

# Monitoring
export PROMETHEUS_URL="http://localhost:9090"
export GRAFANA_URL="http://localhost:3001"

# Performance thresholds
export LOAD_TEST_P95_THRESHOLD="200"
export LOAD_TEST_ERROR_THRESHOLD="0.01"
export LOAD_TEST_CACHE_HIT_THRESHOLD="0.90"
```

### Docker Environment Variables

```bash
# Docker-specific settings
export LOAD_TEST_NETWORK="load-test-network"
export LOAD_TEST_SCALE_K6="3"
export LOAD_TEST_SCALE_ARTILLERY="2"

# Resource limits
export LOAD_TEST_MEMORY_LIMIT="2g"
export LOAD_TEST_CPU_LIMIT="2.0"
```

## Docker Commands

### Container Management

**Start monitoring stack only**:

```bash
docker-compose -f docker-compose.loadtest.yml up -d prometheus grafana
```

**Run specific load test**:

```bash
docker-compose -f docker-compose.loadtest.yml run --rm k6 run /scripts/api/stress-test.js
```

**Scale testing containers**:

```bash
docker-compose -f docker-compose.loadtest.yml up --scale k6=3 --scale artillery=2
```

**View real-time logs**:

```bash
docker-compose -f docker-compose.loadtest.yml logs -f k6 artillery
```

### Resource Monitoring

**Monitor container resources**:

```bash
watch -n 2 'docker stats --no-stream'
```

**Check container health**:

```bash
docker-compose -f docker-compose.loadtest.yml ps
```

**Network inspection**:

```bash
docker network inspect load-test-network
```

### Data Management

**Export test results**:

```bash
docker cp $(docker-compose -f docker-compose.loadtest.yml ps -q k6):/reports ./local-reports
```

**Cleanup test data**:

```bash
docker-compose -f docker-compose.loadtest.yml down -v
docker system prune -f
```

---

## Quick Reference Commands

```bash
# Basic testing workflow
npm run load-test:monitor     # Start monitoring
npm run load-test:basic       # Quick health check
npm run load-test:progressive # Find breaking points
npm run load-test:api         # Stress test APIs

# View results
open load-tests/reports/html/latest-report.html
open http://localhost:3001    # Grafana dashboard

# Cleanup
npm run load-test:clean
```

This API reference provides complete documentation for all load testing
capabilities in the LiskCounter system. For additional examples and advanced
usage, refer to the individual script files and configuration templates.
