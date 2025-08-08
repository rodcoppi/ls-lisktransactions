/**
 * MSW handlers for analytics endpoints
 */

import { rest } from 'msw'
import { generateMockTimeSeriesData } from '../fixtures/blockchain'
import { faker } from '@faker-js/faker'

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const analyticsHandlers = [
  // Dashboard stats
  rest.get(`${baseUrl}/dashboard/stats`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          transactions: {
            total: 1234567,
            today: 5432,
            growth: 12.5,
          },
          blocks: {
            total: 987654,
            today: 720,
            growth: 0.8,
          },
          nodes: {
            active: 89,
            total: 120,
            health: 'excellent',
          },
          network: {
            hashRate: '450 TH/s',
            difficulty: '25.5T',
            avgBlockTime: 13.2,
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Volume analytics
  rest.get(`${baseUrl}/analytics/volume`, (req, res, ctx) => {
    const timeframe = req.url.searchParams.get('timeframe') || '24h'
    
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          timeframe,
          dataPoints: generateMockTimeSeriesData(timeframe as any, 'volume'),
          summary: {
            totalVolume: faker.number.int({ min: 10000000, max: 100000000 }),
            averageVolume: faker.number.int({ min: 500000, max: 2000000 }),
            peakVolume: faker.number.int({ min: 5000000, max: 10000000 }),
            growth: faker.number.float({ min: -20, max: 50, precision: 2 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Transaction analytics
  rest.get(`${baseUrl}/analytics/transactions`, (req, res, ctx) => {
    const timeframe = req.url.searchParams.get('timeframe') || '24h'
    
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          timeframe,
          dataPoints: generateMockTimeSeriesData(timeframe as any, 'transactions'),
          summary: {
            total: faker.number.int({ min: 10000, max: 50000 }),
            successful: faker.number.int({ min: 9000, max: 45000 }),
            failed: faker.number.int({ min: 100, max: 2000 }),
            averageGasUsed: faker.number.int({ min: 21000, max: 100000 }),
            averageGasPrice: faker.number.float({ min: 10, max: 100, precision: 2 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Network analytics
  rest.get(`${baseUrl}/analytics/network`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          nodes: {
            total: faker.number.int({ min: 100, max: 200 }),
            active: faker.number.int({ min: 80, max: 190 }),
            regions: {
              'North America': faker.number.int({ min: 20, max: 50 }),
              'Europe': faker.number.int({ min: 15, max: 40 }),
              'Asia': faker.number.int({ min: 25, max: 60 }),
              'Other': faker.number.int({ min: 5, max: 20 }),
            },
          },
          performance: {
            averageBlockTime: faker.number.float({ min: 10, max: 20, precision: 2 }),
            hashRate: `${faker.number.int({ min: 100, max: 500 })} TH/s`,
            difficulty: `${faker.number.float({ min: 10, max: 50, precision: 1 })}T`,
            networkLatency: faker.number.int({ min: 50, max: 200 }),
          },
          health: {
            score: faker.number.int({ min: 80, max: 100 }),
            status: faker.helpers.arrayElement(['excellent', 'good', 'fair']),
            uptime: faker.number.float({ min: 99, max: 100, precision: 3 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Gas analytics
  rest.get(`${baseUrl}/analytics/gas`, (req, res, ctx) => {
    const timeframe = req.url.searchParams.get('timeframe') || '24h'
    
    const dataPoints = generateMockTimeSeriesData(timeframe as any, 'transactions').map(point => ({
      ...point,
      gasPrice: faker.number.float({ min: 10, max: 100, precision: 2 }),
      gasUsed: faker.number.int({ min: 21000, max: 300000 }),
    }))

    return res(
      ctx.status(200),
      ctx.json({
        data: {
          timeframe,
          dataPoints,
          summary: {
            averageGasPrice: faker.number.float({ min: 20, max: 80, precision: 2 }),
            medianGasPrice: faker.number.float({ min: 15, max: 60, precision: 2 }),
            averageGasUsed: faker.number.int({ min: 50000, max: 150000 }),
            totalGasUsed: faker.number.int({ min: 1000000000, max: 5000000000 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Address analytics
  rest.get(`${baseUrl}/analytics/addresses`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          total: faker.number.int({ min: 1000000, max: 5000000 }),
          active: faker.number.int({ min: 50000, max: 200000 }),
          newToday: faker.number.int({ min: 500, max: 2000 }),
          topAddresses: Array.from({ length: 10 }, (_, index) => ({
            address: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
            balance: faker.number.float({ min: 1000, max: 100000, precision: 4 }),
            transactionCount: faker.number.int({ min: 100, max: 10000 }),
            rank: index + 1,
          })),
          distribution: {
            whales: faker.number.int({ min: 100, max: 500 }),
            dolphins: faker.number.int({ min: 5000, max: 15000 }),
            shrimp: faker.number.int({ min: 100000, max: 500000 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Token analytics
  rest.get(`${baseUrl}/analytics/tokens`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          totalTokens: faker.number.int({ min: 10000, max: 50000 }),
          activeTokens: faker.number.int({ min: 5000, max: 25000 }),
          newTokensToday: faker.number.int({ min: 50, max: 200 }),
          topTokens: Array.from({ length: 20 }, (_, index) => ({
            address: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
            name: faker.company.name(),
            symbol: faker.string.alpha({ length: 3, casing: 'upper' }),
            totalSupply: faker.number.bigInt({ min: 1000000n, max: 1000000000000n }),
            holders: faker.number.int({ min: 100, max: 100000 }),
            transfers24h: faker.number.int({ min: 10, max: 10000 }),
            volume24h: faker.number.float({ min: 10000, max: 1000000, precision: 2 }),
            rank: index + 1,
          })),
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),

  // Smart contract analytics
  rest.get(`${baseUrl}/analytics/contracts`, (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: {
          totalContracts: faker.number.int({ min: 100000, max: 500000 }),
          verifiedContracts: faker.number.int({ min: 50000, max: 200000 }),
          newContractsToday: faker.number.int({ min: 100, max: 1000 }),
          mostActiveContracts: Array.from({ length: 10 }, (_, index) => ({
            address: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
            name: faker.hacker.noun(),
            transactions24h: faker.number.int({ min: 100, max: 10000 }),
            gasUsed24h: faker.number.int({ min: 1000000, max: 100000000 }),
            uniqueUsers24h: faker.number.int({ min: 50, max: 5000 }),
            rank: index + 1,
          })),
          contractTypes: {
            tokens: faker.number.int({ min: 20000, max: 100000 }),
            defi: faker.number.int({ min: 5000, max: 20000 }),
            nft: faker.number.int({ min: 10000, max: 50000 }),
            gaming: faker.number.int({ min: 1000, max: 5000 }),
            other: faker.number.int({ min: 10000, max: 30000 }),
          },
        },
        success: true,
        timestamp: new Date().toISOString(),
      })
    )
  }),
]