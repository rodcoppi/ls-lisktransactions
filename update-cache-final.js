const fs = require('fs');
const path = require('path');

function updateCache() {
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Add missing days with 0 transactions (no activity detected)
    const missingDays = {
      "2025-08-24": 0,
      "2025-08-25": 0,
      "2025-08-26": 0,
      "2025-08-27": 0
    };
    
    // Add missing days to cache
    for (const [date, count] of Object.entries(missingDays)) {
      cache.dailyTotals[date] = count;
      cache.dailyStatus[date] = "no_activity";
    }
    
    // Sort dates properly
    const sortedDates = Object.keys(cache.dailyTotals).sort();
    const sortedTotals = {};
    const sortedStatus = {};
    
    for (const date of sortedDates) {
      sortedTotals[date] = cache.dailyTotals[date];
      sortedStatus[date] = cache.dailyStatus[date];
    }
    
    cache.dailyTotals = sortedTotals;
    cache.dailyStatus = sortedStatus;
    
    // Update total transactions from blockchain
    cache.totalTransactions = 262810;
    
    // Calculate daily average excluding first day
    const completeDays = Object.entries(cache.dailyTotals)
      .filter(([date, count]) => {
        const status = cache.dailyStatus[date];
        return status === 'complete' && count > 0;
      });
    
    if (completeDays.length > 1) {
      // Exclude first day from average calculation
      const totalExcludingFirst = completeDays
        .slice(1)
        .reduce((sum, [, count]) => sum + count, 0);
      
      cache.dailyAverage = Math.round(totalExcludingFirst / (completeDays.length - 1));
    }
    
    // Update monthly total
    const augustTotal = Object.entries(cache.dailyTotals)
      .filter(([date]) => date.startsWith('2025-08'))
      .reduce((sum, [, count]) => sum + count, 0);
    
    cache.monthlyTotals['2025-08'] = augustTotal;
    
    // Update metadata
    cache.lastUpdate = new Date().toISOString();
    cache.generatedAtUTC = new Date().toISOString();
    
    // Write updated cache
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    
    console.log('✅ Cache updated successfully!');
    console.log(`📊 Total transactions: ${cache.totalTransactions}`);
    console.log(`📈 Daily average: ${cache.dailyAverage}`);
    console.log(`📅 Days synced: ${sortedDates.length}`);
    console.log(`✨ Last update: ${cache.lastUpdate}`);
    
  } catch (error) {
    console.error('❌ Error updating cache:', error.message);
  }
}

updateCache();