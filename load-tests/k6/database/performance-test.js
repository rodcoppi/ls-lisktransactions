/**
 * K6 Database Performance Testing
 * Tests database performance under concurrent load with TimescaleDB optimization
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend, Rate, Gauge } from 'k6/metrics';
import sql from 'k6/x/sql';
import { 
  customMetrics, 
  environment, 
  testData, 
  requestConfig, 
  validators, 
  utils 
} from '../config.js';

// Database specific metrics
const dbQueryTime = new Trend('db_query_time');
const dbConnectionTime = new Trend('db_connection_time'); 
const dbConnectionsActive = new Gauge('db_connections_active');
const dbQueryErrors = new Counter('db_query_errors');
const dbSlowQueries = new Counter('db_slow_queries');
const dbConnectionErrors = new Counter('db_connection_errors');
const dbTransactionTime = new Trend('db_transaction_time');

// Test configuration for database load testing
export let options = {
  scenarios: {
    // Database query stress test
    database_queries: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },     // Warm up connections
        { duration: '2m', target: 100 },    // Light load
        { duration: '3m', target: 250 },    // Medium load
        { duration: '5m', target: 500 },    // Heavy load
        { duration: '10m', target: 1000 },  // Stress load
        { duration: '5m', target: 500 },    // Scale down
        { duration: '2m', target: 0 },      // Cool down
      ],
      tags: { testType: 'database_stress' },
    },
    
    // Connection pool stress test
    connection_pool: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 connections per second
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 50,
      maxVUs: 200,
      tags: { testType: 'connection_pool' },
    },
    
    // Long-running transaction test
    long_transactions: {
      executor: 'constant-vus',
      vus: 20,
      duration: '15m',
      tags: { testType: 'long_transactions' },
    },
  },
  
  thresholds: {
    // Database query performance
    'db_query_time': [
      'p(95)<50',       // 95th percentile < 50ms
      'p(99)<100',      // 99th percentile < 100ms  
      'avg<25',         // Average < 25ms
    ],
    
    // Connection performance
    'db_connection_time': [
      'p(95)<100',      // Connection time < 100ms
      'avg<50',         // Average connection time < 50ms
    ],
    
    // Error rates
    'db_query_errors': [
      'rate<0.001',     // < 0.1% query errors
    ],
    
    'db_connection_errors': [
      'rate<0.01',      // < 1% connection errors
    ],
    
    // Slow query monitoring
    'db_slow_queries': [
      'rate<0.05',      // < 5% slow queries
    ],
  },
};

let db;

// Setup function - initialize database connection
export function setup() {
  console.log('Starting Database Performance Test Setup');
  
  try {
    // Initialize database connection
    db = sql.open('postgres', environment.databases.postgres);
    console.log('Database connection established');
    
    // Verify database schema and setup
    verifyDatabaseSetup(db);
    
    return {
      dbUrl: environment.databases.postgres,
      startTime: Date.now(),
    };
  } catch (error) {
    console.error('Database setup failed:', error);
    throw error;
  }
}

// Main test function
export default function(data) {
  const testType = __ENV.TEST_TYPE || 'mixed';
  
  group('Database Performance Tests', function() {
    switch (testType) {
      case 'queries':
        testQueryPerformance();
        break;
      case 'connections':
        testConnectionPool();
        break;
      case 'transactions':
        testTransactionPerformance();
        break;
      default:
        testMixedOperations();
    }
  });
  
  // Random sleep to simulate realistic usage patterns
  sleep(Math.random() * 2);
}

/**
 * Verify database setup and schema
 */
function verifyDatabaseSetup(database) {
  try {
    // Check TimescaleDB extension
    const extensionCheck = sql.query(database, `
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
      ) as timescaledb_installed;
    `);
    
    console.log('TimescaleDB installed:', extensionCheck[0].timescaledb_installed);
    
    // Check key tables exist
    const tableCheck = sql.query(database, `
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename IN ('metrics', 'events', 'users', 'alerts');
    `);
    
    console.log(`Found ${tableCheck.length} key tables`);
    
  } catch (error) {
    console.error('Database verification failed:', error);
  }
}

/**
 * Test various database query patterns
 */
function testQueryPerformance() {
  group('Query Performance Tests', function() {
    // Time-series queries (TimescaleDB optimized)
    testTimeSeriesQueries();
    
    // Analytical queries  
    testAnalyticalQueries();
    
    // CRUD operations
    testCrudOperations();
    
    // Index performance
    testIndexQueries();
    
    // Aggregation queries
    testAggregationQueries();
  });
}

/**
 * Test time-series queries (TimescaleDB specific)
 */
function testTimeSeriesQueries() {
  group('TimescaleDB Time-Series Queries', function() {
    const queries = [
      {
        name: 'Recent metrics (1 hour)',
        sql: `
          SELECT time, metric_id, value 
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '1 hour'
          ORDER BY time DESC 
          LIMIT 1000;
        `
      },
      {
        name: 'Hourly averages (24 hours)', 
        sql: `
          SELECT 
            time_bucket('1 hour', time) as hour,
            metric_id,
            AVG(value) as avg_value,
            MAX(value) as max_value,
            MIN(value) as min_value
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '24 hours'
          GROUP BY hour, metric_id
          ORDER BY hour DESC;
        `
      },
      {
        name: 'Daily aggregates (7 days)',
        sql: `
          SELECT 
            time_bucket('1 day', time) as day,
            COUNT(*) as record_count,
            AVG(value) as daily_avg
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '7 days'
          GROUP BY day
          ORDER BY day DESC;
        `
      }
    ];
    
    queries.forEach(query => {
      executeTimedQuery(query.name, query.sql);
    });
  });
}

/**
 * Test analytical queries
 */
function testAnalyticalQueries() {
  group('Analytical Queries', function() {
    const analyticalQueries = [
      {
        name: 'Top metrics by value',
        sql: `
          SELECT metric_id, AVG(value) as avg_value, COUNT(*) as count
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '1 day'
          GROUP BY metric_id
          ORDER BY avg_value DESC
          LIMIT 50;
        `
      },
      {
        name: 'Percentile analysis',
        sql: `
          SELECT 
            metric_id,
            percentile_cont(0.50) WITHIN GROUP (ORDER BY value) as p50,
            percentile_cont(0.95) WITHIN GROUP (ORDER BY value) as p95,
            percentile_cont(0.99) WITHIN GROUP (ORDER BY value) as p99
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '6 hours'
          GROUP BY metric_id;
        `
      },
      {
        name: 'Moving averages',
        sql: `
          SELECT 
            time,
            metric_id,
            value,
            AVG(value) OVER (
              PARTITION BY metric_id 
              ORDER BY time 
              ROWS BETWEEN 9 PRECEDING AND CURRENT ROW
            ) as moving_avg_10
          FROM metrics 
          WHERE time >= NOW() - INTERVAL '2 hours'
          AND metric_id = 1
          ORDER BY time DESC
          LIMIT 500;
        `
      }
    ];
    
    analyticalQueries.forEach(query => {
      executeTimedQuery(query.name, query.sql);
    });
  });
}

/**
 * Test CRUD operations
 */
function testCrudOperations() {
  group('CRUD Operations', function() {
    // INSERT operations
    const insertStart = Date.now();
    try {
      const result = sql.query(db, `
        INSERT INTO metrics (time, metric_id, value, tags) 
        VALUES (NOW(), $1, $2, $3)
        RETURNING id;
      `, Math.floor(Math.random() * 100), Math.random() * 1000, '{"test": true}');
      
      const insertTime = Date.now() - insertStart;
      dbQueryTime.add(insertTime);
      
      check(result, {
        'insert successful': (r) => r.length > 0,
      });
      
    } catch (error) {
      dbQueryErrors.add(1);
      console.error('Insert failed:', error);
    }
    
    // UPDATE operations
    executeTimedQuery('Update metrics', `
      UPDATE metrics 
      SET value = value * 1.1 
      WHERE time >= NOW() - INTERVAL '1 minute'
      AND metric_id = $1;
    `, Math.floor(Math.random() * 10));
    
    // DELETE operations (be careful with this in load testing)
    executeTimedQuery('Delete old test data', `
      DELETE FROM metrics 
      WHERE tags->>'test' = 'true' 
      AND time < NOW() - INTERVAL '1 hour'
      LIMIT 100;
    `);
  });
}

/**
 * Test index performance
 */
function testIndexQueries() {
  group('Index Performance', function() {
    // Test time-based index
    executeTimedQuery('Time index query', `
      SELECT COUNT(*) 
      FROM metrics 
      WHERE time BETWEEN $1 AND $2;
    `, new Date(Date.now() - 3600000).toISOString(), new Date().toISOString());
    
    // Test composite index
    executeTimedQuery('Composite index query', `
      SELECT time, value 
      FROM metrics 
      WHERE time >= $1 AND metric_id = $2
      ORDER BY time DESC 
      LIMIT 100;
    `, new Date(Date.now() - 1800000).toISOString(), Math.floor(Math.random() * 50));
    
    // Test JSONB index  
    executeTimedQuery('JSONB index query', `
      SELECT COUNT(*) 
      FROM metrics 
      WHERE tags @> $1;
    `, '{"environment": "production"}');
  });
}

/**
 * Test aggregation queries
 */
function testAggregationQueries() {
  group('Aggregation Queries', function() {
    executeTimedQuery('Count aggregation', `
      SELECT 
        metric_id,
        COUNT(*) as total_records,
        COUNT(DISTINCT DATE(time)) as unique_days
      FROM metrics 
      WHERE time >= NOW() - INTERVAL '7 days'
      GROUP BY metric_id;
    `);
    
    executeTimedQuery('Statistical aggregation', `
      SELECT 
        metric_id,
        AVG(value) as mean,
        STDDEV(value) as std_dev,
        VARIANCE(value) as variance
      FROM metrics 
      WHERE time >= NOW() - INTERVAL '24 hours'
      GROUP BY metric_id;
    `);
  });
}

/**
 * Test connection pool behavior
 */
function testConnectionPool() {
  group('Connection Pool Tests', function() {
    const connectionStart = Date.now();
    
    try {
      // Test connection acquisition time
      const testDb = sql.open('postgres', environment.databases.postgres);
      const connectionTime = Date.now() - connectionStart;
      
      dbConnectionTime.add(connectionTime);
      dbConnectionsActive.add(1);
      
      // Perform a simple query to verify connection
      const result = sql.query(testDb, 'SELECT 1 as test');
      
      check(result, {
        'connection successful': (r) => r.length > 0 && r[0].test === 1,
      });
      
      // Close connection
      testDb.close();
      dbConnectionsActive.add(-1);
      
    } catch (error) {
      dbConnectionErrors.add(1);
      console.error('Connection test failed:', error);
    }
  });
}

/**
 * Test transaction performance  
 */
function testTransactionPerformance() {
  group('Transaction Performance', function() {
    const transactionStart = Date.now();
    
    try {
      // Begin transaction
      sql.query(db, 'BEGIN;');
      
      // Multiple operations in transaction
      for (let i = 0; i < 5; i++) {
        sql.query(db, `
          INSERT INTO metrics (time, metric_id, value, tags) 
          VALUES (NOW(), $1, $2, $3);
        `, 
          Math.floor(Math.random() * 100), 
          Math.random() * 1000,
          `{"transaction": true, "batch": ${i}}`
        );
      }
      
      // Commit transaction
      sql.query(db, 'COMMIT;');
      
      const transactionTime = Date.now() - transactionStart;
      dbTransactionTime.add(transactionTime);
      
      check(transactionTime, {
        'transaction completed in reasonable time': (time) => time < 1000,
      });
      
    } catch (error) {
      // Rollback on error
      sql.query(db, 'ROLLBACK;');
      dbQueryErrors.add(1);
      console.error('Transaction failed:', error);
    }
  });
}

/**
 * Test mixed database operations
 */
function testMixedOperations() {
  const operations = ['queries', 'connections', 'transactions'];
  const selectedOperation = operations[Math.floor(Math.random() * operations.length)];
  
  switch (selectedOperation) {
    case 'queries':
      testQueryPerformance();
      break;
    case 'connections':
      testConnectionPool();
      break;
    case 'transactions':
      testTransactionPerformance();
      break;
  }
}

/**
 * Execute a query with timing
 */
function executeTimedQuery(name, query, ...params) {
  const queryStart = Date.now();
  
  try {
    const result = sql.query(db, query, ...params);
    const queryTime = Date.now() - queryStart;
    
    dbQueryTime.add(queryTime);
    
    // Check for slow queries
    if (queryTime > 100) {
      dbSlowQueries.add(1);
      console.warn(`Slow query detected: ${name} took ${queryTime}ms`);
    }
    
    check(result, {
      [`${name} successful`]: (r) => r !== undefined && r !== null,
      [`${name} fast enough`]: () => queryTime < 200,
    });
    
    return result;
    
  } catch (error) {
    dbQueryErrors.add(1);
    console.error(`Query failed - ${name}:`, error);
    
    check(false, {
      [`${name} failed`]: () => false,
    });
    
    return null;
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  if (db) {
    db.close();
  }
  
  const endTime = Date.now();
  const duration = endTime - data.startTime;
  
  console.log(`Database Performance Test completed in ${duration}ms`);
  console.log('Database metrics summary:');
  console.log(`- Query errors: ${dbQueryErrors.count}`);
  console.log(`- Connection errors: ${dbConnectionErrors.count}`);  
  console.log(`- Slow queries: ${dbSlowQueries.count}`);
}