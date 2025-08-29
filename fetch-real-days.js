const fs = require('fs');
const path = require('path');

async function fetchDayTransactions(targetDate) {
  console.log(`📅 Fetching ${targetDate}...`);
  
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const API_BASE = 'https://blockscout.lisk.com/api/v2';
  
  let dayCount = 0;
  let nextPageParams = null;
  let pageCount = 0;
  let foundOlderDate = false;
  
  while (!foundOlderDate && pageCount < 200) {
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
        console.log(`   ❌ API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) break;
      
      // Count transactions for target date
      for (const tx of data.items) {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        
        if (txDate === targetDate) {
          dayCount++;
        } else if (txDate < targetDate) {
          foundOlderDate = true;
          break;
        }
      }
      
      // Progress indicator
      if (pageCount % 20 === 0) {
        console.log(`   📄 Processed ${pageCount} pages, found ${dayCount} txs so far...`);
      }
      
      // Check if we should continue
      if (foundOlderDate || !data.next_page_params) {
        break;
      }
      
      nextPageParams = data.next_page_params;
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      break;
    }
  }
  
  console.log(`   ✅ ${targetDate}: ${dayCount} transactions found`);
  return dayCount;
}

async function main() {
  const daysToFetch = ['2025-08-24', '2025-08-25', '2025-08-26', '2025-08-27'];
  const results = {};
  
  console.log('🚀 Fetching real transaction counts for missing days...\n');
  
  for (const day of daysToFetch) {
    results[day] = await fetchDayTransactions(day);
    console.log('');
  }
  
  // Update cache
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  
  // Update daily totals with real data
  for (const [date, count] of Object.entries(results)) {
    cache.dailyTotals[date] = count;
    cache.dailyStatus[date] = count > 0 ? 'complete' : 'no_activity';
  }
  
  // Recalculate monthly total
  const augustTotal = Object.entries(cache.dailyTotals)
    .filter(([date]) => date.startsWith('2025-08'))
    .reduce((sum, [, count]) => sum + count, 0);
  
  cache.monthlyTotals['2025-08'] = augustTotal;
  
  // Recalculate daily average (excluding first day)
  const completeDays = Object.entries(cache.dailyTotals)
    .filter(([date, count]) => {
      const status = cache.dailyStatus[date];
      return status === 'complete' && count > 0;
    });
  
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
  
  console.log('\n📊 Summary:');
  console.log('Days updated:', Object.keys(results).join(', '));
  console.log('Total transactions added:', Object.values(results).reduce((a, b) => a + b, 0));
  console.log('New monthly total:', cache.monthlyTotals['2025-08']);
  console.log('New daily average:', cache.dailyAverage);
  console.log('\n✅ Cache updated successfully!');
}

main().catch(console.error);