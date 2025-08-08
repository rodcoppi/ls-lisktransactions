/**
 * Mock blockchain data generators for comprehensive testing
 */

import { faker } from '@faker-js/faker'

export interface MockTransaction {
  hash: string
  blockNumber: number
  blockHash: string
  transactionIndex: number
  from: string
  to: string
  value: string
  gas: string
  gasPrice: string
  gasUsed: string
  status: 'success' | 'failed'
  timestamp: string
  nonce: number
  input: string
  logs: MockLog[]
}

export interface MockBlock {
  number: number
  hash: string
  parentHash: string
  timestamp: string
  size: number
  gasLimit: string
  gasUsed: string
  transactionCount: number
  miner: string
  difficulty: string
  totalDifficulty: string
  nonce: string
  extraData: string
}

export interface MockLog {
  address: string
  topics: string[]
  data: string
  blockNumber: number
  transactionHash: string
  transactionIndex: number
  blockHash: string
  logIndex: number
}

export interface MockStats {
  totalTransactions: number
  totalBlocks: number
  activeNodes: number
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor'
  averageBlockTime: number
  transactionsPerSecond: number
  networkHashRate: string
  marketCap: string
  circulatingSupply: string
  price: number
  priceChange24h: number
}

export interface MockChartData {
  transactions: {
    '1h': MockTimeSeriesData[]
    '24h': MockTimeSeriesData[]
    '7d': MockTimeSeriesData[]
    '30d': MockTimeSeriesData[]
  }
  volume: {
    '1h': MockTimeSeriesData[]
    '24h': MockTimeSeriesData[]
    '7d': MockTimeSeriesData[]
    '30d': MockTimeSeriesData[]
  }
}

export interface MockTimeSeriesData {
  timestamp: string
  value: number
  transactions?: number
  volume?: number
}

// Generate mock transaction
export function generateMockTransaction(overrides: Partial<MockTransaction> = {}): MockTransaction {
  return {
    hash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    blockNumber: faker.number.int({ min: 1000000, max: 2000000 }),
    blockHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    transactionIndex: faker.number.int({ min: 0, max: 99 }),
    from: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
    to: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
    value: faker.string.numeric(18), // 18 decimals for ETH-like tokens
    gas: faker.string.numeric(5),
    gasPrice: faker.string.numeric(10),
    gasUsed: faker.string.numeric(5),
    status: faker.helpers.arrayElement(['success', 'failed']),
    timestamp: faker.date.recent({ days: 30 }).toISOString(),
    nonce: faker.number.int({ min: 0, max: 1000000 }),
    input: faker.string.hexadecimal({ length: 128, prefix: '0x' }),
    logs: Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () =>
      generateMockLog()
    ),
    ...overrides,
  }
}

// Generate mock block
export function generateMockBlock(overrides: Partial<MockBlock> = {}): MockBlock {
  return {
    number: faker.number.int({ min: 1000000, max: 2000000 }),
    hash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    parentHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    timestamp: faker.date.recent({ days: 30 }).toISOString(),
    size: faker.number.int({ min: 1000, max: 50000 }),
    gasLimit: faker.string.numeric(8),
    gasUsed: faker.string.numeric(7),
    transactionCount: faker.number.int({ min: 1, max: 200 }),
    miner: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
    difficulty: faker.string.numeric(15),
    totalDifficulty: faker.string.numeric(20),
    nonce: faker.string.hexadecimal({ length: 16, prefix: '0x' }),
    extraData: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    ...overrides,
  }
}

// Generate mock log
export function generateMockLog(overrides: Partial<MockLog> = {}): MockLog {
  return {
    address: faker.string.hexadecimal({ length: 40, prefix: '0x' }),
    topics: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () =>
      faker.string.hexadecimal({ length: 64, prefix: '0x' })
    ),
    data: faker.string.hexadecimal({ length: 128, prefix: '0x' }),
    blockNumber: faker.number.int({ min: 1000000, max: 2000000 }),
    transactionHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    transactionIndex: faker.number.int({ min: 0, max: 99 }),
    blockHash: faker.string.hexadecimal({ length: 64, prefix: '0x' }),
    logIndex: faker.number.int({ min: 0, max: 10 }),
    ...overrides,
  }
}

// Generate mock stats
export function generateMockStats(overrides: Partial<MockStats> = {}): MockStats {
  return {
    totalTransactions: faker.number.int({ min: 1000000, max: 10000000 }),
    totalBlocks: faker.number.int({ min: 500000, max: 2000000 }),
    activeNodes: faker.number.int({ min: 50, max: 200 }),
    networkHealth: faker.helpers.arrayElement(['excellent', 'good', 'fair', 'poor']),
    averageBlockTime: faker.number.float({ min: 10, max: 20, precision: 2 }),
    transactionsPerSecond: faker.number.float({ min: 5, max: 100, precision: 2 }),
    networkHashRate: `${faker.number.int({ min: 100, max: 500 })} TH/s`,
    marketCap: `$${faker.number.int({ min: 1000000000, max: 100000000000 }).toLocaleString()}`,
    circulatingSupply: `${faker.number.int({ min: 100000000, max: 1000000000 }).toLocaleString()}`,
    price: faker.number.float({ min: 50, max: 5000, precision: 2 }),
    priceChange24h: faker.number.float({ min: -20, max: 20, precision: 2 }),
    ...overrides,
  }
}

// Generate time series data for charts
export function generateMockTimeSeriesData(
  timeframe: '1h' | '24h' | '7d' | '30d',
  type: 'transactions' | 'volume'
): MockTimeSeriesData[] {
  const now = new Date()
  let dataPoints: number
  let intervalMs: number

  switch (timeframe) {
    case '1h':
      dataPoints = 60
      intervalMs = 60 * 1000 // 1 minute
      break
    case '24h':
      dataPoints = 24
      intervalMs = 60 * 60 * 1000 // 1 hour
      break
    case '7d':
      dataPoints = 7
      intervalMs = 24 * 60 * 60 * 1000 // 1 day
      break
    case '30d':
      dataPoints = 30
      intervalMs = 24 * 60 * 60 * 1000 // 1 day
      break
  }

  return Array.from({ length: dataPoints }, (_, index) => {
    const timestamp = new Date(now.getTime() - (dataPoints - 1 - index) * intervalMs)
    const baseValue = type === 'transactions' 
      ? faker.number.int({ min: 100, max: 1000 })
      : faker.number.int({ min: 1000000, max: 10000000 })

    return {
      timestamp: timestamp.toISOString(),
      value: baseValue,
      [type]: baseValue,
    }
  })
}

// Generate complete mock blockchain data
export function generateMockBlockchainData() {
  return {
    transactions: Array.from({ length: 50 }, () => generateMockTransaction()),
    blocks: Array.from({ length: 20 }, () => generateMockBlock()),
    stats: generateMockStats(),
    chartData: {
      transactions: {
        '1h': generateMockTimeSeriesData('1h', 'transactions'),
        '24h': generateMockTimeSeriesData('24h', 'transactions'),
        '7d': generateMockTimeSeriesData('7d', 'transactions'),
        '30d': generateMockTimeSeriesData('30d', 'transactions'),
      },
      volume: {
        '1h': generateMockTimeSeriesData('1h', 'volume'),
        '24h': generateMockTimeSeriesData('24h', 'volume'),
        '7d': generateMockTimeSeriesData('7d', 'volume'),
        '30d': generateMockTimeSeriesData('30d', 'volume'),
      },
    } as MockChartData,
  }
}

// Predefined scenarios for specific test cases
export const mockScenarios = {
  // High activity scenario
  highActivity: {
    stats: generateMockStats({
      transactionsPerSecond: 95,
      networkHealth: 'excellent',
      activeNodes: 180,
    }),
    transactions: Array.from({ length: 100 }, () =>
      generateMockTransaction({ status: 'success' })
    ),
  },

  // Network congestion scenario
  congestion: {
    stats: generateMockStats({
      transactionsPerSecond: 5,
      networkHealth: 'poor',
      averageBlockTime: 45,
    }),
    transactions: Array.from({ length: 20 }, () =>
      generateMockTransaction({ gasPrice: '1000000000000' }) // High gas price
    ),
  },

  // Failed transactions scenario
  failures: {
    transactions: Array.from({ length: 10 }, () =>
      generateMockTransaction({ status: 'failed' })
    ),
  },

  // Empty state
  empty: {
    transactions: [],
    blocks: [],
    stats: generateMockStats({
      totalTransactions: 0,
      totalBlocks: 0,
      transactionsPerSecond: 0,
    }),
  },
}