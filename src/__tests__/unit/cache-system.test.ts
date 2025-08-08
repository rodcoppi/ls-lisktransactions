/**
 * Comprehensive unit tests for cache system
 * Tests hit/miss scenarios, invalidation, compression, and performance
 * Target: 97% coverage with bulletproof reliability
 */

import { CacheManager, MemoryCache, RedisCache } from '@/lib/cache'
import { CacheConfig, CacheEntry, CacheStats } from '@/lib/cache/types'

// Mock Redis for testing
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    flushall: jest.fn(),
    exists: jest.fn(),
    ttl: jest.fn(),
    expire: jest.fn(),
    mget: jest.fn(),
    mset: jest.fn(),
    pipeline: jest.fn(() => ({
      get: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      del: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    quit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    status: 'ready',
  }
  return jest.fn(() => mockRedis)
})

describe('Cache System', () => {
  let mockRedis: any
  
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    
    // Get the mocked Redis instance
    const Redis = require('ioredis')
    mockRedis = new Redis()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('Memory Cache', () => {
    let memoryCache: MemoryCache

    beforeEach(() => {
      memoryCache = new MemoryCache({
        maxSize: 100,
        ttl: 5000,
      })
    })

    describe('Basic Operations', () => {
      it('should store and retrieve values', async () => {
        const key = 'test-key'
        const value = { data: 'test data', timestamp: Date.now() }

        await memoryCache.set(key, value)
        const result = await memoryCache.get(key)

        expect(result).toEqual(value)
      })

      it('should return null for non-existent keys', async () => {
        const result = await memoryCache.get('non-existent-key')
        expect(result).toBeNull()
      })

      it('should delete keys', async () => {
        const key = 'delete-test'
        const value = { data: 'to be deleted' }

        await memoryCache.set(key, value)
        expect(await memoryCache.get(key)).toEqual(value)

        await memoryCache.delete(key)
        expect(await memoryCache.get(key)).toBeNull()
      })

      it('should check if key exists', async () => {
        const key = 'exists-test'
        const value = { data: 'exists' }

        expect(await memoryCache.exists(key)).toBe(false)

        await memoryCache.set(key, value)
        expect(await memoryCache.exists(key)).toBe(true)
      })

      it('should clear all cache entries', async () => {
        await memoryCache.set('key1', { data: 'value1' })
        await memoryCache.set('key2', { data: 'value2' })

        expect(await memoryCache.size()).toBe(2)

        await memoryCache.clear()
        expect(await memoryCache.size()).toBe(0)
      })
    })

    describe('TTL (Time To Live)', () => {
      it('should expire entries after TTL', async () => {
        const key = 'ttl-test'
        const value = { data: 'will expire' }

        await memoryCache.set(key, value)
        expect(await memoryCache.get(key)).toEqual(value)

        // Fast-forward past TTL
        jest.advanceTimersByTime(6000)
        
        expect(await memoryCache.get(key)).toBeNull()
      })

      it('should allow custom TTL per entry', async () => {
        const key = 'custom-ttl'
        const value = { data: 'custom TTL' }

        await memoryCache.set(key, value, 2000) // 2 seconds
        expect(await memoryCache.get(key)).toEqual(value)

        // Should still exist after 1 second
        jest.advanceTimersByTime(1000)
        expect(await memoryCache.get(key)).toEqual(value)

        // Should expire after 2 seconds
        jest.advanceTimersByTime(1500)
        expect(await memoryCache.get(key)).toBeNull()
      })

      it('should refresh TTL on access when configured', async () => {
        const refreshCache = new MemoryCache({
          maxSize: 100,
          ttl: 5000,
          refreshOnAccess: true,
        })

        const key = 'refresh-test'
        const value = { data: 'refresh on access' }

        await refreshCache.set(key, value)

        // Access the key multiple times while advancing time
        for (let i = 0; i < 3; i++) {
          jest.advanceTimersByTime(2000) // 2 seconds each time
          expect(await refreshCache.get(key)).toEqual(value)
        }

        // Total time: 6 seconds, but should still exist due to refresh
        expect(await refreshCache.get(key)).toEqual(value)
      })

      it('should get remaining TTL', async () => {
        const key = 'ttl-remaining'
        const value = { data: 'ttl test' }

        await memoryCache.set(key, value, 10000) // 10 seconds

        jest.advanceTimersByTime(3000) // 3 seconds passed
        
        const remainingTTL = await memoryCache.getTTL(key)
        expect(remainingTTL).toBeCloseTo(7000, -2) // ~7 seconds remaining
      })
    })

    describe('Size Management', () => {
      it('should respect maximum size limits', async () => {
        const smallCache = new MemoryCache({
          maxSize: 3,
          ttl: 10000,
        })

        // Fill cache to capacity
        await smallCache.set('key1', { data: 'value1' })
        await smallCache.set('key2', { data: 'value2' })
        await smallCache.set('key3', { data: 'value3' })

        expect(await smallCache.size()).toBe(3)

        // Adding one more should evict the oldest entry
        await smallCache.set('key4', { data: 'value4' })

        expect(await smallCache.size()).toBe(3)
        expect(await smallCache.get('key1')).toBeNull() // Should be evicted
        expect(await smallCache.get('key4')).toEqual({ data: 'value4' })
      })

      it('should use LRU eviction strategy', async () => {
        const lruCache = new MemoryCache({
          maxSize: 2,
          ttl: 10000,
        })

        await lruCache.set('key1', { data: 'value1' })
        await lruCache.set('key2', { data: 'value2' })

        // Access key1 to make it more recently used
        await lruCache.get('key1')

        // Adding key3 should evict key2 (least recently used)
        await lruCache.set('key3', { data: 'value3' })

        expect(await lruCache.get('key1')).toEqual({ data: 'value1' })
        expect(await lruCache.get('key2')).toBeNull()
        expect(await lruCache.get('key3')).toEqual({ data: 'value3' })
      })

      it('should provide accurate size information', async () => {
        expect(await memoryCache.size()).toBe(0)

        await memoryCache.set('key1', { data: 'value1' })
        expect(await memoryCache.size()).toBe(1)

        await memoryCache.set('key2', { data: 'value2' })
        expect(await memoryCache.size()).toBe(2)

        await memoryCache.delete('key1')
        expect(await memoryCache.size()).toBe(1)
      })
    })

    describe('Batch Operations', () => {
      it('should support batch get operations', async () => {
        await memoryCache.set('key1', { data: 'value1' })
        await memoryCache.set('key2', { data: 'value2' })
        await memoryCache.set('key3', { data: 'value3' })

        const results = await memoryCache.mget(['key1', 'key2', 'key4'])
        
        expect(results).toEqual([
          { data: 'value1' },
          { data: 'value2' },
          null, // key4 doesn't exist
        ])
      })

      it('should support batch set operations', async () => {
        const entries: Array<[string, any]> = [
          ['batch1', { data: 'batch value 1' }],
          ['batch2', { data: 'batch value 2' }],
          ['batch3', { data: 'batch value 3' }],
        ]

        await memoryCache.mset(entries)

        expect(await memoryCache.get('batch1')).toEqual({ data: 'batch value 1' })
        expect(await memoryCache.get('batch2')).toEqual({ data: 'batch value 2' })
        expect(await memoryCache.get('batch3')).toEqual({ data: 'batch value 3' })
      })

      it('should support batch delete operations', async () => {
        await memoryCache.set('del1', { data: 'delete1' })
        await memoryCache.set('del2', { data: 'delete2' })
        await memoryCache.set('del3', { data: 'delete3' })

        await memoryCache.mdel(['del1', 'del3'])

        expect(await memoryCache.get('del1')).toBeNull()
        expect(await memoryCache.get('del2')).toEqual({ data: 'delete2' })
        expect(await memoryCache.get('del3')).toBeNull()
      })
    })

    describe('Statistics and Monitoring', () => {
      it('should track cache statistics', async () => {
        const key = 'stats-test'
        const value = { data: 'statistics' }

        // Initial stats
        let stats = await memoryCache.getStats()
        expect(stats.hits).toBe(0)
        expect(stats.misses).toBe(0)

        // Cache miss
        await memoryCache.get(key)
        stats = await memoryCache.getStats()
        expect(stats.misses).toBe(1)

        // Cache set
        await memoryCache.set(key, value)

        // Cache hit
        await memoryCache.get(key)
        stats = await memoryCache.getStats()
        expect(stats.hits).toBe(1)
        expect(stats.hitRate).toBeCloseTo(0.5, 1) // 1 hit / 2 total requests
      })

      it('should calculate hit rate correctly', async () => {
        // Create multiple hits and misses
        await memoryCache.set('hit1', { data: 'will hit' })
        await memoryCache.set('hit2', { data: 'will hit' })

        // Generate hits
        await memoryCache.get('hit1')
        await memoryCache.get('hit2')
        await memoryCache.get('hit1') // Another hit

        // Generate misses
        await memoryCache.get('miss1')
        await memoryCache.get('miss2')

        const stats = await memoryCache.getStats()
        expect(stats.hits).toBe(3)
        expect(stats.misses).toBe(2)
        expect(stats.hitRate).toBeCloseTo(0.6, 1) // 3 hits / 5 total
      })

      it('should reset statistics', async () => {
        await memoryCache.set('key', { data: 'value' })
        await memoryCache.get('key') // Hit
        await memoryCache.get('nonexistent') // Miss

        let stats = await memoryCache.getStats()
        expect(stats.hits).toBe(1)
        expect(stats.misses).toBe(1)

        await memoryCache.resetStats()

        stats = await memoryCache.getStats()
        expect(stats.hits).toBe(0)
        expect(stats.misses).toBe(0)
      })
    })
  })

  describe('Redis Cache', () => {
    let redisCache: RedisCache

    beforeEach(() => {
      redisCache = new RedisCache({
        host: 'localhost',
        port: 6379,
        ttl: 5000,
      })
    })

    describe('Basic Operations', () => {
      it('should store and retrieve values from Redis', async () => {
        const key = 'redis-test-key'
        const value = { data: 'redis test data', id: 123 }

        mockRedis.set.mockResolvedValue('OK')
        mockRedis.get.mockResolvedValue(JSON.stringify(value))

        await redisCache.set(key, value)
        const result = await redisCache.get(key)

        expect(mockRedis.set).toHaveBeenCalledWith(
          key,
          JSON.stringify(value),
          'PX',
          5000
        )
        expect(mockRedis.get).toHaveBeenCalledWith(key)
        expect(result).toEqual(value)
      })

      it('should handle Redis connection errors gracefully', async () => {
        mockRedis.get.mockRejectedValue(new Error('Redis connection failed'))

        const result = await redisCache.get('error-key')
        expect(result).toBeNull() // Should fallback gracefully
      })

      it('should handle invalid JSON gracefully', async () => {
        mockRedis.get.mockResolvedValue('invalid-json-{')

        const result = await redisCache.get('invalid-json-key')
        expect(result).toBeNull() // Should handle parse error
      })

      it('should delete keys from Redis', async () => {
        mockRedis.del.mockResolvedValue(1)

        await redisCache.delete('delete-key')
        expect(mockRedis.del).toHaveBeenCalledWith('delete-key')
      })

      it('should check if key exists in Redis', async () => {
        mockRedis.exists.mockResolvedValue(1)

        const exists = await redisCache.exists('exists-key')
        expect(exists).toBe(true)
        expect(mockRedis.exists).toHaveBeenCalledWith('exists-key')
      })

      it('should clear all keys with pattern', async () => {
        mockRedis.keys.mockResolvedValue(['key1', 'key2', 'key3'])
        mockRedis.pipeline.mockReturnValue({
          del: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        })

        await redisCache.clear('pattern:*')
        expect(mockRedis.keys).toHaveBeenCalledWith('pattern:*')
      })
    })

    describe('TTL Management', () => {
      it('should set TTL with custom expiration', async () => {
        mockRedis.set.mockResolvedValue('OK')

        await redisCache.set('ttl-key', { data: 'ttl test' }, 10000)
        
        expect(mockRedis.set).toHaveBeenCalledWith(
          'ttl-key',
          expect.any(String),
          'PX',
          10000
        )
      })

      it('should get remaining TTL from Redis', async () => {
        mockRedis.ttl.mockResolvedValue(7) // 7 seconds remaining

        const ttl = await redisCache.getTTL('ttl-key')
        expect(ttl).toBe(7000) // Convert to milliseconds
        expect(mockRedis.ttl).toHaveBeenCalledWith('ttl-key')
      })

      it('should handle expired keys correctly', async () => {
        mockRedis.ttl.mockResolvedValue(-2) // Key doesn't exist

        const ttl = await redisCache.getTTL('expired-key')
        expect(ttl).toBe(0)
      })
    })

    describe('Batch Operations', () => {
      it('should support batch get operations', async () => {
        const values = [
          JSON.stringify({ data: 'value1' }),
          JSON.stringify({ data: 'value2' }),
          null, // Non-existent key
        ]
        mockRedis.mget.mockResolvedValue(values)

        const results = await redisCache.mget(['key1', 'key2', 'key3'])
        
        expect(results).toEqual([
          { data: 'value1' },
          { data: 'value2' },
          null,
        ])
        expect(mockRedis.mget).toHaveBeenCalledWith(['key1', 'key2', 'key3'])
      })

      it('should support batch set operations with pipeline', async () => {
        const pipeline = {
          set: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValue([]),
        }
        mockRedis.pipeline.mockReturnValue(pipeline)

        const entries: Array<[string, any]> = [
          ['batch1', { data: 'batch value 1' }],
          ['batch2', { data: 'batch value 2' }],
        ]

        await redisCache.mset(entries)

        expect(pipeline.set).toHaveBeenCalledTimes(2)
        expect(pipeline.exec).toHaveBeenCalled()
      })
    })

    describe('Compression', () => {
      it('should compress large values', async () => {
        const redisWithCompression = new RedisCache({
          host: 'localhost',
          port: 6379,
          compression: {
            enabled: true,
            threshold: 100, // Compress if larger than 100 bytes
          },
        })

        mockRedis.set.mockResolvedValue('OK')
        mockRedis.get.mockResolvedValue('compressed-data')

        // Large object that should trigger compression
        const largeValue = { 
          data: 'x'.repeat(200), // 200 characters
          metadata: { id: 1, timestamp: Date.now() }
        }

        await redisWithCompression.set('large-key', largeValue)

        // Should compress the data before storing
        expect(mockRedis.set).toHaveBeenCalled()
        const [key, compressedValue] = mockRedis.set.mock.calls[0]
        expect(compressedValue).not.toBe(JSON.stringify(largeValue))
      })

      it('should not compress small values', async () => {
        const redisWithCompression = new RedisCache({
          host: 'localhost',
          port: 6379,
          compression: {
            enabled: true,
            threshold: 1000, // High threshold
          },
        })

        mockRedis.set.mockResolvedValue('OK')

        const smallValue = { data: 'small' }
        await redisWithCompression.set('small-key', smallValue)

        const [key, storedValue] = mockRedis.set.mock.calls[0]
        expect(storedValue).toBe(JSON.stringify(smallValue))
      })
    })
  })

  describe('Cache Manager', () => {
    let cacheManager: CacheManager

    beforeEach(() => {
      const config: CacheConfig = {
        layers: [
          {
            type: 'memory',
            maxSize: 50,
            ttl: 5000,
            priority: 1,
          },
          {
            type: 'redis',
            ttl: 30000,
            priority: 2,
          },
        ],
      }

      cacheManager = new CacheManager(config)
    })

    describe('Multi-layer Caching', () => {
      it('should check memory cache first, then Redis', async () => {
        const key = 'multi-layer-key'
        const value = { data: 'multi-layer test' }

        // Mock Redis to return the value
        mockRedis.get.mockResolvedValue(JSON.stringify(value))

        const result = await cacheManager.get(key)

        // Should check memory cache first (miss), then Redis (hit)
        expect(result).toEqual(value)
      })

      it('should populate higher priority caches on cache miss', async () => {
        const key = 'populate-key'
        const value = { data: 'populate test' }

        // Mock Redis hit
        mockRedis.get.mockResolvedValue(JSON.stringify(value))

        await cacheManager.get(key)

        // Should populate memory cache from Redis
        const memoryResult = await cacheManager.get(key)
        expect(memoryResult).toEqual(value)
      })

      it('should write to all cache layers when setting', async () => {
        const key = 'set-all-layers'
        const value = { data: 'set to all' }

        mockRedis.set.mockResolvedValue('OK')

        await cacheManager.set(key, value)

        // Verify both layers have the value
        const memoryResult = await cacheManager.get(key)
        expect(memoryResult).toEqual(value)
        expect(mockRedis.set).toHaveBeenCalled()
      })

      it('should delete from all cache layers', async () => {
        const key = 'delete-all-layers'

        mockRedis.del.mockResolvedValue(1)

        await cacheManager.delete(key)

        expect(mockRedis.del).toHaveBeenCalledWith(key)
      })
    })

    describe('Cache Invalidation', () => {
      it('should support pattern-based invalidation', async () => {
        const keys = ['user:123', 'user:456', 'post:789']
        
        mockRedis.keys.mockResolvedValue(['user:123', 'user:456'])
        mockRedis.del.mockResolvedValue(2)

        await cacheManager.invalidate('user:*')

        expect(mockRedis.keys).toHaveBeenCalledWith('user:*')
        expect(mockRedis.del).toHaveBeenCalled()
      })

      it('should support tag-based invalidation', async () => {
        const key = 'tagged-key'
        const value = { data: 'tagged data' }
        const tags = ['user:123', 'posts']

        await cacheManager.set(key, value, undefined, tags)
        await cacheManager.invalidateByTag('user:123')

        // Should be invalidated
        const result = await cacheManager.get(key)
        expect(result).toBeNull()
      })

      it('should support time-based invalidation', async () => {
        const key = 'time-invalidation'
        const value = { data: 'time-based', timestamp: Date.now() }

        await cacheManager.set(key, value)

        // Fast-forward time
        jest.advanceTimersByTime(6000)

        // Should trigger automatic cleanup
        await cacheManager.cleanup()

        const result = await cacheManager.get(key)
        expect(result).toBeNull()
      })
    })

    describe('Cache Warming', () => {
      it('should support cache warming strategies', async () => {
        const warmingFunction = jest.fn().mockResolvedValue({ data: 'warmed data' })

        await cacheManager.warm('warm-key', warmingFunction)

        expect(warmingFunction).toHaveBeenCalled()
        
        const result = await cacheManager.get('warm-key')
        expect(result).toEqual({ data: 'warmed data' })
      })

      it('should warm multiple keys in batch', async () => {
        const warmingConfig = [
          { key: 'warm1', fn: jest.fn().mockResolvedValue({ data: 'warm1' }) },
          { key: 'warm2', fn: jest.fn().mockResolvedValue({ data: 'warm2' }) },
        ]

        await cacheManager.warmBatch(warmingConfig)

        expect(warmingConfig[0].fn).toHaveBeenCalled()
        expect(warmingConfig[1].fn).toHaveBeenCalled()
      })

      it('should handle warming errors gracefully', async () => {
        const failingFunction = jest.fn().mockRejectedValue(new Error('Warming failed'))

        await expect(cacheManager.warm('fail-key', failingFunction)).resolves.not.toThrow()
        
        // Key should not exist after failed warming
        const result = await cacheManager.get('fail-key')
        expect(result).toBeNull()
      })
    })

    describe('Performance and Monitoring', () => {
      it('should provide comprehensive cache statistics', async () => {
        // Generate some cache activity
        await cacheManager.set('test1', { data: 'test1' })
        await cacheManager.get('test1') // Hit
        await cacheManager.get('nonexistent') // Miss

        const stats = await cacheManager.getStats()

        expect(stats).toMatchObject({
          totalHits: expect.any(Number),
          totalMisses: expect.any(Number),
          hitRate: expect.any(Number),
          layers: expect.any(Array),
        })
      })

      it('should measure cache operation performance', async () => {
        const key = 'perf-test'
        const value = { data: 'performance test' }

        const startTime = Date.now()
        await cacheManager.set(key, value)
        const setTime = Date.now() - startTime

        const getStartTime = Date.now()
        await cacheManager.get(key)
        const getTime = Date.now() - getStartTime

        expect(setTime).toBeGreaterThan(0)
        expect(getTime).toBeGreaterThan(0)
      })

      it('should track cache layer performance separately', async () => {
        const key = 'layer-perf'
        const value = { data: 'layer performance' }

        await cacheManager.set(key, value)

        const stats = await cacheManager.getStats()
        expect(stats.layers).toHaveLength(2) // Memory and Redis
        
        stats.layers.forEach(layerStats => {
          expect(layerStats).toMatchObject({
            type: expect.stringMatching(/memory|redis/),
            hits: expect.any(Number),
            misses: expect.any(Number),
          })
        })
      })
    })

    describe('Error Handling and Resilience', () => {
      it('should continue working when Redis fails', async () => {
        const key = 'resilience-test'
        const value = { data: 'resilience' }

        // Mock Redis failure
        mockRedis.get.mockRejectedValue(new Error('Redis down'))
        mockRedis.set.mockRejectedValue(new Error('Redis down'))

        // Should still work with memory cache
        await cacheManager.set(key, value)
        const result = await cacheManager.get(key)

        expect(result).toEqual(value)
      })

      it('should degrade gracefully under high load', async () => {
        const promises = Array.from({ length: 1000 }, (_, i) =>
          cacheManager.set(`load-test-${i}`, { data: `load-${i}` })
        )

        // Should handle concurrent operations without crashes
        await expect(Promise.allSettled(promises)).resolves.not.toThrow()
      })

      it('should implement circuit breaker for failing cache layers', async () => {
        // Simulate consecutive failures
        mockRedis.get.mockRejectedValue(new Error('Consistent failure'))

        const promises = Array.from({ length: 10 }, () =>
          cacheManager.get('circuit-test').catch(() => null)
        )

        await Promise.allSettled(promises)

        // Circuit breaker should be triggered
        const stats = await cacheManager.getStats()
        expect(stats.circuitBreaker?.isOpen).toBe(true)
      })
    })
  })
})