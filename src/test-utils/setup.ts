/**
 * Global test setup file for Jest
 * Configures testing environment and global test utilities
 */

import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, beforeEach } from '@jest/globals'
import { cleanup } from '@testing-library/react'
import { server } from './mocks/server'
import { setupIntersectionObserver } from './mocks/dom'
import { setupPerformanceObserver } from './mocks/performance'
import { setupResizeObserver } from './mocks/resize-observer'

// Global test configuration
beforeAll(async () => {
  // Start MSW server for API mocking
  server.listen({
    onUnhandledRequest: 'warn',
  })

  // Setup DOM APIs that aren't available in jsdom
  setupIntersectionObserver()
  setupPerformanceObserver()
  setupResizeObserver()

  // Mock console methods to reduce noise in tests
  const originalError = console.error
  const originalWarn = console.warn

  console.error = (...args) => {
    // Suppress known React warnings in tests
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
        args[0].includes('Warning: An invalid form control'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    // Suppress known warnings in tests
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }

  // Setup global fetch mock
  if (!global.fetch) {
    global.fetch = jest.fn()
  }

  // Setup global window properties
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock scrollTo
  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: jest.fn(),
  })

  // Mock localStorage and sessionStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  }
  
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock URL.createObjectURL
  global.URL.createObjectURL = jest.fn(() => 'mocked-url')
  global.URL.revokeObjectURL = jest.fn()

  // Mock requestAnimationFrame
  global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0))
  global.cancelAnimationFrame = jest.fn(id => clearTimeout(id))
})

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()

  // Reset MSW handlers
  server.resetHandlers()

  // Clear localStorage and sessionStorage
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  // Clean up DOM after each test
  cleanup()

  // Reset any runtime handlers we may use during tests
  server.resetHandlers()
})

afterAll(() => {
  // Clean up MSW server
  server.close()

  // Restore console methods
  jest.restoreAllMocks()
})

// Global test timeout
jest.setTimeout(10000)

// Suppress specific warnings that are safe to ignore in tests
const originalConsoleError = console.error
console.error = (...args) => {
  if (
    args[0]?.includes?.('Warning: Function components cannot be given refs') ||
    args[0]?.includes?.('Warning: validateDOMNesting') ||
    args[0]?.includes?('Warning: React.createFactory() is deprecated')
  ) {
    return
  }
  originalConsoleError.call(console, ...args)
}

// Set up environment variables for tests
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api'
process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000'