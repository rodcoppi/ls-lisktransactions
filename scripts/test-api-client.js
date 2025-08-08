#!/usr/bin/env node

/**
 * Script to test the bulletproof Blockscout API client
 * Runs comprehensive stress test to validate 0% failure rate
 */

const path = require('path');

// Add the src directory to the module search path for TypeScript compilation
require('ts-node').register({
  project: path.join(__dirname, '../tsconfig.json'),
  transpileOnly: true,
});

// Now we can import our TypeScript modules
const { runStressTest, runSmokeTest } = require('../src/lib/api/__tests__/stress-test');

async function main() {
  console.log('🚀 Testing Bulletproof Blockscout API Client');
  console.log('=' .repeat(60));
  
  try {
    // First run a quick smoke test
    console.log('\n🔥 Phase 1: Smoke Test');
    const smokeTestPassed = await runSmokeTest();
    
    if (!smokeTestPassed) {
      console.error('❌ Smoke test failed. Aborting stress test.');
      process.exit(1);
    }
    
    // Then run the comprehensive stress test
    console.log('\n⚡ Phase 2: Comprehensive Stress Test');
    const stressTestConfig = {
      concurrentRequests: 5,
      totalRequests: 100,
      requestTypes: ['stats', 'transactions', 'charts'],
      testDurationMs: 30000, // 30 seconds
    };
    
    const results = await runStressTest(undefined, stressTestConfig);
    
    // Evaluate results
    const success = results.failureRate === 0 && results.p95ResponseTime < 200;
    
    if (success) {
      console.log('\n🏆 SUCCESS: API Client achieved bulletproof reliability!');
      console.log(`✅ Zero failures: ${results.failedRequests === 0}`);
      console.log(`✅ Sub-200ms P95: ${results.p95ResponseTime < 200}`);
      console.log(`✅ Cache effectiveness: ${results.cacheHitRate.toFixed(1)}%`);
      process.exit(0);
    } else {
      console.log('\n❌ FAILURE: API Client did not meet bulletproof criteria');
      console.log(`❌ Failure rate: ${results.failureRate.toFixed(2)}%`);
      console.log(`❌ P95 response time: ${results.p95ResponseTime}ms`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };