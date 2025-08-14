const fs = require('fs');
const path = require('path');

const CACHE_V2_FILE = path.join(__dirname, 'src/data/contract-cache-v2.json');

function optimizeCache() {
  console.log('🔧 Optimizing cache for production...');
  
  // Load cache
  const cache = JSON.parse(fs.readFileSync(CACHE_V2_FILE, 'utf8'));
  
  console.log(`📊 Current cache size: ${JSON.stringify(cache).length} chars`);
  console.log(`📅 Days: ${Object.keys(cache.dailyTotals || {}).length}`);
  console.log(`📈 Total transactions: ${cache.totalTransactions || 0}`);
  
  // Remove heavy transaction details but keep summaries
  if (cache.transactionDetails) {
    console.log('🗑️ Removing heavy transaction details...');
    
    // Keep only essential data - remove full transaction details
    const lightTransactionDetails = {};
    Object.keys(cache.transactionDetails).forEach(dayKey => {
      const txs = cache.transactionDetails[dayKey];
      // Keep only count and latest block for each day
      lightTransactionDetails[dayKey] = {
        count: txs.length,
        latestBlock: Math.max(...txs.map(tx => tx.block || 0)),
        latestTimestamp: txs[txs.length - 1]?.timestamp || ''
      };
    });
    
    cache.transactionDetails = lightTransactionDetails;
  }
  
  // Ensure all required fields exist
  if (!cache.dailyTotals) cache.dailyTotals = {};
  if (!cache.recentHourly) cache.recentHourly = {};
  if (!cache.dailyStatus) cache.dailyStatus = {};
  if (!cache.cursor) cache.cursor = { lastBlockNumber: 0, lastTransactionHash: '', lastProcessedTime: '' };
  
  // Update metadata
  cache.totalTransactions = Object.values(cache.dailyTotals).reduce((a, b) => a + b, 0);
  cache.totalDaysActive = Object.keys(cache.dailyTotals).length;
  cache.lastUpdate = new Date().toISOString();
  cache.generatedAtUTC = new Date().toISOString();
  
  // Save optimized cache
  fs.writeFileSync(CACHE_V2_FILE, JSON.stringify(cache, null, 2));
  
  console.log(`✅ Optimized cache size: ${JSON.stringify(cache).length} chars`);
  console.log(`📊 Final stats: ${cache.totalTransactions} total transactions, ${cache.totalDaysActive} active days`);
  console.log('💾 Cache optimized successfully!');
}

optimizeCache();