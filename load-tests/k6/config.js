/**
 * K6 Load Testing Configuration
 * Enterprise-grade performance testing for 1M+ req/day capacity
 */

import { check } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';

// Performance thresholds for enterprise load testing
export const thresholds = {
  // API Response Time Requirements
  http_req_duration: [
    'p(95)<200',    // 95th percentile < 200ms
    'p(99)<500',    // 99th percentile < 500ms
    'avg<100',      // Average < 100ms
    'med<80',       // Median < 80ms
  ],
  
  // Success Rate Requirements
  http_req_failed: [
    'rate<0.001',   // Error rate < 0.1%
  ],
  
  // Throughput Requirements
  http_reqs: [
    'rate>1000',    // > 1000 requests per second
  ],
  
  // Connection Requirements
  http_req_connecting: [
    'p(95)<50',     // Connection time < 50ms
  ],
  
  // TLS Handshake (for HTTPS)
  http_req_tls_handshaking: [
    'p(95)<100',    // TLS handshake < 100ms
  ],
  
  // Data Transfer
  http_req_sending: [
    'p(95)<10',     // Request sending < 10ms
  ],
  
  http_req_receiving: [
    'p(95)<20',     // Response receiving < 20ms
  ],
  
  // Custom Metrics Thresholds
  cache_hit_rate: [
    'value>0.9',    // Cache hit rate > 90%
  ],
  
  database_query_time: [
    'p(95)<50',     // Database queries < 50ms
  ],
  
  websocket_connection_time: [
    'p(95)<100',    // WebSocket connection < 100ms
  ],
};

// Custom metrics for detailed monitoring
export const customMetrics = {
  // Cache performance metrics
  cacheHitRate: new Rate('cache_hit_rate'),
  cacheMissRate: new Rate('cache_miss_rate'),
  cacheResponseTime: new Trend('cache_response_time'),
  
  // Database metrics
  dbQueryTime: new Trend('database_query_time'),
  dbConnectionCount: new Gauge('database_connections'),
  dbQueryErrors: new Counter('database_query_errors'),
  
  // WebSocket metrics
  wsConnectionTime: new Trend('websocket_connection_time'),
  wsMessageLatency: new Trend('websocket_message_latency'),
  wsConnections: new Gauge('websocket_connections'),
  wsErrors: new Counter('websocket_errors'),
  
  // Business logic metrics
  authTokenRefreshes: new Counter('auth_token_refreshes'),
  apiRetries: new Counter('api_retries'),
  circuitBreakerTrips: new Counter('circuit_breaker_trips'),
  
  // Resource utilization
  memoryUsage: new Gauge('memory_usage_bytes'),
  cpuUsage: new Gauge('cpu_usage_percent'),
};

// Test scenarios configuration
export const scenarios = {
  // Smoke test - minimal load validation
  smoke: {
    executor: 'constant-vus',
    vus: 1,
    duration: '1m',
    tags: { testType: 'smoke' },
  },
  
  // Load test - normal expected traffic
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },   // Ramp up
      { duration: '5m', target: 100 },   // Stay at load
      { duration: '2m', target: 200 },   // Ramp to higher load
      { duration: '5m', target: 200 },   // Stay at higher load
      { duration: '2m', target: 0 },     // Ramp down
    ],
    tags: { testType: 'load' },
  },
  
  // Stress test - beyond normal capacity
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '2m', target: 100 },   // Normal load
      { duration: '5m', target: 100 },
      { duration: '2m', target: 200 },   // Above normal load
      { duration: '5m', target: 200 },
      { duration: '2m', target: 300 },   // Stress level
      { duration: '5m', target: 300 },
      { duration: '2m', target: 400 },   // Beyond stress
      { duration: '5m', target: 400 },
      { duration: '10m', target: 0 },    // Recovery
    ],
    tags: { testType: 'stress' },
  },
  
  // Spike test - sudden traffic increase
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 100 },  // Normal load
      { duration: '1m', target: 100 },
      { duration: '10s', target: 1400 }, // Spike!
      { duration: '3m', target: 1400 },  // Stay at spike
      { duration: '10s', target: 100 },  // Back to normal
      { duration: '3m', target: 100 },
      { duration: '10s', target: 0 },    // Ramp down
    ],
    tags: { testType: 'spike' },
  },
  
  // Volume test - large numbers of VUs
  volume: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5m', target: 500 },   // Ramp up to volume
      { duration: '10m', target: 500 },  // Stay at volume
      { duration: '5m', target: 1000 },  // Higher volume
      { duration: '10m', target: 1000 }, // Stay at higher volume
      { duration: '5m', target: 2000 },  // Maximum volume
      { duration: '10m', target: 2000 }, // Stay at maximum
      { duration: '5m', target: 0 },     // Ramp down
    ],
    tags: { testType: 'volume' },
  },
  
  // Soak test - extended duration
  soak: {
    executor: 'constant-vus',
    vus: 400,
    duration: '1h',
    tags: { testType: 'soak' },
  },
};

// Environment configuration
export const environment = {
  // Base URLs for different environments
  baseUrls: {
    local: 'http://localhost:3000',
    staging: 'https://staging.liskcounter.com',
    production: 'https://liskcounter.com',
  },
  
  // Database connection strings
  databases: {
    postgres: __ENV.LOAD_TEST_DB_URL || 'postgresql://dashboard_user:dashboard_password@localhost:5432/dashboard_db',
    redis: __ENV.LOAD_TEST_REDIS_URL || 'redis://localhost:6379',
  },
  
  // API endpoints for testing
  endpoints: {
    health: '/api/health',
    metrics: '/api/metrics',
    auth: '/api/auth/login',
    events: '/api/events',
    websocket: '/api/ws',
    notifications: '/api/notifications',
    alerts: '/api/alerts',
    docs: '/api/docs',
  },
  
  // Authentication configuration
  auth: {
    testUser: {
      email: 'loadtest@example.com',
      password: 'LoadTest123!',
    },
    tokenEndpoint: '/api/auth/login',
    refreshEndpoint: '/api/auth/refresh',
  },
};

// Test data generators
export const testData = {
  // Generate random user data
  randomUser: () => ({
    email: `user${Math.floor(Math.random() * 100000)}@example.com`,
    password: 'LoadTest123!',
    name: `Test User ${Math.floor(Math.random() * 100000)}`,
  }),
  
  // Generate random metric data
  randomMetric: () => ({
    timestamp: new Date().toISOString(),
    value: Math.random() * 1000,
    type: ['cpu', 'memory', 'disk', 'network'][Math.floor(Math.random() * 4)],
    tags: {
      environment: ['production', 'staging'][Math.floor(Math.random() * 2)],
      service: ['api', 'database', 'cache'][Math.floor(Math.random() * 3)],
    },
  }),
  
  // Generate random event data
  randomEvent: () => ({
    type: ['user_action', 'system_event', 'error'][Math.floor(Math.random() * 3)],
    data: {
      userId: Math.floor(Math.random() * 10000),
      action: 'test_action',
      timestamp: new Date().toISOString(),
    },
  }),
};

// Request configuration defaults
export const requestConfig = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-LoadTest/1.0',
  },
  
  timeout: '30s',
  
  // Rate limiting configuration
  rps: parseInt(__ENV.LOAD_TEST_RPS) || 1000,
  
  // Batch request configuration
  batch: {
    size: parseInt(__ENV.LOAD_TEST_BATCH_SIZE) || 20,
    timeout: '60s',
  },
};

// Validation helpers
export const validators = {
  // Check if response is successful
  isSuccess: (response) => {
    return check(response, {
      'status is 2xx': (r) => r.status >= 200 && r.status < 300,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'no errors in body': (r) => !r.body.includes('error'),
    });
  },
  
  // Check cache headers
  isCached: (response) => {
    const isCached = response.headers['X-Cache-Status'] === 'HIT' || 
                    response.headers['x-cache'] === 'HIT';
    
    customMetrics.cacheHitRate.add(isCached ? 1 : 0);
    customMetrics.cacheMissRate.add(isCached ? 0 : 1);
    
    return isCached;
  },
  
  // Validate JSON response
  isValidJson: (response) => {
    try {
      JSON.parse(response.body);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // Check database response time
  dbPerformance: (response) => {
    const dbTime = parseFloat(response.headers['X-DB-Query-Time'] || '0');
    customMetrics.dbQueryTime.add(dbTime);
    
    return check(response, {
      'database query time < 50ms': () => dbTime < 50,
    });
  },
};

// Utility functions
export const utils = {
  // Get current environment
  getEnvironment: () => __ENV.ENVIRONMENT || 'local',
  
  // Get base URL for current environment
  getBaseUrl: () => environment.baseUrls[utils.getEnvironment()],
  
  // Generate authentication token
  getAuthToken: async (http) => {
    const response = await http.post(
      `${utils.getBaseUrl()}${environment.endpoints.auth}`,
      JSON.stringify(environment.auth.testUser),
      { headers: requestConfig.headers }
    );
    
    if (response.status === 200) {
      const body = JSON.parse(response.body);
      return body.token;
    }
    
    throw new Error(`Authentication failed: ${response.status}`);
  },
  
  // Sleep with jitter to avoid thundering herd
  sleepWithJitter: (baseMs, jitterMs = 1000) => {
    const jitter = Math.random() * jitterMs;
    return baseMs + jitter;
  },
  
  // Format bytes
  formatBytes: (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};

export default {
  thresholds,
  customMetrics,
  scenarios,
  environment,
  testData,
  requestConfig,
  validators,
  utils,
};