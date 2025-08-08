#!/usr/bin/env node

/**
 * Database Migration Script
 * 
 * Handles database schema migrations and version tracking.
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

const MIGRATIONS_TABLE = 'schema_migrations';

async function createMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      checksum VARCHAR(32)
    );
  `);
}

async function getAppliedMigrations(pool) {
  const result = await pool.query(`
    SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version
  `);
  return result.rows.map(row => row.version);
}

async function getMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  try {
    const files = await fs.readdir(migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .sort()
      .map(file => ({
        version: file.replace('.sql', ''),
        name: file,
        path: path.join(migrationsDir, file)
      }));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('ℹ️  No migrations directory found. Creating sample migration structure...');
      
      // Create migrations directory
      await fs.mkdir(path.join(__dirname, '..', 'database', 'migrations'), { recursive: true });
      
      // Create sample migration
      const sampleMigration = `-- Sample Migration: Add indexes for performance
-- Version: 001_add_performance_indexes
-- Date: ${new Date().toISOString().split('T')[0]}

-- Add index for frequently queried columns
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sample_column 
--   ON your_table(column_name);

-- Example: Add new column
-- ALTER TABLE your_table ADD COLUMN IF NOT EXISTS new_column VARCHAR(255);

-- Remember to update down migration as well if needed
`;

      await fs.writeFile(
        path.join(__dirname, '..', 'database', 'migrations', '001_sample_migration.sql'),
        sampleMigration
      );

      console.log('✅ Created sample migration structure');
      return [];
    }
    throw error;
  }
}

function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

async function runMigration(pool, migration) {
  const content = await fs.readFile(migration.path, 'utf8');
  const checksum = calculateChecksum(content);
  
  console.log(`🔄 Running migration: ${migration.name}`);
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Execute migration
    await pool.query(content);
    
    // Record migration
    await pool.query(`
      INSERT INTO ${MIGRATIONS_TABLE} (version, name, checksum)
      VALUES ($1, $2, $3)
    `, [migration.version, migration.name, checksum]);
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`✅ Migration ${migration.name} completed successfully`);
    
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    throw new Error(`Migration ${migration.name} failed: ${error.message}`);
  }
}

async function validateMigration(pool, migration) {
  const content = await fs.readFile(migration.path, 'utf8');
  const currentChecksum = calculateChecksum(content);
  
  const result = await pool.query(`
    SELECT checksum FROM ${MIGRATIONS_TABLE} WHERE version = $1
  `, [migration.version]);
  
  if (result.rows.length > 0) {
    const storedChecksum = result.rows[0].checksum;
    if (storedChecksum !== currentChecksum) {
      throw new Error(
        `Migration ${migration.name} has been modified after being applied. ` +
        `Expected checksum: ${storedChecksum}, got: ${currentChecksum}`
      );
    }
  }
}

async function runMigrations(direction = 'up') {
  const pool = new Pool(dbConfig);
  
  try {
    console.log('🔄 Starting database migrations...');
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Create migrations table if it doesn't exist
    await createMigrationsTable(pool);
    
    // Get current state
    const appliedMigrations = await getAppliedMigrations(pool);
    const availableMigrations = await getMigrationFiles();
    
    console.log(`📋 Found ${availableMigrations.length} migration files`);
    console.log(`📋 ${appliedMigrations.length} migrations already applied`);

    if (direction === 'up') {
      // Find pending migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !appliedMigrations.includes(migration.version)
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ Database is up to date');
        return;
      }

      console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

      // Validate all applied migrations first
      for (const migration of availableMigrations) {
        if (appliedMigrations.includes(migration.version)) {
          await validateMigration(pool, migration);
        }
      }

      // Run pending migrations
      for (const migration of pendingMigrations) {
        await runMigration(pool, migration);
      }

      console.log('🎉 All migrations completed successfully!');
      
    } else if (direction === 'status') {
      // Show migration status
      console.log('\n📊 Migration Status:');
      console.log('==================');
      
      for (const migration of availableMigrations) {
        const isApplied = appliedMigrations.includes(migration.version);
        const status = isApplied ? '✅ Applied' : '⏳ Pending';
        console.log(`${status} - ${migration.name}`);
      }
      
      if (availableMigrations.length === 0) {
        console.log('No migrations found');
      }
    }

  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'up';

  switch (command) {
    case 'up':
      await runMigrations('up');
      break;
    case 'status':
      await runMigrations('status');
      break;
    case 'create':
      await createMigration(args[1]);
      break;
    default:
      console.log('Usage: node migrate.js [up|status|create <name>]');
      console.log('');
      console.log('Commands:');
      console.log('  up       - Run pending migrations (default)');
      console.log('  status   - Show migration status');
      console.log('  create   - Create new migration file');
      process.exit(1);
  }
}

async function createMigration(name) {
  if (!name) {
    console.error('❌ Migration name is required');
    console.log('Usage: node migrate.js create <migration_name>');
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
  const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.sql`;
  const filepath = path.join(__dirname, '..', 'database', 'migrations', filename);

  // Create migrations directory if it doesn't exist
  await fs.mkdir(path.dirname(filepath), { recursive: true });

  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Version: ${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}

-- Up migration
-- Add your migration SQL here



-- Down migration (for rollback - optional)
-- Add rollback SQL in a separate file named: ${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}_down.sql
-- or use transaction rollback if migration fails
`;

  await fs.writeFile(filepath, template);
  console.log(`✅ Created migration: ${filename}`);
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runMigrations, createMigration };