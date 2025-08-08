#!/usr/bin/env node

/**
 * Database Backup Script
 * 
 * Creates backups of the database with compression and rotation.
 */

const { Pool } = require('pg');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
require('dotenv').config({ path: '.env.local' });

const pipelineAsync = promisify(pipeline);

// Configuration
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'dashboard_db',
  user: process.env.DB_USER || 'dashboard_user',
  password: process.env.DB_PASSWORD || 'dashboard_password',
  backupDir: process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups'),
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
  compress: process.env.BACKUP_COMPRESS !== 'false'
};

async function ensureBackupDirectory() {
  try {
    await fs.mkdir(config.backupDir, { recursive: true });
    console.log(`📁 Backup directory: ${config.backupDir}`);
  } catch (error) {
    throw new Error(`Failed to create backup directory: ${error.message}`);
  }
}

async function createDatabaseBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseFilename = `${config.database}_${timestamp}`;
  const sqlFilename = `${baseFilename}.sql`;
  const backupPath = path.join(config.backupDir, sqlFilename);
  
  console.log(`🗄️  Creating backup: ${sqlFilename}`);

  // Set PGPASSWORD environment variable for pg_dump
  const env = {
    ...process.env,
    PGPASSWORD: config.password
  };

  const pgDumpArgs = [
    '-h', config.host,
    '-p', config.port.toString(),
    '-U', config.user,
    '-d', config.database,
    '--verbose',
    '--no-password',
    '--format=custom',
    '--compress=9',
    '--file', backupPath
  ];

  return new Promise((resolve, reject) => {
    console.log('🔄 Running pg_dump...');
    
    const pgDump = spawn('pg_dump', pgDumpArgs, { env });
    
    let stderr = '';
    
    pgDump.stderr.on('data', (data) => {
      stderr += data.toString();
      // pg_dump writes progress to stderr, so we show it
      if (data.toString().includes('dumping')) {
        process.stdout.write('.');
      }
    });
    
    pgDump.on('close', (code) => {
      console.log(''); // New line after progress dots
      
      if (code === 0) {
        console.log('✅ Database backup created successfully');
        resolve(backupPath);
      } else {
        console.error('❌ pg_dump failed:', stderr);
        reject(new Error(`pg_dump exited with code ${code}`));
      }
    });
    
    pgDump.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('pg_dump not found. Please install PostgreSQL client tools.'));
      } else {
        reject(error);
      }
    });
  });
}

async function compressBackup(backupPath) {
  if (!config.compress) {
    return backupPath;
  }

  const gzipPath = `${backupPath}.gz`;
  console.log(`📦 Compressing backup to: ${path.basename(gzipPath)}`);

  try {
    const readStream = (await import('fs')).createReadStream(backupPath);
    const writeStream = (await import('fs')).createWriteStream(gzipPath);
    const gzip = createGzip({ level: 9 });

    await pipelineAsync(readStream, gzip, writeStream);

    // Remove uncompressed file
    await fs.unlink(backupPath);
    
    console.log('✅ Backup compressed successfully');
    return gzipPath;
  } catch (error) {
    throw new Error(`Compression failed: ${error.message}`);
  }
}

async function getBackupInfo(backupPath) {
  try {
    const stats = await fs.stat(backupPath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    
    return {
      path: backupPath,
      size: stats.size,
      sizeFormatted: `${sizeInMB} MB`,
      created: stats.birthtime
    };
  } catch (error) {
    console.warn(`⚠️  Could not get backup info: ${error.message}`);
    return { path: backupPath };
  }
}

async function cleanupOldBackups() {
  if (config.retentionDays <= 0) {
    console.log('ℹ️  Backup retention is disabled');
    return;
  }

  console.log(`🧹 Cleaning up backups older than ${config.retentionDays} days...`);
  
  try {
    const files = await fs.readdir(config.backupDir);
    const backupFiles = files.filter(file => 
      file.startsWith(config.database) && 
      (file.endsWith('.sql') || file.endsWith('.sql.gz'))
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    let deletedCount = 0;

    for (const file of backupFiles) {
      const filePath = path.join(config.backupDir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.birthtime < cutoffDate) {
        await fs.unlink(filePath);
        console.log(`🗑️  Deleted old backup: ${file}`);
        deletedCount++;
      }
    }

    if (deletedCount === 0) {
      console.log('✅ No old backups to clean up');
    } else {
      console.log(`✅ Cleaned up ${deletedCount} old backup(s)`);
    }

  } catch (error) {
    console.warn(`⚠️  Cleanup failed: ${error.message}`);
  }
}

async function listBackups() {
  try {
    const files = await fs.readdir(config.backupDir);
    const backupFiles = files.filter(file => 
      file.startsWith(config.database) && 
      (file.endsWith('.sql') || file.endsWith('.sql.gz'))
    );

    if (backupFiles.length === 0) {
      console.log('📄 No backups found');
      return;
    }

    console.log('\n📋 Available backups:');
    console.log('===================');

    const backups = [];
    for (const file of backupFiles) {
      const filePath = path.join(config.backupDir, file);
      const info = await getBackupInfo(filePath);
      backups.push({ ...info, filename: file });
    }

    // Sort by creation date (newest first)
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    backups.forEach(backup => {
      const date = backup.created ? backup.created.toLocaleString() : 'Unknown';
      const size = backup.sizeFormatted || 'Unknown size';
      console.log(`📦 ${backup.filename}`);
      console.log(`   Created: ${date}`);
      console.log(`   Size: ${size}`);
      console.log('');
    });

  } catch (error) {
    console.error(`❌ Failed to list backups: ${error.message}`);
  }
}

async function verifyBackup(backupPath) {
  console.log('🔍 Verifying backup integrity...');
  
  const env = {
    ...process.env,
    PGPASSWORD: config.password
  };

  const pgRestoreArgs = [
    '--list',
    '--verbose',
    backupPath
  ];

  return new Promise((resolve, reject) => {
    const pgRestore = spawn('pg_restore', pgRestoreArgs, { env });
    
    let stdout = '';
    let stderr = '';
    
    pgRestore.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    pgRestore.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    pgRestore.on('close', (code) => {
      if (code === 0) {
        const tableCount = (stdout.match(/TABLE/g) || []).length;
        const indexCount = (stdout.match(/INDEX/g) || []).length;
        
        console.log('✅ Backup verification successful');
        console.log(`   Tables: ${tableCount}`);
        console.log(`   Indexes: ${indexCount}`);
        resolve(true);
      } else {
        console.error('❌ Backup verification failed:', stderr);
        reject(new Error(`pg_restore verification failed with code ${code}`));
      }
    });
    
    pgRestore.on('error', (error) => {
      if (error.code === 'ENOENT') {
        console.warn('⚠️  pg_restore not found, skipping verification');
        resolve(false);
      } else {
        reject(error);
      }
    });
  });
}

async function createBackup() {
  const pool = new Pool(config);

  try {
    console.log('🔄 Starting database backup...');
    
    // Test database connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');

    // Ensure backup directory exists
    await ensureBackupDirectory();

    // Create the backup
    let backupPath = await createDatabaseBackup();

    // Compress if enabled
    if (config.compress) {
      backupPath = await compressBackup(backupPath);
    }

    // Get backup information
    const backupInfo = await getBackupInfo(backupPath);

    // Verify backup integrity
    try {
      await verifyBackup(backupPath);
    } catch (error) {
      console.warn('⚠️  Backup verification failed:', error.message);
    }

    // Clean up old backups
    await cleanupOldBackups();

    console.log('🎉 Backup completed successfully!');
    console.log(`📦 Backup file: ${path.basename(backupPath)}`);
    console.log(`📏 Size: ${backupInfo.sizeFormatted || 'Unknown'}`);
    console.log(`📍 Location: ${backupPath}`);

    return backupPath;

  } catch (error) {
    console.error('💥 Backup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';

  try {
    switch (command) {
      case 'create':
        await createBackup();
        break;
      case 'list':
        await ensureBackupDirectory();
        await listBackups();
        break;
      case 'cleanup':
        await ensureBackupDirectory();
        await cleanupOldBackups();
        break;
      default:
        console.log('Usage: node backup-db.js [create|list|cleanup]');
        console.log('');
        console.log('Commands:');
        console.log('  create   - Create a new backup (default)');
        console.log('  list     - List existing backups');
        console.log('  cleanup  - Clean up old backups');
        process.exit(1);
    }
  } catch (error) {
    console.error('💥 Operation failed:', error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createBackup, listBackups, cleanupOldBackups };