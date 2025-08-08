#!/usr/bin/env node

/**
 * Database Seeding Script
 * 
 * Seeds the database with sample data for development and testing.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'dashboard_password',
};

// Sample data generators
function generateAddress() {
  return Math.floor(Math.random() * 10000000000000000000) + 'L';
}

function generateBlockId() {
  return Math.random().toString(16).substr(2, 64);
}

function generateTransactionId() {
  return Math.random().toString(16).substr(2, 64);
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomTimestamp(daysAgo = 30) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
  return new Date(pastDate.getTime() + Math.random() * (now.getTime() - pastDate.getTime()));
}

async function seedUsers(pool) {
  console.log('👥 Seeding users...');
  
  const users = [
    {
      email: 'admin@dashboard.com',
      name: 'Admin User',
      role: 'admin',
      password: await bcrypt.hash('admin123', 12)
    },
    {
      email: 'developer@dashboard.com',
      name: 'Developer User',
      role: 'developer',
      password: await bcrypt.hash('dev123', 12)
    },
    {
      email: 'viewer@dashboard.com',
      name: 'Viewer User',
      role: 'viewer',
      password: await bcrypt.hash('viewer123', 12)
    }
  ];

  for (const user of users) {
    await pool.query(`
      INSERT INTO dashboard.users (email, password_hash, name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        updated_at = NOW()
    `, [user.email, user.password, user.name, user.role, true, true]);
  }

  console.log(`✅ Seeded ${users.length} users`);
}

async function seedAccounts(pool, count = 100) {
  console.log(`💰 Seeding ${count} accounts...`);
  
  const accounts = [];
  for (let i = 0; i < count; i++) {
    accounts.push({
      address: generateAddress(),
      balance: randomBetween(0, 10000000000000), // 0 to 100,000 LSK (in beddows)
      nonce: randomBetween(0, 1000),
      public_key: Math.random().toString(16).substr(2, 64),
      username: i < 50 ? `user_${i}` : null, // First 50 get usernames
      is_delegate: Math.random() < 0.1, // 10% are delegates
      delegate_weight: randomBetween(0, 1000000000000),
      last_activity_at: getRandomTimestamp(7)
    });
  }

  for (const account of accounts) {
    await pool.query(`
      INSERT INTO analytics.accounts (
        address, balance, nonce, public_key, username, is_delegate, 
        delegate_weight, vote_weight, last_activity_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (address) DO NOTHING
    `, [
      account.address, account.balance, account.nonce, account.public_key,
      account.username, account.is_delegate, account.delegate_weight,
      account.delegate_weight, account.last_activity_at
    ]);
  }

  console.log(`✅ Seeded ${count} accounts`);
  return accounts;
}

async function seedBlocks(pool, count = 1000) {
  console.log(`🧱 Seeding ${count} blocks...`);
  
  let currentHeight = 1;
  const blocks = [];
  
  for (let i = 0; i < count; i++) {
    const timestamp = getRandomTimestamp(30);
    blocks.push({
      height: currentHeight++,
      block_id: generateBlockId(),
      timestamp: timestamp,
      generator_address: generateAddress(),
      transaction_count: randomBetween(0, 100),
      total_amount: randomBetween(0, 100000000000),
      total_fee: randomBetween(1000000, 100000000),
      reward: 500000000, // 5 LSK reward
      size_bytes: randomBetween(1000, 50000)
    });
  }

  // Sort by timestamp to maintain chronological order
  blocks.sort((a, b) => a.timestamp - b.timestamp);

  for (const block of blocks) {
    await pool.query(`
      INSERT INTO analytics.blocks (
        height, block_id, timestamp, generator_address, transaction_count,
        total_amount, total_fee, reward, size_bytes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (height) DO NOTHING
    `, [
      block.height, block.block_id, block.timestamp, block.generator_address,
      block.transaction_count, block.total_amount, block.total_fee, 
      block.reward, block.size_bytes
    ]);
  }

  console.log(`✅ Seeded ${count} blocks`);
  return blocks;
}

async function seedTransactions(pool, accounts, blocks, count = 5000) {
  console.log(`💸 Seeding ${count} transactions...`);
  
  const transactionTypes = [0, 1, 2, 3, 4]; // Different transaction types
  const transactions = [];

  for (let i = 0; i < count; i++) {
    const block = blocks[randomBetween(0, blocks.length - 1)];
    const sender = accounts[randomBetween(0, accounts.length - 1)];
    const recipient = Math.random() < 0.9 ? accounts[randomBetween(0, accounts.length - 1)] : null;
    
    transactions.push({
      transaction_id: generateTransactionId(),
      block_height: block.height,
      timestamp: new Date(block.timestamp.getTime() + randomBetween(0, 600000)), // Within 10 minutes of block
      sender_address: sender.address,
      recipient_address: recipient ? recipient.address : null,
      amount: randomBetween(100000000, 10000000000000), // 1 to 100,000 LSK
      fee: randomBetween(10000000, 100000000), // 0.1 to 1 LSK
      transaction_type: transactionTypes[randomBetween(0, transactionTypes.length - 1)],
      asset: JSON.stringify({ data: `transaction_${i}` }),
      nonce: randomBetween(1, 1000)
    });
  }

  // Sort by timestamp
  transactions.sort((a, b) => a.timestamp - b.timestamp);

  for (const tx of transactions) {
    await pool.query(`
      INSERT INTO analytics.transactions (
        transaction_id, block_height, timestamp, sender_address, recipient_address,
        amount, fee, transaction_type, asset, nonce
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (transaction_id) DO NOTHING
    `, [
      tx.transaction_id, tx.block_height, tx.timestamp, tx.sender_address,
      tx.recipient_address, tx.amount, tx.fee, tx.transaction_type,
      tx.asset, tx.nonce
    ]);
  }

  console.log(`✅ Seeded ${count} transactions`);
}

async function seedMetrics(pool, count = 10000) {
  console.log(`📊 Seeding ${count} metrics...`);
  
  const metricTypes = ['network', 'performance', 'blockchain', 'transaction'];
  const metricNames = {
    network: ['peer_count', 'bandwidth_usage', 'latency'],
    performance: ['cpu_usage', 'memory_usage', 'disk_usage'],
    blockchain: ['block_height', 'difficulty', 'hash_rate'],
    transaction: ['tx_per_second', 'tx_volume', 'avg_fee']
  };

  const baseTimestamp = new Date();
  baseTimestamp.setDate(baseTimestamp.getDate() - 30); // Start 30 days ago

  for (let i = 0; i < count; i++) {
    const metricType = metricTypes[randomBetween(0, metricTypes.length - 1)];
    const metricName = metricNames[metricType][randomBetween(0, metricNames[metricType].length - 1)];
    
    // Create realistic time-series data
    const timestamp = new Date(baseTimestamp.getTime() + (i * (30 * 24 * 60 * 60 * 1000 / count)));
    
    let value;
    switch (metricName) {
      case 'peer_count':
        value = randomBetween(50, 200);
        break;
      case 'cpu_usage':
        value = Math.random() * 100;
        break;
      case 'tx_per_second':
        value = Math.random() * 50;
        break;
      default:
        value = Math.random() * 1000;
    }

    await pool.query(`
      INSERT INTO analytics.lisk_metrics (
        time, metric_type, metric_name, value, metadata
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      timestamp, metricType, metricName, value, 
      JSON.stringify({ source: 'seed_script', batch: Math.floor(i / 100) })
    ]);
  }

  console.log(`✅ Seeded ${count} metrics`);
}

async function seedSystemMetrics(pool, count = 1000) {
  console.log(`🖥️  Seeding ${count} system metrics...`);
  
  const services = ['app', 'database', 'cache', 'nginx'];
  const metrics = ['cpu_percent', 'memory_bytes', 'disk_bytes', 'network_bytes'];
  
  for (let i = 0; i < count; i++) {
    const service = services[randomBetween(0, services.length - 1)];
    const metric = metrics[randomBetween(0, metrics.length - 1)];
    const timestamp = getRandomTimestamp(7);
    
    let value;
    switch (metric) {
      case 'cpu_percent':
        value = Math.random() * 100;
        break;
      case 'memory_bytes':
        value = randomBetween(100000000, 2000000000); // 100MB to 2GB
        break;
      case 'disk_bytes':
        value = randomBetween(1000000000, 100000000000); // 1GB to 100GB
        break;
      case 'network_bytes':
        value = randomBetween(1000, 10000000); // 1KB to 10MB
        break;
      default:
        value = Math.random() * 1000;
    }

    await pool.query(`
      INSERT INTO monitoring.system_metrics (
        time, metric_name, metric_value, service_name, instance_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      timestamp, metric, value, service, `${service}-001`,
      JSON.stringify({ environment: 'development' })
    ]);
  }

  console.log(`✅ Seeded ${count} system metrics`);
}

async function seedDatabase() {
  const pool = new Pool(dbConfig);

  try {
    console.log('🌱 Starting database seeding...');
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Check if tables exist
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema IN ('dashboard', 'analytics', 'monitoring')
    `);

    if (tableCheck.rows[0].count === '0') {
      console.log('⚠️  No tables found. Please run database setup first.');
      console.log('   Run: npm run db:setup');
      process.exit(1);
    }

    // Check if data already exists
    const userCount = await pool.query('SELECT COUNT(*) FROM dashboard.users');
    if (parseInt(userCount.rows[0].count) > 0) {
      console.log('⚠️  Database already contains data.');
      console.log('   To reseed, first run: npm run db:reset');
      
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to continue and add more data? (y/N): ', resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() !== 'y') {
        console.log('🛑 Seeding cancelled');
        process.exit(0);
      }
    }

    // Seed data
    await seedUsers(pool);
    const accounts = await seedAccounts(pool);
    const blocks = await seedBlocks(pool);
    await seedTransactions(pool, accounts, blocks);
    await seedMetrics(pool);
    await seedSystemMetrics(pool);

    // Refresh materialized views
    console.log('🔄 Refreshing materialized views...');
    try {
      await pool.query('REFRESH MATERIALIZED VIEW analytics.hourly_transaction_stats');
      console.log('✅ Materialized views refreshed');
    } catch (error) {
      console.log('⚠️  Could not refresh materialized views:', error.message);
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('👥 Test users created:');
    console.log('   - admin@dashboard.com (password: admin123)');
    console.log('   - developer@dashboard.com (password: dev123)');
    console.log('   - viewer@dashboard.com (password: viewer123)');

  } catch (error) {
    console.error('💥 Database seeding failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line execution
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };