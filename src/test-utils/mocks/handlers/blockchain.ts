/**
 * MSW handlers for blockchain API endpoints
 */

import { rest } from 'msw'
import { generateMockBlockchainData } from '../fixtures/blockchain'

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const blockchainHandlers = [
  // Get blockchain stats
  rest.get(`${baseUrl}/stats`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: generateMockBlockchainData().stats,
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get transactions
  rest.get(`${baseUrl}/transactions`, (req, res, ctx) => {
    const limit = req.url.searchParams.get('limit') || '10'
    const offset = req.url.searchParams.get('offset') || '0'
    
    const transactions = generateMockBlockchainData().transactions.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )

    return res(
      ctx.status(200),
      ctx.json({
        data: {
          items: transactions,
          total: 1000000,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get specific transaction
  rest.get(`${baseUrl}/transactions/:hash`, (req, res, ctx) => {
    const { hash } = req.params
    
    if (hash === 'invalid-hash') {
      return res(
        ctx.status(404),
        ctx.json({
          error: 'Transaction not found',
          success: false,
        })
      )
    }

    const transaction = generateMockBlockchainData().transactions[0]
    transaction.hash = hash as string

    return res(
      ctx.status(200),
      ctx.json({
        data: transaction,
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get blocks
  rest.get(`${baseUrl}/blocks`, (req, res, ctx) => {
    const limit = req.url.searchParams.get('limit') || '10'
    const offset = req.url.searchParams.get('offset') || '0'
    
    const blocks = generateMockBlockchainData().blocks.slice(
      parseInt(offset),
      parseInt(offset) + parseInt(limit)
    )

    return res(
      ctx.status(200),
      ctx.json({
        data: {
          items: blocks,
          total: 500000,
          limit: parseInt(limit),
          offset: parseInt(offset),
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get specific block
  rest.get(`${baseUrl}/blocks/:number`, (req, res, ctx) => {
    const { number } = req.params
    
    const block = generateMockBlockchainData().blocks[0]
    block.number = parseInt(number as string)

    return res(
      ctx.status(200),
      ctx.json({
        data: block,
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get transaction charts data
  rest.get(`${baseUrl}/analytics/transactions`, (req, res, ctx) => {
    const timeframe = req.url.searchParams.get('timeframe') || '24h'
    
    return res(
      ctx.status(200),
      ctx.json({
        data: generateMockBlockchainData().chartData.transactions[timeframe as keyof typeof generateMockBlockchainData().chartData.transactions],
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Get volume data
  rest.get(`${baseUrl}/analytics/volume`, (req, res, ctx) => {
    const timeframe = req.url.searchParams.get('timeframe') || '24h'
    
    return res(
      ctx.status(200),
      ctx.json({
        data: generateMockBlockchainData().chartData.volume[timeframe as keyof typeof generateMockBlockchainData().chartData.volume],
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Simulate network error
  rest.get(`${baseUrl}/simulate-error`, (req, res, ctx) => {
    return res.networkError('Network error')
  }),

  // Simulate timeout
  rest.get(`${baseUrl}/simulate-timeout`, (req, res, ctx) => {
    return res(
      ctx.delay(30000), // 30 second delay
      ctx.status(200),
      ctx.json({ message: 'This should timeout' })
    )
  }),

  // Simulate rate limiting
  rest.get(`${baseUrl}/simulate-rate-limit`, (req, res, ctx) => {
    return res(
      ctx.status(429),
      ctx.json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: 60,
      })
    )
  }),
]