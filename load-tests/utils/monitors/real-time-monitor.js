/**
 * Real-time Performance Monitoring System
 * Continuously monitors system performance and detects bottlenecks during load testing
 */

import http from 'k6/http';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// Real-time monitoring metrics
export const monitoringMetrics = {
  // System health metrics
  healthScore: new Gauge('system_health_score'),
  availabilityPercent: new Gauge('system_availability_percent'),
  
  // Performance trends
  responseTimeTrend: new Trend('response_time_trend'),
  throughputTrend: new Trend('throughput_trend'),
  errorRateTrend: new Trend('error_rate_trend'),
  
  // Resource utilization
  cpuUtilization: new Gauge('cpu_utilization_percent'),
  memoryUtilization: new Gauge('memory_utilization_percent'),
  diskUtilization: new Gauge('disk_utilization_percent'),
  networkUtilization: new Gauge('network_utilization_percent'),
  
  // Database performance
  dbConnectionsActive: new Gauge('db_connections_active'),
  dbConnectionsMax: new Gauge('db_connections_max'),
  dbQueryQueue: new Gauge('db_query_queue_length'),
  dbSlowQueries: new Counter('db_slow_queries'),
  
  // Cache performance
  cacheHitRateRealTime: new Gauge('cache_hit_rate_realtime'),
  cacheMemoryUsage: new Gauge('cache_memory_usage_percent'),
  cacheEvictions: new Counter('cache_evictions'),
  
  // Bottleneck detection
  bottleneckDetected: new Counter('bottleneck_detected'),
  bottleneckType: new Gauge('bottleneck_type_id'),
  bottleneckSeverity: new Gauge('bottleneck_severity_score'),
};

/**
 * Real-time Performance Monitor
 * Continuously monitors system performance and detects issues
 */
export class RealTimeMonitor {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      monitoringInterval: config.monitoringInterval || 5000,    // 5 seconds
      healthCheckInterval: config.healthCheckInterval || 10000,  // 10 seconds
      bottleneckThreshold: config.bottleneckThreshold || 0.8,   // 80%
      alertThreshold: config.alertThreshold || 0.9,             // 90%
      ...config,
    };
    
    this.isMonitoring = false;
    this.healthHistory = [];
    this.performanceBaseline = null;
    this.detectedBottlenecks = [];
    this.alerts = [];
    
    // Bottleneck types
    this.bottleneckTypes = {
      CPU: 1,
      MEMORY: 2,
      DATABASE: 3,
      CACHE: 4,
      NETWORK: 5,
      DISK: 6,
    };
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {
      console.log('Monitoring already started');
      return;
    }
    
    this.isMonitoring = true;
    console.log('Starting real-time performance monitoring...');
    
    // Establish baseline
    this.establishBaseline();
    
    // Start monitoring loops
    this.startHealthMonitoring();
    this.startPerformanceMonitoring();
    this.startBottleneckDetection();
    
    console.log(`Real-time monitoring started with ${this.config.monitoringInterval}ms intervals`);
  }

  /**
   * Stop real-time monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false;
    console.log('Real-time monitoring stopped');
    
    // Generate final monitoring report
    return this.generateMonitoringReport();
  }

  /**
   * Establish performance baseline
   */
  establishBaseline() {
    console.log('Establishing performance baseline...');
    
    try {
      const healthResponse = http.get(`${this.baseUrl}/api/health`, {
        timeout: '10s',
        tags: { monitoring: 'baseline' },
      });
      
      if (healthResponse.status === 200) {
        this.performanceBaseline = {
          responseTime: healthResponse.timings.duration,
          timestamp: Date.now(),
          status: healthResponse.status,
        };
        
        console.log(`Performance baseline established: ${this.performanceBaseline.responseTime}ms`);
      } else {
        console.warn('Failed to establish baseline - system may already be under stress');
      }
    } catch (error) {
      console.error('Failed to establish baseline:', error);
    }
  }

  /**
   * Start health monitoring loop
   */
  startHealthMonitoring() {
    const healthMonitor = () => {
      if (!this.isMonitoring) return;
      
      try {
        this.checkSystemHealth();
      } catch (error) {
        console.error('Health monitoring error:', error);
      }
      
      // Schedule next health check
      setTimeout(healthMonitor, this.config.healthCheckInterval);
    };
    
    // Start health monitoring
    setTimeout(healthMonitor, 1000);
  }

  /**
   * Start performance monitoring loop
   */
  startPerformanceMonitoring() {
    const performanceMonitor = () => {
      if (!this.isMonitoring) return;
      
      try {
        this.collectPerformanceMetrics();
      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
      
      // Schedule next performance check
      setTimeout(performanceMonitor, this.config.monitoringInterval);
    };
    
    // Start performance monitoring
    setTimeout(performanceMonitor, 2000);
  }

  /**
   * Start bottleneck detection
   */
  startBottleneckDetection() {
    const bottleneckDetector = () => {
      if (!this.isMonitoring) return;
      
      try {
        this.detectBottlenecks();
      } catch (error) {
        console.error('Bottleneck detection error:', error);
      }
      
      // Schedule next bottleneck check
      setTimeout(bottleneckDetector, this.config.monitoringInterval * 2);
    };
    
    // Start bottleneck detection
    setTimeout(bottleneckDetector, 3000);
  }

  /**
   * Check overall system health
   */
  checkSystemHealth() {
    const healthResponse = http.get(`${this.baseUrl}/api/health`, {
      timeout: '15s',
      tags: { monitoring: 'health' },
    });
    
    const healthData = {
      timestamp: Date.now(),
      status: healthResponse.status,
      responseTime: healthResponse.timings?.duration || 0,
      available: healthResponse.status === 200,
    };
    
    // Parse health response if available
    if (healthResponse.status === 200 && healthResponse.body) {
      try {
        const healthBody = JSON.parse(healthResponse.body);
        healthData.services = healthBody.checks || {};
        healthData.systemLoad = healthBody.systemLoad || {};
      } catch (error) {
        console.warn('Failed to parse health response body');
      }
    }
    
    this.healthHistory.push(healthData);
    
    // Keep only last 100 health checks
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }
    
    // Calculate health score
    const healthScore = this.calculateHealthScore(healthData);
    monitoringMetrics.healthScore.add(healthScore);
    
    // Calculate availability
    const availability = this.calculateAvailability();
    monitoringMetrics.availabilityPercent.add(availability);
    
    // Check for alerts
    if (healthScore < this.config.alertThreshold * 100) {
      this.triggerAlert('health', `System health score dropped to ${healthScore.toFixed(1)}%`);
    }
    
    return healthData;
  }

  /**
   * Collect detailed performance metrics
   */
  collectPerformanceMetrics() {
    // Collect system metrics via API
    const metricsResponse = http.get(`${this.baseUrl}/api/metrics?internal=true`, {
      timeout: '10s',
      tags: { monitoring: 'performance' },
    });
    
    if (metricsResponse.status === 200) {
      try {
        const metrics = JSON.parse(metricsResponse.body);
        this.processPerformanceMetrics(metrics);
      } catch (error) {
        console.warn('Failed to parse performance metrics');
      }
    }
    
    // Record response time trend
    monitoringMetrics.responseTimeTrend.add(metricsResponse.timings?.duration || 0);
    
    // Collect database metrics
    this.collectDatabaseMetrics();
    
    // Collect cache metrics
    this.collectCacheMetrics();
  }

  /**
   * Process performance metrics from API response
   */
  processPerformanceMetrics(metrics) {
    // CPU utilization
    if (metrics.system?.cpu) {
      monitoringMetrics.cpuUtilization.add(metrics.system.cpu.percent || 0);
    }
    
    // Memory utilization
    if (metrics.system?.memory) {
      const memoryPercent = (metrics.system.memory.used / metrics.system.memory.total) * 100;
      monitoringMetrics.memoryUtilization.add(memoryPercent);
    }
    
    // Disk utilization
    if (metrics.system?.disk) {
      monitoringMetrics.diskUtilization.add(metrics.system.disk.percent || 0);
    }
    
    // Network utilization
    if (metrics.system?.network) {
      monitoringMetrics.networkUtilization.add(metrics.system.network.percent || 0);
    }
    
    // Application metrics
    if (metrics.application) {
      // Throughput
      if (metrics.application.requestsPerSecond) {
        monitoringMetrics.throughputTrend.add(metrics.application.requestsPerSecond);
      }
      
      // Error rate
      if (metrics.application.errorRate !== undefined) {
        monitoringMetrics.errorRateTrend.add(metrics.application.errorRate);
      }
    }
  }

  /**
   * Collect database performance metrics
   */
  collectDatabaseMetrics() {
    // Database metrics endpoint (if available)
    const dbMetricsResponse = http.get(`${this.baseUrl}/api/internal/db-metrics`, {
      timeout: '5s',
      tags: { monitoring: 'database' },
    });
    
    if (dbMetricsResponse.status === 200) {
      try {
        const dbMetrics = JSON.parse(dbMetricsResponse.body);
        
        // Active connections
        if (dbMetrics.connections) {
          monitoringMetrics.dbConnectionsActive.add(dbMetrics.connections.active || 0);
          monitoringMetrics.dbConnectionsMax.add(dbMetrics.connections.max || 0);
        }
        
        // Query queue
        if (dbMetrics.queryQueue) {
          monitoringMetrics.dbQueryQueue.add(dbMetrics.queryQueue.length || 0);
        }
        
        // Slow queries
        if (dbMetrics.slowQueries) {
          monitoringMetrics.dbSlowQueries.add(dbMetrics.slowQueries.count || 0);
        }
        
      } catch (error) {
        // Database metrics may not be available
      }
    }
  }

  /**
   * Collect cache performance metrics
   */
  collectCacheMetrics() {
    // Cache metrics endpoint (if available)
    const cacheMetricsResponse = http.get(`${this.baseUrl}/api/internal/cache-metrics`, {
      timeout: '5s',
      tags: { monitoring: 'cache' },
    });
    
    if (cacheMetricsResponse.status === 200) {
      try {
        const cacheMetrics = JSON.parse(cacheMetricsResponse.body);
        
        // Hit rate
        if (cacheMetrics.hitRate !== undefined) {
          monitoringMetrics.cacheHitRateRealTime.add(cacheMetrics.hitRate);
        }
        
        // Memory usage
        if (cacheMetrics.memoryUsage) {
          const memoryPercent = (cacheMetrics.memoryUsage.used / cacheMetrics.memoryUsage.total) * 100;
          monitoringMetrics.cacheMemoryUsage.add(memoryPercent);
        }
        
        // Evictions
        if (cacheMetrics.evictions) {
          monitoringMetrics.cacheEvictions.add(cacheMetrics.evictions.count || 0);
        }
        
      } catch (error) {
        // Cache metrics may not be available
      }
    }
  }

  /**
   * Detect system bottlenecks
   */
  detectBottlenecks() {
    const currentBottlenecks = [];
    
    // Get latest metric values
    const latestMetrics = this.getLatestMetrics();
    
    // CPU bottleneck detection
    if (latestMetrics.cpuUtilization > this.config.bottleneckThreshold * 100) {
      currentBottlenecks.push({
        type: 'CPU',
        typeId: this.bottleneckTypes.CPU,
        severity: this.calculateSeverity(latestMetrics.cpuUtilization, 100),
        message: `CPU utilization at ${latestMetrics.cpuUtilization.toFixed(1)}%`,
        value: latestMetrics.cpuUtilization,
        threshold: this.config.bottleneckThreshold * 100,
      });
    }
    
    // Memory bottleneck detection
    if (latestMetrics.memoryUtilization > this.config.bottleneckThreshold * 100) {
      currentBottlenecks.push({
        type: 'MEMORY',
        typeId: this.bottleneckTypes.MEMORY,
        severity: this.calculateSeverity(latestMetrics.memoryUtilization, 100),
        message: `Memory utilization at ${latestMetrics.memoryUtilization.toFixed(1)}%`,
        value: latestMetrics.memoryUtilization,
        threshold: this.config.bottleneckThreshold * 100,
      });
    }
    
    // Database bottleneck detection
    if (latestMetrics.dbConnectionUsage > this.config.bottleneckThreshold) {
      currentBottlenecks.push({
        type: 'DATABASE',
        typeId: this.bottleneckTypes.DATABASE,
        severity: this.calculateSeverity(latestMetrics.dbConnectionUsage, 1),
        message: `Database connection pool at ${(latestMetrics.dbConnectionUsage * 100).toFixed(1)}% capacity`,
        value: latestMetrics.dbConnectionUsage,
        threshold: this.config.bottleneckThreshold,
      });
    }
    
    // Cache bottleneck detection
    if (latestMetrics.cacheHitRate < 90) {  // Cache hit rate below 90%
      currentBottlenecks.push({
        type: 'CACHE',
        typeId: this.bottleneckTypes.CACHE,
        severity: this.calculateSeverity(90 - latestMetrics.cacheHitRate, 90),
        message: `Cache hit rate dropped to ${latestMetrics.cacheHitRate.toFixed(1)}%`,
        value: latestMetrics.cacheHitRate,
        threshold: 90,
      });
    }
    
    // Process detected bottlenecks
    currentBottlenecks.forEach(bottleneck => {
      this.processBottleneck(bottleneck);
    });
    
    // Update bottleneck metrics
    if (currentBottlenecks.length > 0) {
      const mostSevereBottleneck = currentBottlenecks.reduce((prev, current) => 
        current.severity > prev.severity ? current : prev
      );
      
      monitoringMetrics.bottleneckDetected.add(1);
      monitoringMetrics.bottleneckType.add(mostSevereBottleneck.typeId);
      monitoringMetrics.bottleneckSeverity.add(mostSevereBottleneck.severity);
    }
  }

  /**
   * Process detected bottleneck
   */
  processBottleneck(bottleneck) {
    // Check if this is a new bottleneck
    const existingBottleneck = this.detectedBottlenecks.find(b => 
      b.type === bottleneck.type && Date.now() - b.firstDetected < 60000
    );
    
    if (!existingBottleneck) {
      // New bottleneck
      bottleneck.firstDetected = Date.now();
      bottleneck.occurrences = 1;
      this.detectedBottlenecks.push(bottleneck);
      
      console.warn(`🔴 BOTTLENECK DETECTED: ${bottleneck.message}`);
      
      // Trigger alert for severe bottlenecks
      if (bottleneck.severity > 0.9) {
        this.triggerAlert('bottleneck', bottleneck.message, 'critical');
      }
      
    } else {
      // Existing bottleneck - update
      existingBottleneck.occurrences++;
      existingBottleneck.lastDetected = Date.now();
      existingBottleneck.severity = Math.max(existingBottleneck.severity, bottleneck.severity);
    }
  }

  /**
   * Trigger monitoring alert
   */
  triggerAlert(type, message, severity = 'warning') {
    const alert = {
      type: type,
      message: message,
      severity: severity,
      timestamp: Date.now(),
    };
    
    this.alerts.push(alert);
    
    console.warn(`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }
  }

  /**
   * Calculate system health score (0-100)
   */
  calculateHealthScore(healthData) {
    let score = 100;
    
    // Availability penalty
    if (!healthData.available) {
      score -= 50;
    }
    
    // Response time penalty
    if (this.performanceBaseline && healthData.responseTime) {
      const responseRatio = healthData.responseTime / this.performanceBaseline.responseTime;
      if (responseRatio > 2) score -= 20;
      else if (responseRatio > 1.5) score -= 10;
      else if (responseRatio > 1.2) score -= 5;
    }
    
    // Service-specific penalties
    if (healthData.services) {
      const totalServices = Object.keys(healthData.services).length;
      const unhealthyServices = Object.values(healthData.services)
        .filter(service => service.status !== 'healthy').length;
      
      if (totalServices > 0) {
        score -= (unhealthyServices / totalServices) * 30;
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * Calculate system availability percentage
   */
  calculateAvailability() {
    if (this.healthHistory.length === 0) return 100;
    
    const availableChecks = this.healthHistory.filter(h => h.available).length;
    return (availableChecks / this.healthHistory.length) * 100;
  }

  /**
   * Get latest metric values
   */
  getLatestMetrics() {
    // This would typically come from the metrics collection
    // For now, return mock values based on monitoring state
    return {
      cpuUtilization: Math.random() * 100,
      memoryUtilization: Math.random() * 100,
      dbConnectionUsage: Math.random(),
      cacheHitRate: 85 + Math.random() * 15,
      responseTime: this.healthHistory.length > 0 ? 
        this.healthHistory[this.healthHistory.length - 1].responseTime : 0,
    };
  }

  /**
   * Calculate bottleneck severity (0-1)
   */
  calculateSeverity(value, threshold) {
    return Math.min(1, Math.max(0, (value - threshold) / threshold));
  }

  /**
   * Generate comprehensive monitoring report
   */
  generateMonitoringReport() {
    const report = {
      summary: {
        monitoringDuration: Date.now() - (this.performanceBaseline?.timestamp || Date.now()),
        totalHealthChecks: this.healthHistory.length,
        finalHealthScore: this.healthHistory.length > 0 ? 
          this.calculateHealthScore(this.healthHistory[this.healthHistory.length - 1]) : 0,
        finalAvailability: this.calculateAvailability(),
        totalBottlenecks: this.detectedBottlenecks.length,
        totalAlerts: this.alerts.length,
      },
      
      healthHistory: this.healthHistory.map(h => ({
        timestamp: new Date(h.timestamp).toISOString(),
        available: h.available,
        responseTime: h.responseTime,
        status: h.status,
      })),
      
      detectedBottlenecks: this.detectedBottlenecks.map(b => ({
        type: b.type,
        message: b.message,
        severity: b.severity,
        occurrences: b.occurrences,
        firstDetected: new Date(b.firstDetected).toISOString(),
        lastDetected: b.lastDetected ? new Date(b.lastDetected).toISOString() : null,
      })),
      
      alerts: this.alerts.map(a => ({
        type: a.type,
        message: a.message,
        severity: a.severity,
        timestamp: new Date(a.timestamp).toISOString(),
      })),
      
      recommendations: this.generateMonitoringRecommendations(),
      
      generatedAt: new Date().toISOString(),
    };
    
    return report;
  }

  /**
   * Generate monitoring recommendations
   */
  generateMonitoringRecommendations() {
    const recommendations = [];
    
    // Analyze bottlenecks for recommendations
    const bottlenecksByType = {};
    this.detectedBottlenecks.forEach(b => {
      bottlenecksByType[b.type] = (bottlenecksByType[b.type] || 0) + b.occurrences;
    });
    
    Object.entries(bottlenecksByType).forEach(([type, occurrences]) => {
      switch (type) {
        case 'CPU':
          recommendations.push({
            category: 'Resource Scaling',
            priority: 'High',
            issue: `CPU bottlenecks detected ${occurrences} times`,
            recommendation: 'Scale CPU resources or optimize application performance',
          });
          break;
          
        case 'MEMORY':
          recommendations.push({
            category: 'Resource Scaling',
            priority: 'High',
            issue: `Memory bottlenecks detected ${occurrences} times`,
            recommendation: 'Increase memory allocation or investigate memory leaks',
          });
          break;
          
        case 'DATABASE':
          recommendations.push({
            category: 'Database Optimization',
            priority: 'High',
            issue: `Database bottlenecks detected ${occurrences} times`,
            recommendation: 'Increase database connection pool size or optimize queries',
          });
          break;
          
        case 'CACHE':
          recommendations.push({
            category: 'Cache Optimization',
            priority: 'Medium',
            issue: `Cache performance issues detected ${occurrences} times`,
            recommendation: 'Review cache strategy and increase cache memory allocation',
          });
          break;
      }
    });
    
    // Availability recommendations
    const availability = this.calculateAvailability();
    if (availability < 99.5) {
      recommendations.push({
        category: 'Reliability',
        priority: 'Critical',
        issue: `System availability at ${availability.toFixed(2)}%`,
        recommendation: 'Investigate frequent outages and implement better error handling',
      });
    }
    
    return recommendations;
  }
}

// Factory function
export function createRealTimeMonitor(baseUrl, config = {}) {
  return new RealTimeMonitor(baseUrl, config);
}

export default RealTimeMonitor;