/**
 * Global teardown for Jest testing environment
 * Runs once after all test suites complete
 */

import { execSync } from 'child_process'

export default async function globalTeardown() {
  console.log('🧹 Cleaning up test environment...')

  // Clean up test database
  try {
    // This would be uncommented in a real environment
    // execSync('npm run db:test:teardown', { stdio: 'inherit' })
    console.log('✅ Test database cleaned up (mocked)')
  } catch (error) {
    console.warn('⚠️ Test database cleanup failed:', error)
  }

  // Stop test Redis instance
  try {
    // This would be uncommented in a real environment
    // execSync('redis-cli -p 6380 shutdown', { stdio: 'inherit' })
    console.log('✅ Test Redis stopped (mocked)')
  } catch (error) {
    console.warn('⚠️ Test Redis cleanup failed:', error)
  }

  // Clean up temporary test files
  try {
    execSync('rm -rf .tmp-test-files', { stdio: 'inherit' })
    console.log('✅ Temporary test files cleaned up')
  } catch (error) {
    console.warn('⚠️ Temporary files cleanup failed:', error)
  }

  console.log('🎯 Test environment cleanup complete')
}