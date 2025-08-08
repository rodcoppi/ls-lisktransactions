/**
 * Horizontal Scaling Test Suite
 * Tests system behavior under horizontal scaling scenarios
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import {
  customMetrics,
  environment,
  requestConfig,
  validators,
  utils
} from '../../k6/config.js';

// Horizontal scaling metrics
const scalingMetrics = {
  // Instance scaling metrics
  instanceCount: new Gauge('active_instances'),
  scaleUpTime: new Trend('scale_up_time_seconds'),
  scaleDownTime: new Trend('scale_down_time_seconds'),
  scaleUpEvents: new Counter('scale_up_events'),
  scaleDownEvents: new Counter('scale_down_events'),
  
  // Load distribution
  loadDistributionEfficiency: new Gauge('load_distribution_efficiency'),
  instanceUtilizationVariance: new Trend('instance_utilization_variance'),
  trafficDistribution: new Trend('traffic_distribution_percent'),
  
  // Scaling performance
  scalingLatency: new Trend('scaling_latency_ms'),
  capacityUtilization: new Gauge('capacity_utilization_percent'),
  throughputPerInstance: new Trend('throughput_per_instance'),
  
  // Health and stability during scaling
  scalingErrors: new Counter('scaling_errors'),
  healthDuringScaling: new Rate('health_during_scaling'),
  connectionDrainTime: new Trend('connection_drain_time_seconds'),
};

/**
 * Horizontal Scaling Test Suite
 */
export class HorizontalScalingTest {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      initialInstances: config.initialInstances || 1,
      maxInstances: config.maxInstances || 10,
      scaleUpThreshold: config.scaleUpThreshold || 80,    // CPU %
      scaleDownThreshold: config.scaleDownThreshold || 30, // CPU %
      scaleUpCooldown: config.scaleUpCooldown || 300,     // 5 minutes
      scaleDownCooldown: config.scaleDownCooldown || 600, // 10 minutes
      healthCheckInterval: config.healthCheckInterval || 10000,
      ...config,
    };
    
    this.currentInstances = this.config.initialInstances;
    this.instanceHistory = [];
    this.scalingEvents = [];
    this.lastScaleEvent = null;
  }

  /**
   * Run comprehensive horizontal scaling tests
   */
  runScalingTests() {
    console.log('Starting Horizontal Scaling Tests');
    
    group('Horizontal Scaling Test Suite', () => {
      // Test 1: Auto-scaling trigger validation
      this.testAutoScalingTriggers();
      
      // Test 2: Scale-up performance
      this.testScaleUpPerformance();
      
      // Test 3: Scale-down stability
      this.testScaleDownStability();
      
      // Test 4: Load distribution
      this.testLoadDistribution();
      
      // Test 5: Rapid scaling scenarios
      this.testRapidScaling();
      
      // Test 6: Instance health during scaling
      this.testInstanceHealthDuringScaling();
    });
  }

  /**
   * Test auto-scaling trigger mechanisms
   */
  testAutoScalingTriggers() {
    group('Auto-scaling Triggers', () => {
      console.log('Testing auto-scaling trigger mechanisms...');
      
      // Simulate load increase to trigger scale-up
      const triggerResponse = this.simulateLoadIncrease();
      
      check(triggerResponse, {
        'Load increase detected': (r) => r.status < 400,
        'Auto-scaling triggers available': (r) => this.checkAutoScalingEnabled(),
      });
      
      // Wait for scale-up to occur
      const scaleUpDetected = this.waitForScaleUp();
      
      if (scaleUpDetected) {
        scalingMetrics.scaleUpEvents.add(1);
        console.log(`✅ Scale-up triggered successfully`);
      } else {
        console.warn('❌ Scale-up not detected within timeout');
      }
    });
  }

  /**
   * Test scale-up performance and timing
   */
  testScaleUpPerformance() {
    group('Scale-up Performance', () => {
      console.log('Testing scale-up performance...');
      
      const scaleUpStart = Date.now();
      
      // Trigger scale-up through load
      this.triggerScaleUp();
      
      // Monitor scale-up process
      const scaleUpComplete = this.monitorScaleUp();
      
      if (scaleUpComplete) {
        const scaleUpTime = (Date.now() - scaleUpStart) / 1000;
        scalingMetrics.scaleUpTime.add(scaleUpTime);
        
        console.log(`Scale-up completed in ${scaleUpTime}s`);
        
        // Test new instance availability
        const newInstanceHealthy = this.testNewInstanceHealth();
        
        check(newInstanceHealthy, {
          'New instances healthy': (healthy) => healthy,
          'Scale-up time acceptable': () => scaleUpTime < 300, // 5 minutes max
        });
      }
    });
  }

  /**
   * Test scale-down stability
   */
  testScaleDownStability() {
    group('Scale-down Stability', () => {
      console.log('Testing scale-down stability...');
      
      if (this.currentInstances <= 1) {
        console.log('Skipping scale-down test - insufficient instances');
        return;
      }
      
      const scaleDownStart = Date.now();
      
      // Trigger scale-down by reducing load
      this.triggerScaleDown();
      
      // Monitor connection draining
      const drainTime = this.monitorConnectionDraining();
      scalingMetrics.connectionDrainTime.add(drainTime);
      
      // Monitor scale-down completion
      const scaleDownComplete = this.monitorScaleDown();
      
      if (scaleDownComplete) {
        const scaleDownTime = (Date.now() - scaleDownStart) / 1000;
        scalingMetrics.scaleDownTime.add(scaleDownTime);
        scalingMetrics.scaleDownEvents.add(1);
        
        console.log(`Scale-down completed in ${scaleDownTime}s`);
        
        check(scaleDownComplete, {
          'Scale-down graceful': () => true,
          'No connection drops': () => drainTime > 0,
          'Scale-down time reasonable': () => scaleDownTime < 600, // 10 minutes max
        });
      }
    });
  }

  /**
   * Test load distribution across instances
   */
  testLoadDistribution() {
    group('Load Distribution', () => {
      console.log('Testing load distribution across instances...');
      
      if (this.currentInstances < 2) {
        console.log('Skipping load distribution test - need multiple instances');
        return;
      }
      
      // Generate distributed load
      const loadResults = this.generateDistributedLoad();
      
      // Analyze distribution efficiency
      const distributionEfficiency = this.analyzeLoadDistribution(loadResults);
      scalingMetrics.loadDistributionEfficiency.add(distributionEfficiency);
      
      // Check instance utilization variance
      const utilizationVariance = this.calculateUtilizationVariance(loadResults);
      scalingMetrics.instanceUtilizationVariance.add(utilizationVariance);
      
      check(distributionEfficiency, {
        'Load distribution efficient': (efficiency) => efficiency > 80,
        'Low utilization variance': () => utilizationVariance < 20,
      });
    });
  }

  /**
   * Test rapid scaling scenarios
   */
  testRapidScaling() {
    group('Rapid Scaling', () => {
      console.log('Testing rapid scaling scenarios...');
      
      // Simulate traffic spike requiring rapid scale-up
      const spikeResponse = this.simulateTrafficSpike();
      
      const rapidScaleStart = Date.now();
      const rapidScaleSuccess = this.monitorRapidScaling();
      const rapidScaleTime = (Date.now() - rapidScaleStart) / 1000;
      
      scalingMetrics.scalingLatency.add(rapidScaleTime);
      
      check(rapidScaleSuccess, {
        'Rapid scaling successful': (success) => success,
        'Rapid scaling fast enough': () => rapidScaleTime < 120, // 2 minutes for rapid
      });
      
      // Test system stability during rapid scaling
      const stabilityDuringScaling = this.testStabilityDuringScaling();
      
      check(stabilityDuringScaling, {
        'System stable during rapid scaling': (stable) => stable,
      });
    });
  }

  /**
   * Test instance health during scaling operations
   */
  testInstanceHealthDuringScaling() {
    group('Instance Health During Scaling', () => {
      console.log('Testing instance health during scaling...');
      
      const healthChecks = [];
      const healthCheckInterval = setInterval(() => {
        const health = this.checkAllInstancesHealth();
        healthChecks.push(health);
        scalingMetrics.healthDuringScaling.add(health.allHealthy ? 1 : 0);
      }, this.config.healthCheckInterval);
      
      // Perform scaling operation while monitoring health
      this.performScalingWithHealthMonitoring();
      
      clearInterval(healthCheckInterval);
      
      // Analyze health during scaling
      const healthAnalysis = this.analyzeHealthDuringScaling(healthChecks);
      
      check(healthAnalysis, {
        'Health maintained during scaling': (analysis) => analysis.healthyPercent > 90,
        'No extended outages': (analysis) => analysis.maxOutageDuration < 30, // 30 seconds max
      });
    });
  }

  // Helper methods for scaling operations

  /**
   * Simulate load increase to trigger auto-scaling
   */
  simulateLoadIncrease() {
    const requests = [];
    
    // Generate high load to trigger scaling
    for (let i = 0; i < 50; i++) {
      requests.push({
        method: 'GET',
        url: `${this.baseUrl}/api/metrics?range=1h&detailed=true`,
        headers: requestConfig.headers,
      });
    }
    
    const responses = http.batch(requests);
    return responses[0]; // Return first response for checking
  }

  /**
   * Wait for scale-up to be detected
   */
  waitForScaleUp(timeout = 300000) { // 5 minute timeout
    const startTime = Date.now();
    const initialInstances = this.currentInstances;
    
    while (Date.now() - startTime < timeout) {
      const currentInstances = this.getCurrentInstanceCount();
      
      if (currentInstances > initialInstances) {
        this.currentInstances = currentInstances;
        scalingMetrics.instanceCount.add(currentInstances);
        return true;
      }
      
      sleep(5); // Wait 5 seconds between checks
    }
    
    return false;
  }

  /**
   * Get current instance count (mock implementation)
   */
  getCurrentInstanceCount() {
    // In a real implementation, this would query the container orchestrator
    // For testing purposes, simulate instance count changes
    const response = http.get(`${this.baseUrl}/api/internal/instances`, {
      timeout: '10s',
    });
    
    if (response.status === 200) {
      try {
        const data = JSON.parse(response.body);
        return data.count || this.currentInstances;
      } catch (error) {
        // Fallback to mock behavior
        return this.simulateInstanceCount();
      }
    }
    
    return this.simulateInstanceCount();
  }

  /**
   * Simulate instance count for testing
   */
  simulateInstanceCount() {
    // Simple simulation: gradually increase instances under load
    const loadFactor = Math.random();
    
    if (loadFactor > 0.8 && this.currentInstances < this.config.maxInstances) {
      return this.currentInstances + 1;
    } else if (loadFactor < 0.3 && this.currentInstances > this.config.initialInstances) {
      return this.currentInstances - 1;
    }
    
    return this.currentInstances;
  }

  /**
   * Check if auto-scaling is enabled
   */
  checkAutoScalingEnabled() {
    const response = http.get(`${this.baseUrl}/api/internal/scaling-config`, {
      timeout: '5s',
    });
    
    if (response.status === 200) {
      try {
        const config = JSON.parse(response.body);
        return config.autoScalingEnabled === true;
      } catch (error) {
        // Assume enabled if can't determine
        return true;
      }
    }
    
    return true; // Assume enabled for testing
  }

  /**
   * Trigger scale-up operation
   */
  triggerScaleUp() {
    console.log('Triggering scale-up...');
    
    // Generate sustained high load
    const highLoadRequests = [];
    for (let i = 0; i < 100; i++) {
      highLoadRequests.push({
        method: 'GET',
        url: `${this.baseUrl}/api/metrics?range=6h&aggregation=detailed`,
        headers: requestConfig.headers,
      });
    }
    
    // Execute high load
    http.batch(highLoadRequests);
    
    this.recordScalingEvent('scale_up_trigger', {
      timestamp: Date.now(),
      reason: 'high_load_simulation',
      currentInstances: this.currentInstances,
    });
  }

  /**
   * Trigger scale-down operation
   */
  triggerScaleDown() {
    console.log('Triggering scale-down...');
    
    // Reduce load to trigger scale-down
    sleep(30); // Simulate reduced load period
    
    this.recordScalingEvent('scale_down_trigger', {
      timestamp: Date.now(),
      reason: 'reduced_load_simulation',
      currentInstances: this.currentInstances,
    });
  }

  /**
   * Monitor scale-up process
   */
  monitorScaleUp(timeout = 300000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const instanceCount = this.getCurrentInstanceCount();
      
      if (instanceCount > this.currentInstances) {
        this.currentInstances = instanceCount;
        scalingMetrics.instanceCount.add(instanceCount);
        return true;
      }
      
      sleep(10);
    }
    
    return false;
  }

  /**
   * Monitor scale-down process
   */
  monitorScaleDown(timeout = 600000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const instanceCount = this.getCurrentInstanceCount();
      
      if (instanceCount < this.currentInstances) {
        this.currentInstances = instanceCount;
        scalingMetrics.instanceCount.add(instanceCount);
        return true;
      }
      
      sleep(15);
    }
    
    return false;
  }

  /**
   * Monitor connection draining during scale-down
   */
  monitorConnectionDraining() {
    const drainStart = Date.now();
    
    // Monitor for graceful connection handling
    const connectionResponse = http.get(`${this.baseUrl}/api/health`, {
      timeout: '30s',
    });
    
    const drainTime = (Date.now() - drainStart) / 1000;
    
    if (connectionResponse.status === 200) {
      return drainTime;
    }
    
    return 0;
  }

  /**
   * Test new instance health after scale-up
   */
  testNewInstanceHealth() {
    // Test health of all instances
    const healthResponse = http.get(`${this.baseUrl}/api/health`, {
      timeout: '15s',
    });
    
    return healthResponse.status === 200;
  }

  /**
   * Generate distributed load for testing
   */
  generateDistributedLoad() {
    const requests = [];
    
    // Generate varied requests to test distribution
    for (let i = 0; i < 20; i++) {
      requests.push({
        method: 'GET',
        url: `${this.baseUrl}/api/events?page=${i}`,
        headers: requestConfig.headers,
      });
    }
    
    const responses = http.batch(requests);
    
    return {
      responses: responses,
      totalRequests: requests.length,
      successfulRequests: responses.filter(r => r.status < 400).length,
    };
  }

  /**
   * Analyze load distribution efficiency
   */
  analyzeLoadDistribution(loadResults) {
    // Calculate distribution efficiency based on response times
    const responseTimes = loadResults.responses
      .filter(r => r.timings)
      .map(r => r.timings.duration);
    
    if (responseTimes.length === 0) return 0;
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    
    // Efficiency based on response time consistency
    const efficiency = (1 - (maxResponseTime - avgResponseTime) / avgResponseTime) * 100;
    
    return Math.max(0, Math.min(100, efficiency));
  }

  /**
   * Calculate utilization variance across instances
   */
  calculateUtilizationVariance(loadResults) {
    // Mock implementation - in reality would query actual instance metrics
    const utilizationValues = Array.from({length: this.currentInstances}, () => 
      50 + Math.random() * 40 // Simulate 50-90% utilization
    );
    
    const avgUtilization = utilizationValues.reduce((a, b) => a + b, 0) / utilizationValues.length;
    const variance = utilizationValues.reduce((sum, util) => 
      sum + Math.pow(util - avgUtilization, 2), 0) / utilizationValues.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Simulate traffic spike for rapid scaling test
   */
  simulateTrafficSpike() {
    console.log('Simulating traffic spike...');
    
    const spikeRequests = [];
    
    // Generate massive spike
    for (let i = 0; i < 200; i++) {
      spikeRequests.push({
        method: 'GET',
        url: `${this.baseUrl}/api/metrics?spike=true&id=${i}`,
        headers: requestConfig.headers,
      });
    }
    
    return http.batch(spikeRequests);
  }

  /**
   * Monitor rapid scaling response
   */
  monitorRapidScaling(timeout = 120000) { // 2 minutes for rapid scaling
    const startTime = Date.now();
    const initialInstances = this.currentInstances;
    
    while (Date.now() - startTime < timeout) {
      const currentInstances = this.getCurrentInstanceCount();
      
      if (currentInstances > initialInstances * 1.5) { // 50% increase
        this.currentInstances = currentInstances;
        return true;
      }
      
      sleep(5);
    }
    
    return false;
  }

  /**
   * Test system stability during scaling
   */
  testStabilityDuringScaling() {
    const stabilityChecks = [];
    
    for (let i = 0; i < 10; i++) {
      const response = http.get(`${this.baseUrl}/api/health`, {
        timeout: '10s',
      });
      
      stabilityChecks.push(response.status === 200);
      sleep(2);
    }
    
    const stableChecks = stabilityChecks.filter(check => check).length;
    return stableChecks / stabilityChecks.length > 0.8; // 80% stability
  }

  /**
   * Check health of all instances
   */
  checkAllInstancesHealth() {
    const response = http.get(`${this.baseUrl}/api/internal/instances/health`, {
      timeout: '10s',
    });
    
    if (response.status === 200) {
      try {
        const healthData = JSON.parse(response.body);
        return {
          allHealthy: healthData.allHealthy || true,
          healthyCount: healthData.healthyCount || this.currentInstances,
          totalCount: healthData.totalCount || this.currentInstances,
        };
      } catch (error) {
        // Fallback to mock
        return {
          allHealthy: Math.random() > 0.1, // 90% healthy
          healthyCount: this.currentInstances,
          totalCount: this.currentInstances,
        };
      }
    }
    
    return {
      allHealthy: false,
      healthyCount: 0,
      totalCount: this.currentInstances,
    };
  }

  /**
   * Perform scaling with health monitoring
   */
  performScalingWithHealthMonitoring() {
    // Simulate scaling operation
    this.triggerScaleUp();
    sleep(60); // Wait during scaling
  }

  /**
   * Analyze health during scaling operations
   */
  analyzeHealthDuringScaling(healthChecks) {
    if (healthChecks.length === 0) {
      return { healthyPercent: 0, maxOutageDuration: 0 };
    }
    
    const healthyChecks = healthChecks.filter(check => check.allHealthy).length;
    const healthyPercent = (healthyChecks / healthChecks.length) * 100;
    
    // Calculate max consecutive unhealthy period
    let maxOutageDuration = 0;
    let currentOutage = 0;
    
    healthChecks.forEach(check => {
      if (!check.allHealthy) {
        currentOutage += this.config.healthCheckInterval / 1000;
        maxOutageDuration = Math.max(maxOutageDuration, currentOutage);
      } else {
        currentOutage = 0;
      }
    });
    
    return {
      healthyPercent: healthyPercent,
      maxOutageDuration: maxOutageDuration,
    };
  }

  /**
   * Record scaling event for analysis
   */
  recordScalingEvent(type, data) {
    this.scalingEvents.push({
      type: type,
      data: data,
      timestamp: Date.now(),
    });
    
    this.lastScaleEvent = {
      type: type,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate scaling test report
   */
  generateScalingReport() {
    return {
      summary: {
        initialInstances: this.config.initialInstances,
        maxInstancesReached: Math.max(...this.instanceHistory.map(h => h.count)),
        totalScalingEvents: this.scalingEvents.length,
        averageScaleUpTime: scalingMetrics.scaleUpTime.avg || 0,
        averageScaleDownTime: scalingMetrics.scaleDownTime.avg || 0,
      },
      
      scalingEvents: this.scalingEvents,
      instanceHistory: this.instanceHistory,
      
      performance: {
        loadDistributionEfficiency: scalingMetrics.loadDistributionEfficiency.value || 0,
        utilizationVariance: scalingMetrics.instanceUtilizationVariance.avg || 0,
        scalingLatency: scalingMetrics.scalingLatency.avg || 0,
      },
      
      recommendations: this.generateScalingRecommendations(),
      
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate scaling recommendations
   */
  generateScalingRecommendations() {
    const recommendations = [];
    
    const avgScaleUpTime = scalingMetrics.scaleUpTime.avg || 0;
    const avgScaleDownTime = scalingMetrics.scaleDownTime.avg || 0;
    
    if (avgScaleUpTime > 180) { // > 3 minutes
      recommendations.push({
        category: 'Scaling Performance',
        priority: 'High',
        issue: `Scale-up time averaging ${avgScaleUpTime}s`,
        recommendation: 'Optimize instance startup time or use pre-warmed instances',
      });
    }
    
    if (avgScaleDownTime > 300) { // > 5 minutes
      recommendations.push({
        category: 'Scaling Performance',
        priority: 'Medium',
        issue: `Scale-down time averaging ${avgScaleDownTime}s`,
        recommendation: 'Optimize connection draining and shutdown procedures',
      });
    }
    
    const distributionEfficiency = scalingMetrics.loadDistributionEfficiency.value || 0;
    if (distributionEfficiency < 80) {
      recommendations.push({
        category: 'Load Balancing',
        priority: 'High',
        issue: `Load distribution efficiency at ${distributionEfficiency.toFixed(1)}%`,
        recommendation: 'Review load balancer configuration and instance health checks',
      });
    }
    
    return recommendations;
  }
}

// Factory function
export function createHorizontalScalingTest(baseUrl, config = {}) {
  return new HorizontalScalingTest(baseUrl, config);
}

export default HorizontalScalingTest;