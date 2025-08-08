/**
 * Comprehensive unit tests for API client
 * Tests all scenarios: success, error, timeout, retry, circuit breaker
 * Target: 98% coverage with zero flaky tests
 */

import { createBlockscoutClient, testConnection } from '@/lib/api/client'
import { ApiClientConfig } from '@/lib/api/types'
import { server } from '@/test-utils/mocks/server'
import { rest } from 'msw'

// Test configuration
const defaultConfig: Partial<ApiClientConfig> = {
  baseURL: 'http://localhost:3000/api',
  timeout: 5000,
  retries: {
    count: 3,
    delays: [100, 200, 400],
    conditions: ['network', 'timeout', '5xx', '429'],
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeout: 10000,
    monitoringPeriod: 30000,
  },
  cache: {
    ttl: 5000,
    maxSize: 100,
  },
  rateLimit: {
    maxRequests: 10,
    perTimeWindow: 1000,
  },
}

describe('API Client', () => {
  let client: ReturnType<typeof createBlockscoutClient>

  beforeEach(() => {
    client = createBlockscoutClient(defaultConfig)
    jest.clearAllTimers()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('Client Creation', () => {
    it('should create client with default configuration', () => {
      const defaultClient = createBlockscoutClient()
      expect(defaultClient).toBeDefined()
      expect(typeof defaultClient.getStats).toBe('function')
    })

    it('should create client with custom configuration', () => {
      const customClient = createBlockscoutClient({
        baseURL: 'https://custom-api.example.com',
        timeout: 10000,
      })
      expect(customClient).toBeDefined()
    })

    it('should validate configuration parameters', () => {
      expect(() => {
        createBlockscoutClient({
          timeout: -1000, // Invalid timeout
        })
      }).toThrow('Invalid timeout value')
    })

    it('should merge configuration with defaults', () => {
      const client = createBlockscoutClient({
        timeout: 8000,
      })
      
      const status = client.getStatus()
      expect(status.config.timeout).toBe(8000)
      expect(status.config.retries).toBeDefined() // Should have default retries
    })
  })

  describe('Successful API Calls', () => {
    it('should fetch blockchain stats successfully', async () => {
      const stats = await client.getStats()
      
      expect(stats).toMatchObject({
        data: expect.objectContaining({
          totalTransactions: expect.any(Number),
          totalBlocks: expect.any(Number),
          activeNodes: expect.any(Number),
          networkHealth: expect.any(String),
        }),
        success: true,
        timestamp: expect.any(String),
      })
    })

    it('should fetch transactions with pagination', async () => {
      const result = await client.getTransactions({ 
        limit: 20, 
        offset: 10 
      })
      
      expect(result).toMatchObject({
        data: expect.objectContaining({
          items: expect.any(Array),
          total: expect.any(Number),
          limit: 20,
          offset: 10,
        }),
        success: true,
      })
      
      expect(result.data.items).toHaveLength(20)
    })

    it('should fetch specific transaction by hash', async () => {
      const hash = '0x1234567890abcdef'
      const transaction = await client.getTransaction(hash)
      
      expect(transaction).toMatchObject({
        data: expect.objectContaining({
          hash,
          blockNumber: expect.any(Number),
          from: expect.any(String),
          to: expect.any(String),
        }),
        success: true,
      })
    })

    it('should fetch blocks with default parameters', async () => {
      const result = await client.getBlocks()
      
      expect(result.data.items).toHaveLength(10) // Default limit
      expect(result.data.limit).toBe(10)
      expect(result.data.offset).toBe(0)
    })

    it('should fetch chart data for transactions', async () => {
      const chartData = await client.getTransactionCharts()
      
      expect(chartData.data).toMatchObject({
        '24h': expect.any(Array),
      })
      
      chartData.data['24h'].forEach(point => {
        expect(point).toMatchObject({
          timestamp: expect.any(String),
          value: expect.any(Number),
        })
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      await expect(client.getTransaction('invalid-hash')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: expect.stringContaining('not found'),
        status: 404,
      })
    })

    it('should handle network errors', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res.networkError('Network connection failed')
        })
      )

      await expect(client.getStats()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
        message: expect.stringContaining('network'),
      })
    })

    it('should handle 500 server errors', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal Server Error' })
          )
        })
      )

      await expect(client.getStats()).rejects.toMatchObject({
        code: 'SERVER_ERROR',
        status: 500,
      })
    })

    it('should handle malformed JSON responses', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.text('invalid json response')
          )
        })
      )

      await expect(client.getStats()).rejects.toMatchObject({
        code: 'PARSE_ERROR',
        message: expect.stringContaining('JSON'),
      })
    })

    it('should handle timeout errors', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(ctx.delay(10000)) // 10 second delay
        })
      )

      const timeoutPromise = client.getStats()
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(6000) // Beyond 5s timeout
      
      await expect(timeoutPromise).rejects.toMatchObject({
        code: 'TIMEOUT_ERROR',
        message: expect.stringContaining('timeout'),
      })
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry on network errors', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          attempts++
          if (attempts <= 2) {
            return res.networkError('Network error')
          }
          return res(
            ctx.status(200),
            ctx.json({
              data: { totalTransactions: 12345 },
              success: true,
            })
          )
        })
      )

      const result = await client.getStats()
      expect(attempts).toBe(3) // 1 initial + 2 retries
      expect(result.success).toBe(true)
    })

    it('should retry on 5xx errors', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          attempts++
          if (attempts <= 2) {
            return res(
              ctx.status(503),
              ctx.json({ error: 'Service Unavailable' })
            )
          }
          return res(
            ctx.status(200),
            ctx.json({
              data: { totalTransactions: 12345 },
              success: true,
            })
          )
        })
      )

      const result = await client.getStats()
      expect(attempts).toBe(3)
      expect(result.success).toBe(true)
    })

    it('should retry on 429 rate limit errors', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          attempts++
          if (attempts === 1) {
            return res(
              ctx.status(429),
              ctx.json({ error: 'Too Many Requests' })
            )
          }
          return res(
            ctx.status(200),
            ctx.json({
              data: { totalTransactions: 12345 },
              success: true,
            })
          )
        })
      )

      const result = await client.getStats()
      expect(attempts).toBe(2)
      expect(result.success).toBe(true)
    })

    it('should not retry on 4xx client errors (except 429)', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/transactions/invalid', (req, res, ctx) => {
          attempts++
          return res(
            ctx.status(404),
            ctx.json({ error: 'Not Found' })
          )
        })
      )

      await expect(client.getTransaction('invalid')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: 404,
      })
      
      expect(attempts).toBe(1) // No retries for 404
    })

    it('should respect retry delays', async () => {
      let attempts = 0
      const startTime = Date.now()
      
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          attempts++
          if (attempts <= 2) {
            return res.networkError('Network error')
          }
          return res(
            ctx.status(200),
            ctx.json({
              data: { totalTransactions: 12345 },
              success: true,
            })
          )
        })
      )

      const promise = client.getStats()
      
      // Fast-forward through retry delays
      jest.advanceTimersByTime(100) // First retry delay
      jest.advanceTimersByTime(200) // Second retry delay
      
      const result = await promise
      expect(result.success).toBe(true)
      expect(attempts).toBe(3)
    })

    it('should fail after maximum retry attempts', async () => {
      let attempts = 0
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          attempts++
          return res.networkError('Persistent network error')
        })
      )

      await expect(client.getStats()).rejects.toMatchObject({
        code: 'NETWORK_ERROR',
      })
      
      expect(attempts).toBe(4) // 1 initial + 3 retries
    })
  })

  describe('Circuit Breaker', () => {
    it('should trip circuit breaker after failure threshold', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server Error' })
          )
        })
      )

      // Make requests to trip the circuit breaker
      const promises = Array.from({ length: 6 }, () => 
        client.getStats().catch(() => {})
      )
      
      await Promise.allSettled(promises)
      
      // Circuit breaker should be open now
      const status = client.getStatus()
      expect(status.circuitBreaker.state).toBe('OPEN')
      
      // Additional requests should fail fast
      await expect(client.getStats()).rejects.toMatchObject({
        code: 'CIRCUIT_BREAKER_OPEN',
      })
    })

    it('should transition to half-open state after reset timeout', async () => {
      // Trip the circuit breaker
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server Error' })
          )
        })
      )

      for (let i = 0; i < 6; i++) {
        try {
          await client.getStats()
        } catch (error) {
          // Expected failures
        }
      }

      expect(client.getStatus().circuitBreaker.state).toBe('OPEN')

      // Fast-forward past reset timeout
      jest.advanceTimersByTime(11000) // Beyond 10s reset timeout

      expect(client.getStatus().circuitBreaker.state).toBe('HALF_OPEN')
    })

    it('should close circuit breaker on successful request in half-open state', async () => {
      // Trip the circuit breaker first
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server Error' })
          )
        })
      )

      for (let i = 0; i < 6; i++) {
        try {
          await client.getStats()
        } catch (error) {
          // Expected failures
        }
      }

      // Fast-forward to half-open state
      jest.advanceTimersByTime(11000)

      // Now make the server respond successfully
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(200),
            ctx.json({
              data: { totalTransactions: 12345 },
              success: true,
            })
          )
        })
      )

      const result = await client.getStats()
      expect(result.success).toBe(true)
      expect(client.getStatus().circuitBreaker.state).toBe('CLOSED')
    })
  })

  describe('Caching', () => {
    it('should cache successful responses', async () => {
      const result1 = await client.getStats()
      const result2 = await client.getStats()
      
      expect(result1.data).toEqual(result2.data)
      
      const status = client.getStatus()
      expect(status.cacheStats.hitRate).toBeGreaterThan(0)
    })

    it('should respect cache TTL', async () => {
      const result1 = await client.getStats()
      
      // Fast-forward past cache TTL
      jest.advanceTimersByTime(6000) // Beyond 5s TTL
      
      const result2 = await client.getStats()
      
      // Should be fresh data (cache expired)
      const status = client.getStatus()
      expect(status.cacheStats.missCount).toBeGreaterThan(0)
    })

    it('should not cache error responses', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server Error' })
          )
        })
      )

      try {
        await client.getStats()
      } catch (error) {
        // Expected error
      }

      const status = client.getStatus()
      expect(status.cacheStats.hitCount).toBe(0) // No cache hits for errors
    })

    it('should invalidate cache on demand', async () => {
      await client.getStats() // Prime cache
      
      client.clearCache()
      
      const status = client.getStatus()
      expect(status.cacheStats.size).toBe(0)
    })

    it('should respect cache size limits', async () => {
      // Fill cache beyond max size
      const promises = Array.from({ length: 150 }, (_, index) => 
        client.getTransactions({ offset: index * 10 })
      )
      
      await Promise.allSettled(promises)
      
      const status = client.getStatus()
      expect(status.cacheStats.size).toBeLessThanOrEqual(100) // Max size limit
    })
  })

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Make requests rapidly to hit rate limit
      const promises = Array.from({ length: 15 }, () => client.getStats())
      
      const results = await Promise.allSettled(promises)
      
      // Some requests should be rate limited
      const rateLimitedCount = results.filter(
        result => result.status === 'rejected' && 
        (result.reason as any)?.code === 'RATE_LIMIT_ERROR'
      ).length
      
      expect(rateLimitedCount).toBeGreaterThan(0)
    })

    it('should reset rate limit after time window', async () => {
      // Hit rate limit
      const promises1 = Array.from({ length: 15 }, () => 
        client.getStats().catch(() => {})
      )
      await Promise.allSettled(promises1)
      
      // Fast-forward past rate limit window
      jest.advanceTimersByTime(1100) // Beyond 1s window
      
      // Should be able to make requests again
      const result = await client.getStats()
      expect(result.success).toBe(true)
    })
  })

  describe('Metrics and Monitoring', () => {
    it('should track request metrics', async () => {
      await client.getStats()
      await client.getTransactions()
      
      const status = client.getStatus()
      expect(status.requestCount).toBeGreaterThanOrEqual(2)
      expect(status.successCount).toBeGreaterThanOrEqual(2)
      expect(status.averageResponseTime).toBeGreaterThan(0)
    })

    it('should track error metrics', async () => {
      server.use(
        rest.get('http://localhost:3000/api/stats', (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Server Error' })
          )
        })
      )

      try {
        await client.getStats()
      } catch (error) {
        // Expected error
      }

      const status = client.getStatus()
      expect(status.errorCount).toBe(1)
      expect(status.errorRate).toBeGreaterThan(0)
    })

    it('should provide detailed performance metrics', async () => {
      await client.getStats()
      
      const metrics = client.getMetrics()
      expect(metrics).toMatchObject({
        requests: {
          total: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
        },
        responseTime: {
          average: expect.any(Number),
          p50: expect.any(Number),
          p95: expect.any(Number),
          p99: expect.any(Number),
        },
        cache: {
          hitRate: expect.any(Number),
          size: expect.any(Number),
        },
        circuitBreaker: {
          state: expect.any(String),
          failureCount: expect.any(Number),
        },
      })
    })
  })

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      const result = await testConnection(client)
      
      expect(result).toMatchObject({
        success: true,
        responseTime: expect.any(Number),
        timestamp: expect.any(String),
      })
    })

    it('should detect connection failures', async () => {
      server.use(
        rest.get('http://localhost:3000/api/health', (req, res, ctx) => {
          return res.networkError('Connection failed')
        })
      )

      const result = await testConnection(client)
      
      expect(result).toMatchObject({
        success: false,
        error: expect.stringContaining('Connection'),
      })
    })

    it('should measure response time accurately', async () => {
      server.use(
        rest.get('http://localhost:3000/api/health', (req, res, ctx) => {
          return res(
            ctx.delay(100),
            ctx.status(200),
            ctx.json({ status: 'ok' })
          )
        })
      )

      const startTime = Date.now()
      jest.advanceTimersByTime(100)
      
      const result = await testConnection(client)
      
      expect(result.success).toBe(true)
      expect(result.responseTime).toBeGreaterThanOrEqual(100)
    })
  })

  describe('Configuration Validation', () => {
    it('should validate timeout configuration', () => {
      expect(() => {
        createBlockscoutClient({ timeout: 0 })
      }).toThrow('Invalid timeout')
      
      expect(() => {
        createBlockscoutClient({ timeout: -100 })
      }).toThrow('Invalid timeout')
    })

    it('should validate retry configuration', () => {
      expect(() => {
        createBlockscoutClient({
          retries: {
            count: -1,
            delays: [100],
            conditions: ['network'],
          },
        })
      }).toThrow('Invalid retry count')
    })

    it('should validate circuit breaker configuration', () => {
      expect(() => {
        createBlockscoutClient({
          circuitBreaker: {
            failureThreshold: 0,
            resetTimeout: 1000,
            monitoringPeriod: 5000,
          },
        })
      }).toThrow('Invalid failure threshold')
    })

    it('should validate cache configuration', () => {
      expect(() => {
        createBlockscoutClient({
          cache: {
            ttl: -1000,
            maxSize: 100,
          },
        })
      }).toThrow('Invalid cache TTL')
    })

    it('should validate rate limit configuration', () => {
      expect(() => {
        createBlockscoutClient({
          rateLimit: {
            maxRequests: 0,
            perTimeWindow: 1000,
          },
        })
      }).toThrow('Invalid rate limit')
    })
  })
})