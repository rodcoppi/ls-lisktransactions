/**
 * Performance API mocks for testing
 */

export function setupPerformanceObserver() {
  const mockPerformanceObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  Object.defineProperty(global, 'PerformanceObserver', {
    value: mockPerformanceObserver,
    writable: true,
  })

  // Mock performance.now
  Object.defineProperty(global.performance, 'now', {
    value: jest.fn(() => Date.now()),
    writable: true,
  })

  // Mock performance.mark
  Object.defineProperty(global.performance, 'mark', {
    value: jest.fn(),
    writable: true,
  })

  // Mock performance.measure
  Object.defineProperty(global.performance, 'measure', {
    value: jest.fn(),
    writable: true,
  })

  // Mock performance.getEntriesByType
  Object.defineProperty(global.performance, 'getEntriesByType', {
    value: jest.fn(() => []),
    writable: true,
  })
}

export function createMockPerformanceEntry(overrides: Partial<PerformanceEntry> = {}): PerformanceEntry {
  return {
    name: 'mock-entry',
    entryType: 'measure',
    startTime: 0,
    duration: 100,
    toJSON: () => ({}),
    ...overrides,
  }
}