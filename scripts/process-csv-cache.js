const fs = require('fs');
const path = require('path');

// Parse CSV data from complete transaction export
function processCsvToCache() {
  console.log('🔄 Processing all CSV files to update cache...');
  
  const csvFiles = ['tx1.csv', 'tx2.csv', 'tx3.csv', 'tx4.csv']; // tx1=05/08, tx2=06/08, tx3=07/08, tx4=08/08
  const cacheFile = path.join(process.cwd(), 'src/data/contract-cache.json');
  
  let allTransactions = [];
  
  // Process each CSV file
  csvFiles.forEach(fileName => {
    const csvPath = path.join(process.cwd(), fileName);
    
    if (!fs.existsSync(csvPath)) {
      console.log(`⚠️ CSV file not found: ${fileName}, skipping...`);
      return;
    }
    
    console.log(`📄 Processing ${fileName}...`);
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');
    const transactions = lines.slice(1).filter(line => line.trim()); // Skip header
    
    console.log(`   Found ${transactions.length} transactions in ${fileName}`);
    allTransactions.push(...transactions);
  });
  
  const transactions = allTransactions;
  
  console.log(`📊 Processing ${transactions.length} transactions from CSV...`);
  
  // Initialize data structures
  const dailyTotals = {};
  const monthlyTotals = {};
  const recentHourly = {};
  
  let maxBlock = 0;
  let totalTransactions = 0;
  const daysWithTxs = new Set();
  
  // Process each transaction
  transactions.forEach(line => {
    const parts = line.split(',');
    if (parts.length < 3) return;
    
    const blockNumber = parseInt(parts[1]);
    const timestamp = parts[2]; // Format: "2025-08-08 20:53:33.000000Z"
    
    if (!timestamp || !blockNumber) return;
    
    // Parse timestamp (already in UTC format)
    const txDate = new Date(timestamp);
    const dayKey = txDate.toISOString().split('T')[0];
    const monthKey = txDate.getFullYear() + '-' + String(txDate.getMonth() + 1).padStart(2, '0');
    const hour = txDate.getUTCHours();
    
    // Count daily and monthly totals
    dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + 1;
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + 1;
    daysWithTxs.add(dayKey);
    
    // Initialize hourly arrays for this day if needed
    if (!recentHourly[dayKey]) {
      recentHourly[dayKey] = new Array(24).fill(0);
    }
    
    // Count hourly data
    recentHourly[dayKey][hour]++;
    
    // Track max block
    if (blockNumber > maxBlock) {
      maxBlock = blockNumber;
    }
    
    totalTransactions++;
  });
  
  // Create cache structure
  const cacheData = {
    dailyTotals,
    monthlyTotals,
    recentHourly,
    lastUpdate: new Date().toISOString(),
    lastBlockNumber: maxBlock,
    totalTransactions,
    totalDaysActive: daysWithTxs.size
  };
  
  // Save to cache file
  fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
  
  console.log('✅ Cache updated successfully:');
  console.log(`   Total transactions: ${totalTransactions}`);
  console.log(`   Days with activity: ${daysWithTxs.size}`);
  console.log(`   Date range: ${Math.min(...Object.keys(dailyTotals))} to ${Math.max(...Object.keys(dailyTotals))}`);
  console.log(`   Max block: ${maxBlock}`);
  
  // Display some key statistics
  console.log('\n📈 Daily totals (last 5 days):');
  const sortedDays = Object.keys(dailyTotals).sort().reverse().slice(0, 5);
  sortedDays.forEach(day => {
    const hourlySum = recentHourly[day] ? recentHourly[day].reduce((sum, count) => sum + count, 0) : 0;
    const dailyTotal = dailyTotals[day];
    const match = hourlySum === dailyTotal ? '✅' : '⚠️';
    console.log(`   ${day}: ${dailyTotal} txs (hourly sum: ${hourlySum}) ${match}`);
  });
  
  return cacheData;
}

// Run the processing
processCsvToCache();