#!/usr/bin/env node

/**
 * Database Setup Script
 * 
 * This script sets up the database with initial schema and data.
 * It can be run independently or as part of the development setup.
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'dashboard_password',
};

// SQL files to execute in order
const sqlFiles = [
  '01-init.sql',
  '02-tables.sql',
  '03-indexes.sql',
  '04-functions.sql',
  '05-policies.sql'
];

async function executeSQL(pool, sqlContent, filename) {
  try {
    console.log(`📝 Executing ${filename}...`);
    await pool.query(sqlContent);
    console.log(`✅ ${filename} executed successfully`);
  } catch (error) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    throw error;
  }
}

async function checkTimescaleDB(pool) {
  try {
    const result = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'timescaledb';");
    if (result.rows.length === 0) {
      console.log('⚠️  TimescaleDB extension not found. Installing...');
      await pool.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;');
      console.log('✅ TimescaleDB extension installed');
    } else {
      console.log('✅ TimescaleDB extension is available');
    }
  } catch (error) {
    console.error('❌ Error checking TimescaleDB:', error.message);
    console.log('ℹ️  Make sure you are using a TimescaleDB-enabled PostgreSQL instance');
    throw error;
  }
}

async function setupDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Check TimescaleDB availability
    await checkTimescaleDB(pool);

    // Execute SQL files
    for (const filename of sqlFiles) {
      const filePath = path.join(__dirname, '..', 'database', 'init', filename);
      
      try {
        const sqlContent = await fs.readFile(filePath, 'utf8');
        await executeSQL(pool, sqlContent, filename);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`⚠️  ${filename} not found, skipping...`);
        } else {
          throw error;
        }
      }
    }

    // Verify setup
    console.log('🔍 Verifying database setup...');
    const tables = await pool.query(`
      SELECT schemaname, tablename 
      FROM pg_tables 
      WHERE schemaname IN ('dashboard', 'analytics', 'monitoring')
      ORDER BY schemaname, tablename;
    `);

    console.log('📊 Created tables:');
    tables.rows.forEach(row => {
      console.log(`  - ${row.schemaname}.${row.tablename}`);
    });

    // Check hypertables
    const hypertables = await pool.query(`
      SELECT hypertable_name, num_chunks 
      FROM timescaledb_information.hypertables;
    `);

    if (hypertables.rows.length > 0) {
      console.log('⏰ TimescaleDB hypertables:');
      hypertables.rows.forEach(row => {
        console.log(`  - ${row.hypertable_name} (${row.num_chunks} chunks)`);
      });
    }

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line execution
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };