/**
 * Environment variables setup for testing
 * This file is loaded before any tests run
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_ENV = 'test'

// Database configuration for tests
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/lisk_counter_test'
process.env.REDIS_URL = 'redis://localhost:6379/1'

// Security settings
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// API keys and external services (use test values)
process.env.BLOCKSCOUT_API_URL = 'http://localhost:3001/api/v2'
process.env.RATE_LIMIT_MAX = '1000'
process.env.RATE_LIMIT_WINDOW = '60000'

// Feature flags for testing
process.env.ENABLE_ANALYTICS = 'true'
process.env.ENABLE_REAL_TIME = 'true'
process.env.ENABLE_CACHING = 'true'
process.env.ENABLE_COMPRESSION = 'true'

// Logging configuration
process.env.LOG_LEVEL = 'error' // Reduce log noise in tests

export {}