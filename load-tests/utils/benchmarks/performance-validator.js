/**
 * Performance Validation and SLA Monitoring System
 * Validates performance against enterprise SLA requirements
 */

import { Counter, Trend, Rate, Gauge } from 'k6/metrics';

// SLA Performance Requirements
export const SLA_REQUIREMENTS = {
  // Response Time Requirements
  responseTime: {
    p95: 200,       // 95th percentile < 200ms
    p99: 500,       // 99th percentile < 500ms
    avg: 100,       // Average < 100ms
    max: 2000,      // Maximum < 2 seconds
  },
  
  // Database Query Requirements
  database: {
    p95: 50,        // 95th percentile < 50ms
    p99: 100,       // 99th percentile < 100ms
    avg: 25,        // Average < 25ms
    max: 500,       // Maximum < 500ms
  },
  
  // Cache Performance Requirements
  cache: {
    hitRate: 90,    // > 90% hit rate
    responseTime: 5, // < 5ms cache response
    availability: 99.9, // 99.9% availability
  },
  
  // Real-time/WebSocket Requirements
  realtime: {
    connectionTime: 100,  // < 100ms connection
    messageLatency: 50,   // < 50ms message delivery
    p99Latency: 100,      // 99th percentile < 100ms
  },
  
  // Throughput Requirements
  throughput: {
    minRps: 1000,         // > 1000 requests per second
    peakRps: 5000,        // Peak > 5000 requests per second
    sustainedRps: 2000,   // Sustained > 2000 requests per second
  },
  
  // Error Rate Requirements
  errorRate: {
    overall: 0.1,         // < 0.1% overall error rate
    api: 0.05,            // < 0.05% API error rate
    database: 0.01,       // < 0.01% database error rate
  },
  
  // Availability Requirements
  availability: {
    overall: 99.9,        // 99.9% overall availability
    core: 99.99,          // 99.99% core services availability
    maintenance: 99.5,    // 99.5% during maintenance windows
  },
  
  // Scalability Requirements
  scalability: {
    maxUsers: 10000,      // Support 10,000+ concurrent users
    dailyRequests: 1000000, // 1M+ requests per day
    dataVolume: 1000000,  // 1M+ records per day
  },
};

// Performance validation metrics
export const performanceMetrics = {
  // SLA compliance metrics
  slaViolations: new Counter('sla_violations'),
  slaCompliance: new Rate('sla_compliance_rate'),
  
  // Response time validation
  responseTimeSLA: new Rate('response_time_sla_met'),
  responseTimeViolations: new Counter('response_time_violations'),
  
  // Database performance validation
  databaseSLA: new Rate('database_sla_met'),
  databaseViolations: new Counter('database_violations'),
  
  // Cache performance validation
  cacheSLA: new Rate('cache_sla_met'),
  cacheViolations: new Counter('cache_violations'),
  
  // Throughput validation
  throughputSLA: new Rate('throughput_sla_met'),
  throughputViolations: new Counter('throughput_violations'),
  
  // Error rate validation
  errorRateSLA: new Rate('error_rate_sla_met'),
  errorRateViolations: new Counter('error_rate_violations'),
  
  // Overall performance score
  performanceScore: new Gauge('overall_performance_score'),
  benchmarkGrade: new Gauge('benchmark_grade'),
};

/**
 * Performance Validator Class
 * Validates system performance against SLA requirements
 */
export class PerformanceValidator {
  constructor() {
    this.violations = [];
    this.measurements = [];
    this.slaChecks = [];
    this.benchmarkResults = {};
  }

  /**
   * Validate response time performance
   */
  validateResponseTime(responseTime, percentile = 'avg', endpoint = 'generic') {
    const requirement = this.getResponseTimeRequirement(percentile);
    const isMet = responseTime <= requirement;
    
    const validation = {
      metric: 'response_time',
      endpoint: endpoint,
      percentile: percentile,
      value: responseTime,
      requirement: requirement,
      met: isMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!isMet) {
      this.recordViolation({
        type: 'response_time',
        endpoint: endpoint,
        message: `Response time ${responseTime}ms exceeds SLA requirement ${requirement}ms (${percentile})`,
        severity: this.getSeverity(responseTime, requirement),
        ...validation,
      });
      performanceMetrics.responseTimeViolations.add(1);
    }
    
    performanceMetrics.responseTimeSLA.add(isMet ? 1 : 0);
    return isMet;
  }

  /**
   * Validate database performance
   */
  validateDatabasePerformance(queryTime, queryType = 'generic') {
    const requirement = SLA_REQUIREMENTS.database.avg;
    const isMet = queryTime <= requirement;
    
    const validation = {
      metric: 'database',
      queryType: queryType,
      value: queryTime,
      requirement: requirement,
      met: isMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!isMet) {
      this.recordViolation({
        type: 'database',
        queryType: queryType,
        message: `Database query time ${queryTime}ms exceeds SLA requirement ${requirement}ms`,
        severity: this.getSeverity(queryTime, requirement),
        ...validation,
      });
      performanceMetrics.databaseViolations.add(1);
    }
    
    performanceMetrics.databaseSLA.add(isMet ? 1 : 0);
    return isMet;
  }

  /**
   * Validate cache performance
   */
  validateCachePerformance(hitRate, responseTime = null) {
    const hitRateRequirement = SLA_REQUIREMENTS.cache.hitRate;
    const responseTimeRequirement = SLA_REQUIREMENTS.cache.responseTime;
    
    let hitRateMet = hitRate >= hitRateRequirement;
    let responseTimeMet = responseTime === null || responseTime <= responseTimeRequirement;
    
    const validation = {
      metric: 'cache',
      hitRate: hitRate,
      hitRateRequirement: hitRateRequirement,
      responseTime: responseTime,
      responseTimeRequirement: responseTimeRequirement,
      hitRateMet: hitRateMet,
      responseTimeMet: responseTimeMet,
      met: hitRateMet && responseTimeMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!hitRateMet) {
      this.recordViolation({
        type: 'cache_hit_rate',
        message: `Cache hit rate ${hitRate.toFixed(2)}% below SLA requirement ${hitRateRequirement}%`,
        severity: 'medium',
        ...validation,
      });
      performanceMetrics.cacheViolations.add(1);
    }
    
    if (!responseTimeMet && responseTime !== null) {
      this.recordViolation({
        type: 'cache_response_time',
        message: `Cache response time ${responseTime}ms exceeds SLA requirement ${responseTimeRequirement}ms`,
        severity: 'low',
        ...validation,
      });
      performanceMetrics.cacheViolations.add(1);
    }
    
    performanceMetrics.cacheSLA.add(validation.met ? 1 : 0);
    return validation.met;
  }

  /**
   * Validate throughput performance
   */
  validateThroughput(requestsPerSecond, testType = 'sustained') {
    let requirement;
    
    switch (testType) {
      case 'peak':
        requirement = SLA_REQUIREMENTS.throughput.peakRps;
        break;
      case 'sustained':
        requirement = SLA_REQUIREMENTS.throughput.sustainedRps;
        break;
      default:
        requirement = SLA_REQUIREMENTS.throughput.minRps;
    }
    
    const isMet = requestsPerSecond >= requirement;
    
    const validation = {
      metric: 'throughput',
      testType: testType,
      value: requestsPerSecond,
      requirement: requirement,
      met: isMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!isMet) {
      this.recordViolation({
        type: 'throughput',
        testType: testType,
        message: `Throughput ${requestsPerSecond} req/s below SLA requirement ${requirement} req/s (${testType})`,
        severity: testType === 'peak' ? 'medium' : 'high',
        ...validation,
      });
      performanceMetrics.throughputViolations.add(1);
    }
    
    performanceMetrics.throughputSLA.add(isMet ? 1 : 0);
    return isMet;
  }

  /**
   * Validate error rate performance
   */
  validateErrorRate(errorRate, errorType = 'overall') {
    const requirement = SLA_REQUIREMENTS.errorRate[errorType] || SLA_REQUIREMENTS.errorRate.overall;
    const isMet = errorRate <= requirement;
    
    const validation = {
      metric: 'error_rate',
      errorType: errorType,
      value: errorRate,
      requirement: requirement,
      met: isMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!isMet) {
      this.recordViolation({
        type: 'error_rate',
        errorType: errorType,
        message: `Error rate ${errorRate.toFixed(3)}% exceeds SLA requirement ${requirement}% (${errorType})`,
        severity: this.getErrorRateSeverity(errorRate, requirement),
        ...validation,
      });
      performanceMetrics.errorRateViolations.add(1);
    }
    
    performanceMetrics.errorRateSLA.add(isMet ? 1 : 0);
    return isMet;
  }

  /**
   * Validate real-time performance (WebSocket)
   */
  validateRealTimePerformance(connectionTime, messageLatency) {
    const connectionRequirement = SLA_REQUIREMENTS.realtime.connectionTime;
    const latencyRequirement = SLA_REQUIREMENTS.realtime.messageLatency;
    
    const connectionMet = connectionTime <= connectionRequirement;
    const latencyMet = messageLatency <= latencyRequirement;
    
    const validation = {
      metric: 'realtime',
      connectionTime: connectionTime,
      messageLatency: messageLatency,
      connectionRequirement: connectionRequirement,
      latencyRequirement: latencyRequirement,
      connectionMet: connectionMet,
      latencyMet: latencyMet,
      met: connectionMet && latencyMet,
      timestamp: Date.now(),
    };
    
    this.recordValidation(validation);
    
    if (!connectionMet) {
      this.recordViolation({
        type: 'websocket_connection',
        message: `WebSocket connection time ${connectionTime}ms exceeds SLA requirement ${connectionRequirement}ms`,
        severity: 'medium',
        ...validation,
      });
    }
    
    if (!latencyMet) {
      this.recordViolation({
        type: 'websocket_latency',
        message: `WebSocket message latency ${messageLatency}ms exceeds SLA requirement ${latencyRequirement}ms`,
        severity: 'high',
        ...validation,
      });
    }
    
    return validation.met;
  }

  /**
   * Calculate overall performance score (0-100)
   */
  calculatePerformanceScore() {
    if (this.slaChecks.length === 0) {
      return 0;
    }
    
    const totalChecks = this.slaChecks.length;
    const passedChecks = this.slaChecks.filter(check => check.met).length;
    const baseScore = (passedChecks / totalChecks) * 100;
    
    // Apply severity penalties
    let severityPenalty = 0;
    this.violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          severityPenalty += 10;
          break;
        case 'high':
          severityPenalty += 5;
          break;
        case 'medium':
          severityPenalty += 2;
          break;
        case 'low':
          severityPenalty += 1;
          break;
      }
    });
    
    const finalScore = Math.max(0, baseScore - severityPenalty);
    performanceMetrics.performanceScore.add(finalScore);
    
    return finalScore;
  }

  /**
   * Get benchmark grade (A-F)
   */
  getBenchmarkGrade(score = null) {
    const performanceScore = score || this.calculatePerformanceScore();
    
    let grade;
    let gradeValue;
    
    if (performanceScore >= 95) {
      grade = 'A+';
      gradeValue = 100;
    } else if (performanceScore >= 90) {
      grade = 'A';
      gradeValue = 95;
    } else if (performanceScore >= 85) {
      grade = 'A-';
      gradeValue = 90;
    } else if (performanceScore >= 80) {
      grade = 'B+';
      gradeValue = 85;
    } else if (performanceScore >= 75) {
      grade = 'B';
      gradeValue = 80;
    } else if (performanceScore >= 70) {
      grade = 'B-';
      gradeValue = 75;
    } else if (performanceScore >= 65) {
      grade = 'C+';
      gradeValue = 70;
    } else if (performanceScore >= 60) {
      grade = 'C';
      gradeValue = 65;
    } else if (performanceScore >= 55) {
      grade = 'C-';
      gradeValue = 60;
    } else if (performanceScore >= 50) {
      grade = 'D';
      gradeValue = 55;
    } else {
      grade = 'F';
      gradeValue = 50;
    }
    
    performanceMetrics.benchmarkGrade.add(gradeValue);
    
    return {
      grade: grade,
      score: performanceScore,
      gradeValue: gradeValue,
    };
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport() {
    const performanceScore = this.calculatePerformanceScore();
    const benchmarkGrade = this.getBenchmarkGrade(performanceScore);
    
    const report = {
      summary: {
        performanceScore: performanceScore,
        benchmarkGrade: benchmarkGrade.grade,
        totalValidations: this.slaChecks.length,
        totalViolations: this.violations.length,
        slaCompliance: ((this.slaChecks.length - this.violations.length) / Math.max(1, this.slaChecks.length) * 100),
      },
      
      slaRequirements: SLA_REQUIREMENTS,
      
      violations: this.violations.map(v => ({
        type: v.type,
        message: v.message,
        severity: v.severity,
        timestamp: new Date(v.timestamp).toISOString(),
        value: v.value,
        requirement: v.requirement,
      })),
      
      metrics: {
        responseTime: this.getMetricSummary('response_time'),
        database: this.getMetricSummary('database'),
        cache: this.getMetricSummary('cache'),
        throughput: this.getMetricSummary('throughput'),
        errorRate: this.getMetricSummary('error_rate'),
        realtime: this.getMetricSummary('realtime'),
      },
      
      recommendations: this.generateRecommendations(),
      
      generatedAt: new Date().toISOString(),
    };
    
    return report;
  }

  // Private helper methods
  
  getResponseTimeRequirement(percentile) {
    switch (percentile) {
      case 'p95': return SLA_REQUIREMENTS.responseTime.p95;
      case 'p99': return SLA_REQUIREMENTS.responseTime.p99;
      case 'avg': return SLA_REQUIREMENTS.responseTime.avg;
      case 'max': return SLA_REQUIREMENTS.responseTime.max;
      default: return SLA_REQUIREMENTS.responseTime.avg;
    }
  }

  getSeverity(value, requirement) {
    const ratio = value / requirement;
    if (ratio >= 3) return 'critical';
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  getErrorRateSeverity(errorRate, requirement) {
    const ratio = errorRate / requirement;
    if (ratio >= 10) return 'critical';
    if (ratio >= 5) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  recordValidation(validation) {
    this.slaChecks.push(validation);
    performanceMetrics.slaCompliance.add(validation.met ? 1 : 0);
    
    if (!validation.met) {
      performanceMetrics.slaViolations.add(1);
    }
  }

  recordViolation(violation) {
    this.violations.push(violation);
    console.warn(`SLA Violation: ${violation.message}`);
  }

  getMetricSummary(metricType) {
    const metricChecks = this.slaChecks.filter(check => check.metric === metricType);
    const metricViolations = this.violations.filter(v => v.type.includes(metricType.replace('_', '')));
    
    return {
      totalChecks: metricChecks.length,
      passedChecks: metricChecks.filter(c => c.met).length,
      violations: metricViolations.length,
      complianceRate: metricChecks.length > 0 ? 
        (metricChecks.filter(c => c.met).length / metricChecks.length * 100) : 0,
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Analyze violation patterns and generate recommendations
    const violationsByType = {};
    this.violations.forEach(v => {
      violationsByType[v.type] = (violationsByType[v.type] || 0) + 1;
    });
    
    Object.entries(violationsByType).forEach(([type, count]) => {
      switch (type) {
        case 'response_time':
          recommendations.push({
            category: 'Performance',
            priority: 'High',
            issue: `${count} response time violations detected`,
            recommendation: 'Optimize application code, add caching, or increase server resources',
          });
          break;
          
        case 'database':
          recommendations.push({
            category: 'Database',
            priority: 'High',
            issue: `${count} database performance violations`,
            recommendation: 'Optimize database queries, add indexes, or scale database resources',
          });
          break;
          
        case 'cache_hit_rate':
          recommendations.push({
            category: 'Caching',
            priority: 'Medium',
            issue: `${count} cache hit rate violations`,
            recommendation: 'Review cache strategy, increase cache TTL, or add cache warming',
          });
          break;
          
        case 'throughput':
          recommendations.push({
            category: 'Scalability',
            priority: 'High',
            issue: `${count} throughput violations`,
            recommendation: 'Scale horizontally, optimize load balancing, or increase server capacity',
          });
          break;
          
        case 'error_rate':
          recommendations.push({
            category: 'Reliability',
            priority: 'Critical',
            issue: `${count} error rate violations`,
            recommendation: 'Investigate and fix error sources, improve error handling, add circuit breakers',
          });
          break;
      }
    });
    
    return recommendations;
  }
}

// Factory function for creating performance validator
export function createPerformanceValidator() {
  return new PerformanceValidator();
}

// Utility functions for common validations
export const ValidationUtils = {
  validateK6Response: (validator, response, endpoint = 'api') => {
    if (response.timings) {
      validator.validateResponseTime(response.timings.duration, 'avg', endpoint);
      
      // Check for database timing header
      if (response.headers['X-DB-Query-Time']) {
        const dbTime = parseFloat(response.headers['X-DB-Query-Time']);
        validator.validateDatabasePerformance(dbTime);
      }
      
      // Check for cache headers
      if (response.headers['X-Cache-Status']) {
        const isHit = response.headers['X-Cache-Status'] === 'HIT';
        const hitRate = isHit ? 100 : 0;
        validator.validateCachePerformance(hitRate);
      }
    }
    
    return response.status < 400;
  },
  
  validateBatchResponses: (validator, responses, endpoint = 'batch') => {
    const responseTimes = responses.map(r => r.timings?.duration || 0);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const errorRate = responses.filter(r => r.status >= 400).length / responses.length * 100;
    
    validator.validateResponseTime(avgResponseTime, 'avg', endpoint);
    validator.validateErrorRate(errorRate);
    
    return responses.every(r => r.status < 400);
  },
};

export default PerformanceValidator;