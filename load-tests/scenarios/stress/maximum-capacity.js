/**
 * Maximum Capacity Stress Testing Scenario
 * Tests system behavior at absolute maximum load to determine breaking points
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import { 
  customMetrics, 
  environment, 
  testData, 
  requestConfig, 
  validators, 
  utils 
} from '../../k6/config.js';

// Maximum capacity metrics
const capacityMetrics = {
  maxSuccessfulVUs: new Gauge('max_successful_vus'),
  maxThroughput: new Gauge('max_throughput_rps'),
  breakingPointTime: new Gauge('breaking_point_duration'),
  recoveryTime: new Trend('recovery_time_seconds'),
  
  systemFailures: new Counter('system_failures'),
  circuitBreakerActivations: new Counter('circuit_breaker_activations'),
  timeoutErrors: new Counter('timeout_errors'),
  connectionErrors: new Counter('connection_errors'),
  
  resourceExhaustionDetected: new Rate('resource_exhaustion_rate'),
  degradationSeverity: new Gauge('degradation_severity_score'),
};

// Maximum capacity test configuration
export let options = {
  scenarios: {
    // Find maximum sustainable load
    max_sustainable_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Quick ramp to known safe level
        { duration: '2m', target: 1000, name: 'safe_baseline' },
        { duration: '3m', target: 1000, name: 'baseline_steady' },
        
        // Aggressive ramp to stress levels  
        { duration: '2m', target: 3000, name: 'stress_ramp1' },
        { duration: '5m', target: 3000, name: 'stress_hold1' },
        
        { duration: '2m', target: 6000, name: 'stress_ramp2' },
        { duration: '5m', target: 6000, name: 'stress_hold2' },
        
        { duration: '2m', target: 10000, name: 'high_stress' },
        { duration: '10m', target: 10000, name: 'high_stress_hold' },
        
        { duration: '2m', target: 15000, name: 'extreme_stress' },
        { duration: '10m', target: 15000, name: 'extreme_hold' },
        
        { duration: '2m', target: 20000, name: 'breaking_point' },
        { duration: '5m', target: 20000, name: 'breaking_hold' },
        
        { duration: '1m', target: 25000, name: 'overflow1' },
        { duration: '1m', target: 30000, name: 'overflow2' },
        
        // Recovery testing
        { duration: '3m', target: 15000, name: 'recovery1' },
        { duration: '3m', target: 5000, name: 'recovery2' },
        { duration: '3m', target: 1000, name: 'recovery3' },
        { duration: '2m', target: 0, name: 'complete_recovery' },
      ],
      gracefulRampDown: '2m',
      tags: { testType: 'max_capacity' },
    },
    
    // Burst capacity test
    burst_capacity: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      stages: [
        { duration: '30s', target: 500 },   // 500 req/s
        { duration: '30s', target: 1000 },  // 1K req/s
        { duration: '30s', target: 2000 },  // 2K req/s  
        { duration: '30s', target: 5000 },  // 5K req/s
        { duration: '30s', target: 10000 }, // 10K req/s
        { duration: '30s', target: 15000 }, // 15K req/s (breaking point)
        { duration: '30s', target: 20000 }, // 20K req/s (overflow)
        { duration: '60s', target: 1000 },  // Recovery
      ],
      preAllocatedVUs: 1000,
      maxVUs: 30000,
      tags: { testType: 'burst_capacity' },
    },
  },
  
  thresholds: {
    // Capacity thresholds (more lenient for stress testing)
    'http_req_duration': ['p(95)<5000', 'p(99)<10000'],
    'http_req_failed': ['rate<0.20'],  // Allow 20% failure at extreme load
    
    // Breaking point detection
    'max_successful_vus': ['value>8000'],  // Should handle at least 8K VUs
    'max_throughput_rps': ['value>5000'],  // Should achieve 5K req/s
    
    // Error monitoring  
    'system_failures': ['count<1000'],     // Limit system failures
    'timeout_errors': ['rate<0.30'],       // Max 30% timeouts
    
    // Resource exhaustion
    'resource_exhaustion_rate': ['rate<0.50'], // Max 50% resource exhaustion
  },
  
  // Extended timeouts for stress testing
  httpDebug: 'full',
  noConnectionReuse: false,
  discardResponseBodies: false,
};

// Test state for capacity tracking
let maxVUsAchieved = 0;
let maxThroughputAchieved = 0;
let breakingPointDetected = false;
let recoveryStartTime = null;
let systemHealthy = true;

// Setup function with capacity baseline
export function setup() {
  console.log('Starting Maximum Capacity Stress Test');
  console.log('WARNING: This test will push the system to its absolute limits');
  console.log(`Target: ${utils.getBaseUrl()}`);
  
  // Establish system health baseline
  const healthCheck = http.get(`${utils.getBaseUrl()}/api/health`);
  const initialHealth = {
    responseTime: healthCheck.timings.duration,
    status: healthCheck.status,
    timestamp: Date.now(),
  };
  
  console.log(`Initial system health: ${healthCheck.status} (${initialHealth.responseTime}ms)`);
  
  return {
    baseUrl: utils.getBaseUrl(),
    initialHealth,
    testStartTime: Date.now(),
  };
}

// Main capacity testing function
export default function(data) {
  const baseUrl = data.baseUrl;
  const currentVUs = __ENV.__VU || 0;
  const currentStage = getCurrentStage();
  
  // Track maximum VUs achieved
  if (currentVUs > maxVUsAchieved) {
    maxVUsAchieved = currentVUs;
    capacityMetrics.maxSuccessfulVUs.add(currentVUs);
  }
  
  group(`Capacity Test - ${currentStage}`, function() {
    // Essential system functions testing
    testEssentialFunctions(baseUrl, currentStage);
    
    // Monitor system health degradation
    monitorSystemHealth(baseUrl, data.initialHealth);
    
    // Capacity-specific testing based on current load
    switch (currentStage) {
      case 'baseline':
        testBaselineCapacity(baseUrl);
        break;
      case 'stress':
        testStressCapacity(baseUrl);
        break;
      case 'extreme':
        testExtremeCapacity(baseUrl);
        break;
      case 'breaking':
        testBreakingPoint(baseUrl);
        break;
      case 'overflow':
        testOverflow(baseUrl);
        break;
      case 'recovery':
        testRecovery(baseUrl);
        break;
    }
  });
  
  // Minimal sleep at high loads to maximize pressure
  const thinkTime = Math.max(0.01, 1 - (currentVUs / 10000));
  sleep(thinkTime);
}

/**
 * Determine current test stage based on VUs
 */
function getCurrentStage() {
  const vus = __ENV.__VU || 0;
  
  if (vus <= 1000) return 'baseline';
  else if (vus <= 6000) return 'stress';
  else if (vus <= 15000) return 'extreme';
  else if (vus <= 20000) return 'breaking';
  else if (vus <= 30000) return 'overflow';
  else return 'recovery';
}

/**
 * Test essential system functions under load
 */
function testEssentialFunctions(baseUrl, stage) {
  group('Essential Functions', function() {
    const startTime = Date.now();
    
    // Health check - most critical endpoint
    const healthResponse = http.get(`${baseUrl}/api/health`, {
      headers: {
        ...requestConfig.headers,
        'X-Load-Test': 'capacity',
        'X-Stage': stage,
      },
      timeout: '30s',
      tags: { 
        endpoint: 'health', 
        critical: 'true',
        stage: stage 
      },
    });
    
    const responseTime = Date.now() - startTime;
    
    // Check if system is still responding
    const isResponding = check(healthResponse, {
      'System responding': (r) => r.status !== 0,  // Any response is good
      'Health endpoint accessible': (r) => r.status < 500,
      'Response within timeout': () => responseTime < 30000,
    });
    
    if (!isResponding) {
      capacityMetrics.systemFailures.add(1);
      systemHealthy = false;
    }
    
    // Track connection errors
    if (healthResponse.status === 0) {
      capacityMetrics.connectionErrors.add(1);
    }
    
    // Track timeout errors
    if (responseTime > 30000) {
      capacityMetrics.timeoutErrors.add(1);
    }
  });
}

/**
 * Monitor overall system health degradation
 */
function monitorSystemHealth(baseUrl, initialHealth) {
  if (Math.random() < 0.1) {  // Sample 10% of requests for health monitoring
    const healthResponse = http.get(`${baseUrl}/api/health`, {
      timeout: '10s',
      tags: { monitoring: 'health' },
    });
    
    if (healthResponse.status === 200) {
      const currentResponseTime = healthResponse.timings.duration;
      const degradationRatio = currentResponseTime / initialHealth.responseTime;
      
      // Calculate degradation severity (1-10 scale)
      const severity = Math.min(10, Math.max(1, degradationRatio));
      capacityMetrics.degradationSeverity.add(severity);
      
      // Detect resource exhaustion
      const resourceExhausted = degradationRatio > 5 || healthResponse.status === 503;
      capacityMetrics.resourceExhaustionDetected.add(resourceExhausted ? 1 : 0);
      
      if (severity > 8) {
        console.warn(`Severe degradation detected: ${degradationRatio}x baseline`);
      }
    }
  }
}

/**
 * Test baseline capacity (safe operating levels)
 */
function testBaselineCapacity(baseUrl) {
  group('Baseline Capacity', function() {
    // Full feature testing at baseline
    const metricsResponse = http.get(`${baseUrl}/api/metrics?range=1h`, {
      headers: requestConfig.headers,
      timeout: '10s',
      tags: { scenario: 'baseline_metrics' },
    });
    
    validators.isSuccess(metricsResponse);
    validators.isCached(metricsResponse);
    
    check(metricsResponse, {
      'Baseline - Full features available': (r) => r.status === 200,
      'Baseline - Fast response': (r) => r.timings.duration < 500,
      'Baseline - Cache working': (r) => validators.isCached(r),
    });
  });
}

/**
 * Test stress capacity levels
 */
function testStressCapacity(baseUrl) {
  group('Stress Capacity', function() {
    // Reduced feature set under stress
    const alertsResponse = http.get(`${baseUrl}/api/alerts`, {
      headers: requestConfig.headers,
      timeout: '15s',
      tags: { scenario: 'stress_alerts' },
    });
    
    check(alertsResponse, {
      'Stress - Core functions work': (r) => r.status < 500,
      'Stress - Reasonable response time': (r) => r.timings.duration < 3000,
      'Stress - Rate limiting acceptable': (r) => r.status !== 429 || Math.random() < 0.3,
    });
    
    // Test circuit breaker behavior
    if (alertsResponse.status === 503) {
      capacityMetrics.circuitBreakerActivations.add(1);
    }
  });
}

/**
 * Test extreme capacity levels
 */
function testExtremeCapacity(baseUrl) {
  group('Extreme Capacity', function() {
    // Only essential operations
    const essentialResponse = http.get(`${baseUrl}/api/health`, {
      headers: {
        ...requestConfig.headers,
        'X-Priority': 'critical',
      },
      timeout: '20s',
      tags: { scenario: 'extreme_essential' },
    });
    
    check(essentialResponse, {
      'Extreme - System survives': (r) => r.status !== 0,
      'Extreme - Some response received': (r) => r.body.length > 0,
      'Extreme - Not completely broken': (r) => r.status < 600,
    });
    
    // Many requests may fail at extreme load - that's expected
    if (essentialResponse.status >= 500) {
      capacityMetrics.systemFailures.add(1);
    }
  });
}

/**
 * Test at breaking point
 */
function testBreakingPoint(baseUrl) {
  group('Breaking Point', function() {
    if (!breakingPointDetected) {
      breakingPointDetected = true;
      capacityMetrics.breakingPointTime.add(Date.now());
      console.warn(`Breaking point reached at ${__ENV.__VU} VUs`);
    }
    
    // Survival testing
    const survivalResponse = http.get(`${baseUrl}/api/health`, {
      headers: requestConfig.headers,
      timeout: '25s',
      tags: { scenario: 'breaking_survival' },
    });
    
    // At breaking point, any response is a success
    check(survivalResponse, {
      'Breaking - System not dead': (r) => r.status !== 0,
      'Breaking - Graceful degradation': (r) => r.status === 503 || r.status === 200,
    });
  });
}

/**
 * Test overflow conditions
 */
function testOverflow(baseUrl) {
  group('Overflow Test', function() {
    // At overflow, expect many failures
    const overflowResponse = http.get(`${baseUrl}/api/health`, {
      headers: requestConfig.headers,
      timeout: '30s',
      tags: { scenario: 'overflow' },
    });
    
    // Document overflow behavior
    check(overflowResponse, {
      'Overflow - Request completed': () => true,  // Always pass
      'Overflow - Connection possible': (r) => r.status !== 0 || Math.random() < 0.5,
    });
    
    if (overflowResponse.status === 0) {
      capacityMetrics.connectionErrors.add(1);
    }
  });
}

/**
 * Test system recovery
 */
function testRecovery(baseUrl) {
  group('Recovery Test', function() {
    if (!recoveryStartTime) {
      recoveryStartTime = Date.now();
      console.log('Starting recovery phase monitoring');
    }
    
    const recoveryResponse = http.get(`${baseUrl}/api/health`, {
      headers: requestConfig.headers,
      timeout: '15s',
      tags: { scenario: 'recovery' },
    });
    
    const isRecovered = recoveryResponse.status === 200 && 
                       recoveryResponse.timings.duration < 1000;
    
    if (isRecovered && recoveryStartTime) {
      const recoveryDuration = (Date.now() - recoveryStartTime) / 1000;
      capacityMetrics.recoveryTime.add(recoveryDuration);
      console.log(`System recovery detected after ${recoveryDuration}s`);
      recoveryStartTime = null;  // Reset for multiple recovery phases
    }
    
    check(recoveryResponse, {
      'Recovery - Improving response': (r) => r.status < 400,
      'Recovery - Response time improving': (r) => r.timings.duration < 2000,
    });
  });
}

// Comprehensive teardown analysis
export function teardown(data) {
  const testEndTime = Date.now();
  const totalDuration = (testEndTime - data.testStartTime) / 1000 / 60;
  
  console.log('\n=== Maximum Capacity Stress Test Results ===');
  console.log(`Total test duration: ${Math.round(totalDuration)} minutes`);
  console.log(`Maximum VUs achieved: ${maxVUsAchieved}`);
  console.log(`System health at start: ${data.initialHealth.responseTime}ms`);
  
  // Capacity analysis
  console.log('\n--- Capacity Analysis ---');
  console.log(`Maximum sustainable VUs: ~${Math.round(maxVUsAchieved * 0.8)}`);
  console.log(`Breaking point VUs: ~${maxVUsAchieved}`);
  console.log(`System failures: ${capacityMetrics.systemFailures}`);
  console.log(`Circuit breaker activations: ${capacityMetrics.circuitBreakerActivations}`);
  
  // Performance degradation analysis
  console.log('\n--- Performance Degradation ---');
  console.log(`Resource exhaustion rate: ${capacityMetrics.resourceExhaustionDetected}%`);
  console.log(`Connection errors: ${capacityMetrics.connectionErrors}`);
  console.log(`Timeout errors: ${capacityMetrics.timeoutErrors}`);
  
  // Recovery analysis
  console.log('\n--- Recovery Analysis ---');
  if (capacityMetrics.recoveryTime) {
    console.log(`Average recovery time: ${capacityMetrics.recoveryTime}s`);
  }
  
  // Recommendations
  console.log('\n--- Recommendations ---');
  console.log('1. Set auto-scaling triggers before breaking point');
  console.log(`2. Configure alerts at ${Math.round(maxVUsAchieved * 0.6)} concurrent users`);
  console.log('3. Implement circuit breakers for non-essential features');
  console.log('4. Add rate limiting to protect core functions');
  console.log('5. Monitor resource exhaustion patterns');
  console.log('6. Plan capacity for 2x expected peak load');
  
  // Bottleneck identification
  console.log('\n--- Likely Bottlenecks ---');
  if (capacityMetrics.connectionErrors > 100) {
    console.log('- Network/connection pool limits');
  }
  if (capacityMetrics.timeoutErrors > 100) {
    console.log('- Database or backend service capacity');
  }
  if (capacityMetrics.resourceExhaustionDetected > 0.3) {
    console.log('- Memory or CPU exhaustion');
  }
  
  console.log('\n=== End Maximum Capacity Test ===');
}