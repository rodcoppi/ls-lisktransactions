const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/test-utils/setup.ts',
    '<rootDir>/src/test-utils/matchers.ts'
  ],
  setupFiles: ['<rootDir>/src/test-utils/env.ts'],
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/test-utils/(.*)$': '<rootDir>/src/test-utils/$1',
  },
  
  // Test environment configuration
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  
  // Coverage configuration - 95%+ coverage target
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test-utils/**/*',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/*.config.{js,ts}',
    '!src/**/index.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/page.tsx',
    '!src/middleware.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    // Specific thresholds for critical components
    'src/lib/api/**/*.{js,jsx,ts,tsx}': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98,
    },
    'src/lib/cache/**/*.{js,jsx,ts,tsx}': {
      branches: 97,
      functions: 97,
      lines: 97,
      statements: 97,
    },
    'src/hooks/**/*.{js,jsx,ts,tsx}': {
      branches: 96,
      functions: 96,
      lines: 96,
      statements: 96,
    }
  },
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary',
    'cobertura'
  ],
  
  // Test patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{js,jsx,ts,tsx}',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/',
  ],
  
  // Performance optimizations
  maxWorkers: '50%', // Use 50% of available CPU cores
  cacheDirectory: '<rootDir>/.jest-cache',
  testTimeout: 10000, // 10 seconds timeout for tests
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['@swc/jest', {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
    }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Global setup
  globalSetup: '<rootDir>/src/test-utils/global-setup.ts',
  globalTeardown: '<rootDir>/src/test-utils/global-teardown.ts',
  
  // Test result processor for custom reporting
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: './coverage/',
        outputName: 'junit.xml',
      },
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'index.html',
      },
    ],
  ],
  
  // Mock configuration
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/coverage/',
  ],
  
  // Error handling
  errorOnDeprecated: true,
  verbose: false, // Set to true for debugging
  
  // Collect coverage from test files as well
  collectCoverage: process.env.NODE_ENV !== 'development',
  
  // Bail on first test failure in CI
  bail: process.env.CI ? 1 : 0,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)