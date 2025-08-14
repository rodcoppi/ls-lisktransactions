const fs = require('fs');
const path = require('path');

const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const CACHE_V2_FILE = path.join(__dirname, 'src/data/contract-cache-v2.json');

// Parse CSV simple
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

// Convert CSV to Transaction
function csvToTransaction(csv, index) {
  // Try different timestamp fields
  let dateStr = csv.DateTime || csv.Datetime || csv.timestamp || csv.UnixTimestamp;
  if (!dateStr) {
    console.warn(`No timestamp found for transaction ${index}:`, csv);
    dateStr = new Date().toISOString();
  }
  
  // Parse timestamp - handle different formats
  let timestamp;
  try {
    if (dateStr.includes('Z') || dateStr.includes('T')) {
      timestamp = new Date(dateStr).toISOString();
    } else if (dateStr.includes(' ')) {
      // Format like "2025-08-11 20:59:35.000000Z"
      timestamp = new Date(dateStr.replace(' ', 'T')).toISOString();
    } else {
      timestamp = new Date(dateStr).toISOString();
    }
  } catch (e) {
    console.warn(`Invalid timestamp "${dateStr}" for transaction ${index}, using current time`);
    timestamp = new Date().toISOString();
  }
  
  const dayKey = timestamp.substring(0, 10);
  
  return {
    hash: csv.Txhash || csv.TxHash || csv.hash || `csv-${index}`,
    block: parseInt(csv.BlockNumber || csv.Block || csv.block) || 0,
    timestamp,
    dayKey,
    from: csv.FromAddress || csv.From || csv.from || '',
    to: csv.ToAddress || csv.To || csv.to || '',
    value: csv.Value || csv.value || '0',
    gasPrice: csv.GasPrice || csv.gasPrice || '0',
    gasUsed: csv.GasUsed || csv.gasUsed || '0',
    status: csv.Status || csv.status || 'ok',
    method: csv.Method || csv.method || '',
    txIndex: index
  };
}

function toUTCDateKey(date) {
  return date.toISOString().substring(0, 10);
}

function addUTCDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function recomputeDayStatus(dayKey, dailyTotal, hourlyData, todayKey) {
  if (dayKey === todayKey) return 'current';
  return dailyTotal > 0 ? 'complete' : 'empty';
}

async function main() {
  console.log('🚀 Starting CSV import...');
  
  // Find all dia*.csv files
  const allFiles = fs.readdirSync(__dirname);
  const csvFiles = allFiles.filter(file => file.match(/^dia\d+/i) && file.endsWith('.csv'));
  
  console.log(`📂 Found ${csvFiles.length} CSV files:`, csvFiles);
  
  if (csvFiles.length === 0) {
    console.log('❌ No dia*.csv files found');
    return;
  }
  
  const allTransactions = [];
  const importResults = { total: 0 };
  
  // Process each CSV
  for (const csvFile of csvFiles) {
    const csvPath = path.join(__dirname, csvFile);
    console.log(`📄 Reading ${csvFile}...`);
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvData = parseCSV(csvContent);
    const validTxs = csvData
      .filter(csv => csv.ToAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
      .filter(csv => csv.Status === 'ok')
      .map((csv, index) => csvToTransaction(csv, index));
    
    console.log(`✅ ${csvFile}: ${validTxs.length} valid transactions`);
    importResults[csvFile] = validTxs.length;
    allTransactions.push(...validTxs);
  }
  
  if (allTransactions.length === 0) {
    console.log('❌ No valid transactions found');
    return;
  }
  
  importResults.total = allTransactions.length;
  console.log(`📊 Processing ${allTransactions.length} total transactions...`);
  
  // Sort transactions
  allTransactions.sort((a, b) => a.block - b.block || a.timestamp.localeCompare(b.timestamp));
  
  // Load existing cache
  let cache;
  if (fs.existsSync(CACHE_V2_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_V2_FILE, 'utf8'));
    console.log('📖 Loaded existing cache');
    
    // Ensure all required fields exist
    if (!cache.transactionDetails) cache.transactionDetails = {};
    if (!cache.recentHourly) cache.recentHourly = {};
    if (!cache.dailyStatus) cache.dailyStatus = {};
    if (!cache.cursor) cache.cursor = { lastBlockNumber: 0, lastTransactionHash: '', lastProcessedTime: '' };
  } else {
    console.log('🆕 Creating new cache');
    cache = {
      dailyTotals: {},
      recentHourly: {},
      dailyStatus: {},
      transactionDetails: {},
      cursor: { lastBlockNumber: 0, lastTransactionHash: '', lastProcessedTime: '' },
      totalTransactions: 0,
      totalDaysActive: 0,
      lastUpdate: '',
      generatedAtUTC: ''
    };
  }
  
  // Process transactions by day
  const processedDays = new Set();
  const dailyTotals = {};
  
  allTransactions.forEach(tx => {
    const dayKey = tx.dayKey;
    processedDays.add(dayKey);
    
    // Initialize day data
    if (!cache.dailyTotals[dayKey]) cache.dailyTotals[dayKey] = 0;
    if (!cache.recentHourly[dayKey]) cache.recentHourly[dayKey] = {};
    if (!cache.transactionDetails[dayKey]) cache.transactionDetails[dayKey] = [];
    
    // Add transaction
    cache.dailyTotals[dayKey]++;
    cache.transactionDetails[dayKey].push(tx);
    
    // Update hourly (simplified)
    const hour = new Date(tx.timestamp).getUTCHours().toString();
    if (!cache.recentHourly[dayKey]) cache.recentHourly[dayKey] = {};
    if (!cache.recentHourly[dayKey][hour]) cache.recentHourly[dayKey][hour] = 0;
    cache.recentHourly[dayKey][hour]++;
    
    // Update cursor if newer
    if (tx.block > cache.cursor.lastBlockNumber) {
      cache.cursor.lastBlockNumber = tx.block;
      cache.cursor.lastTransactionHash = tx.hash;
      cache.cursor.lastProcessedTime = tx.timestamp;
    }
  });
  
  // Update daily status
  const nowUTC = new Date();
  const todayKey = toUTCDateKey(nowUTC);
  
  processedDays.forEach(dayKey => {
    const total = cache.dailyTotals[dayKey] || 0;
    const hourly = cache.recentHourly[dayKey] || {};
    cache.dailyStatus[dayKey] = recomputeDayStatus(dayKey, total, hourly, todayKey);
    
    dailyTotals[dayKey] = total;
  });
  
  // Update metadata
  cache.totalTransactions = Object.values(cache.dailyTotals).reduce((a, b) => a + b, 0);
  cache.totalDaysActive = Object.keys(cache.dailyTotals).length;
  cache.lastUpdate = new Date().toISOString();
  cache.generatedAtUTC = new Date().toISOString();
  
  // Save updated cache
  fs.writeFileSync(CACHE_V2_FILE, JSON.stringify(cache, null, 2));
  
  console.log('💾 Cache updated successfully!');
  console.log(`📊 Final stats: ${cache.totalTransactions} total transactions, ${cache.totalDaysActive} active days`);
  console.log('📋 Import Results:', importResults);
  console.log('📅 Daily Totals:', dailyTotals);
  
  console.log('✅ CSV import completed!');
}

main().catch(console.error);