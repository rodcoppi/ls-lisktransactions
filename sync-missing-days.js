const fs = require('fs');
const path = require('path');

async function syncDay(targetDate) {
  console.log(`📅 Syncing: ${targetDate}`);
  
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const API_BASE = 'https://blockscout.lisk.com/api/v2';
  
  try {
    let allTransactions = [];
    let nextPageParams = null;
    let pageCount = 0;
    
    // Fetch transactions for the target date
    while (pageCount < 100) {
      pageCount++;
      
      let url = `${API_BASE}/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`;
      if (nextPageParams) {
        const params = new URLSearchParams(nextPageParams);
        url += '&' + params.toString();
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`   ❌ API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) break;
      
      // Filter transactions for target date
      const dayTxs = data.items.filter(tx => {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        return txDate === targetDate;
      });
      
      if (dayTxs.length > 0) {
        allTransactions.push(...dayTxs);
        console.log(`   📦 Page ${pageCount}: Found ${dayTxs.length} txs (total: ${allTransactions.length})`);
      }
      
      // Check if we should continue
      const oldestTx = data.items[data.items.length - 1];
      const oldestDate = new Date(oldestTx.timestamp).toISOString().split('T')[0];
      
      if (oldestDate < targetDate) {
        console.log(`   ✅ Reached older dates, stopping`);
        break;
      }
      
      // Get next page params
      if (data.next_page_params) {
        nextPageParams = data.next_page_params;
      } else {
        break;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return allTransactions.length;
    
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return 0;
  }
}

async function updateCache(dayData) {
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    // Update daily totals
    for (const [date, count] of Object.entries(dayData)) {
      cache.dailyTotals[date] = count;
      cache.dailyStatus[date] = count > 0 ? 'complete' : 'no_data';
    }
    
    // Sort dates
    const sortedDates = Object.keys(cache.dailyTotals).sort();
    const sortedTotals = {};
    const sortedStatus = {};
    
    for (const date of sortedDates) {
      sortedTotals[date] = cache.dailyTotals[date];
      sortedStatus[date] = cache.dailyStatus[date];
    }
    
    cache.dailyTotals = sortedTotals;
    cache.dailyStatus = sortedStatus;
    
    // Update metadata
    cache.lastUpdate = new Date().toISOString();
    
    // Write back
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log('✅ Cache updated successfully');
    
  } catch (error) {
    console.error('❌ Failed to update cache:', error.message);
  }
}

async function fetchRealTotal() {
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const url = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/counters`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.transactions_count || 0;
  } catch (error) {
    console.error('❌ Failed to fetch real total:', error.message);
    return 0;
  }
}

async function main() {
  const daysToSync = ['2025-08-24', '2025-08-25', '2025-08-26', '2025-08-27'];
  const results = {};
  
  console.log('🚀 Starting sync for missing days...\n');
  
  for (const day of daysToSync) {
    const count = await syncDay(day);
    results[day] = count;
    console.log(`   💾 ${day}: ${count} transactions\n`);
  }
  
  console.log('\n📊 Summary:');
  for (const [date, count] of Object.entries(results)) {
    console.log(`   ${date}: ${count} txs`);
  }
  
  // Update cache
  await updateCache(results);
  
  // Fetch and update real total
  console.log('\n🔗 Fetching real blockchain total...');
  const realTotal = await fetchRealTotal();
  
  if (realTotal > 0) {
    const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    cache.totalTransactions = realTotal;
    
    // Calculate daily average (excluding first day)
    const dates = Object.keys(cache.dailyTotals).filter(d => cache.dailyStatus[d] === 'complete');
    if (dates.length > 1) {
      const totalExcludingFirst = Object.entries(cache.dailyTotals)
        .filter(([date]) => date !== dates[0] && cache.dailyStatus[date] === 'complete')
        .reduce((sum, [, count]) => sum + count, 0);
      
      cache.dailyAverage = Math.round(totalExcludingFirst / (dates.length - 1));
    }
    
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    console.log(`   ✅ Total transactions: ${realTotal}`);
    console.log(`   ✅ Daily average: ${cache.dailyAverage}`);
  }
  
  console.log('\n✨ Sync complete!');
}

main().catch(console.error);