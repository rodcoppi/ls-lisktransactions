#!/usr/bin/env node

/**
 * Cache Clearing Script
 * 
 * Clears various caches used by the application including Redis, 
 * database cache, and application-level caches.
 */

const redis = require('redis');
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Configuration
const config = {
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    password: process.env.REDIS_PASSWORD,
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'dashboard_db',
    user: process.env.DB_USER || 'dashboard_user',
    password: process.env.DB_PASSWORD || 'dashboard_password',
  }
};

async function clearRedisCache() {
  console.log('🔴 Clearing Redis cache...');
  
  const client = redis.createClient({
    url: config.redis.url,
    password: config.redis.password,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Redis');

    // Get current database info
    const info = await client.info('keyspace');
    console.log(`ℹ️  Redis info: ${info.split('\n')[1] || 'No keys found'}`);

    // Clear all keys
    const result = await client.flushDb();
    console.log('✅ Redis cache cleared:', result);

    // Get key count after clearing
    const keyCount = await client.dbSize();
    console.log(`📊 Keys remaining: ${keyCount}`);

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('⚠️  Redis not available, skipping Redis cache clear');
    } else {
      console.error('❌ Redis cache clear failed:', error.message);
    }
  } finally {
    try {
      await client.quit();
    } catch (error) {
      // Ignore disconnect errors
    }
  }
}

async function clearDatabaseCache() {
  console.log('🗄️  Clearing database cache...');
  
  const pool = new Pool(config.database);

  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to database');

    // Clear application cache table
    const result = await pool.query('DELETE FROM dashboard.cache WHERE TRUE');
    console.log(`✅ Cleared ${result.rowCount} entries from database cache`);

    // Clear expired cache entries (this function was created in our setup)
    try {
      const expiredResult = await pool.query('SELECT clean_expired_cache()');
      console.log(`🧹 Cleaned ${expiredResult.rows[0].clean_expired_cache} expired entries`);
    } catch (error) {
      console.log('ℹ️  Could not run expired cache cleanup:', error.message);
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.log('⚠️  Database not available, skipping database cache clear');
    } else {
      console.error('❌ Database cache clear failed:', error.message);
    }
  } finally {
    await pool.end();
  }
}

async function clearFileSystemCache() {
  console.log('📁 Clearing filesystem cache...');
  
  const cacheDirs = [
    path.join(__dirname, '..', '.next', 'cache'),
    path.join(__dirname, '..', 'node_modules', '.cache'),
    path.join(__dirname, '..', '.cache'),
    path.join(__dirname, '..', 'reports'),
    '/tmp/next-cache', // Common Next.js cache location
  ];

  let clearedCount = 0;

  for (const cacheDir of cacheDirs) {
    try {
      const stats = await fs.stat(cacheDir);
      if (stats.isDirectory()) {
        await fs.rm(cacheDir, { recursive: true, force: true });
        console.log(`✅ Cleared: ${cacheDir}`);
        clearedCount++;
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.log(`⚠️  Could not clear ${cacheDir}: ${error.message}`);
      }
    }
  }

  // Recreate necessary directories
  try {
    await fs.mkdir(path.join(__dirname, '..', 'reports'), { recursive: true });
  } catch (error) {
    // Ignore errors
  }

  console.log(`📊 Cleared ${clearedCount} filesystem cache directories`);
}

async function clearBrowserCache() {
  console.log('🌐 Browser cache instructions:');
  console.log('   To clear browser cache:');
  console.log('   - Chrome/Edge: Ctrl+Shift+R or F12 → Application → Clear Storage');
  console.log('   - Firefox: Ctrl+Shift+R or F12 → Storage → Clear All');
  console.log('   - Safari: Option+Cmd+R or Develop → Empty Caches');
}

async function clearApplicationCache() {
  console.log('⚡ Clearing application-level cache...');
  
  // This would clear any in-memory caches if the application was running
  // For now, we'll just show instructions
  console.log('ℹ️  To clear application memory cache:');
  console.log('   - Restart the application: npm run dev (development)');
  console.log('   - Or restart Docker containers: docker-compose restart');
}

async function showCacheStatus() {
  console.log('\n📊 Cache Status Report');
  console.log('======================');

  // Redis status
  const redisClient = redis.createClient({
    url: config.redis.url,
    password: config.redis.password,
  });

  try {
    await redisClient.connect();
    const keyCount = await redisClient.dbSize();
    const info = await redisClient.info('memory');
    const memoryMatch = info.match(/used_memory_human:(\S+)/);
    const memory = memoryMatch ? memoryMatch[1] : 'Unknown';
    
    console.log(`🔴 Redis: ${keyCount} keys, ${memory} memory used`);
    await redisClient.quit();
  } catch (error) {
    console.log('🔴 Redis: Not available');
  }

  // Database cache status
  const pool = new Pool(config.database);
  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM dashboard.cache');
    console.log(`🗄️  Database cache: ${result.rows[0].count} entries`);
  } catch (error) {
    console.log('🗄️  Database cache: Not available');
  } finally {
    await pool.end();
  }

  // Filesystem cache status
  const cacheDirs = [
    path.join(__dirname, '..', '.next', 'cache'),
    path.join(__dirname, '..', 'node_modules', '.cache'),
  ];

  let totalSize = 0;
  let dirCount = 0;

  for (const cacheDir of cacheDirs) {
    try {
      const stats = await fs.stat(cacheDir);
      if (stats.isDirectory()) {
        // Get directory size (simplified)
        const files = await fs.readdir(cacheDir, { recursive: true });
        dirCount++;
        // Note: This is a simplified size calculation
      }
    } catch (error) {
      // Directory doesn't exist
    }
  }

  console.log(`📁 Filesystem cache: ${dirCount} directories found`);
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  console.log('🧹 Cache Management Tool');
  console.log('========================\n');

  try {
    switch (command) {
      case 'all':
        console.log('🔄 Clearing all caches...\n');
        await clearRedisCache();
        await clearDatabaseCache();
        await clearFileSystemCache();
        await clearApplicationCache();
        await clearBrowserCache();
        console.log('\n🎉 All caches cleared!');
        break;
        
      case 'redis':
        await clearRedisCache();
        break;
        
      case 'database':
      case 'db':
        await clearDatabaseCache();
        break;
        
      case 'filesystem':
      case 'fs':
        await clearFileSystemCache();
        break;
        
      case 'status':
        await showCacheStatus();
        break;
        
      default:
        console.log('Usage: node clear-cache.js [command]');
        console.log('');
        console.log('Commands:');
        console.log('  all        - Clear all caches (default)');
        console.log('  redis      - Clear Redis cache only');
        console.log('  database   - Clear database cache only');
        console.log('  filesystem - Clear filesystem cache only');
        console.log('  status     - Show cache status');
        console.log('');
        console.log('Examples:');
        console.log('  npm run cache:clear');
        console.log('  node scripts/clear-cache.js redis');
        console.log('  node scripts/clear-cache.js status');
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Cache clear operation failed:', error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  clearRedisCache,
  clearDatabaseCache,
  clearFileSystemCache,
  showCacheStatus
};