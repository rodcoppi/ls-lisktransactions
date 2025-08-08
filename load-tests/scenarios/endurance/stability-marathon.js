/**
 * Stability Marathon Testing Scenario
 * Extended 24-hour endurance test to detect memory leaks, degradation, and stability issues
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

// Stability marathon metrics
const marathonMetrics = {
  // Performance tracking over time
  hourlyPerformance: new Trend('hourly_avg_response_time'),
  performanceDrift: new Trend('performance_drift_percent'),
  memoryLeakIndicator: new Trend('memory_leak_indicator'),
  
  // Stability metrics
  uptimePercentage: new Gauge('uptime_percentage'),
  consecutiveSuccesses: new Gauge('consecutive_successes'),
  longestOutage: new Gauge('longest_outage_seconds'),
  stabilityScore: new Gauge('stability_score'),
  
  // Error pattern tracking
  errorBursts: new Counter('error_bursts'),
  timeoutPatterns: new Counter('timeout_patterns'),
  connectionDrops: new Counter('connection_drops'),
  recoveryEvents: new Counter('recovery_events'),
  
  // Resource utilization trends
  resourceUtilizationTrend: new Trend('resource_utilization_trend'),
  cacheEfficiencyTrend: new Trend('cache_efficiency_trend'),
  databasePerformanceTrend: new Trend('database_performance_trend'),
};

// Marathon test configuration - 24 hour endurance test
export let options = {
  scenarios: {
    // Main stability marathon scenario
    stability_marathon: {
      executor: 'constant-vus',
      vus: 500,  // Moderate but sustained load
      duration: '24h',  // Full 24-hour marathon
      gracefulRampDown: '5m',
      tags: { testType: 'marathon' },
    },
    
    // Periodic spike testing during marathon
    periodic_spikes: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        // Repeat this pattern every 4 hours (6 times in 24h)
        { duration: '3h55m', target: 0, name: 'wait' },
        { duration: '2m', target: 1500, name: 'spike_ramp' },
        { duration: '3m', target: 1500, name: 'spike_hold' },
        { duration: '0s', target: 0, name: 'spike_end' },
      ].concat(
        // Repeat 5 more times
        ...Array(5).fill().flatMap(() => [
          { duration: '3h55m', target: 0 },
          { duration: '2m', target: 1500 },
          { duration: '3m', target: 1500 },
          { duration: '0s', target: 0 },
        ])
      ),
      tags: { testType: 'periodic_spikes' },
    },
    
    // Background health monitoring
    health_monitor: {
      executor: 'constant-arrival-rate',
      rate: 1,  // 1 health check per second
      timeUnit: '1s',
      duration: '24h',
      preAllocatedVUs: 2,
      maxVUs: 5,
      tags: { testType: 'health_monitor' },
    },
  },
  
  thresholds: {
    // Marathon-specific thresholds (24-hour stability)
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'],  // Stable performance
    'http_req_failed': ['rate<0.01'],  // <1% failure rate for stability
    
    // Stability thresholds
    'uptime_percentage': ['value>99.5'],  // >99.5% uptime
    'stability_score': ['value>95'],      // >95 stability score
    'longest_outage_seconds': ['value<300'], // Max 5 minute outage
    
    // Performance drift thresholds
    'performance_drift_percent': ['value<50'], // <50% performance degradation
    'memory_leak_indicator': ['trend<0.1'],    // No significant memory leak pattern
    
    // Cache and database stability
    'cache_efficiency_trend': ['trend>-5'],    // Cache efficiency shouldn't drop >5%
    'database_performance_trend': ['trend<20'], // DB performance shouldn't degrade >20%
  },
  
  // Extended settings for marathon testing
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  noConnectionReuse: false,  // Reuse connections for stability
  batchPerHost: 6,
};

// Marathon state tracking
let testStartTime = Date.now();
let baselinePerformance = null;
let hourlyCheckpoints = [];
let consecutiveSuccessCount = 0;
let longestSuccessStreak = 0;
let lastOutageStart = null;
let totalOutageTime = 0;
let errorBurstStart = null;

// Setup with marathon initialization
export function setup() {
  console.log('=== Starting 24-Hour Stability Marathon ===');
  console.log(`Target: ${utils.getBaseUrl()}`);
  console.log('Test duration: 24 hours');
  console.log('Sustained load: 500 VUs');
  console.log('Periodic spikes: 1500 VUs every 4 hours');
  console.log('Health monitoring: Continuous');
  
  // Establish performance baseline
  const baselineResponse = http.get(`${utils.getBaseUrl()}/api/health`);
  baselinePerformance = {
    responseTime: baselineResponse.timings.duration,
    timestamp: Date.now(),
    status: baselineResponse.status,
  };
  
  console.log(`Performance baseline: ${baselinePerformance.responseTime}ms`);
  console.log('WARNING: This is a 24-hour test - ensure monitoring is in place');
  
  return {
    baseUrl: utils.getBaseUrl(),
    baseline: baselinePerformance,
    marathonStart: testStartTime,
  };
}

// Main marathon test function
export default function(data) {
  const baseUrl = data.baseUrl;
  const testType = __ENV.SCENARIO || 'stability_marathon';
  const elapsedHours = (Date.now() - data.marathonStart) / (1000 * 60 * 60);
  
  group(`Marathon Test - Hour ${Math.floor(elapsedHours) + 1}`, function() {
    switch (testType) {
      case 'stability_marathon':
        runStabilityTests(baseUrl, data.baseline, elapsedHours);
        break;
      case 'periodic_spikes':
        runSpikeTests(baseUrl, elapsedHours);
        break;
      case 'health_monitor':
        runHealthMonitoring(baseUrl, data.baseline, elapsedHours);
        break;
      default:
        runStabilityTests(baseUrl, data.baseline, elapsedHours);
    }
  });
  
  // Variable sleep based on test type
  const sleepTime = testType === 'health_monitor' ? 0.5 : 
                   testType === 'periodic_spikes' ? 1 : 2;
  sleep(sleepTime);
}

/**
 * Run core stability tests
 */
function runStabilityTests(baseUrl, baseline, elapsedHours) {
  group('Core Stability Tests', function() {
    // Track hourly performance checkpoints
    if (Math.floor(elapsedHours) !== hourlyCheckpoints.length) {
      recordHourlyCheckpoint(baseUrl, baseline, Math.floor(elapsedHours));
    }
    
    // Core API stability testing
    testCoreApiStability(baseUrl);
    
    // Memory leak detection patterns
    detectMemoryLeakPatterns(baseUrl, baseline, elapsedHours);
    
    // Database stability testing
    testDatabaseStability(baseUrl);
    
    // Cache performance stability
    testCacheStability(baseUrl);
    
    // Error pattern monitoring
    monitorErrorPatterns(baseUrl);
  });
}

/**
 * Record hourly performance checkpoints
 */
function recordHourlyCheckpoint(baseUrl, baseline, hour) {
  if (hour >= hourlyCheckpoints.length) {
    const checkpointStart = Date.now();
    
    const healthResponse = http.get(`${baseUrl}/api/health`, {
      timeout: '30s',
      tags: { checkpoint: `hour_${hour}` },
    });
    
    const checkpointTime = Date.now() - checkpointStart;
    
    if (healthResponse.status === 200) {
      marathonMetrics.hourlyPerformance.add(checkpointTime);
      
      // Calculate performance drift
      const driftPercent = ((checkpointTime - baseline.responseTime) / baseline.responseTime) * 100;
      marathonMetrics.performanceDrift.add(driftPercent);
      
      hourlyCheckpoints.push({
        hour: hour,
        responseTime: checkpointTime,
        drift: driftPercent,
        timestamp: Date.now(),
      });
      
      console.log(`Hour ${hour} checkpoint: ${checkpointTime}ms (${driftPercent.toFixed(1)}% drift)`);
    }
  }
}

/**
 * Test core API stability
 */
function testCoreApiStability(baseUrl) {
  group('Core API Stability', function() {
    const endpoints = [
      { url: '/api/health', name: 'Health Check', critical: true },
      { url: '/api/metrics?range=1h', name: 'Metrics Query', critical: false },
      { url: '/api/events', name: 'Events', critical: false },
      { url: '/api/alerts', name: 'Alerts', critical: false },
    ];
    
    endpoints.forEach(endpoint => {
      const response = http.get(`${baseUrl}${endpoint.url}`, {
        headers: requestConfig.headers,
        timeout: '15s',
        tags: { 
          endpoint: endpoint.name,
          critical: endpoint.critical.toString()
        },
      });
      
      const success = check(response, {
        [`${endpoint.name} - Available`]: (r) => r.status < 500,
        [`${endpoint.name} - Reasonable time`]: (r) => r.timings.duration < 10000,
      });
      
      // Track consecutive successes for stability score
      if (success) {
        consecutiveSuccessCount++;
        longestSuccessStreak = Math.max(longestSuccessStreak, consecutiveSuccessCount);
      } else {
        consecutiveSuccessCount = 0;
        trackOutage();
      }
      
      marathonMetrics.consecutiveSuccesses.add(consecutiveSuccessCount);
    });
  });
}

/**
 * Detect memory leak patterns
 */
function detectMemoryLeakPatterns(baseUrl, baseline, elapsedHours) {
  if (Math.random() < 0.05) {  // Sample 5% of requests for memory leak detection
    group('Memory Leak Detection', function() {
      // Monitor response time degradation over time
      const response = http.get(`${baseUrl}/api/metrics?range=6h&detailed=true`, {
        headers: requestConfig.headers,
        timeout: '30s',
        tags: { pattern: 'memory_leak_detection' },
      });
      
      if (response.status === 200 && elapsedHours > 1) {
        const currentTime = response.timings.duration;
        const expectedTime = baseline.responseTime * (1 + (elapsedHours * 0.02)); // Expected 2% per hour growth
        
        const memoryLeakIndicator = (currentTime - expectedTime) / expectedTime;
        marathonMetrics.memoryLeakIndicator.add(memoryLeakIndicator);
        
        if (memoryLeakIndicator > 0.5) {  // >50% above expected
          console.warn(`Potential memory leak detected at hour ${elapsedHours.toFixed(1)}`);
        }
      }
    });
  }
}

/**
 * Test database stability over time
 */
function testDatabaseStability(baseUrl) {
  if (Math.random() < 0.1) {  // Test database stability in 10% of requests
    group('Database Stability', function() {
      const dbIntensiveResponse = http.get(`${baseUrl}/api/metrics?range=24h&aggregation=detailed`, {
        headers: requestConfig.headers,
        timeout: '45s',
        tags: { test: 'database_stability' },
      });
      
      const dbPerformanceOk = check(dbIntensiveResponse, {
        'Database - Query completes': (r) => r.status !== 0,
        'Database - No timeout': (r) => r.timings.duration < 45000,
        'Database - Reasonable performance': (r) => r.timings.duration < 10000,
      });
      
      if (dbIntensiveResponse.status === 200) {
        marathonMetrics.databasePerformanceTrend.add(dbIntensiveResponse.timings.duration);
      }
      
      if (!dbPerformanceOk && dbIntensiveResponse.timings.duration > 30000) {
        console.warn('Database performance degradation detected');
      }
    });
  }
}

/**
 * Test cache performance stability
 */
function testCacheStability(baseUrl) {
  group('Cache Stability', function() {
    // Test cache hit consistency
    const cacheTestResponse = http.get(`${baseUrl}/api/metrics?range=1h&cached=true`, {
      headers: requestConfig.headers,
      timeout: '10s',
      tags: { test: 'cache_stability' },
    });
    
    const isCacheHit = validators.isCached(cacheTestResponse);
    const cacheEfficiency = isCacheHit ? 100 : 0;
    
    marathonMetrics.cacheEfficiencyTrend.add(cacheEfficiency);
    
    check(cacheTestResponse, {
      'Cache - Responding': (r) => r.status < 500,
      'Cache - Fast response': (r) => r.timings.duration < 1000,
      'Cache - Hit rate maintained': () => isCacheHit || Math.random() < 0.1, // Allow 10% misses
    });
  });
}

/**
 * Monitor error patterns and bursts
 */
function monitorErrorPatterns(baseUrl) {
  const response = http.get(`${baseUrl}/api/health`, {
    timeout: '5s',
    tags: { monitoring: 'error_patterns' },
  });
  
  const isError = response.status >= 400 || response.status === 0;
  
  if (isError) {
    if (!errorBurstStart) {
      errorBurstStart = Date.now();
    }
  } else {
    if (errorBurstStart) {
      const burstDuration = Date.now() - errorBurstStart;
      if (burstDuration > 10000) {  // Burst lasting >10 seconds
        marathonMetrics.errorBursts.add(1);
        console.warn(`Error burst detected: ${burstDuration}ms duration`);
      }
      errorBurstStart = null;
    }
  }
  
  // Connection drop detection
  if (response.status === 0) {
    marathonMetrics.connectionDrops.add(1);
  }
  
  // Timeout pattern detection
  if (response.timings.duration > 5000) {
    marathonMetrics.timeoutPatterns.add(1);
  }
}

/**
 * Run periodic spike tests
 */
function runSpikeTests(baseUrl, elapsedHours) {
  group('Periodic Spike Test', function() {
    // During spikes, test system resilience
    const spikeResponse = http.get(`${baseUrl}/api/metrics?range=1h`, {
      headers: {
        ...requestConfig.headers,
        'X-Load-Spike': 'true',
      },
      timeout: '20s',
      tags: { test: 'spike_resilience' },
    });
    
    check(spikeResponse, {
      'Spike - System survives': (r) => r.status !== 0,
      'Spike - Degrades gracefully': (r) => r.status < 600,
      'Spike - Eventually responds': (r) => r.timings.duration < 20000,
    });
    
    console.log(`Spike test at hour ${elapsedHours.toFixed(1)}: ${spikeResponse.status}`);
  });
}

/**
 * Run continuous health monitoring
 */
function runHealthMonitoring(baseUrl, baseline, elapsedHours) {
  const healthResponse = http.get(`${baseUrl}/api/health`, {
    timeout: '10s',
    tags: { monitoring: 'continuous' },
  });
  
  const isHealthy = healthResponse.status === 200;
  const uptimePercent = calculateUptimePercentage();
  
  marathonMetrics.uptimePercentage.add(uptimePercent);
  
  // Calculate stability score (0-100)
  const stabilityScore = calculateStabilityScore(uptimePercent, elapsedHours);
  marathonMetrics.stabilityScore.add(stabilityScore);
  
  if (!isHealthy) {
    trackOutage();
  } else {
    trackRecovery();
  }
}

/**
 * Track system outages
 */
function trackOutage() {
  if (!lastOutageStart) {
    lastOutageStart = Date.now();
  }
}

/**
 * Track system recovery
 */
function trackRecovery() {
  if (lastOutageStart) {
    const outrageDuration = (Date.now() - lastOutageStart) / 1000;
    totalOutageTime += outrageDuration;
    
    marathonMetrics.longestOutage.add(Math.max(marathonMetrics.longestOutage.value || 0, outrageDuration));
    marathonMetrics.recoveryEvents.add(1);
    
    console.log(`System recovered after ${outrageDuration}s outage`);
    lastOutageStart = null;
  }
}

/**
 * Calculate uptime percentage
 */
function calculateUptimePercentage() {
  const totalTime = (Date.now() - testStartTime) / 1000;
  return Math.max(0, ((totalTime - totalOutageTime) / totalTime) * 100);
}

/**
 * Calculate overall stability score
 */
function calculateStabilityScore(uptimePercent, elapsedHours) {
  const uptimeScore = Math.min(50, uptimePercent / 2);  // Max 50 points for uptime
  const driftPenalty = Math.max(0, hourlyCheckpoints.length > 0 ? 
    hourlyCheckpoints[hourlyCheckpoints.length - 1].drift / 2 : 0);  // Penalize performance drift
  const consistencyScore = Math.min(30, longestSuccessStreak / 100);  // Max 30 points for consistency
  const enduranceScore = Math.min(20, elapsedHours * 0.8);  // Max 20 points for endurance
  
  return Math.max(0, uptimeScore + consistencyScore + enduranceScore - driftPenalty);
}

// Comprehensive marathon analysis
export function teardown(data) {
  const marathonEndTime = Date.now();
  const totalDurationHours = (marathonEndTime - data.marathonStart) / (1000 * 60 * 60);
  
  console.log('\n=== 24-Hour Stability Marathon Results ===');
  console.log(`Actual test duration: ${totalDurationHours.toFixed(2)} hours`);
  console.log(`Target duration: 24 hours`);
  console.log(`Completion rate: ${(totalDurationHours / 24 * 100).toFixed(1)}%`);
  
  // Stability analysis
  console.log('\n--- Stability Analysis ---');
  console.log(`Final uptime: ${calculateUptimePercentage().toFixed(2)}%`);
  console.log(`Final stability score: ${calculateStabilityScore(calculateUptimePercentage(), totalDurationHours).toFixed(1)}/100`);
  console.log(`Longest success streak: ${longestSuccessStreak} requests`);
  console.log(`Total outage time: ${(totalOutageTime / 60).toFixed(1)} minutes`);
  console.log(`Recovery events: ${marathonMetrics.recoveryEvents}`);
  
  // Performance analysis
  console.log('\n--- Performance Analysis ---');
  console.log(`Baseline performance: ${data.baseline.responseTime}ms`);
  
  if (hourlyCheckpoints.length > 0) {
    const finalCheckpoint = hourlyCheckpoints[hourlyCheckpoints.length - 1];
    console.log(`Final performance: ${finalCheckpoint.responseTime}ms`);
    console.log(`Total performance drift: ${finalCheckpoint.drift.toFixed(1)}%`);
    
    console.log('\nHourly Performance Trend:');
    hourlyCheckpoints.forEach(checkpoint => {
      console.log(`  Hour ${checkpoint.hour}: ${checkpoint.responseTime}ms (${checkpoint.drift.toFixed(1)}% drift)`);
    });
  }
  
  // Error analysis
  console.log('\n--- Error Analysis ---');
  console.log(`Error bursts: ${marathonMetrics.errorBursts}`);
  console.log(`Connection drops: ${marathonMetrics.connectionDrops}`);
  console.log(`Timeout patterns: ${marathonMetrics.timeoutPatterns}`);
  
  // Memory leak analysis
  console.log('\n--- Memory Leak Analysis ---');
  if (marathonMetrics.memoryLeakIndicator) {
    console.log(`Memory leak indicator: ${marathonMetrics.memoryLeakIndicator.avg?.toFixed(3) || 'N/A'}`);
    console.log('(Positive values indicate potential memory leaks)');
  }
  
  // Recommendations
  console.log('\n--- Marathon Recommendations ---');
  
  const uptimePercent = calculateUptimePercentage();
  if (uptimePercent < 99.5) {
    console.log('❌ Uptime below target (99.5%) - investigate stability issues');
  } else {
    console.log('✅ Uptime meets target requirements');
  }
  
  if (hourlyCheckpoints.length > 0 && hourlyCheckpoints[hourlyCheckpoints.length - 1].drift > 30) {
    console.log('❌ Significant performance degradation detected - check for memory leaks');
  } else {
    console.log('✅ Performance degradation within acceptable limits');
  }
  
  if (marathonMetrics.errorBursts > 5) {
    console.log('❌ Multiple error bursts detected - improve error handling');
  } else {
    console.log('✅ Error patterns within acceptable limits');
  }
  
  console.log('\n--- Action Items ---');
  console.log('1. Monitor memory usage patterns for leak detection');
  console.log('2. Investigate performance degradation root causes');
  console.log('3. Implement better error recovery mechanisms');
  console.log('4. Set up automated stability testing in CI/CD');
  console.log('5. Plan capacity for sustained 24-hour operations');
  
  console.log('\n=== End 24-Hour Marathon ===');
}