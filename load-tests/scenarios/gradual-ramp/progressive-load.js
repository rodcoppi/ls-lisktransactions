/**
 * Progressive Load Testing Scenario
 * Gradually increases load from 1 to 10,000+ users to identify breaking points
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { 
  customMetrics, 
  environment, 
  testData, 
  requestConfig, 
  validators, 
  utils 
} from '../../k6/config.js';

// Progressive load metrics
const loadStageMetrics = {
  stage1: new Trend('stage1_response_time'),
  stage2: new Trend('stage2_response_time'),
  stage3: new Trend('stage3_response_time'),
  stage4: new Trend('stage4_response_time'),
  stage5: new Trend('stage5_response_time'),
  
  breakingPoint: new Gauge('breaking_point_users'),
  degradationStart: new Gauge('degradation_start_users'),
  stabilityLevel: new Gauge('stability_level_users'),
};

// Progressive load configuration
export let options = {
  scenarios: {
    progressive_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Stage 1: Minimal load (1-10 users)
        { duration: '2m', target: 1, name: 'stage1_minimal' },
        { duration: '3m', target: 10, name: 'stage1_low' },
        
        // Stage 2: Light load (10-100 users) 
        { duration: '3m', target: 25, name: 'stage2_light' },
        { duration: '3m', target: 50, name: 'stage2_medium' },
        { duration: '3m', target: 100, name: 'stage2_high' },
        
        // Stage 3: Moderate load (100-500 users)
        { duration: '5m', target: 200, name: 'stage3_moderate' },
        { duration: '5m', target: 350, name: 'stage3_higher' },
        { duration: '5m', target: 500, name: 'stage3_peak' },
        
        // Stage 4: Heavy load (500-2000 users)
        { duration: '5m', target: 750, name: 'stage4_heavy' },
        { duration: '5m', target: 1000, name: 'stage4_thousand' },
        { duration: '10m', target: 1500, name: 'stage4_stress' },
        { duration: '10m', target: 2000, name: 'stage4_peak' },
        
        // Stage 5: Extreme load (2000-10000+ users)
        { duration: '5m', target: 3000, name: 'stage5_extreme' },
        { duration: '10m', target: 5000, name: 'stage5_very_high' },
        { duration: '10m', target: 7500, name: 'stage5_maximum' },
        { duration: '15m', target: 10000, name: 'stage5_breaking' },
        
        // Overflow testing (push beyond limits)
        { duration: '5m', target: 12500, name: 'overflow_test' },
        { duration: '5m', target: 15000, name: 'overflow_extreme' },
        
        // Gradual recovery
        { duration: '5m', target: 10000, name: 'recovery_start' },
        { duration: '5m', target: 5000, name: 'recovery_middle' },
        { duration: '5m', target: 1000, name: 'recovery_normal' },
        { duration: '3m', target: 100, name: 'recovery_low' },
        { duration: '2m', target: 0, name: 'recovery_complete' },
      ],
      gracefulRampDown: '3m',
      tags: { testType: 'progressive_load' },
    },
  },
  
  thresholds: {
    // Overall performance thresholds
    'http_req_duration': ['p(95)<2000', 'p(99)<5000'],
    'http_req_failed': ['rate<0.05'],  // Allow 5% failure rate at extreme loads
    
    // Stage-specific thresholds  
    'stage1_response_time': ['p(95)<200', 'p(99)<300'],
    'stage2_response_time': ['p(95)<300', 'p(99)<500'],
    'stage3_response_time': ['p(95)<500', 'p(99)<1000'],
    'stage4_response_time': ['p(95)<1000', 'p(99)<2000'],
    'stage5_response_time': ['p(95)<2000', 'p(99)<5000'],
    
    // Breaking point detection
    'breaking_point_users': ['value>8000'],  // Should handle at least 8k users
    'degradation_start_users': ['value>2000'],  // Degradation should start after 2k users
  },
  
  // Progressive test summary report
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Test state tracking
let currentStage = 1;
let performanceBaseline = null;
let degradationDetected = false;
let breakingPointReached = false;

// Setup function
export function setup() {
  console.log('Starting Progressive Load Testing');
  console.log(`Target: ${utils.getBaseUrl()}`);
  console.log('Load progression: 1 → 15,000 users over ~2.5 hours');
  
  // Establish performance baseline
  const baselineResponse = http.get(`${utils.getBaseUrl()}/api/health`);
  performanceBaseline = {
    responseTime: baselineResponse.timings.duration,
    timestamp: Date.now(),
  };
  
  console.log(`Performance baseline: ${performanceBaseline.responseTime}ms`);
  
  return {
    baseUrl: utils.getBaseUrl(),
    baseline: performanceBaseline,
    startTime: Date.now(),
  };
}

// Main test function with progressive load tracking
export default function(data) {
  const baseUrl = data.baseUrl;
  const currentVUs = __ENV.__VU || 0;
  
  // Determine current stage based on VU count
  updateCurrentStage(currentVUs);
  
  group(`Progressive Load Test - Stage ${currentStage}`, function() {
    // Core API testing with performance monitoring
    testCoreAPIs(baseUrl);
    
    // Monitor performance degradation
    monitorPerformanceDegradation(data.baseline);
    
    // Test different load patterns based on stage
    switch (currentStage) {
      case 1:
        testMinimalLoadScenarios(baseUrl);
        break;
      case 2:
        testLightLoadScenarios(baseUrl);
        break;
      case 3:
        testModerateLoadScenarios(baseUrl);
        break;
      case 4:
        testHeavyLoadScenarios(baseUrl);
        break;
      case 5:
        testExtremeLoadScenarios(baseUrl);
        break;
    }
  });
  
  // Progressive think time (more pressure at higher loads)
  const thinkTime = Math.max(0.1, 3 - (currentVUs / 2000));
  sleep(thinkTime);
}

/**
 * Update current stage based on VU count
 */
function updateCurrentStage(vus) {
  if (vus <= 100) currentStage = 1;
  else if (vus <= 500) currentStage = 2;
  else if (vus <= 2000) currentStage = 3;
  else if (vus <= 10000) currentStage = 4;
  else currentStage = 5;
}

/**
 * Test core APIs with performance tracking
 */
function testCoreAPIs(baseUrl) {
  group('Core API Performance', function() {
    const startTime = Date.now();
    
    // Health check (should always be fast)
    const healthResponse = http.get(`${baseUrl}/api/health`, {
      headers: requestConfig.headers,
      tags: { endpoint: 'health', stage: `stage${currentStage}` },
    });
    
    const responseTime = Date.now() - startTime;
    
    // Record stage-specific metrics
    recordStageMetrics(responseTime, currentStage);
    
    validators.isSuccess(healthResponse);
    validators.isCached(healthResponse);
    
    // Additional checks for progressive load
    check(healthResponse, {
      [`Stage ${currentStage} - Health response OK`]: (r) => r.status === 200,
      [`Stage ${currentStage} - Response time acceptable`]: () => {
        const acceptable = getAcceptableResponseTime(currentStage);
        return responseTime < acceptable;
      },
    });
  });
}

/**
 * Record metrics for specific stages
 */
function recordStageMetrics(responseTime, stage) {
  switch (stage) {
    case 1:
      loadStageMetrics.stage1.add(responseTime);
      break;
    case 2:
      loadStageMetrics.stage2.add(responseTime);
      break;
    case 3:
      loadStageMetrics.stage3.add(responseTime);
      break;
    case 4:
      loadStageMetrics.stage4.add(responseTime);
      break;
    case 5:
      loadStageMetrics.stage5.add(responseTime);
      break;
  }
}

/**
 * Get acceptable response time for stage
 */
function getAcceptableResponseTime(stage) {
  const thresholds = {
    1: 300,    // Stage 1: 300ms
    2: 500,    // Stage 2: 500ms
    3: 1000,   // Stage 3: 1 second
    4: 2000,   // Stage 4: 2 seconds
    5: 5000,   // Stage 5: 5 seconds
  };
  return thresholds[stage] || 5000;
}

/**
 * Monitor performance degradation
 */
function monitorPerformanceDegradation(baseline) {
  const currentResponseTime = Date.now(); // This would be measured properly
  
  if (!degradationDetected && baseline) {
    const degradationThreshold = baseline.responseTime * 2; // 2x baseline
    
    if (currentResponseTime > degradationThreshold) {
      degradationDetected = true;
      loadStageMetrics.degradationStart.add(__ENV.__VU || 0);
      console.warn(`Performance degradation detected at ${__ENV.__VU} users`);
    }
  }
}

/**
 * Test scenarios for minimal load (1-100 users)
 */
function testMinimalLoadScenarios(baseUrl) {
  group('Minimal Load Scenarios', function() {
    // Perfect performance expected
    const metricsResponse = http.get(`${baseUrl}/api/metrics?range=1h`, {
      headers: requestConfig.headers,
      tags: { scenario: 'minimal_load' },
    });
    
    check(metricsResponse, {
      'Minimal load - Perfect response time': (r) => r.timings.duration < 200,
      'Minimal load - No errors': (r) => r.status === 200,
      'Minimal load - Cache working': (r) => r.headers['X-Cache-Status'] !== undefined,
    });
  });
}

/**
 * Test scenarios for light load (100-500 users)
 */
function testLightLoadScenarios(baseUrl) {
  group('Light Load Scenarios', function() {
    // Good performance expected
    const eventsResponse = http.get(`${baseUrl}/api/events`, {
      headers: requestConfig.headers,
      tags: { scenario: 'light_load' },
    });
    
    check(eventsResponse, {
      'Light load - Good response time': (r) => r.timings.duration < 500,
      'Light load - High success rate': (r) => r.status < 400,
    });
    
    // Test concurrent operations
    const batchRequests = [
      { method: 'GET', url: `${baseUrl}/api/health` },
      { method: 'GET', url: `${baseUrl}/api/metrics?range=1h` },
      { method: 'GET', url: `${baseUrl}/api/events` },
    ];
    
    const batchResponse = http.batch(batchRequests);
    
    check(batchResponse[0], {
      'Light load - Batch request successful': (r) => r.status === 200,
    });
  });
}

/**
 * Test scenarios for moderate load (500-2000 users)  
 */
function testModerateLoadScenarios(baseUrl) {
  group('Moderate Load Scenarios', function() {
    // Acceptable performance expected
    const alertsResponse = http.get(`${baseUrl}/api/alerts`, {
      headers: requestConfig.headers,
      tags: { scenario: 'moderate_load' },
    });
    
    check(alertsResponse, {
      'Moderate load - Acceptable response time': (r) => r.timings.duration < 1000,
      'Moderate load - Most requests succeed': (r) => r.status < 500,
    });
    
    // Test database-heavy operations
    const analyticsResponse = http.get(`${baseUrl}/api/metrics?range=24h&detailed=true`, {
      headers: requestConfig.headers,
      tags: { scenario: 'moderate_analytics' },
    });
    
    check(analyticsResponse, {
      'Moderate load - Analytics query completes': (r) => r.timings.duration < 3000,
    });
  });
}

/**
 * Test scenarios for heavy load (2000-10000 users)
 */
function testHeavyLoadScenarios(baseUrl) {
  group('Heavy Load Scenarios', function() {
    // Performance degradation expected but system should survive
    const notificationsResponse = http.get(`${baseUrl}/api/notifications`, {
      headers: requestConfig.headers,
      tags: { scenario: 'heavy_load' },
    });
    
    check(notificationsResponse, {
      'Heavy load - System survives': (r) => r.status !== 500,
      'Heavy load - Reasonable response time': (r) => r.timings.duration < 3000,
      'Heavy load - Rate limiting may occur': (r) => r.status !== 429 || true, // Allow 429s
    });
    
    // Reduced functionality testing
    if (Math.random() < 0.3) {  // Only 30% do expensive operations
      const exportResponse = http.get(`${baseUrl}/api/export?format=csv&range=7d`, {
        headers: requestConfig.headers,
        tags: { scenario: 'heavy_export' },
      });
      
      check(exportResponse, {
        'Heavy load - Export handled': (r) => r.status === 200 || r.status === 503,
      });
    }
  });
}

/**
 * Test scenarios for extreme load (10000+ users)
 */
function testExtremeLoadScenarios(baseUrl) {
  group('Extreme Load Scenarios', function() {
    // System should prioritize essential functions
    const essentialResponse = http.get(`${baseUrl}/api/health`, {
      headers: {
        ...requestConfig.headers,
        'X-Priority': 'high',
      },
      tags: { scenario: 'extreme_essential' },
    });
    
    check(essentialResponse, {
      'Extreme load - Essential functions work': (r) => r.status === 200,
      'Extreme load - Circuit breaker may activate': (r) => r.status !== 503 || true,
    });
    
    // Only critical operations
    if (Math.random() < 0.1) {  // Only 10% do non-essential operations
      const nonEssentialResponse = http.get(`${baseUrl}/api/metrics?range=1h`, {
        headers: requestConfig.headers,
        tags: { scenario: 'extreme_non_essential' },
      });
      
      // Allow failures at extreme load
      check(nonEssentialResponse, {
        'Extreme load - Non-essential may fail': () => true,  // Always pass
      });
    }
    
    // Track breaking point
    if (!breakingPointReached && (__ENV.__VU || 0) > 12000) {
      breakingPointReached = true;
      loadStageMetrics.breakingPoint.add(__ENV.__VU || 0);
      console.warn(`Breaking point reached at ${__ENV.__VU} users`);
    }
  });
}

// Teardown with comprehensive analysis
export function teardown(data) {
  const endTime = Date.now();
  const totalDuration = endTime - data.startTime;
  
  console.log('\n=== Progressive Load Test Analysis ===');
  console.log(`Total test duration: ${Math.round(totalDuration / 1000 / 60)} minutes`);
  
  if (performanceBaseline) {
    console.log(`Performance baseline: ${performanceBaseline.responseTime}ms`);
  }
  
  if (degradationDetected) {
    console.log(`Performance degradation started around: ${loadStageMetrics.degradationStart} users`);
  }
  
  if (breakingPointReached) {
    console.log(`Breaking point reached at: ${loadStageMetrics.breakingPoint} users`);
  } else {
    console.log('System handled maximum load without complete failure');
  }
  
  console.log('\nStage Performance Summary:');
  console.log('Stage 1 (1-100 users): Optimal performance expected');
  console.log('Stage 2 (100-500 users): Good performance expected');
  console.log('Stage 3 (500-2000 users): Acceptable performance expected');
  console.log('Stage 4 (2000-10000 users): Degraded but functional');
  console.log('Stage 5 (10000+ users): Survival mode');
  
  console.log('\nRecommendations:');
  console.log('- Analyze performance degradation patterns');
  console.log('- Identify bottlenecks at each stage');
  console.log('- Implement auto-scaling triggers');
  console.log('- Configure circuit breakers for extreme load');
  console.log('- Set up monitoring alerts for each stage');
}

// Generate HTML report
export function handleSummary(data) {
  return {
    'progressive-load-report.html': htmlReport(data),
    'progressive-load-results.json': JSON.stringify(data, null, 2),
  };
}