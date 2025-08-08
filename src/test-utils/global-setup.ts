/**
 * Global setup for Jest testing environment
 * Runs once before all test suites
 */

import { execSync } from 'child_process'

export default async function globalSetup() {
  console.log('🚀 Setting up test environment...')

  // Set test environment
  process.env.NODE_ENV = 'test'

  // Create test database if needed (in a real environment)
  try {
    // This would be uncommented in a real environment with a test database
    // execSync('npm run db:test:setup', { stdio: 'inherit' })
    console.log('✅ Test database ready (mocked)')
  } catch (error) {
    console.warn('⚠️ Test database setup skipped:', error)
  }

  // Start test Redis instance if needed
  try {
    // This would be uncommented in a real environment with Redis
    // execSync('redis-server --port 6380 --daemonize yes', { stdio: 'inherit' })
    console.log('✅ Test Redis ready (mocked)')
  } catch (error) {
    console.warn('⚠️ Test Redis setup skipped:', error)
  }

  // Clean up any previous test artifacts
  try {
    execSync('rm -rf coverage/.tmp jest-cache', { stdio: 'inherit' })
    console.log('✅ Cleaned up test artifacts')
  } catch (error) {
    console.warn('⚠️ Test cleanup skipped:', error)
  }

  console.log('🎯 Test environment setup complete')
}