const fs = require('fs');
const path = require('path');

async function fetchDay28Complete() {
  console.log('🚀 Fetching complete data for August 28, 2025...\n');
  
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const API_BASE = 'https://blockscout.lisk.com/api/v2';
  const targetDate = '2025-08-28';
  
  let transactions = [];
  let nextPageParams = null;
  let pageCount = 0;
  let foundOlderDate = false;
  
  // Fetch all transactions for day 28
  while (!foundOlderDate && pageCount < 300) {
    pageCount++;
    
    let url = `${API_BASE}/addresses/${CONTRACT_ADDRESS}/transactions?filter=to`;
    if (nextPageParams) {
      const params = new URLSearchParams(nextPageParams);
      url += '&' + params.toString();
    }
    
    try {
      const response = await fetch(url);
      if (!response.ok) break;
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) break;
      
      // Filter transactions for target date
      for (const tx of data.items) {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        
        if (txDate === targetDate) {
          transactions.push(tx);
        } else if (txDate < targetDate) {
          foundOlderDate = true;
          break;
        }
      }
      
      // Progress
      if (pageCount % 30 === 0) {
        console.log(`📄 Processed ${pageCount} pages, found ${transactions.length} txs so far...`);
      }
      
      if (foundOlderDate || !data.next_page_params) break;
      
      nextPageParams = data.next_page_params;
      await new Promise(resolve => setTimeout(resolve, 30));
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      break;
    }
  }
  
  console.log(`\n✅ Found ${transactions.length} transactions for ${targetDate}`);
  
  // Calculate hourly distribution
  const hourlyData = new Array(24).fill(0);
  
  transactions.forEach(tx => {
    const hour = new Date(tx.timestamp).getUTCHours();
    hourlyData[hour]++;
  });
  
  console.log('\n📊 Hourly distribution:');
  hourlyData.forEach((count, hour) => {
    if (count > 0) {
      console.log(`   Hour ${hour.toString().padStart(2, '0')}:00 - ${count} txs`);
    }
  });
  
  // Update cache
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  
  // Add day 28 data
  cache.dailyTotals['2025-08-28'] = transactions.length;
  cache.dailyStatus['2025-08-28'] = transactions.length > 0 ? 'complete' : 'no_activity';
  
  // Add hourly data for day 28
  if (!cache.recentHourly) {
    cache.recentHourly = {};
  }
  cache.recentHourly['2025-08-28'] = hourlyData;
  
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
  
  // Update monthly total
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
  
  // Fetch real total from blockchain
  console.log('\n🔗 Fetching real blockchain total...');
  try {
    const countersResponse = await fetch(`${API_BASE}/addresses/${CONTRACT_ADDRESS}/counters`);
    if (countersResponse.ok) {
      const countersData = await countersResponse.json();
      cache.totalTransactions = parseInt(countersData.transactions_count) || 0;
      console.log(`   ✅ Total transactions: ${cache.totalTransactions}`);
    }
  } catch (error) {
    console.log('   ⚠️ Could not fetch blockchain total');
  }
  
  // Update metadata
  cache.lastUpdate = new Date().toISOString();
  cache.generatedAtUTC = new Date().toISOString();
  
  // Write updated cache
  fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  
  console.log('\n✅ Cache updated successfully!');
  console.log(`📊 Day 28: ${transactions.length} transactions`);
  console.log(`📊 New monthly total: ${cache.monthlyTotals['2025-08']}`);
  console.log(`📈 New daily average: ${cache.dailyAverage}`);
  console.log(`🔢 Total blockchain transactions: ${cache.totalTransactions}`);
}

fetchDay28Complete().catch(console.error);