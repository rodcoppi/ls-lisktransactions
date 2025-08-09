import { cacheManagerV2 } from '../lib/cache-manager-v2';
import fs from 'fs';
import path from 'path';
import type { OptimizedCacheV2 } from '../lib/types';
import { toUTCDateKey, formatDateLongUTC } from '../lib/types';
import { recomputeDayStatus, ensure24 } from '../lib/logic';
import crypto from 'crypto';

/**
 * Script to migrate existing V1 cache to V2 with proper status computation
 * and fix the 08/08 data issue
 */

const CACHE_V1_FILE = path.join(process.cwd(), 'src/data/contract-cache.json');
const CACHE_V2_FILE = path.join(process.cwd(), 'src/data/contract-cache-v2.json');

async function migrateToV2(): Promise<void> {
  console.log('🔄 Starting migration from V1 to V2...');

  try {
    // Step 1: Load V1 cache
    if (!fs.existsSync(CACHE_V1_FILE)) {
      console.error('❌ V1 cache file not found:', CACHE_V1_FILE);
      return;
    }

    const v1Data = fs.readFileSync(CACHE_V1_FILE, 'utf8');
    const v1Cache = JSON.parse(v1Data);
    console.log(`📊 Loaded V1 cache: ${v1Cache.totalTransactions} transactions`);

    // Step 2: Build V2 cache structure
    const nowUTC = new Date();
    const todayKey = toUTCDateKey(nowUTC);

    // Initialize V2 structure
    const v2Cache: OptimizedCacheV2 = {
      schemaVersion: '1.2.0',
      generatedAtUTC: nowUTC.toISOString(),
      source: 'migrated-from-v1',
      integrity: 'pending',
      
      dailyTotals: v1Cache.dailyTotals || {},
      dailyStatus: {},
      monthlyTotals: v1Cache.monthlyTotals || {},
      recentHourly: {},
      
      cursor: {
        lastBlockNumber: v1Cache.lastBlockNumber || 0,
        lastTxIndex: 0,
        lastTxHash: ''
      },
      
      lastUpdate: v1Cache.lastUpdate || nowUTC.toISOString(),
      totalTransactions: v1Cache.totalTransactions || 0,
      totalDaysActive: v1Cache.totalDaysActive || 0
    };

    // Step 3: Process hourly data and ensure 24 slots
    Object.keys(v1Cache.recentHourly || {}).forEach(dateKey => {
      const hourlyData = v1Cache.recentHourly[dateKey];
      v2Cache.recentHourly[dateKey] = ensure24(hourlyData);
    });

    // Step 4: Compute daily status for all days
    Object.keys(v2Cache.dailyTotals).forEach(dateKey => {
      const total = v2Cache.dailyTotals[dateKey];
      const hourly = v2Cache.recentHourly[dateKey];
      v2Cache.dailyStatus[dateKey] = recomputeDayStatus(dateKey, total, hourly, todayKey);
    });

    // Step 5: Mark 08/08 as partial (known issue)
    if (v2Cache.dailyStatus['2025-08-08']) {
      v2Cache.dailyStatus['2025-08-08'] = 'partial';
      console.log('⚠️ Marked 2025-08-08 as partial (known incomplete data)');
    }

    // Step 6: Generate integrity hash
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify({ 
        dailyTotals: v2Cache.dailyTotals, 
        monthlyTotals: v2Cache.monthlyTotals, 
        cursor: v2Cache.cursor 
      }))
      .digest('hex');
    v2Cache.integrity = `sha256:${contentHash}`;

    // Step 7: Save V2 cache
    const dir = path.dirname(CACHE_V2_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(CACHE_V2_FILE, JSON.stringify(v2Cache, null, 2));
    console.log(`💾 V2 cache saved to: ${CACHE_V2_FILE}`);

    // Step 8: Report status summary
    console.log('\n📊 Migration Summary:');
    console.log(`  Total Transactions: ${v2Cache.totalTransactions}`);
    console.log(`  Total Days: ${Object.keys(v2Cache.dailyTotals).length}`);
    
    const statusCounts = Object.values(v2Cache.dailyStatus).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('  Day Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count} days`);
    });

    // Show problematic days
    const partialDays = Object.entries(v2Cache.dailyStatus)
      .filter(([_, status]) => status === 'partial')
      .map(([date, _]) => date);
    
    if (partialDays.length > 0) {
      console.log(`  Partial Days (need fixing): ${partialDays.join(', ')}`);
    }

    console.log('\n✅ Migration to V2 completed successfully!');
    console.log('🔧 Next steps:');
    console.log('  1. Run fix-0808-data script to correct partial days');
    console.log('  2. Test the V2 API endpoint');
    console.log('  3. Deploy to production');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Main execution
if (require.main === module) {
  migrateToV2().catch(console.error);
}

export { migrateToV2 };