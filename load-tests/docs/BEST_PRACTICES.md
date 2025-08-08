# Load Testing Best Practices

This document outlines best practices for designing, executing, and maintaining
effective load tests for the LiskCounter application.

## Table of Contents

1. [Test Design Principles](#test-design-principles)
2. [Test Data Management](#test-data-management)
3. [Performance Targets and SLAs](#performance-targets-and-slas)
4. [Test Environment Management](#test-environment-management)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [Results Analysis and Interpretation](#results-analysis-and-interpretation)
7. [Continuous Integration](#continuous-integration)
8. [Scaling and Capacity Planning](#scaling-and-capacity-planning)

## Test Design Principles

### Start Small and Scale Gradually

**Progressive Load Testing**:

```javascript
// K6 configuration for gradual ramp-up
export let options = {
  stages: [
    { duration: '2m', target: 100 },    // Warm-up
    { duration: '3m', target: 500 },    // Ramp up
    { duration: '5m', target: 1000 },   // Normal load
    { duration: '3m', target: 2000 },   // Stress point
    { duration: '2m', target: 5000 },   // Breaking point
    { duration: '5m', target: 0 },      // Ramp down
  ]
}
```

**Why This Works**:

- Identifies performance degradation points
- Allows system to warm up caches
- Provides clear breakpoint identification
- Enables safe testing without system crashes

### Test Realistic User Behavior

**User Journey Modeling**:

```javascript
// Realistic user flow in K6
export default function() {
  // User authentication (20% of requests)
  if (Math.random() < 0.2) {
    http.post('/api/auth/login', {
      username: 'testuser',
      password: 'testpass'
    })
  }

  // Browse dashboard (60% of requests)
  if (Math.random() < 0.6) {
    http.get('/api/stats')
    sleep(randomIntBetween(1, 5))
    http.get('/api/transactions?limit=20')
  }

  // Export data (20% of requests)
  if (Math.random() < 0.2) {
    http.get('/api/export/transactions')
  }

  sleep(randomIntBetween(5, 30)) // Think time
}
```

### Use Proper Test Categories

**Test Type Classification**:

1. **Smoke Tests** (Basic functionality)
   - 10-50 concurrent users
   - 2-5 minutes duration
   - Validates basic system health

2. **Load Tests** (Normal expected load)
   - Expected peak concurrent users
   - 15-30 minutes duration
   - Validates performance under normal conditions

3. **Stress Tests** (Beyond normal capacity)
   - 2-5x expected load
   - 15-45 minutes duration
   - Identifies breaking points

4. **Spike Tests** (Sudden load increases)
   - Immediate jump to high load
   - 5-15 minutes duration
   - Tests auto-scaling and resilience

5. **Endurance Tests** (Extended periods)
   - Normal load for extended time
   - 4-24+ hours duration
   - Identifies memory leaks and degradation

## Test Data Management

### Use Realistic Data Volumes

**Database Preparation**:

```bash
# Populate with production-like data volumes
psql -c "
INSERT INTO transactions
SELECT
  generate_random_uuid(),
  NOW() - (random() * INTERVAL '30 days'),
  (random() * 1000)::numeric(18,8),
  'test_data'
FROM generate_series(1, 1000000);
"

# Create appropriate indexes
psql -c "CREATE INDEX CONCURRENTLY idx_transactions_timestamp ON transactions(timestamp);"
```

### Test Data Isolation

**Separate Test Data**:

```javascript
// K6 test data management
import { check } from 'k6'

export function setup() {
  // Create test-specific data
  const testId = `test_${Date.now()}`

  const response = http.post('/api/test-data', {
    testId: testId,
    userCount: 1000,
    transactionCount: 10000
  })

  return { testId: testId }
}

export default function(data) {
  // Use test-specific data
  const response = http.get(`/api/transactions?testId=${data.testId}`)
  check(response, {
    'status is 200': (r) => r.status === 200,
  })
}

export function teardown(data) {
  // Clean up test data
  http.delete(`/api/test-data/${data.testId}`)
}
```

### Data Consistency

**Maintain Data Integrity**:

```sql
-- Create constraints for test data
ALTER TABLE transactions ADD CONSTRAINT test_data_check
CHECK (test_data = true OR test_data IS NULL);

-- Separate test and production data
CREATE VIEW production_transactions AS
SELECT * FROM transactions WHERE test_data IS NULL OR test_data = false;

CREATE VIEW test_transactions AS
SELECT * FROM transactions WHERE test_data = true;
```

## Performance Targets and SLAs

### Define Clear SLA Requirements

**Response Time Targets**:

```javascript
// K6 SLA configuration
export let options = {
  thresholds: {
    // API Response Times
    'http_req_duration{endpoint:stats}': ['p(95)<200'],
    'http_req_duration{endpoint:transactions}': ['p(95)<300'],
    'http_req_duration{endpoint:export}': ['p(95)<5000'],

    // Database Performance
    'database_query_duration': ['p(95)<50'],

    // Cache Performance
    'cache_hit_rate': ['value>0.90'],

    // Error Rates
    'http_req_failed': ['rate<0.01'],
    'database_errors': ['rate<0.001'],

    // Throughput
    'http_reqs': ['rate>100'],
  }
}
```

### Business Impact Metrics

**Key Performance Indicators**:

```javascript
// Custom metrics for business impact
import { Trend, Counter, Rate } from 'k6/metrics'

const transactionProcessingTime = new Trend('transaction_processing_time')
const successfulTransactions = new Counter('successful_transactions')
const userSessionLength = new Trend('user_session_length')
const dataExportSuccess = new Rate('data_export_success')

export default function() {
  const start = Date.now()

  // Measure transaction processing
  const response = http.post('/api/transactions', transactionData)
  transactionProcessingTime.add(Date.now() - start)

  if (response.status === 200) {
    successfulTransactions.add(1)
  }
}
```

### Capacity Planning Metrics

**System Capacity Indicators**:

- **Users per Hour**: Target 100K+ unique users
- **Transactions per Second**: Target 1000+ TPS
- **Data Processing**: 1TB+ daily data volume
- **Geographic Distribution**: <500ms response time globally
- **Concurrent WebSockets**: 10K+ simultaneous connections

## Test Environment Management

### Environment Parity

**Production-Like Setup**:

```yaml
# docker-compose.production-test.yml
version: '3.8'
services:
  app:
    image: lisk-counter:latest
    replicas: 3
    resources:
      limits:
        cpus: '2.0'
        memory: 4G
      reservations:
        cpus: '1.0'
        memory: 2G

  database:
    image: timescale/timescaledb:latest
    environment:
      POSTGRES_DB: lisk_counter_prod_test
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - prod_test_db:/var/lib/postgresql/data
    resources:
      limits:
        cpus: '4.0'
        memory: 8G
```

### Resource Monitoring

**Infrastructure Monitoring**:

```bash
# Pre-test resource check
#!/bin/bash
echo "=== System Resources Before Test ==="
free -h
df -h
docker stats --no-stream
netstat -i

# During test monitoring
watch -n 30 '
echo "=== $(date) ==="
echo "Memory Usage:"
free -h | grep Mem
echo "Disk Usage:"
df -h | grep -E "(/$|/var)"
echo "Top Processes:"
ps aux --sort=-%cpu | head -5
echo "Docker Stats:"
docker stats --no-stream | head -10
'
```

### Network Considerations

**Network Performance Testing**:

```javascript
// Network latency simulation
import { check, sleep } from 'k6'
import http from 'k6/http'

export let options = {
  // Simulate different network conditions
  scenarios: {
    fast_network: {
      executor: 'constant-vus',
      vus: 100,
      duration: '10m',
      env: { NETWORK_DELAY: '10ms' }
    },
    slow_network: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
      env: { NETWORK_DELAY: '200ms' }
    },
    mobile_network: {
      executor: 'constant-vus',
      vus: 25,
      duration: '10m',
      env: { NETWORK_DELAY: '500ms' }
    }
  }
}
```

## Monitoring and Observability

### Multi-Layer Monitoring

**Application Metrics**:

```javascript
// Custom application metrics
const appMetrics = {
  endpoint_response_time: new Trend('app_endpoint_response_time', true),
  cache_operations: new Counter('app_cache_operations'),
  database_connections: new Gauge('app_database_connections'),
  memory_usage: new Gauge('app_memory_usage'),
}

export default function() {
  const tags = {
    endpoint: 'transactions',
    method: 'GET'
  }

  const start = Date.now()
  const response = http.get('/api/transactions', { tags })
  appMetrics.endpoint_response_time.add(Date.now() - start, tags)
}
```

**Infrastructure Metrics**:

```yaml
# prometheus.yml - comprehensive monitoring
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'application'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: 5s

  - job_name: 'database'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
```

### Real-Time Alerting

**Alert Configuration**:

```yaml
# alerting-rules.yml
groups:
  - name: load_testing_alerts
    rules:
      - alert: HighResponseTime
        expr: http_request_duration_seconds{quantile="0.95"} > 0.2
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: 'High response time detected'
          description: 'P95 response time is {{ $value }}s'

      - alert: ErrorRateHigh
        expr: rate(http_requests_total{status!~"2.."}[5m]) > 0.01
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'High error rate detected'
          description: 'Error rate is {{ $value | humanizePercentage }}'
```

## Results Analysis and Interpretation

### Statistical Analysis

**Performance Trend Analysis**:

```python
# Python script for trend analysis
import pandas as pd
import matplotlib.pyplot as plt
from scipy import stats

def analyze_performance_trends(results_dir):
    # Load historical test results
    results = []
    for file in glob.glob(f'{results_dir}/*.json'):
        with open(file) as f:
            data = json.load(f)
            results.append({
                'timestamp': data['timestamp'],
                'p95_response_time': data['aggregate']['p95'],
                'error_rate': data['aggregate']['error_rate'],
                'throughput': data['aggregate']['rps']
            })

    df = pd.DataFrame(results)
    df['timestamp'] = pd.to_datetime(df['timestamp'])

    # Trend analysis
    slope, intercept, r_value, p_value, std_err = stats.linregress(
        range(len(df)), df['p95_response_time']
    )

    print(f"Response Time Trend: {'Improving' if slope < 0 else 'Degrading'}")
    print(f"R-squared: {r_value**2:.3f}")
    print(f"Statistical Significance: {'Yes' if p_value < 0.05 else 'No'}")
```

### Performance Regression Detection

**Automated Regression Checks**:

```bash
#!/bin/bash
# regression-check.sh

BASELINE_FILE="load-tests/reports/baseline/performance-baseline.json"
CURRENT_FILE="load-tests/reports/json/latest-results.json"

# Extract key metrics
baseline_p95=$(jq '.aggregate.p95' $BASELINE_FILE)
current_p95=$(jq '.aggregate.p95' $CURRENT_FILE)

baseline_error_rate=$(jq '.aggregate.error_rate' $BASELINE_FILE)
current_error_rate=$(jq '.aggregate.error_rate' $CURRENT_FILE)

# Check for regression (>20% degradation)
p95_regression=$(echo "$current_p95 > $baseline_p95 * 1.2" | bc -l)
error_regression=$(echo "$current_error_rate > $baseline_error_rate * 2.0" | bc -l)

if [ "$p95_regression" -eq 1 ] || [ "$error_regression" -eq 1 ]; then
    echo "❌ Performance regression detected!"
    echo "P95 Response Time: ${baseline_p95}ms → ${current_p95}ms"
    echo "Error Rate: ${baseline_error_rate}% → ${current_error_rate}%"
    exit 1
else
    echo "✅ No performance regression detected"
    exit 0
fi
```

### Report Generation

**Automated Report Creation**:

```javascript
// report-generator.js
const generatePerformanceReport = async (testResults) => {
  const report = {
    summary: {
      testDuration: testResults.duration,
      totalRequests: testResults.totalRequests,
      averageRPS: testResults.rps,
      errorRate: testResults.errorRate
    },

    performance: {
      responseTime: {
        p50: testResults.p50,
        p95: testResults.p95,
        p99: testResults.p99,
        max: testResults.max
      }
    },

    slaCompliance: {
      responseTimeSLA: testResults.p95 < 200 ? 'PASS' : 'FAIL',
      errorRateSLA: testResults.errorRate < 0.01 ? 'PASS' : 'FAIL',
      throughputSLA: testResults.rps > 100 ? 'PASS' : 'FAIL'
    },

    recommendations: generateRecommendations(testResults)
  }

  return report
}
```

## Continuous Integration

### Automated Test Pipelines

**GitHub Actions Integration**:

```yaml
# .github/workflows/performance-testing.yml
name: Performance Testing

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Start Test Environment
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for Services
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:3000/health; do sleep 2; done'

      - name: Run Smoke Tests
        run: npm run load-test:basic

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: smoke-test-results
          path: load-tests/reports/

  load-tests:
    needs: smoke-tests
    runs-on: ubuntu-latest
    if:
      github.event_name == 'schedule' || github.event_name ==
      'workflow_dispatch'

    strategy:
      matrix:
        test-type: [api_stress, progressive_load, websocket_realtime]

    steps:
      - uses: actions/checkout@v3

      - name: Run Load Test
        run: |
          npm run load-test:docker
          npm run load-test:${{ matrix.test-type }}

      - name: Performance Regression Check
        run: ./scripts/regression-check.sh

      - name: Generate Report
        run: node scripts/generate-report.js

      - name: Publish Results
        run: |
          # Send to monitoring system
          curl -X POST "http://monitoring.internal/api/performance" \
            -H "Content-Type: application/json" \
            -d @load-tests/reports/json/latest-results.json
```

### Quality Gates

**Performance Quality Checks**:

```javascript
// quality-gates.js
const qualityGates = {
  mandatory: [
    { metric: 'p95_response_time', threshold: 200, operator: '<' },
    { metric: 'error_rate', threshold: 0.01, operator: '<' },
    { metric: 'availability', threshold: 0.999, operator: '>' }
  ],

  warning: [
    { metric: 'p95_response_time', threshold: 150, operator: '<' },
    { metric: 'cache_hit_rate', threshold: 0.95, operator: '>' },
    { metric: 'database_p95', threshold: 30, operator: '<' }
  ]
}

const evaluateQualityGates = (results) => {
  const failures = []
  const warnings = []

  qualityGates.mandatory.forEach(gate => {
    if (!evaluateCondition(results[gate.metric], gate.operator, gate.threshold)) {
      failures.push(`${gate.metric} ${gate.operator} ${gate.threshold} (actual: ${results[gate.metric]})`)
    }
  })

  qualityGates.warning.forEach(gate => {
    if (!evaluateCondition(results[gate.metric], gate.operator, gate.threshold)) {
      warnings.push(`${gate.metric} ${gate.operator} ${gate.threshold} (actual: ${results[gate.metric]})`)
    }
  })

  return { failures, warnings }
}
```

## Scaling and Capacity Planning

### Predictive Capacity Models

**Capacity Forecasting**:

```python
# capacity-planning.py
import numpy as np
from sklearn.linear_model import LinearRegression
import matplotlib.pyplot as plt

def predict_capacity_needs(historical_data):
    # Load historical performance data
    users = np.array([data['concurrent_users'] for data in historical_data])
    response_times = np.array([data['p95_response_time'] for data in historical_data])

    # Create polynomial features for non-linear scaling
    users_poly = np.column_stack([users, users**2, users**3])

    # Fit model
    model = LinearRegression()
    model.fit(users_poly, response_times)

    # Predict breaking point (where p95 > 200ms)
    test_users = np.arange(1000, 20000, 100)
    test_users_poly = np.column_stack([test_users, test_users**2, test_users**3])
    predicted_times = model.predict(test_users_poly)

    # Find capacity limit
    breaking_point = test_users[predicted_times > 200][0]

    return {
        'current_capacity': breaking_point * 0.8,  # 80% safety margin
        'scaling_needed_at': breaking_point * 0.6, # Scale at 60%
        'model_accuracy': model.score(users_poly, response_times)
    }
```

### Auto-Scaling Validation

**Scaling Trigger Tests**:

```javascript
// scaling-validation.js
export let options = {
  scenarios: {
    scaling_simulation: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages: [
        { duration: '2m', target: 50 },   // Normal load
        { duration: '1m', target: 200 },  // Trigger scaling
        { duration: '5m', target: 200 },  // Maintain load
        { duration: '1m', target: 500 },  // Test new capacity
        { duration: '2m', target: 0 },    // Ramp down
      ]
    }
  }
}

export default function() {
  const start = Date.now()
  const response = http.get('http://localhost:3000/api/stats')

  // Track scaling events
  if (response.headers['x-instance-id']) {
    instanceMetrics.add(1, { instance: response.headers['x-instance-id'] })
  }

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time OK': (r) => r.timings.duration < 200,
  })
}
```

---

## Summary

Following these best practices ensures:

- **Reliable Results**: Consistent, repeatable test outcomes
- **Actionable Insights**: Clear understanding of system behavior
- **Continuous Improvement**: Ongoing performance optimization
- **Risk Mitigation**: Early identification of performance issues
- **Scalable Testing**: Tests that grow with your system

Remember: Load testing is not just about finding limits—it's about understanding
your system's behavior under various conditions and ensuring optimal user
experience.
