/**
 * MSW handlers for health check endpoints
 */

import { rest } from 'msw'

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const healthHandlers = [
  // Health check endpoint
  rest.get(`${baseUrl}/health`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(Math.random() * 86400), // Random uptime in seconds
        version: '1.0.0',
        environment: 'test',
        services: {
          database: {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 50) + 10, // 10-60ms
          },
          redis: {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 10) + 1, // 1-11ms
          },
          api: {
            status: 'healthy',
            responseTime: Math.floor(Math.random() * 100) + 50, // 50-150ms
          },
        },
        metrics: {
          requestCount: Math.floor(Math.random() * 10000) + 1000,
          errorRate: Math.random() * 0.05, // 0-5% error rate
          averageResponseTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
        },
      })
    )
  }),

  // Simulate unhealthy service
  rest.get(`${baseUrl}/health/unhealthy`, (req, res, ctx) => {
    return res(
      ctx.status(503),
      ctx.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: 0,
        version: '1.0.0',
        environment: 'test',
        services: {
          database: {
            status: 'unhealthy',
            error: 'Connection timeout',
            responseTime: null,
          },
          redis: {
            status: 'degraded',
            responseTime: 5000, // 5 seconds - very slow
            warning: 'High latency detected',
          },
          api: {
            status: 'healthy',
            responseTime: 120,
          },
        },
        metrics: {
          requestCount: 0,
          errorRate: 1.0, // 100% error rate
          averageResponseTime: null,
        },
      })
    )
  }),

  // Metrics endpoint
  rest.get(`${baseUrl}/metrics`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        timestamp: new Date().toISOString(),
        metrics: {
          http: {
            requests_total: Math.floor(Math.random() * 100000) + 50000,
            request_duration_seconds: {
              '50': 0.1,
              '95': 0.5,
              '99': 1.0,
            },
            errors_total: Math.floor(Math.random() * 100) + 10,
          },
          database: {
            connections_active: Math.floor(Math.random() * 20) + 5,
            connections_idle: Math.floor(Math.random() * 10) + 15,
            query_duration_seconds: {
              '50': 0.05,
              '95': 0.2,
              '99': 0.5,
            },
          },
          cache: {
            hit_rate: Math.random() * 0.3 + 0.7, // 70-100% hit rate
            miss_rate: Math.random() * 0.3, // 0-30% miss rate
            operations_total: Math.floor(Math.random() * 50000) + 25000,
          },
          memory: {
            usage_bytes: Math.floor(Math.random() * 1000000000) + 500000000, // 500MB - 1.5GB
            heap_size_bytes: Math.floor(Math.random() * 2000000000) + 1000000000, // 1GB - 3GB
          },
          cpu: {
            usage_percent: Math.random() * 100,
          },
        },
      })
    )
  }),
]