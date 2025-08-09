const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Simple migration script to create V2 cache from V1
 */

const CACHE_V1_FILE = path.join(process.cwd(), 'src/data/contract-cache.json');
const CACHE_V2_FILE = path.join(process.cwd(), 'src/data/contract-cache-v2.json');

function toUTCDateKey(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ensure24(hours) {
  const arr = (hours || []).slice(0, 24);
  while (arr.length < 24) arr.push(0);
  return arr;
}

function recomputeDayStatus(dateKey, dailyTotal, hourly, todayUTCKey) {
  if (dailyTotal === undefined || dailyTotal === null) return 'unknown';
  if (dateKey === todayUTCKey) return 'unknown';
  
  const h = ensure24(hourly);
  const sum = h.reduce((a, b) => a + (b || 0), 0);
  
  if (sum === dailyTotal) return 'complete';
  return 'partial';
}

async function simpleMigrate() {
  console.log('🔄 Starting simple migration from V1 to V2...');

  try {
    // Load V1 cache
    if (!fs.existsSync(CACHE_V1_FILE)) {
      console.error('❌ V1 cache file not found:', CACHE_V1_FILE);
      return;
    }

    const v1Data = fs.readFileSync(CACHE_V1_FILE, 'utf8');
    const v1Cache = JSON.parse(v1Data);
    console.log(`📊 Loaded V1 cache: ${v1Cache.totalTransactions} transactions`);

    const nowUTC = new Date();
    const todayKey = toUTCDateKey(nowUTC);

    // Build V2 structure
    const v2Cache = {
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

    // Process hourly data
    Object.keys(v1Cache.recentHourly || {}).forEach(dateKey => {
      const hourlyData = v1Cache.recentHourly[dateKey];
      v2Cache.recentHourly[dateKey] = ensure24(hourlyData);
    });

    // Compute daily status
    Object.keys(v2Cache.dailyTotals).forEach(dateKey => {
      const total = v2Cache.dailyTotals[dateKey];
      const hourly = v2Cache.recentHourly[dateKey];
      v2Cache.dailyStatus[dateKey] = recomputeDayStatus(dateKey, total, hourly, todayKey);
    });

    // Mark 08/08 as partial (known issue)
    if (v2Cache.dailyStatus['2025-08-08']) {
      v2Cache.dailyStatus['2025-08-08'] = 'partial';
      console.log('⚠️ Marked 2025-08-08 as partial (known incomplete data)');
    }

    // Generate integrity hash
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify({ 
        dailyTotals: v2Cache.dailyTotals, 
        monthlyTotals: v2Cache.monthlyTotals, 
        cursor: v2Cache.cursor 
      }))
      .digest('hex');
    v2Cache.integrity = `sha256:${contentHash}`;

    // Save V2 cache
    const dir = path.dirname(CACHE_V2_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(CACHE_V2_FILE, JSON.stringify(v2Cache, null, 2));
    console.log(`💾 V2 cache saved to: ${CACHE_V2_FILE}`);

    // Report status summary
    console.log('\n📊 Migration Summary:');
    console.log(`  Total Transactions: ${v2Cache.totalTransactions}`);
    console.log(`  Total Days: ${Object.keys(v2Cache.dailyTotals).length}`);
    
    const statusCounts = Object.values(v2Cache.dailyStatus).reduce((acc, status) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('  Day Status Summary:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`    ${status}: ${count} days`);
    });

    const partialDays = Object.entries(v2Cache.dailyStatus)
      .filter(([_, status]) => status === 'partial')
      .map(([date, _]) => date);
    
    if (partialDays.length > 0) {
      console.log(`  Partial Days (need fixing): ${partialDays.join(', ')}`);
    }

    console.log('\n✅ Migration to V2 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

simpleMigrate();