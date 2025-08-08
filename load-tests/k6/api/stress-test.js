/**
 * K6 API Stress Testing Script
 * Tests all API endpoints under high load to validate 1M+ req/day capacity
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';
import { 
  thresholds, 
  customMetrics, 
  scenarios, 
  environment, 
  testData, 
  requestConfig, 
  validators, 
  utils 
} from '../config.js';

// Test configuration
export let options = {
  scenarios: {
    // API stress test with 10k concurrent users
    api_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Warm up
        { duration: '5m', target: 500 },    // Ramp to load
        { duration: '10m', target: 1000 },  // Increase load
        { duration: '15m', target: 2000 },  // Stress level
        { duration: '20m', target: 5000 },  // High stress
        { duration: '10m', target: 10000 }, // Maximum stress
        { duration: '5m', target: 5000 },   // Partial recovery
        { duration: '5m', target: 0 },      // Cool down
      ],
      gracefulRampDown: '2m',
      tags: { testType: 'api_stress' },
    },
    
    // Spike test for sudden load increases
    api_spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },    // Normal load
        { duration: '30s', target: 5000 },  // Sudden spike
        { duration: '5m', target: 5000 },   // Maintain spike
        { duration: '30s', target: 100 },   // Return to normal
        { duration: '2m', target: 0 },      // Cool down
      ],
      tags: { testType: 'api_spike' },
    },
  },
  
  thresholds: {
    ...thresholds,
    // Custom thresholds for stress testing
    'http_req_duration{testType:api_stress}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{testType:api_spike}': ['p(95)<1000', 'p(99)<2000'],
    'http_req_failed{testType:api_stress}': ['rate<0.01'],  // Allow 1% errors under stress
    'http_req_failed{testType:api_spike}': ['rate<0.05'],   // Allow 5% errors during spike
  },
};

// Shared test data
const testUsers = new SharedArray('test-users', function() {
  const users = [];
  for (let i = 0; i < 1000; i++) {
    users.push(testData.randomUser());
  }
  return users;
});

// Authentication token cache
let authToken = null;
let tokenExpiry = 0;

// Setup function - runs once per VU
export function setup() {
  console.log('Starting API Stress Test Setup');
  console.log(`Environment: ${utils.getEnvironment()}`);
  console.log(`Base URL: ${utils.getBaseUrl()}`);
  console.log(`Max VUs: ${__ENV.K6_MAX_VUS || '10000'}`);
  
  // Pre-warm the system
  const warmupResponse = http.get(`${utils.getBaseUrl()}${environment.endpoints.health}`);
  console.log(`Health check status: ${warmupResponse.status}`);
  
  return {
    baseUrl: utils.getBaseUrl(),
    startTime: Date.now(),
  };
}

// Main test function
export default function(data) {
  const baseUrl = data.baseUrl;
  const userId = Math.floor(Math.random() * testUsers.length);
  const user = testUsers[userId];
  
  // Ensure we have a valid auth token
  ensureAuthToken(baseUrl);
  
  group('API Endpoint Tests', function() {
    // Test critical API endpoints under load
    testHealthEndpoint(baseUrl);
    testMetricsEndpoint(baseUrl);
    testAuthenticationFlow(baseUrl, user);
    testEventsEndpoint(baseUrl);
    testNotificationsEndpoint(baseUrl);
    testAlertsEndpoint(baseUrl);
    
    // Test with different load patterns
    if (Math.random() < 0.3) {
      testBatchRequests(baseUrl);
    }
    
    if (Math.random() < 0.1) {
      testLongPolling(baseUrl);
    }
  });
  
  group('Error Handling Tests', function() {
    testErrorScenarios(baseUrl);
    testRateLimiting(baseUrl);
  });
  
  // Random sleep to simulate user think time
  sleep(Math.random() * 2);
}

/**
 * Ensure we have a valid authentication token
 */
function ensureAuthToken(baseUrl) {
  const now = Date.now();
  
  if (!authToken || now > tokenExpiry) {
    const response = http.post(
      `${baseUrl}${environment.endpoints.auth}`,
      JSON.stringify(environment.auth.testUser),
      {
        headers: requestConfig.headers,
        tags: { endpoint: 'auth' },
      }
    );
    
    if (validators.isSuccess(response)) {
      const body = JSON.parse(response.body);
      authToken = body.token;
      tokenExpiry = now + (body.expiresIn * 1000) - 60000; // Refresh 1 min early
      customMetrics.authTokenRefreshes.add(1);
    }
  }
}

/**
 * Test health endpoint
 */
function testHealthEndpoint(baseUrl) {
  group('Health Check', function() {
    const response = http.get(`${baseUrl}${environment.endpoints.health}`, {
      headers: requestConfig.headers,
      tags: { endpoint: 'health' },
    });
    
    const success = validators.isSuccess(response);
    validators.isCached(response);
    
    check(response, {
      'health check returns 200': (r) => r.status === 200,
      'health check has correct structure': (r) => {
        const body = JSON.parse(r.body);
        return body.status && body.timestamp && body.checks;
      },
      'all services healthy': (r) => {
        const body = JSON.parse(r.body);
        return Object.values(body.checks).every(check => check.status === 'healthy');
      },
    });
  });
}

/**
 * Test metrics endpoint with various query parameters
 */
function testMetricsEndpoint(baseUrl) {
  group('Metrics API', function() {
    const timeRanges = ['1h', '6h', '24h', '7d'];
    const aggregations = ['avg', 'sum', 'min', 'max'];
    
    // Test different metric queries
    const timeRange = timeRanges[Math.floor(Math.random() * timeRanges.length)];
    const aggregation = aggregations[Math.floor(Math.random() * aggregations.length)];
    
    const response = http.get(
      `${baseUrl}${environment.endpoints.metrics}?range=${timeRange}&agg=${aggregation}`,
      {
        headers: {
          ...requestConfig.headers,
          'Authorization': `Bearer ${authToken}`,
        },
        tags: { endpoint: 'metrics' },
      }
    );
    
    validators.isSuccess(response);
    validators.isCached(response);
    validators.dbPerformance(response);
    
    check(response, {
      'metrics data is array': (r) => Array.isArray(JSON.parse(r.body)),
      'metrics have timestamps': (r) => {
        const data = JSON.parse(r.body);
        return data.length === 0 || data[0].timestamp;
      },
    });
  });
}

/**
 * Test authentication flow
 */
function testAuthenticationFlow(baseUrl, user) {
  group('Authentication Flow', function() {
    // Test login
    const loginResponse = http.post(
      `${baseUrl}${environment.endpoints.auth}`,
      JSON.stringify(user),
      {
        headers: requestConfig.headers,
        tags: { endpoint: 'auth_login' },
      }
    );
    
    const loginSuccess = check(loginResponse, {
      'login returns 200 or 401': (r) => r.status === 200 || r.status === 401,
    });
    
    if (loginSuccess && loginResponse.status === 200) {
      const body = JSON.parse(loginResponse.body);
      const token = body.token;
      
      // Test authenticated request
      const profileResponse = http.get(
        `${baseUrl}/api/auth/profile`,
        {
          headers: {
            ...requestConfig.headers,
            'Authorization': `Bearer ${token}`,
          },
          tags: { endpoint: 'auth_profile' },
        }
      );
      
      validators.isSuccess(profileResponse);
    }
  });
}

/**
 * Test events endpoint
 */
function testEventsEndpoint(baseUrl) {
  group('Events API', function() {
    // GET events
    const getResponse = http.get(`${baseUrl}${environment.endpoints.events}`, {
      headers: {
        ...requestConfig.headers,
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { endpoint: 'events_get' },
    });
    
    validators.isSuccess(getResponse);
    validators.isCached(getResponse);
    
    // POST event
    const eventData = testData.randomEvent();
    const postResponse = http.post(
      `${baseUrl}${environment.endpoints.events}`,
      JSON.stringify(eventData),
      {
        headers: {
          ...requestConfig.headers,
          'Authorization': `Bearer ${authToken}`,
        },
        tags: { endpoint: 'events_post' },
      }
    );
    
    check(postResponse, {
      'event created': (r) => r.status === 200 || r.status === 201,
    });
  });
}

/**
 * Test notifications endpoint
 */
function testNotificationsEndpoint(baseUrl) {
  group('Notifications API', function() {
    const response = http.get(`${baseUrl}${environment.endpoints.notifications}`, {
      headers: {
        ...requestConfig.headers,
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { endpoint: 'notifications' },
    });
    
    validators.isSuccess(response);
    validators.isCached(response);
    
    // Test notification preferences
    const prefsResponse = http.get(`${baseUrl}${environment.endpoints.notifications}/preferences`, {
      headers: {
        ...requestConfig.headers,
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { endpoint: 'notification_preferences' },
    });
    
    validators.isSuccess(prefsResponse);
  });
}

/**
 * Test alerts endpoint
 */
function testAlertsEndpoint(baseUrl) {
  group('Alerts API', function() {
    const response = http.get(`${baseUrl}${environment.endpoints.alerts}`, {
      headers: {
        ...requestConfig.headers,
        'Authorization': `Bearer ${authToken}`,
      },
      tags: { endpoint: 'alerts' },
    });
    
    validators.isSuccess(response);
    validators.dbPerformance(response);
    
    check(response, {
      'alerts response is valid': (r) => validators.isValidJson(r),
    });
  });
}

/**
 * Test batch requests
 */
function testBatchRequests(baseUrl) {
  group('Batch Requests', function() {
    const requests = [];
    
    // Create batch of requests
    for (let i = 0; i < requestConfig.batch.size; i++) {
      requests.push({
        method: 'GET',
        url: `${baseUrl}${environment.endpoints.metrics}?batch=${i}`,
        headers: {
          ...requestConfig.headers,
          'Authorization': `Bearer ${authToken}`,
        },
        tags: { endpoint: 'batch_metrics' },
      });
    }
    
    // Execute batch
    const responses = http.batch(requests);
    
    // Validate all responses
    responses.forEach((response, index) => {
      check(response, {
        [`batch request ${index} successful`]: (r) => r.status < 400,
        [`batch request ${index} fast enough`]: (r) => r.timings.duration < 1000,
      });
    });
  });
}

/**
 * Test long polling scenarios
 */
function testLongPolling(baseUrl) {
  group('Long Polling', function() {
    const response = http.get(
      `${baseUrl}${environment.endpoints.events}?longpoll=true&timeout=10`,
      {
        headers: {
          ...requestConfig.headers,
          'Authorization': `Bearer ${authToken}`,
        },
        timeout: '15s',
        tags: { endpoint: 'events_longpoll' },
      }
    );
    
    check(response, {
      'long poll completes': (r) => r.status === 200 || r.status === 204,
      'long poll timeout reasonable': (r) => r.timings.duration <= 15000,
    });
  });
}

/**
 * Test error scenarios
 */
function testErrorScenarios(baseUrl) {
  group('Error Handling', function() {
    // Test 404
    const notFoundResponse = http.get(`${baseUrl}/api/nonexistent`, {
      headers: requestConfig.headers,
      tags: { endpoint: 'error_404' },
    });
    
    check(notFoundResponse, {
      '404 handled correctly': (r) => r.status === 404,
    });
    
    // Test invalid JSON
    const invalidJsonResponse = http.post(
      `${baseUrl}${environment.endpoints.events}`,
      'invalid json',
      {
        headers: requestConfig.headers,
        tags: { endpoint: 'error_json' },
      }
    );
    
    check(invalidJsonResponse, {
      'invalid JSON handled': (r) => r.status === 400,
    });
    
    // Test unauthorized access
    const unauthorizedResponse = http.get(`${baseUrl}${environment.endpoints.metrics}`, {
      headers: requestConfig.headers,
      tags: { endpoint: 'error_auth' },
    });
    
    check(unauthorizedResponse, {
      'unauthorized handled': (r) => r.status === 401,
    });
  });
}

/**
 * Test rate limiting
 */
function testRateLimiting(baseUrl) {
  group('Rate Limiting', function() {
    const requests = [];
    
    // Create rapid requests to trigger rate limiting
    for (let i = 0; i < 100; i++) {
      requests.push({
        method: 'GET',
        url: `${baseUrl}${environment.endpoints.health}`,
        headers: requestConfig.headers,
        tags: { endpoint: 'rate_limit_test' },
      });
    }
    
    const responses = http.batch(requests);
    
    // Check if rate limiting kicks in
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    console.log(`Rate limited requests: ${rateLimitedCount}/100`);
    
    check(responses[0], {
      'rate limiting implemented': () => rateLimitedCount > 0,
    });
  });
}

// Teardown function - runs once after all VUs finish
export function teardown(data) {
  const endTime = Date.now();
  const duration = endTime - data.startTime;
  
  console.log(`API Stress Test completed in ${duration}ms`);
  console.log('Final metrics summary:');
  console.log(`- Auth token refreshes: ${customMetrics.authTokenRefreshes}`);
  console.log(`- API retries: ${customMetrics.apiRetries}`);
  console.log(`- Circuit breaker trips: ${customMetrics.circuitBreakerTrips}`);
}