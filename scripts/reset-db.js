#!/usr/bin/env node

/**
 * Database Reset Script
 * 
 * Completely resets the database by dropping all tables and data.
 * WARNING: This is destructive and should only be used in development!
 */

const { Pool } = require('pg');
const readline = require('readline');
require('dotenv').config({ path: '.env.local' });

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'dashboard_password',
};

async function confirmReset() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('⚠️  WARNING: This will completely reset the database!');
    console.log('🗑️  All data will be permanently deleted!');
    console.log('');
    console.log('Database:', dbConfig.database);
    console.log('Host:', dbConfig.host);
    console.log('');
    
    rl.question('Are you sure you want to continue? Type "yes" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function dropTimescaleDbObjects(pool) {
  console.log('⏰ Removing TimescaleDB objects...');
  
  try {
    // Drop continuous aggregates
    const aggregatesResult = await pool.query(`
      SELECT view_name 
      FROM timescaledb_information.continuous_aggregates
    `);
    
    for (const row of aggregatesResult.rows) {
      console.log(`  Dropping continuous aggregate: ${row.view_name}`);
      await pool.query(`DROP MATERIALIZED VIEW IF EXISTS ${row.view_name} CASCADE`);
    }

    // Drop jobs
    const jobsResult = await pool.query(`
      SELECT job_id, proc_name 
      FROM timescaledb_information.jobs 
      WHERE job_type = 'User-Defined Action'
    `);
    
    for (const row of jobsResult.rows) {
      console.log(`  Dropping job: ${row.proc_name} (${row.job_id})`);
      await pool.query(`SELECT delete_job($1)`, [row.job_id]);
    }

    // Drop hypertables (this will also drop regular tables)
    const hypertablesResult = await pool.query(`
      SELECT hypertable_schema, hypertable_name 
      FROM timescaledb_information.hypertables
    `);
    
    for (const row of hypertablesResult.rows) {
      console.log(`  Dropping hypertable: ${row.hypertable_schema}.${row.hypertable_name}`);
      await pool.query(`DROP TABLE IF EXISTS ${row.hypertable_schema}.${row.hypertable_name} CASCADE`);
    }

  } catch (error) {
    console.log('⚠️  Error removing TimescaleDB objects:', error.message);
  }
}

async function dropSchemas(pool) {
  console.log('📁 Dropping schemas...');
  
  const schemas = ['dashboard', 'analytics', 'monitoring'];
  
  for (const schema of schemas) {
    try {
      console.log(`  Dropping schema: ${schema}`);
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } catch (error) {
      console.log(`  Warning: Could not drop schema ${schema}:`, error.message);
    }
  }
}

async function dropMigrationTable(pool) {
  console.log('📋 Dropping migration tracking...');
  
  try {
    await pool.query('DROP TABLE IF EXISTS schema_migrations CASCADE');
  } catch (error) {
    console.log('  Warning: Could not drop migration table:', error.message);
  }
}

async function cleanupOrphanedObjects(pool) {
  console.log('🧹 Cleaning up orphaned objects...');
  
  try {
    // Drop any remaining functions
    const functionsResult = await pool.query(`
      SELECT routine_schema, routine_name 
      FROM information_schema.routines 
      WHERE routine_schema IN ('dashboard', 'analytics', 'monitoring')
      AND routine_type = 'FUNCTION'
    `);
    
    for (const row of functionsResult.rows) {
      console.log(`  Dropping function: ${row.routine_schema}.${row.routine_name}`);
      await pool.query(`DROP FUNCTION IF EXISTS ${row.routine_schema}.${row.routine_name} CASCADE`);
    }

    // Drop any remaining procedures
    const proceduresResult = await pool.query(`
      SELECT routine_schema, routine_name 
      FROM information_schema.routines 
      WHERE routine_schema IN ('dashboard', 'analytics', 'monitoring')
      AND routine_type = 'PROCEDURE'
    `);
    
    for (const row of proceduresResult.rows) {
      console.log(`  Dropping procedure: ${row.routine_schema}.${row.routine_name}`);
      await pool.query(`DROP PROCEDURE IF EXISTS ${row.routine_schema}.${row.routine_name} CASCADE`);
    }

    // Drop any remaining types
    const typesResult = await pool.query(`
      SELECT schema_name, type_name 
      FROM information_schema.user_defined_types 
      WHERE schema_name IN ('dashboard', 'analytics', 'monitoring')
    `);
    
    for (const row of typesResult.rows) {
      console.log(`  Dropping type: ${row.schema_name}.${row.type_name}`);
      await pool.query(`DROP TYPE IF EXISTS ${row.schema_name}.${row.type_name} CASCADE`);
    }

  } catch (error) {
    console.log('⚠️  Error during cleanup:', error.message);
  }
}

async function verifyReset(pool) {
  console.log('🔍 Verifying reset...');
  
  // Check for remaining tables
  const tablesResult = await pool.query(`
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname IN ('dashboard', 'analytics', 'monitoring')
  `);
  
  if (tablesResult.rows.length > 0) {
    console.log('⚠️  Warning: Some tables still exist:');
    tablesResult.rows.forEach(row => {
      console.log(`    - ${row.schemaname}.${row.tablename}`);
    });
  } else {
    console.log('✅ All application tables removed');
  }

  // Check for remaining schemas
  const schemasResult = await pool.query(`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name IN ('dashboard', 'analytics', 'monitoring')
  `);
  
  if (schemasResult.rows.length > 0) {
    console.log('⚠️  Warning: Some schemas still exist:');
    schemasResult.rows.forEach(row => {
      console.log(`    - ${row.schema_name}`);
    });
  } else {
    console.log('✅ All application schemas removed');
  }

  // Check TimescaleDB objects
  try {
    const hypertablesResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM timescaledb_information.hypertables
    `);
    
    if (parseInt(hypertablesResult.rows[0].count) === 0) {
      console.log('✅ All hypertables removed');
    } else {
      console.log(`⚠️  Warning: ${hypertablesResult.rows[0].count} hypertables still exist`);
    }
  } catch (error) {
    console.log('ℹ️  Could not check TimescaleDB objects (extension may be removed)');
  }
}

async function resetDatabase() {
  // Prevent accidental resets in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Database reset is not allowed in production!');
    process.exit(1);
  }

  const confirmed = await confirmReset();
  if (!confirmed) {
    console.log('🛑 Database reset cancelled');
    process.exit(0);
  }

  const pool = new Pool(dbConfig);

  try {
    console.log('🔄 Starting database reset...');
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    // Check if TimescaleDB is available
    let hasTimescaleDB = false;
    try {
      const extResult = await pool.query("SELECT extname FROM pg_extension WHERE extname = 'timescaledb'");
      hasTimescaleDB = extResult.rows.length > 0;
      console.log(`⏰ TimescaleDB ${hasTimescaleDB ? 'detected' : 'not found'}`);
    } catch (error) {
      console.log('ℹ️  Could not check for TimescaleDB extension');
    }

    // Drop TimescaleDB objects first if extension is available
    if (hasTimescaleDB) {
      await dropTimescaleDbObjects(pool);
    }

    // Drop schemas (this will cascade to all objects)
    await dropSchemas(pool);

    // Drop migration tracking table
    await dropMigrationTable(pool);

    // Clean up any orphaned objects
    await cleanupOrphanedObjects(pool);

    // Verify the reset
    await verifyReset(pool);

    console.log('🎉 Database reset completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run: npm run db:setup    # Set up fresh schema');
    console.log('  2. Run: npm run db:seed     # Add sample data (optional)');

  } catch (error) {
    console.error('💥 Database reset failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line execution
if (require.main === module) {
  resetDatabase().catch(console.error);
}

module.exports = { resetDatabase };