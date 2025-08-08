#!/usr/bin/env node

/**
 * Performance Testing Orchestration Script
 * Automates the execution of comprehensive load testing scenarios
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Performance test configuration
const PERFORMANCE_CONFIG = {
  // Test environment
  environment: process.env.LOAD_TEST_ENV || 'local',
  baseUrl: process.env.LOAD_TEST_BASE_URL || 'http://localhost:3000',
  
  // Test parameters
  maxUsers: parseInt(process.env.LOAD_TEST_MAX_USERS) || 10000,
  duration: process.env.LOAD_TEST_DURATION || '1800s',
  rampUp: process.env.LOAD_TEST_RAMP_UP || '600s',
  
  // Output configuration
  outputDir: './load-tests/reports',
  timestamp: new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19),
  
  // Test scenarios to run
  scenarios: {
    smoke: { enabled: true, priority: 1 },
    api_stress: { enabled: true, priority: 2 },
    progressive_load: { enabled: true, priority: 3 },
    websocket_realtime: { enabled: true, priority: 4 },
    database_performance: { enabled: true, priority: 5 },
    endurance_stability: { enabled: false, priority: 6 }, // 24-hour test
    artillery_sustained: { enabled: true, priority: 7 },
    artillery_spike: { enabled: true, priority: 8 },
    geographic_multi_region: { enabled: false, priority: 9 }, // Requires multi-region setup
  },
  
  // Monitoring and reporting
  enableMonitoring: true,
  enableReporting: true,
  enableSLAValidation: true,
  
  // CI/CD integration
  failOnSLAViolation: process.env.CI === 'true',
  uploadResults: process.env.UPLOAD_RESULTS === 'true',
};

/**
 * Performance Test Orchestrator
 */
class PerformanceTestOrchestrator {
  constructor(config = PERFORMANCE_CONFIG) {
    this.config = config;
    this.testResults = {
      summary: {
        startTime: Date.now(),
        endTime: null,
        totalDuration: 0,
        scenariosRun: 0,
        scenariosPassed: 0,
        scenariosFailed: 0,
        overallStatus: 'pending',
      },
      scenarios: {},
      violations: [],
      recommendations: [],
      metrics: {},
    };
    
    this.isRunning = false;
  }

  /**
   * Main orchestration method
   */
  async runPerformanceTests() {
    console.log('🚀 Starting Performance Test Orchestration');
    console.log(`Environment: ${this.config.environment}`);
    console.log(`Target: ${this.config.baseUrl}`);
    console.log(`Max Users: ${this.config.maxUsers}`);
    console.log(`Duration: ${this.config.duration}`);
    console.log('='.repeat(60));
    
    this.isRunning = true;
    
    try {
      // Pre-test setup
      await this.setupTestEnvironment();
      
      // Execute test scenarios
      await this.executeTestScenarios();
      
      // Post-test analysis
      await this.analyzeResults();
      
      // Generate reports
      await this.generateReports();
      
      // CI/CD integration
      await this.handleCIIntegration();
      
      this.testResults.summary.overallStatus = 'completed';
      
    } catch (error) {
      console.error('❌ Performance test orchestration failed:', error);
      this.testResults.summary.overallStatus = 'failed';
      
      if (this.config.failOnSLAViolation) {
        process.exit(1);
      }
    } finally {
      this.testResults.summary.endTime = Date.now();
      this.testResults.summary.totalDuration = this.testResults.summary.endTime - this.testResults.summary.startTime;
      this.isRunning = false;
      
      await this.cleanup();
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');
    
    // Create output directory
    await this.ensureDirectory(this.config.outputDir);
    
    // Verify target system health
    await this.verifySystemHealth();
    
    // Initialize monitoring
    if (this.config.enableMonitoring) {
      await this.initializeMonitoring();
    }
    
    // Warm up the system
    await this.warmUpSystem();
    
    console.log('✅ Test environment ready');
  }

  /**
   * Execute all enabled test scenarios
   */
  async executeTestScenarios() {
    console.log('🧪 Executing test scenarios...');
    
    const enabledScenarios = Object.entries(this.config.scenarios)
      .filter(([_, config]) => config.enabled)
      .sort(([_, a], [__, b]) => a.priority - b.priority);
    
    for (const [scenarioName, scenarioConfig] of enabledScenarios) {
      console.log(`\n📊 Running scenario: ${scenarioName}`);
      
      const scenarioStart = Date.now();
      
      try {
        const result = await this.runScenario(scenarioName, scenarioConfig);
        
        this.testResults.scenarios[scenarioName] = {
          ...result,
          status: 'passed',
          duration: Date.now() - scenarioStart,
          timestamp: new Date().toISOString(),
        };
        
        this.testResults.summary.scenariosPassed++;
        console.log(`✅ Scenario ${scenarioName} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Scenario ${scenarioName} failed:`, error.message);
        
        this.testResults.scenarios[scenarioName] = {
          status: 'failed',
          error: error.message,
          duration: Date.now() - scenarioStart,
          timestamp: new Date().toISOString(),
        };
        
        this.testResults.summary.scenariosFailed++;
      }
      
      this.testResults.summary.scenariosRun++;
      
      // Brief pause between scenarios
      await this.sleep(5000);
    }
    
    console.log(`\n📈 Scenario execution completed: ${this.testResults.summary.scenariosPassed}/${this.testResults.summary.scenariosRun} passed`);
  }

  /**
   * Run individual test scenario
   */
  async runScenario(scenarioName, scenarioConfig) {
    switch (scenarioName) {
      case 'smoke':
        return this.runSmokeTest();
      case 'api_stress':
        return this.runK6Test('api/stress-test.js');
      case 'progressive_load':
        return this.runK6Test('scenarios/gradual-ramp/progressive-load.js');
      case 'websocket_realtime':
        return this.runK6Test('websocket/realtime-test.js');
      case 'database_performance':
        return this.runK6Test('database/performance-test.js');
      case 'endurance_stability':
        return this.runK6Test('scenarios/endurance/stability-marathon.js');
      case 'artillery_sustained':
        return this.runArtilleryTest('sustained/endurance-test.yml');
      case 'artillery_spike':
        return this.runArtilleryTest('spike/traffic-surge.yml');
      case 'geographic_multi_region':
        return this.runArtilleryTest('geographic/multi-region.yml');
      default:
        throw new Error(`Unknown scenario: ${scenarioName}`);
    }
  }

  /**
   * Run smoke test to verify basic functionality
   */
  async runSmokeTest() {
    console.log('💨 Running smoke test...');
    
    const smokeTest = `
      import http from 'k6/http';
      import { check, sleep } from 'k6';
      
      export let options = {
        stages: [{ duration: '30s', target: 1 }],
      };
      
      export default function() {
        const response = http.get('${this.config.baseUrl}/api/health');
        
        check(response, {
          'status is 200': (r) => r.status === 200,
          'response time < 500ms': (r) => r.timings.duration < 500,
        });
        
        sleep(1);
      }
    `;
    
    return this.executeK6Script(smokeTest, { duration: '30s', vus: 1 });
  }

  /**
   * Run K6 test script
   */
  async runK6Test(scriptPath) {
    const fullPath = path.join(__dirname, '../load-tests/k6', scriptPath);
    
    const k6Options = {
      'K6_MAX_VUS': this.config.maxUsers,
      'LOAD_TEST_BASE_URL': this.config.baseUrl,
      'LOAD_TEST_DURATION': this.config.duration,
      'ENVIRONMENT': this.config.environment,
    };
    
    return this.executeK6Script(null, k6Options, fullPath);
  }

  /**
   * Run Artillery test configuration
   */
  async runArtilleryTest(configPath) {
    const fullPath = path.join(__dirname, '../load-tests/artillery', configPath);
    const outputFile = path.join(this.config.outputDir, `artillery-${Date.now()}.json`);
    
    const command = `artillery run ${fullPath} --output ${outputFile}`;
    
    const env = {
      ...process.env,
      LOAD_TEST_BASE_URL: this.config.baseUrl,
      LOAD_TEST_MAX_USERS: this.config.maxUsers,
      ENVIRONMENT: this.config.environment,
    };
    
    return this.executeShellCommand(command, env);
  }

  /**
   * Execute K6 script with options
   */
  async executeK6Script(scriptContent, options = {}, scriptPath = null) {
    let tempScriptPath = scriptPath;
    
    if (scriptContent && !scriptPath) {
      // Create temporary script file
      tempScriptPath = path.join(this.config.outputDir, `temp-script-${Date.now()}.js`);
      await fs.writeFile(tempScriptPath, scriptContent);
    }
    
    const k6Command = `k6 run ${tempScriptPath}`;
    
    const env = {
      ...process.env,
      ...options,
    };
    
    try {
      const result = await this.executeShellCommand(k6Command, env);
      
      // Clean up temporary script
      if (scriptContent && !scriptPath) {
        await fs.unlink(tempScriptPath);
      }
      
      return result;
    } catch (error) {
      // Clean up temporary script on error
      if (scriptContent && !scriptPath && tempScriptPath) {
        try {
          await fs.unlink(tempScriptPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup temporary script:', cleanupError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * Execute shell command with environment variables
   */
  async executeShellCommand(command, env = {}) {
    return new Promise((resolve, reject) => {
      const child = exec(command, {
        env: { ...process.env, ...env },
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`Command failed: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve({
            stdout,
            stderr,
            success: true,
          });
        }
      });
      
      // Stream output in real-time
      child.stdout?.on('data', (data) => {
        process.stdout.write(data);
      });
      
      child.stderr?.on('data', (data) => {
        process.stderr.write(data);
      });
    });
  }

  /**
   * Verify target system health before testing
   */
  async verifySystemHealth() {
    console.log('🏥 Verifying system health...');
    
    try {
      const healthCheck = `
        import http from 'k6/http';
        import { check } from 'k6';
        
        export default function() {
          const response = http.get('${this.config.baseUrl}/api/health');
          
          if (!check(response, {'health check passed': (r) => r.status === 200})) {
            throw new Error('System health check failed');
          }
          
          console.log('System health verified');
        }
      `;
      
      await this.executeK6Script(healthCheck, { duration: '10s', vus: 1 });
      console.log('✅ System health verified');
      
    } catch (error) {
      throw new Error(`System health check failed: ${error.message}`);
    }
  }

  /**
   * Initialize monitoring systems
   */
  async initializeMonitoring() {
    console.log('📊 Initializing monitoring...');
    
    // Start application metrics collection
    try {
      await this.executeShellCommand(`curl -f ${this.config.baseUrl}/api/internal/monitoring/start`, {});
      console.log('✅ Monitoring initialized');
    } catch (error) {
      console.warn('⚠️ Could not initialize monitoring:', error.message);
    }
  }

  /**
   * Warm up the system before testing
   */
  async warmUpSystem() {
    console.log('🔥 Warming up system...');
    
    const warmUpTest = `
      import http from 'k6/http';
      import { sleep } from 'k6';
      
      export let options = {
        stages: [{ duration: '60s', target: 5 }],
      };
      
      export default function() {
        http.get('${this.config.baseUrl}/api/health');
        http.get('${this.config.baseUrl}/api/metrics?range=1h');
        sleep(1);
      }
    `;
    
    await this.executeK6Script(warmUpTest, { duration: '60s', vus: 5 });
    console.log('✅ System warmed up');
  }

  /**
   * Analyze test results and detect SLA violations
   */
  async analyzeResults() {
    console.log('🔍 Analyzing test results...');
    
    // Calculate overall metrics
    this.calculateOverallMetrics();
    
    // Detect SLA violations
    if (this.config.enableSLAValidation) {
      this.detectSLAViolations();
    }
    
    // Generate recommendations
    this.generateRecommendations();
    
    console.log('✅ Results analysis completed');
    console.log(`📊 Overall Status: ${this.testResults.summary.overallStatus}`);
    console.log(`📈 SLA Violations: ${this.testResults.violations.length}`);
  }

  /**
   * Calculate overall performance metrics
   */
  calculateOverallMetrics() {
    const scenarios = Object.values(this.testResults.scenarios);
    const successfulScenarios = scenarios.filter(s => s.status === 'passed');
    
    if (successfulScenarios.length === 0) {
      console.warn('⚠️ No successful scenarios for metrics calculation');
      return;
    }
    
    // Calculate aggregated metrics
    this.testResults.metrics = {
      totalRequests: successfulScenarios.reduce((sum, s) => sum + (s.totalRequests || 0), 0),
      successfulRequests: successfulScenarios.reduce((sum, s) => sum + (s.successfulRequests || 0), 0),
      failedRequests: successfulScenarios.reduce((sum, s) => sum + (s.failedRequests || 0), 0),
      avgResponseTime: this.calculateWeightedAverage(successfulScenarios, 'avgResponseTime', 'totalRequests'),
      p95ResponseTime: Math.max(...successfulScenarios.map(s => s.p95ResponseTime || 0)),
      maxThroughput: Math.max(...successfulScenarios.map(s => s.maxThroughput || 0)),
      maxConcurrentUsers: Math.max(...successfulScenarios.map(s => s.maxConcurrentUsers || 0)),
    };
    
    // Calculate success rate
    if (this.testResults.metrics.totalRequests > 0) {
      this.testResults.metrics.successRate = 
        (this.testResults.metrics.successfulRequests / this.testResults.metrics.totalRequests) * 100;
    }
  }

  /**
   * Detect SLA violations based on performance thresholds
   */
  detectSLAViolations() {
    const metrics = this.testResults.metrics;
    const violations = [];
    
    // Response time SLA
    if (metrics.p95ResponseTime > 200) {
      violations.push({
        type: 'response_time',
        severity: metrics.p95ResponseTime > 500 ? 'critical' : 'high',
        message: `P95 response time ${metrics.p95ResponseTime}ms exceeds SLA (200ms)`,
        value: metrics.p95ResponseTime,
        threshold: 200,
        timestamp: Date.now(),
      });
    }
    
    // Success rate SLA
    if (metrics.successRate < 99.9) {
      violations.push({
        type: 'success_rate',
        severity: metrics.successRate < 95 ? 'critical' : 'high',
        message: `Success rate ${metrics.successRate.toFixed(2)}% below SLA (99.9%)`,
        value: metrics.successRate,
        threshold: 99.9,
        timestamp: Date.now(),
      });
    }
    
    // Throughput SLA
    if (metrics.maxThroughput < 1000) {
      violations.push({
        type: 'throughput',
        severity: metrics.maxThroughput < 500 ? 'critical' : 'medium',
        message: `Max throughput ${metrics.maxThroughput} req/s below SLA (1000 req/s)`,
        value: metrics.maxThroughput,
        threshold: 1000,
        timestamp: Date.now(),
      });
    }
    
    this.testResults.violations = violations;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const violations = this.testResults.violations;
    const metrics = this.testResults.metrics;
    
    // Response time recommendations
    if (violations.some(v => v.type === 'response_time')) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: 'Response time SLA violations detected',
        recommendation: 'Optimize database queries, add caching, or scale resources',
      });
    }
    
    // Throughput recommendations
    if (violations.some(v => v.type === 'throughput')) {
      recommendations.push({
        category: 'Scalability',
        priority: 'High',
        issue: 'Throughput below requirements',
        recommendation: 'Implement horizontal scaling or optimize load balancing',
      });
    }
    
    // Success rate recommendations
    if (violations.some(v => v.type === 'success_rate')) {
      recommendations.push({
        category: 'Reliability',
        priority: 'Critical',
        issue: 'High error rate detected',
        recommendation: 'Investigate error sources and implement circuit breakers',
      });
    }
    
    // General recommendations based on scenario results
    const failedScenarios = Object.entries(this.testResults.scenarios)
      .filter(([_, result]) => result.status === 'failed');
    
    if (failedScenarios.length > 0) {
      recommendations.push({
        category: 'Testing',
        priority: 'Medium',
        issue: `${failedScenarios.length} test scenarios failed`,
        recommendation: 'Review failed scenarios and fix underlying issues',
      });
    }
    
    this.testResults.recommendations = recommendations;
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports() {
    console.log('📄 Generating performance reports...');
    
    if (!this.config.enableReporting) {
      console.log('📄 Reporting disabled, skipping report generation');
      return;
    }
    
    const reportTimestamp = this.config.timestamp;
    
    // Generate JSON report
    await this.generateJSONReport(reportTimestamp);
    
    // Generate HTML report
    await this.generateHTMLReport(reportTimestamp);
    
    // Generate summary report
    await this.generateSummaryReport(reportTimestamp);
    
    console.log('✅ Reports generated successfully');
  }

  /**
   * Generate JSON report
   */
  async generateJSONReport(timestamp) {
    const reportPath = path.join(this.config.outputDir, `performance-report-${timestamp}.json`);
    
    const jsonReport = {
      metadata: {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        baseUrl: this.config.baseUrl,
        maxUsers: this.config.maxUsers,
        duration: this.config.duration,
      },
      summary: this.testResults.summary,
      scenarios: this.testResults.scenarios,
      metrics: this.testResults.metrics,
      violations: this.testResults.violations,
      recommendations: this.testResults.recommendations,
    };
    
    await fs.writeFile(reportPath, JSON.stringify(jsonReport, null, 2));
    console.log(`📊 JSON report saved: ${reportPath}`);
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(timestamp) {
    const reportPath = path.join(this.config.outputDir, `performance-report-${timestamp}.html`);
    
    const htmlContent = this.buildHTMLReport();
    await fs.writeFile(reportPath, htmlContent);
    
    console.log(`📊 HTML report saved: ${reportPath}`);
  }

  /**
   * Generate summary report for CI/CD
   */
  async generateSummaryReport(timestamp) {
    const reportPath = path.join(this.config.outputDir, `performance-summary-${timestamp}.txt`);
    
    const summary = `
PERFORMANCE TEST SUMMARY
========================
Timestamp: ${new Date().toISOString()}
Environment: ${this.config.environment}
Target: ${this.config.baseUrl}
Duration: ${Math.round(this.testResults.summary.totalDuration / 1000 / 60)} minutes

SCENARIO RESULTS
================
Total Scenarios: ${this.testResults.summary.scenariosRun}
Passed: ${this.testResults.summary.scenariosPassed}
Failed: ${this.testResults.summary.scenariosFailed}
Success Rate: ${((this.testResults.summary.scenariosPassed / Math.max(1, this.testResults.summary.scenariosRun)) * 100).toFixed(1)}%

PERFORMANCE METRICS
===================
Total Requests: ${this.formatNumber(this.testResults.metrics.totalRequests || 0)}
Success Rate: ${(this.testResults.metrics.successRate || 0).toFixed(2)}%
Avg Response Time: ${(this.testResults.metrics.avgResponseTime || 0).toFixed(0)}ms
P95 Response Time: ${this.testResults.metrics.p95ResponseTime || 0}ms
Max Throughput: ${this.formatNumber(this.testResults.metrics.maxThroughput || 0)} req/s
Max Concurrent Users: ${this.formatNumber(this.testResults.metrics.maxConcurrentUsers || 0)}

SLA COMPLIANCE
==============
SLA Violations: ${this.testResults.violations.length}
Critical Violations: ${this.testResults.violations.filter(v => v.severity === 'critical').length}
High Priority Violations: ${this.testResults.violations.filter(v => v.severity === 'high').length}

${this.testResults.violations.length > 0 ? 'VIOLATIONS:\n' + this.testResults.violations.map(v => `- ${v.message}`).join('\n') : 'No SLA violations detected!'}

RECOMMENDATIONS
===============
${this.testResults.recommendations.length > 0 ? 
  this.testResults.recommendations.map(r => `- [${r.priority}] ${r.issue}: ${r.recommendation}`).join('\n') : 
  'No specific recommendations at this time.'}

OVERALL STATUS: ${this.testResults.summary.overallStatus.toUpperCase()}
`;
    
    await fs.writeFile(reportPath, summary);
    console.log(`📊 Summary report saved: ${reportPath}`);
  }

  /**
   * Handle CI/CD integration
   */
  async handleCIIntegration() {
    console.log('🔄 Handling CI/CD integration...');
    
    if (process.env.CI === 'true') {
      // Set GitHub Actions output
      if (process.env.GITHUB_ACTIONS === 'true') {
        await this.setGitHubActionsOutput();
      }
      
      // Upload results if configured
      if (this.config.uploadResults) {
        await this.uploadResults();
      }
      
      // Check for SLA violations that should fail CI
      if (this.config.failOnSLAViolation) {
        const criticalViolations = this.testResults.violations.filter(v => v.severity === 'critical');
        
        if (criticalViolations.length > 0) {
          console.error(`❌ CI/CD failure: ${criticalViolations.length} critical SLA violations detected`);
          process.exit(1);
        }
      }
    }
    
    console.log('✅ CI/CD integration completed');
  }

  /**
   * Set GitHub Actions output variables
   */
  async setGitHubActionsOutput() {
    const outputs = [
      `performance-score=${this.calculatePerformanceScore()}`,
      `sla-violations=${this.testResults.violations.length}`,
      `success-rate=${(this.testResults.metrics.successRate || 0).toFixed(2)}`,
      `avg-response-time=${(this.testResults.metrics.avgResponseTime || 0).toFixed(0)}`,
      `max-throughput=${this.testResults.metrics.maxThroughput || 0}`,
    ];
    
    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      await fs.appendFile(outputFile, outputs.join('\n') + '\n');
      console.log('✅ GitHub Actions outputs set');
    }
  }

  /**
   * Upload test results to external storage
   */
  async uploadResults() {
    console.log('📤 Uploading results (placeholder)...');
    // Placeholder for result upload functionality
    // Could integrate with S3, GCS, or other storage services
  }

  /**
   * Cleanup after test execution
   */
  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    // Stop monitoring if it was started
    try {
      await this.executeShellCommand(`curl -f ${this.config.baseUrl}/api/internal/monitoring/stop`, {});
    } catch (error) {
      // Ignore cleanup errors
    }
    
    console.log('✅ Cleanup completed');
  }

  // Utility methods

  /**
   * Calculate weighted average
   */
  calculateWeightedAverage(items, valueKey, weightKey) {
    let totalWeightedValue = 0;
    let totalWeight = 0;
    
    items.forEach(item => {
      const value = item[valueKey] || 0;
      const weight = item[weightKey] || 0;
      totalWeightedValue += value * weight;
      totalWeight += weight;
    });
    
    return totalWeight > 0 ? totalWeightedValue / totalWeight : 0;
  }

  /**
   * Calculate overall performance score
   */
  calculatePerformanceScore() {
    const metrics = this.testResults.metrics;
    let score = 100;
    
    // Response time impact
    const avgResponseTime = metrics.avgResponseTime || 0;
    if (avgResponseTime > 200) score -= 20;
    else if (avgResponseTime > 100) score -= 10;
    
    // Success rate impact
    const successRate = metrics.successRate || 0;
    if (successRate < 99) score -= 30;
    else if (successRate < 99.9) score -= 15;
    
    // SLA violations impact
    const violations = this.testResults.violations.length;
    score -= violations * 5;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Format large numbers
   */
  formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  }

  /**
   * Build HTML report content
   */
  buildHTMLReport() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background: #f4f4f4; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .card h3 { margin: 0 0 10px 0; color: #333; }
        .card .value { font-size: 2em; font-weight: bold; color: #007bff; }
        .scenarios { margin: 30px 0; }
        .scenario { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 8px; }
        .scenario.passed { border-left: 4px solid #28a745; }
        .scenario.failed { border-left: 4px solid #dc3545; }
        .violations { margin: 30px 0; }
        .violation { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ffc107; }
        .violation.critical { background: #f8d7da; border-left-color: #dc3545; }
        .recommendations { margin: 30px 0; }
        .recommendation { background: #d1ecf1; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Performance Test Report</h1>
            <p>Generated: ${new Date().toISOString()}</p>
            <p>Environment: ${this.config.environment} | Target: ${this.config.baseUrl}</p>
        </div>
        
        <div class="summary">
            <div class="card">
                <h3>Total Requests</h3>
                <div class="value">${this.formatNumber(this.testResults.metrics.totalRequests || 0)}</div>
            </div>
            <div class="card">
                <h3>Success Rate</h3>
                <div class="value">${(this.testResults.metrics.successRate || 0).toFixed(1)}%</div>
            </div>
            <div class="card">
                <h3>Avg Response Time</h3>
                <div class="value">${(this.testResults.metrics.avgResponseTime || 0).toFixed(0)}ms</div>
            </div>
            <div class="card">
                <h3>Max Throughput</h3>
                <div class="value">${this.formatNumber(this.testResults.metrics.maxThroughput || 0)}</div>
            </div>
        </div>
        
        <div class="scenarios">
            <h2>📊 Test Scenarios</h2>
            ${Object.entries(this.testResults.scenarios).map(([name, result]) => `
                <div class="scenario ${result.status}">
                    <h3>${name} - ${result.status.toUpperCase()}</h3>
                    <p>Duration: ${Math.round((result.duration || 0) / 1000)}s</p>
                    ${result.error ? `<p style="color: #dc3545;">Error: ${result.error}</p>` : ''}
                </div>
            `).join('')}
        </div>
        
        ${this.testResults.violations.length > 0 ? `
        <div class="violations">
            <h2>🚨 SLA Violations</h2>
            ${this.testResults.violations.map(violation => `
                <div class="violation ${violation.severity}">
                    <strong>[${violation.severity.toUpperCase()}]</strong> ${violation.message}
                </div>
            `).join('')}
        </div>
        ` : '<div class="violations"><h2>✅ No SLA Violations</h2></div>'}
        
        ${this.testResults.recommendations.length > 0 ? `
        <div class="recommendations">
            <h2>💡 Recommendations</h2>
            ${this.testResults.recommendations.map(rec => `
                <div class="recommendation">
                    <strong>[${rec.priority}]</strong> ${rec.issue}: ${rec.recommendation}
                </div>
            `).join('')}
        </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Ensure directory exists
   */
  async ensureDirectory(dir) {
    try {
      await fs.access(dir);
    } catch (error) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  /**
   * Sleep for specified milliseconds
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution
if (require.main === module) {
  const orchestrator = new PerformanceTestOrchestrator();
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received interrupt signal, shutting down gracefully...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received terminate signal, shutting down gracefully...');
    process.exit(0);
  });
  
  orchestrator.runPerformanceTests().catch(error => {
    console.error('❌ Performance test orchestration failed:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceTestOrchestrator, PERFORMANCE_CONFIG };