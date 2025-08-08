/**
 * Comprehensive hook tests with different scenarios
 * Tests custom hooks with edge cases, error handling, and performance
 * Target: 96% coverage with robust scenario testing
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTestQueryClient } from '@/test-utils/helpers/render'
import { server } from '@/test-utils/mocks/server'
import { rest } from 'msw'

// Import hooks to test
import { useApi } from '@/hooks/useApi'
import { useDashboardLayout } from '@/hooks/use-dashboard-layout'
import { useFilters } from '@/hooks/use-filters'
import { useRealtime } from '@/hooks/use-realtime'
import { usePerformance } from '@/hooks/use-performance'
import { useTheme } from '@/hooks/use-theme'

// Test wrapper for hooks that need providers
const createWrapper = (queryClient?: QueryClient) => {
  const testQueryClient = queryClient || createTestQueryClient()
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Custom Hooks', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    queryClient.clear()
  })

  describe('useApi Hook', () => {
    it('should fetch data successfully', async () => {
      const { result } = renderHook(
        () => useApi('/api/stats'),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toMatchObject({
        data: expect.objectContaining({
          totalTransactions: expect.any(Number),
        }),
        success: true,
      })
      expect(result.current.isLoading).toBe(false)
    })

    it('should handle API errors gracefully', async () => {
      server.use(
        rest.get('http://localhost:3000/api/error-endpoint', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal Server Error' })
          )
        })
      )

      const { result } = renderHook(
        () => useApi('/api/error-endpoint'),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeDefined()
      expect(result.current.data).toBeUndefined()
    })

    it('should support custom query options', async () => {
      const { result } = renderHook(
        () => useApi('/api/stats', {
          refetchInterval: 5000,
          enabled: false,
        }),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result.current.isLoading).toBe(false) // Disabled by default
      expect(result.current.data).toBeUndefined()

      // Enable the query
      act(() => {
        result.current.refetch()
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })
    })

    it('should retry on failure', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/retry-test', (req, res, ctx) => {
          attempts++
          if (attempts <= 2) {
            return res(
              ctx.status(500),
              ctx.json({ error: 'Temporary Error' })
            )
          }
          return res(
            ctx.status(200),
            ctx.json({
              data: { success: true },
              success: true,
            })
          )
        })
      )

      const { result } = renderHook(
        () => useApi('/api/retry-test', { retry: 3 }),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(attempts).toBe(3) // 1 initial + 2 retries
      expect(result.current.data?.success).toBe(true)
    })

    it('should cache responses correctly', async () => {
      const { result: result1 } = renderHook(
        () => useApi('/api/stats'),
        { wrapper: createWrapper(queryClient) }
      )

      await waitFor(() => {
        expect(result1.current.isSuccess).toBe(true)
      })

      // Second hook with same query should use cache
      const { result: result2 } = renderHook(
        () => useApi('/api/stats'),
        { wrapper: createWrapper(queryClient) }
      )

      expect(result2.current.data).toEqual(result1.current.data)
      expect(result2.current.isLoading).toBe(false) // From cache
    })

    it('should handle network timeouts', async () => {
      server.use(
        rest.get('http://localhost:3000/api/timeout', (req, res, ctx) => {
          return res(ctx.delay(10000)) // 10 second delay
        })
      )

      const { result } = renderHook(
        () => useApi('/api/timeout', { timeout: 1000 }),
        { wrapper: createWrapper(queryClient) }
      )

      jest.advanceTimersByTime(2000)

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toMatchObject({
        message: expect.stringContaining('timeout'),
      })
    })
  })

  describe('useDashboardLayout Hook', () => {
    it('should initialize with default layout', () => {
      const { result } = renderHook(() => useDashboardLayout())

      expect(result.current.layout).toBeDefined()
      expect(result.current.widgets).toBeInstanceOf(Array)
      expect(result.current.isCustomLayout).toBe(false)
    })

    it('should update widget positions', () => {
      const { result } = renderHook(() => useDashboardLayout())

      const newLayout = [
        { i: 'widget-1', x: 0, y: 0, w: 6, h: 4 },
        { i: 'widget-2', x: 6, y: 0, w: 6, h: 4 },
      ]

      act(() => {
        result.current.updateLayout(newLayout)
      })

      expect(result.current.layout).toEqual(newLayout)
      expect(result.current.isCustomLayout).toBe(true)
    })

    it('should add new widgets', () => {
      const { result } = renderHook(() => useDashboardLayout())

      const newWidget = {
        id: 'new-widget',
        type: 'chart',
        title: 'New Chart',
        config: {},
      }

      act(() => {
        result.current.addWidget(newWidget)
      })

      expect(result.current.widgets).toContainEqual(
        expect.objectContaining({
          id: 'new-widget',
          type: 'chart',
        })
      )
    })

    it('should remove widgets', () => {
      const { result } = renderHook(() => useDashboardLayout())

      // Add a widget first
      act(() => {
        result.current.addWidget({
          id: 'remove-me',
          type: 'stats',
          title: 'Remove Me',
          config: {},
        })
      })

      const initialCount = result.current.widgets.length

      act(() => {
        result.current.removeWidget('remove-me')
      })

      expect(result.current.widgets).toHaveLength(initialCount - 1)
      expect(result.current.widgets.find(w => w.id === 'remove-me')).toBeUndefined()
    })

    it('should reset to default layout', () => {
      const { result } = renderHook(() => useDashboardLayout())

      // Customize layout first
      act(() => {
        result.current.updateLayout([
          { i: 'custom', x: 0, y: 0, w: 12, h: 6 },
        ])
      })

      expect(result.current.isCustomLayout).toBe(true)

      act(() => {
        result.current.resetLayout()
      })

      expect(result.current.isCustomLayout).toBe(false)
    })

    it('should persist layout changes to localStorage', () => {
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')
      
      const { result } = renderHook(() => useDashboardLayout())

      const newLayout = [
        { i: 'persisted', x: 0, y: 0, w: 6, h: 4 },
      ]

      act(() => {
        result.current.updateLayout(newLayout)
      })

      expect(mockSetItem).toHaveBeenCalledWith(
        'dashboard-layout',
        JSON.stringify(newLayout)
      )

      mockSetItem.mockRestore()
    })

    it('should load layout from localStorage', () => {
      const savedLayout = [
        { i: 'saved', x: 3, y: 2, w: 6, h: 4 },
      ]

      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue(JSON.stringify(savedLayout))

      const { result } = renderHook(() => useDashboardLayout())

      expect(result.current.layout).toEqual(savedLayout)
      expect(result.current.isCustomLayout).toBe(true)

      mockGetItem.mockRestore()
    })
  })

  describe('useFilters Hook', () => {
    it('should initialize with default filters', () => {
      const { result } = renderHook(() => useFilters())

      expect(result.current.filters).toBeDefined()
      expect(result.current.activeFilters).toHaveLength(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should add and remove filters', () => {
      const { result } = renderHook(() => useFilters())

      const filter = {
        field: 'status',
        operator: 'equals',
        value: 'active',
      }

      act(() => {
        result.current.addFilter(filter)
      })

      expect(result.current.activeFilters).toHaveLength(1)
      expect(result.current.hasActiveFilters).toBe(true)

      act(() => {
        result.current.removeFilter(0) // Remove by index
      })

      expect(result.current.activeFilters).toHaveLength(0)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('should update existing filters', () => {
      const { result } = renderHook(() => useFilters())

      const filter = {
        field: 'amount',
        operator: 'greater_than',
        value: 100,
      }

      act(() => {
        result.current.addFilter(filter)
      })

      expect(result.current.activeFilters[0].value).toBe(100)

      act(() => {
        result.current.updateFilter(0, { value: 500 })
      })

      expect(result.current.activeFilters[0].value).toBe(500)
    })

    it('should clear all filters', () => {
      const { result } = renderHook(() => useFilters())

      act(() => {
        result.current.addFilter({ field: 'status', operator: 'equals', value: 'active' })
        result.current.addFilter({ field: 'type', operator: 'contains', value: 'test' })
      })

      expect(result.current.activeFilters).toHaveLength(2)

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.activeFilters).toHaveLength(0)
    })

    it('should generate query parameters from filters', () => {
      const { result } = renderHook(() => useFilters())

      act(() => {
        result.current.addFilter({ field: 'status', operator: 'equals', value: 'active' })
        result.current.addFilter({ field: 'amount', operator: 'greater_than', value: 100 })
      })

      const queryParams = result.current.getQueryParams()

      expect(queryParams).toMatchObject({
        'filter[status][equals]': 'active',
        'filter[amount][greater_than]': '100',
      })
    })

    it('should handle complex filter combinations', () => {
      const { result } = renderHook(() => useFilters())

      act(() => {
        result.current.addFilter({
          field: 'date',
          operator: 'between',
          value: ['2023-01-01', '2023-12-31'],
        })
        result.current.addFilter({
          field: 'category',
          operator: 'in',
          value: ['crypto', 'defi', 'nft'],
        })
      })

      const queryParams = result.current.getQueryParams()

      expect(queryParams).toMatchObject({
        'filter[date][between]': '2023-01-01,2023-12-31',
        'filter[category][in]': 'crypto,defi,nft',
      })
    })

    it('should validate filter values', () => {
      const { result } = renderHook(() => useFilters())

      act(() => {
        result.current.addFilter({
          field: 'email',
          operator: 'equals',
          value: 'invalid-email',
          validation: (value) => value.includes('@'),
        })
      })

      expect(result.current.filterErrors).toHaveLength(1)
      expect(result.current.isValid).toBe(false)
    })

    it('should save and load filter presets', () => {
      const { result } = renderHook(() => useFilters())

      const filters = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'type', operator: 'contains', value: 'important' },
      ]

      act(() => {
        filters.forEach(filter => result.current.addFilter(filter))
        result.current.savePreset('my-preset', 'My Custom Filters')
      })

      act(() => {
        result.current.clearFilters()
        result.current.loadPreset('my-preset')
      })

      expect(result.current.activeFilters).toEqual(
        expect.arrayContaining(filters.map(f => expect.objectContaining(f)))
      )
    })
  })

  describe('useRealtime Hook', () => {
    it('should establish WebSocket connection', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { result } = renderHook(() => useRealtime('ws://localhost:3001/ws'))

      expect(result.current.connectionState).toBe('connecting')
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3001/ws')
    })

    it('should handle connection state changes', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { result } = renderHook(() => useRealtime('ws://localhost:3001/ws'))

      // Simulate connection opening
      act(() => {
        const openHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'open'
        )?.[1]
        openHandler?.()
      })

      expect(result.current.connectionState).toBe('connected')
    })

    it('should receive and process messages', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const onMessage = jest.fn()
      const { result } = renderHook(() => 
        useRealtime('ws://localhost:3001/ws', { onMessage })
      )

      // Simulate receiving a message
      act(() => {
        const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'message'
        )?.[1]
        messageHandler?.({
          data: JSON.stringify({ type: 'update', data: { id: 1, value: 'test' } })
        })
      })

      expect(onMessage).toHaveBeenCalledWith({
        type: 'update',
        data: { id: 1, value: 'test' }
      })
    })

    it('should handle connection errors and retry', async () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.CLOSED,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { result } = renderHook(() => 
        useRealtime('ws://localhost:3001/ws', { 
          reconnect: true,
          reconnectAttempts: 3,
          reconnectInterval: 1000,
        })
      )

      // Simulate connection error
      act(() => {
        const errorHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'error'
        )?.[1]
        errorHandler?.()
      })

      expect(result.current.connectionState).toBe('reconnecting')

      // Fast-forward for reconnection attempt
      jest.advanceTimersByTime(1100)

      expect(WebSocket).toHaveBeenCalledTimes(2) // Initial + retry
    })

    it('should send messages when connected', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.OPEN,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { result } = renderHook(() => useRealtime('ws://localhost:3001/ws'))

      // Simulate connection opened
      act(() => {
        const openHandler = mockWebSocket.addEventListener.mock.calls.find(
          call => call[0] === 'open'
        )?.[1]
        openHandler?.()
      })

      const message = { type: 'ping', timestamp: Date.now() }

      act(() => {
        result.current.sendMessage(message)
      })

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(message))
    })

    it('should queue messages when disconnected', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        send: jest.fn(),
        readyState: WebSocket.CLOSED,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { result } = renderHook(() => useRealtime('ws://localhost:3001/ws'))

      const message = { type: 'queued', data: 'test' }

      act(() => {
        result.current.sendMessage(message)
      })

      expect(mockWebSocket.send).not.toHaveBeenCalled()
      expect(result.current.queuedMessages).toContain(message)
    })

    it('should clean up on unmount', () => {
      const mockWebSocket = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        close: jest.fn(),
        readyState: WebSocket.OPEN,
      }

      global.WebSocket = jest.fn().mockImplementation(() => mockWebSocket)

      const { unmount } = renderHook(() => useRealtime('ws://localhost:3001/ws'))

      unmount()

      expect(mockWebSocket.close).toHaveBeenCalled()
    })
  })

  describe('usePerformance Hook', () => {
    it('should measure component render performance', () => {
      const { result } = renderHook(() => usePerformance('TestComponent'))

      expect(result.current.metrics).toBeDefined()
      expect(result.current.isMonitoring).toBe(true)
    })

    it('should track render count and timing', () => {
      const { result, rerender } = renderHook(() => usePerformance('TestComponent'))

      // Initial render
      expect(result.current.metrics.renderCount).toBe(1)

      // Trigger re-renders
      rerender()
      rerender()

      expect(result.current.metrics.renderCount).toBe(3)
      expect(result.current.metrics.averageRenderTime).toBeGreaterThan(0)
    })

    it('should detect performance issues', async () => {
      const { result } = renderHook(() => usePerformance('SlowComponent', {
        threshold: 16, // 16ms threshold
      }))

      // Simulate slow render
      act(() => {
        result.current.markRenderStart()
        
        // Simulate slow operation
        const start = performance.now()
        while (performance.now() - start < 20) {
          // Busy wait to simulate slow render
        }
        
        result.current.markRenderEnd()
      })

      expect(result.current.metrics.slowRenders).toBeGreaterThan(0)
      expect(result.current.hasPerformanceIssues).toBe(true)
    })

    it('should provide optimization suggestions', () => {
      const { result } = renderHook(() => usePerformance('TestComponent'))

      // Simulate multiple slow renders
      act(() => {
        for (let i = 0; i < 5; i++) {
          result.current.markRenderStart()
          
          const start = performance.now()
          while (performance.now() - start < 20) {
            // Simulate slow render
          }
          
          result.current.markRenderEnd()
        }
      })

      const suggestions = result.current.getOptimizationSuggestions()
      expect(suggestions).toBeInstanceOf(Array)
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should export performance report', () => {
      const { result } = renderHook(() => usePerformance('TestComponent'))

      const report = result.current.exportReport()

      expect(report).toMatchObject({
        componentName: 'TestComponent',
        metrics: expect.objectContaining({
          renderCount: expect.any(Number),
          averageRenderTime: expect.any(Number),
        }),
        timestamp: expect.any(String),
      })
    })
  })

  describe('useTheme Hook', () => {
    it('should initialize with system theme', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('dark'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      })

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('dark')
      expect(result.current.systemTheme).toBe('dark')
    })

    it('should toggle between light and dark themes', () => {
      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('light')
      })

      expect(result.current.theme).toBe('light')

      act(() => {
        result.current.toggleTheme()
      })

      expect(result.current.theme).toBe('dark')
    })

    it('should persist theme preference', () => {
      const mockSetItem = jest.spyOn(Storage.prototype, 'setItem')

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('dark')
      })

      expect(mockSetItem).toHaveBeenCalledWith('theme', 'dark')

      mockSetItem.mockRestore()
    })

    it('should load theme from localStorage', () => {
      const mockGetItem = jest.spyOn(Storage.prototype, 'getItem')
        .mockReturnValue('dark')

      const { result } = renderHook(() => useTheme())

      expect(result.current.theme).toBe('dark')

      mockGetItem.mockRestore()
    })

    it('should follow system theme when set to system', () => {
      const matchMediaMock = jest.fn().mockImplementation(query => ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      }))

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
      })

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('system')
      })

      expect(result.current.theme).toBe('system')
      expect(result.current.resolvedTheme).toBe('dark') // Based on matchMedia
    })

    it('should listen for system theme changes', () => {
      const listeners: Array<(e: any) => void> = []
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn((type, listener) => {
          if (type === 'change') {
            listeners.push(listener)
          }
        }),
        removeEventListener: jest.fn(),
      }

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockReturnValue(mockMediaQuery),
      })

      const { result } = renderHook(() => useTheme())

      act(() => {
        result.current.setTheme('system')
      })

      // Simulate system theme change
      act(() => {
        mockMediaQuery.matches = true
        listeners.forEach(listener => listener({ matches: true }))
      })

      expect(result.current.resolvedTheme).toBe('dark')
    })
  })
})