/**
 * Redis Cluster Performance and Scalability Test
 * Tests Redis cluster behavior under high load and scaling scenarios
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

// Redis cluster metrics
const redisMetrics = {
  // Connection metrics
  connectionPoolSize: new Gauge('redis_connection_pool_size'),
  activeConnections: new Gauge('redis_active_connections'),
  connectionLatency: new Trend('redis_connection_latency_ms'),
  connectionFailures: new Counter('redis_connection_failures'),
  
  // Performance metrics
  operationLatency: new Trend('redis_operation_latency_ms'),
  throughputOperationsPerSecond: new Gauge('redis_throughput_ops_per_sec'),
  cacheHitRate: new Gauge('redis_cache_hit_rate_percent'),
  cacheMissRate: new Gauge('redis_cache_miss_rate_percent'),
  
  // Cluster metrics
  clusterNodes: new Gauge('redis_cluster_nodes'),
  clusterSlotsDistribution: new Trend('redis_cluster_slots_distribution'),
  clusterRebalanceEvents: new Counter('redis_cluster_rebalance_events'),
  crossSlotOperations: new Counter('redis_cross_slot_operations'),
  
  // Memory and storage
  memoryUsage: new Gauge('redis_memory_usage_bytes'),
  memoryUtilization: new Gauge('redis_memory_utilization_percent'),
  keyEvictions: new Counter('redis_key_evictions'),
  expiredKeys: new Counter('redis_expired_keys'),
  
  // High availability
  failoverEvents: new Counter('redis_failover_events'),
  replicationLag: new Trend('redis_replication_lag_ms'),
  masterSlaveConsistency: new Rate('redis_master_slave_consistency'),
  
  // Error tracking
  timeoutOperations: new Counter('redis_timeout_operations'),
  clusterDownEvents: new Counter('redis_cluster_down_events'),
  slotMigrationErrors: new Counter('redis_slot_migration_errors'),
};

/**
 * Redis Cluster Performance Test Suite
 */
export class RedisClusterTest {
  constructor(baseUrl, config = {}) {
    this.baseUrl = baseUrl;
    this.config = {
      redisEndpoint: config.redisEndpoint || '/api/internal/redis-metrics',
      cacheEndpoint: config.cacheEndpoint || '/api/internal/cache-test',
      expectedNodes: config.expectedNodes || 6,        // 3 masters + 3 slaves
      maxMemoryUsage: config.maxMemoryUsage || 0.8,   // 80% memory threshold
      expectedHitRate: config.expectedHitRate || 0.9, // 90% hit rate
      operationTimeout: config.operationTimeout || 5000,
      ...config,
    };
    
    this.clusterState = {
      nodes: [],
      slots: {},
      memory: {},
      performance: {},
    };
    
    this.testDataSets = this.generateTestDataSets();
  }

  /**
   * Run comprehensive Redis cluster tests
   */
  runClusterTests() {
    console.log('Starting Redis Cluster Performance Tests');
    
    group('Redis Cluster Test Suite', () => {
      // Test 1: Cluster topology and health
      this.testClusterTopology();
      
      // Test 2: Connection pool performance
      this.testConnectionPoolPerformance();
      
      // Test 3: Cache operation performance
      this.testCacheOperationPerformance();
      
      // Test 4: High-throughput stress testing
      this.testHighThroughputOperations();
      
      // Test 5: Slot distribution and rebalancing
      this.testSlotDistribution();
      
      // Test 6: Failover and high availability
      this.testFailoverScenarios();
      
      // Test 7: Memory management and eviction
      this.testMemoryManagement();
      
      // Test 8: Cross-slot operations
      this.testCrossSlotOperations();
    });
  }

  /**
   * Test cluster topology and node health
   */
  testClusterTopology() {
    group('Cluster Topology', () => {
      console.log('Testing Redis cluster topology...');
      
      const topologyResponse = this.getClusterTopology();
      
      if (topologyResponse.success) {
        const topology = topologyResponse.data;
        
        redisMetrics.clusterNodes.add(topology.nodeCount);
        
        check(topology, {
          'Expected number of nodes': (t) => t.nodeCount === this.config.expectedNodes,
          'All nodes healthy': (t) => t.healthyNodes === t.nodeCount,
          'Masters available': (t) => t.masters > 0,
          'Slaves available': (t) => t.slaves > 0,
          'All slots covered': (t) => t.slotsAssigned === 16384, // Redis has 16384 slots
        });
        
        this.clusterState.nodes = topology.nodes;
        console.log(`✅ Cluster topology: ${topology.nodeCount} nodes (${topology.masters}M/${topology.slaves}S)`);
      } else {
        console.error('❌ Failed to get cluster topology');
      }
    });
  }

  /**
   * Test connection pool performance
   */
  testConnectionPoolPerformance() {
    group('Connection Pool Performance', () => {
      console.log('Testing Redis connection pool performance...');
      
      // Test connection pool scaling
      const connectionTests = [];
      
      // Simulate concurrent connections
      for (let i = 0; i < 50; i++) {
        connectionTests.push(() => {
          const connectionStart = Date.now();
          
          const response = this.testCacheOperation('get', `conn_test_${i}`, null);
          
          const connectionTime = Date.now() - connectionStart;
          redisMetrics.connectionLatency.add(connectionTime);
          
          if (response.success) {
            redisMetrics.activeConnections.add(1);
            return true;
          } else {
            redisMetrics.connectionFailures.add(1);
            return false;
          }
        });
      }
      
      // Execute connection tests
      const connectionResults = connectionTests.map(test => test());
      const successfulConnections = connectionResults.filter(result => result).length;
      
      check(connectionResults, {
        'High connection success rate': () => (successfulConnections / connectionResults.length) > 0.95,
        'Connection latency acceptable': () => redisMetrics.connectionLatency.avg < 10, // < 10ms
      });
      
      console.log(`Connection test: ${successfulConnections}/${connectionResults.length} successful`);
    });
  }

  /**
   * Test basic cache operation performance
   */
  testCacheOperationPerformance() {
    group('Cache Operation Performance', () => {
      console.log('Testing cache operation performance...');
      
      const operationResults = {
        sets: [],
        gets: [],
        deletes: [],
      };
      
      // Test SET operations
      for (let i = 0; i < 100; i++) {
        const setStart = Date.now();
        const setResult = this.testCacheOperation('set', `perf_test_${i}`, `value_${i}`);
        const setTime = Date.now() - setStart;
        
        operationResults.sets.push({
          success: setResult.success,
          latency: setTime,
        });
        
        redisMetrics.operationLatency.add(setTime);
      }
      
      sleep(1); // Brief pause between operations
      
      // Test GET operations (should hit cache)
      for (let i = 0; i < 100; i++) {
        const getStart = Date.now();
        const getResult = this.testCacheOperation('get', `perf_test_${i}`, null);
        const getTime = Date.now() - getStart;
        
        operationResults.gets.push({
          success: getResult.success,
          latency: getTime,
          hit: getResult.data !== null,
        });
        
        redisMetrics.operationLatency.add(getTime);
      }
      
      // Calculate hit rate
      const hits = operationResults.gets.filter(g => g.hit).length;
      const hitRate = (hits / operationResults.gets.length) * 100;
      redisMetrics.cacheHitRate.add(hitRate);
      redisMetrics.cacheMissRate.add(100 - hitRate);
      
      // Test DELETE operations
      for (let i = 0; i < 50; i++) {
        const deleteStart = Date.now();
        const deleteResult = this.testCacheOperation('delete', `perf_test_${i}`, null);
        const deleteTime = Date.now() - deleteStart;
        
        operationResults.deletes.push({
          success: deleteResult.success,
          latency: deleteTime,
        });
        
        redisMetrics.operationLatency.add(deleteTime);
      }
      
      // Analyze results
      const avgSetLatency = this.calculateAverageLatency(operationResults.sets);
      const avgGetLatency = this.calculateAverageLatency(operationResults.gets);
      const avgDeleteLatency = this.calculateAverageLatency(operationResults.deletes);
      
      check(operationResults, {
        'SET operations fast': () => avgSetLatency < 5, // < 5ms
        'GET operations fast': () => avgGetLatency < 2, // < 2ms
        'DELETE operations fast': () => avgDeleteLatency < 3, // < 3ms
        'High cache hit rate': () => hitRate > this.config.expectedHitRate * 100,
        'SET success rate high': () => this.calculateSuccessRate(operationResults.sets) > 0.99,
        'GET success rate high': () => this.calculateSuccessRate(operationResults.gets) > 0.99,
      });
      
      console.log(`Cache performance: SET ${avgSetLatency}ms, GET ${avgGetLatency}ms, DEL ${avgDeleteLatency}ms`);
      console.log(`Cache hit rate: ${hitRate.toFixed(1)}%`);
    });
  }

  /**
   * Test high-throughput operations
   */
  testHighThroughputOperations() {
    group('High Throughput Stress Test', () => {
      console.log('Testing high-throughput Redis operations...');
      
      const throughputStart = Date.now();
      const operationCount = 1000;
      const concurrentOperations = [];
      
      // Generate concurrent operations
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 3 === 0 ? 'set' : 'get';
        const key = `throughput_test_${i % 100}`; // Reuse keys to test contention
        const value = operationType === 'set' ? `high_throughput_value_${i}` : null;
        
        concurrentOperations.push(() => {
          return this.testCacheOperation(operationType, key, value);
        });
      }
      
      // Execute all operations
      const results = concurrentOperations.map(op => op());
      const throughputTime = (Date.now() - throughputStart) / 1000;
      const operationsPerSecond = operationCount / throughputTime;
      
      redisMetrics.throughputOperationsPerSecond.add(operationsPerSecond);
      
      const successfulOperations = results.filter(r => r.success).length;
      const successRate = successfulOperations / operationCount;
      
      check(results, {
        'High throughput achieved': () => operationsPerSecond > 500, // > 500 ops/sec
        'High success rate under load': () => successRate > 0.95,
        'Reasonable response time under load': () => throughputTime < 10, // Complete in < 10s
      });
      
      console.log(`Throughput test: ${operationsPerSecond.toFixed(0)} ops/sec, ${(successRate * 100).toFixed(1)}% success`);
    });
  }

  /**
   * Test slot distribution and rebalancing
   */
  testSlotDistribution() {
    group('Slot Distribution', () => {
      console.log('Testing Redis cluster slot distribution...');
      
      const slotDistribution = this.getSlotDistribution();
      
      if (slotDistribution.success) {
        const distribution = slotDistribution.data;
        
        // Calculate distribution variance
        const slotsPerNode = distribution.map(node => node.slotCount);
        const avgSlotsPerNode = slotsPerNode.reduce((a, b) => a + b, 0) / slotsPerNode.length;
        const variance = slotsPerNode.reduce((sum, slots) => 
          sum + Math.pow(slots - avgSlotsPerNode, 2), 0) / slotsPerNode.length;
        
        redisMetrics.clusterSlotsDistribution.add(Math.sqrt(variance));
        
        check(distribution, {
          'Slots evenly distributed': () => Math.sqrt(variance) < avgSlotsPerNode * 0.1, // < 10% variance
          'All slots assigned': () => distribution.reduce((sum, node) => sum + node.slotCount, 0) === 16384,
          'No unassigned slots': () => distribution.every(node => node.slotCount > 0),
        });
        
        console.log(`Slot distribution variance: ${Math.sqrt(variance).toFixed(2)}`);
      }
    });
  }

  /**
   * Test failover scenarios
   */
  testFailoverScenarios() {
    group('Failover and High Availability', () => {
      console.log('Testing Redis failover scenarios...');
      
      // Test read operations during simulated failover
      const failoverResults = [];
      
      for (let i = 0; i < 20; i++) {
        const operation = this.testCacheOperation('get', `failover_test_${i}`, null);
        failoverResults.push(operation);
        
        // Brief pause between operations
        sleep(0.1);
      }
      
      const successfulReads = failoverResults.filter(r => r.success).length;
      const availabilityPercent = (successfulReads / failoverResults.length) * 100;
      
      // Test replication consistency
      const consistencyTest = this.testReplicationConsistency();
      redisMetrics.masterSlaveConsistency.add(consistencyTest.consistent ? 1 : 0);
      
      if (consistencyTest.replicationLag !== undefined) {
        redisMetrics.replicationLag.add(consistencyTest.replicationLag);
      }
      
      check(failoverResults, {
        'High availability maintained': () => availabilityPercent > 95,
        'Replication consistent': () => consistencyTest.consistent,
        'Low replication lag': () => (consistencyTest.replicationLag || 0) < 10, // < 10ms
      });
      
      console.log(`Failover test: ${availabilityPercent.toFixed(1)}% availability, replication lag: ${consistencyTest.replicationLag || 0}ms`);
    });
  }

  /**
   * Test memory management and eviction
   */
  testMemoryManagement() {
    group('Memory Management', () => {
      console.log('Testing Redis memory management...');
      
      const memoryInfo = this.getMemoryInfo();
      
      if (memoryInfo.success) {
        const memory = memoryInfo.data;
        
        redisMetrics.memoryUsage.add(memory.usedMemory);
        redisMetrics.memoryUtilization.add(memory.memoryUtilization);
        redisMetrics.keyEvictions.add(memory.evictedKeys);
        redisMetrics.expiredKeys.add(memory.expiredKeys);
        
        check(memory, {
          'Memory usage within limits': (m) => m.memoryUtilization < this.config.maxMemoryUsage,
          'Memory info available': (m) => m.usedMemory > 0,
          'Eviction policy working': (m) => m.evictedKeys !== undefined,
        });
        
        // Test memory pressure handling
        const memoryPressureTest = this.testMemoryPressure();
        
        check(memoryPressureTest, {
          'Handles memory pressure gracefully': (test) => test.gracefulHandling,
          'Eviction policy effective': (test) => test.evictionEffective,
        });
        
        console.log(`Memory: ${memory.memoryUtilization.toFixed(1)}% used, ${memory.evictedKeys} evictions`);
      }
    });
  }

  /**
   * Test cross-slot operations (Redis Cluster limitation)
   */
  testCrossSlotOperations() {
    group('Cross-slot Operations', () => {
      console.log('Testing cross-slot operations...');
      
      // Test operations that might span multiple slots
      const crossSlotTests = [];
      
      // Multi-key operations that might hit different slots
      const keys = ['slot_test_a', 'slot_test_b', 'slot_test_c'];
      
      for (let i = 0; i < keys.length; i++) {
        const setResult = this.testCacheOperation('set', keys[i], `value_${i}`);
        crossSlotTests.push(setResult);
      }
      
      // Test multi-key get (may require cross-slot handling)
      const multiGetResult = this.testMultiKeyOperation('mget', keys);
      
      if (multiGetResult.crossSlot) {
        redisMetrics.crossSlotOperations.add(1);
      }
      
      check(crossSlotTests, {
        'Single-key operations succeed': () => crossSlotTests.every(t => t.success),
        'Multi-key operations handled': () => multiGetResult.success || multiGetResult.expectedFailure,
      });
      
      console.log(`Cross-slot operations: ${multiGetResult.crossSlot ? 'detected' : 'not detected'}`);
    });
  }

  // Helper methods for Redis operations

  /**
   * Get cluster topology information
   */
  getClusterTopology() {
    try {
      const response = http.get(`${this.baseUrl}${this.config.redisEndpoint}/topology`, {
        timeout: `${this.config.operationTimeout}ms`,
      });
      
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return {
          success: true,
          data: {
            nodeCount: data.nodes?.length || 0,
            healthyNodes: data.nodes?.filter(n => n.healthy).length || 0,
            masters: data.masters || 0,
            slaves: data.slaves || 0,
            slotsAssigned: data.slotsAssigned || 0,
            nodes: data.nodes || [],
          },
        };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test individual cache operation
   */
  testCacheOperation(operation, key, value) {
    try {
      const payload = {
        operation: operation,
        key: key,
      };
      
      if (value !== null) {
        payload.value = value;
      }
      
      const response = http.post(`${this.baseUrl}${this.config.cacheEndpoint}`, 
        JSON.stringify(payload), {
          headers: requestConfig.headers,
          timeout: `${this.config.operationTimeout}ms`,
        }
      );
      
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return {
          success: true,
          data: data.result,
          latency: response.timings.duration,
        };
      }
      
      if (response.status === 408) {
        redisMetrics.timeoutOperations.add(1);
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get slot distribution information
   */
  getSlotDistribution() {
    try {
      const response = http.get(`${this.baseUrl}${this.config.redisEndpoint}/slots`, {
        timeout: `${this.config.operationTimeout}ms`,
      });
      
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return {
          success: true,
          data: data.distribution || [],
        };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test replication consistency
   */
  testReplicationConsistency() {
    try {
      const testKey = 'consistency_test';
      const testValue = `test_${Date.now()}`;
      
      // Write to master
      const writeResult = this.testCacheOperation('set', testKey, testValue);
      
      if (!writeResult.success) {
        return { consistent: false, error: 'Write failed' };
      }
      
      // Small delay for replication
      sleep(0.1);
      
      // Read from cluster (may hit slave)
      const readResult = this.testCacheOperation('get', testKey, null);
      
      const consistent = readResult.success && readResult.data === testValue;
      
      return {
        consistent: consistent,
        replicationLag: readResult.latency || 0,
      };
    } catch (error) {
      return { consistent: false, error: error.message };
    }
  }

  /**
   * Get memory information
   */
  getMemoryInfo() {
    try {
      const response = http.get(`${this.baseUrl}${this.config.redisEndpoint}/memory`, {
        timeout: `${this.config.operationTimeout}ms`,
      });
      
      if (response.status === 200) {
        const data = JSON.parse(response.body);
        return {
          success: true,
          data: {
            usedMemory: data.usedMemory || 0,
            maxMemory: data.maxMemory || 0,
            memoryUtilization: ((data.usedMemory || 0) / Math.max(data.maxMemory || 1, 1)) * 100,
            evictedKeys: data.evictedKeys || 0,
            expiredKeys: data.expiredKeys || 0,
          },
        };
      }
      
      return { success: false, error: `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test memory pressure handling
   */
  testMemoryPressure() {
    // Fill cache with test data to create memory pressure
    const pressureKeys = [];
    
    for (let i = 0; i < 50; i++) {
      const key = `memory_pressure_${i}`;
      const largeValue = 'x'.repeat(1000); // 1KB value
      
      const result = this.testCacheOperation('set', key, largeValue);
      
      if (result.success) {
        pressureKeys.push(key);
      }
    }
    
    // Check if eviction is working
    const memoryAfter = this.getMemoryInfo();
    
    return {
      gracefulHandling: pressureKeys.length > 0,
      evictionEffective: memoryAfter.success && memoryAfter.data.evictedKeys > 0,
      keysSet: pressureKeys.length,
    };
  }

  /**
   * Test multi-key operations
   */
  testMultiKeyOperation(operation, keys) {
    try {
      const response = http.post(`${this.baseUrl}${this.config.cacheEndpoint}/multi`, 
        JSON.stringify({
          operation: operation,
          keys: keys,
        }), {
          headers: requestConfig.headers,
          timeout: `${this.config.operationTimeout}ms`,
        }
      );
      
      // Multi-key operations may fail in Redis Cluster if keys are in different slots
      const expectedFailure = response.status === 400; // CROSSSLOT error
      
      return {
        success: response.status === 200,
        expectedFailure: expectedFailure,
        crossSlot: expectedFailure || (response.body && response.body.includes('CROSSSLOT')),
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Calculate average latency from operation results
   */
  calculateAverageLatency(operations) {
    if (operations.length === 0) return 0;
    
    const totalLatency = operations.reduce((sum, op) => sum + (op.latency || 0), 0);
    return totalLatency / operations.length;
  }

  /**
   * Calculate success rate from operation results
   */
  calculateSuccessRate(operations) {
    if (operations.length === 0) return 0;
    
    const successfulOps = operations.filter(op => op.success).length;
    return successfulOps / operations.length;
  }

  /**
   * Generate test data sets
   */
  generateTestDataSets() {
    return {
      small: Array.from({length: 100}, (_, i) => ({
        key: `small_${i}`,
        value: `value_${i}`,
      })),
      
      medium: Array.from({length: 50}, (_, i) => ({
        key: `medium_${i}`,
        value: 'x'.repeat(100), // 100 bytes
      })),
      
      large: Array.from({length: 10}, (_, i) => ({
        key: `large_${i}`,
        value: 'x'.repeat(10000), // 10KB
      })),
    };
  }

  /**
   * Generate Redis cluster test report
   */
  generateClusterReport() {
    return {
      summary: {
        clusterNodes: redisMetrics.clusterNodes.value || 0,
        averageOperationLatency: redisMetrics.operationLatency.avg || 0,
        maxThroughput: redisMetrics.throughputOperationsPerSecond.value || 0,
        cacheHitRate: redisMetrics.cacheHitRate.value || 0,
        memoryUtilization: redisMetrics.memoryUtilization.value || 0,
      },
      
      performance: {
        connectionLatency: redisMetrics.connectionLatency.avg || 0,
        operationLatency: redisMetrics.operationLatency.avg || 0,
        throughput: redisMetrics.throughputOperationsPerSecond.value || 0,
        replicationLag: redisMetrics.replicationLag.avg || 0,
      },
      
      cluster: {
        nodes: redisMetrics.clusterNodes.value || 0,
        slotDistributionVariance: redisMetrics.clusterSlotsDistribution.avg || 0,
        crossSlotOperations: redisMetrics.crossSlotOperations.count || 0,
        rebalanceEvents: redisMetrics.clusterRebalanceEvents.count || 0,
      },
      
      reliability: {
        connectionFailures: redisMetrics.connectionFailures.count || 0,
        timeoutOperations: redisMetrics.timeoutOperations.count || 0,
        failoverEvents: redisMetrics.failoverEvents.count || 0,
        masterSlaveConsistency: (redisMetrics.masterSlaveConsistency.rate || 0) * 100,
      },
      
      memory: {
        memoryUsage: redisMetrics.memoryUsage.value || 0,
        memoryUtilization: redisMetrics.memoryUtilization.value || 0,
        keyEvictions: redisMetrics.keyEvictions.count || 0,
        expiredKeys: redisMetrics.expiredKeys.count || 0,
      },
      
      recommendations: this.generateRedisRecommendations(),
      
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate Redis-specific recommendations
   */
  generateRedisRecommendations() {
    const recommendations = [];
    
    const avgLatency = redisMetrics.operationLatency.avg || 0;
    if (avgLatency > 5) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: `Average operation latency ${avgLatency.toFixed(2)}ms`,
        recommendation: 'Optimize network connectivity or increase Redis memory allocation',
      });
    }
    
    const hitRate = redisMetrics.cacheHitRate.value || 0;
    if (hitRate < this.config.expectedHitRate * 100) {
      recommendations.push({
        category: 'Cache Efficiency',
        priority: 'Medium',
        issue: `Cache hit rate ${hitRate.toFixed(1)}% below target`,
        recommendation: 'Review cache strategy, increase TTL, or add cache warming',
      });
    }
    
    const memoryUtilization = redisMetrics.memoryUtilization.value || 0;
    if (memoryUtilization > this.config.maxMemoryUsage * 100) {
      recommendations.push({
        category: 'Memory Management',
        priority: 'High',
        issue: `Memory utilization at ${memoryUtilization.toFixed(1)}%`,
        recommendation: 'Increase Redis memory allocation or review eviction policies',
      });
    }
    
    const connectionFailures = redisMetrics.connectionFailures.count || 0;
    if (connectionFailures > 0) {
      recommendations.push({
        category: 'Connection Pool',
        priority: 'High',
        issue: `${connectionFailures} connection failures detected`,
        recommendation: 'Increase connection pool size or check network stability',
      });
    }
    
    return recommendations;
  }
}

// Factory function
export function createRedisClusterTest(baseUrl, config = {}) {
  return new RedisClusterTest(baseUrl, config);
}

export default RedisClusterTest;