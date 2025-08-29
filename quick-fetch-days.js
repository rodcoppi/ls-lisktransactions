const fs = require('fs');
const path = require('path');

async function quickFetchDays() {
  console.log('🚀 Quick fetching transaction counts...\n');
  
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const API_BASE = 'https://blockscout.lisk.com/api/v2';
  
  const targetDays = ['2025-08-24', '2025-08-25', '2025-08-26', '2025-08-27', '2025-08-28'];
  const dayCounts = {};
  targetDays.forEach(d => dayCounts[d] = 0);
  
  let nextPageParams = null;
  let pageCount = 0;
  let oldestDate = null;
  let continueSearch = true;
  
  while (continueSearch && pageCount < 300) {
    pageCount++;
    
    // Build URL
    let url = `${API_BASE}/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`;
    if (nextPageParams) {
      const params = new URLSearchParams(nextPageParams);
      url += '&' + params.toString();
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.log(`❌ API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) break;
      
      // Process transactions
      for (const tx of data.items) {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        
        if (dayCounts.hasOwnProperty(txDate)) {
          dayCounts[txDate]++;
        }
        
        oldestDate = txDate;
      }
      
      // Progress indicator
      if (pageCount % 30 === 0) {
        console.log(`📄 Processed ${pageCount} pages...`);
        console.log(`   Current oldest date: ${oldestDate}`);
        console.log(`   Counts so far:`, dayCounts);
      }
      
      // Check if we've gone past our target dates
      if (oldestDate && oldestDate < '2025-08-24') {
        console.log(`\n✅ Reached ${oldestDate}, stopping search.`);
        continueSearch = false;
        break;
      }
      
      // Get next page
      if (!data.next_page_params) {
        console.log('\n✅ No more pages available.');
        break;
      }
      
      nextPageParams = data.next_page_params;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 30));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n📊 Final counts after ${pageCount} pages:`);
  for (const [date, count] of Object.entries(dayCounts)) {
    console.log(`   ${date}: ${count} transactions`);
  }
  
  // Update cache
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  
  // Update daily totals
  for (const [date, count] of Object.entries(dayCounts)) {
    if (date <= '2025-08-27') { // Only update up to day 27 as requested
      cache.dailyTotals[date] = count;
      cache.dailyStatus[date] = count > 0 ? 'complete' : 'no_activity';
    }
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
  
  // Recalculate monthly total
  const augustTotal = Object.entries(cache.dailyTotals)
    .filter(([date]) => date.startsWith('2025-08'))
    .reduce((sum, [, count]) => sum + count, 0);
  
  cache.monthlyTotals['2025-08'] = augustTotal;
  
  // Recalculate daily average (excluding first day)
  const completeDays = Object.entries(cache.dailyTotals)
    .filter(([date, count]) => cache.dailyStatus[date] === 'complete' && count > 0)
    .sort();
  
  if (completeDays.length > 1) {
    const totalExcludingFirst = completeDays
      .slice(1)
      .reduce((sum, [, count]) => sum + count, 0);
    
    cache.dailyAverage = Math.round(totalExcludingFirst / (completeDays.length - 1));
  }
  
  // Update metadata
  cache.lastUpdate = new Date().toISOString();
  
  // Write updated cache
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  
  console.log('\n✅ Cache updated successfully!');
  console.log(`📊 New monthly total: ${cache.monthlyTotals['2025-08']}`);
  console.log(`📈 New daily average: ${cache.dailyAverage}`);
  
  // Note about day 28
  if (dayCounts['2025-08-28'] > 0) {
    console.log(`\n💡 Note: Day 28 has ${dayCounts['2025-08-28']} transactions but was not included (as requested, only up to day 27)`);
  }
}

quickFetchDays().catch(console.error);