import fs from 'fs';
import path from 'path';
import type { OptimizedCacheV2, Transaction } from '../lib/types';
import { toUTCDateKey, addUTCDays } from '../lib/types';
import { recomputeDayStatus } from '../lib/logic';

interface CSVTransaction {
  TxHash: string;
  BlockNumber: string;
  UnixTimestamp: string;
  FromAddress: string;
  ToAddress: string;
  ContractAddress: string;
  Type: string;
  Value: string;
  Fee: string;
  Status: string;
  ErrCode: string;
  CurrentPrice: string;
  TxDateOpeningPrice: string;
  TxDateClosingPrice: string;
  MethodName: string;
}

const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const CACHE_V2_FILE = path.join(process.cwd(), 'src/data/contract-cache-v2.json');

function parseCSV(content: string): CSVTransaction[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  
  return lines.slice(1).map(line => {
    const values = line.split(',');
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    return row as CSVTransaction;
  });
}

function csvToTransaction(csv: CSVTransaction, index: number): Transaction {
  return {
    hash: csv.TxHash,
    timestamp: csv.UnixTimestamp,
    block: parseInt(csv.BlockNumber),
    method: csv.MethodName || 'unknown',
    gas_used: '0', // Not in CSV
    fee: { value: csv.Fee },
    to: csv.ToAddress,
    status: csv.Status === 'ok' ? true : false,
    txIndex: index
  };
}

function buildCacheFromTransactions(transactions: Transaction[]): OptimizedCacheV2 {
  const nowUTC = new Date();
  const todayKey = toUTCDateKey(nowUTC);
  
  const dailyTotals: Record<string, number> = {};
  const monthlyTotals: Record<string, number> = {};
  const recentHourly: Record<string, number[]> = {};
  const dailyStatus: Record<string, 'complete' | 'partial' | 'unknown'> = {};
  const hourlyData: Record<string, Record<number, number>> = {};
  
  console.log(`📊 Processing ${transactions.length} transactions from CSV...`);
  
  // Initialize hourly arrays for all days we'll encounter
  const allDays = new Set<string>();
  transactions.forEach(tx => {
    const txDate = new Date(tx.timestamp);
    const dayKey = toUTCDateKey(txDate);
    allDays.add(dayKey);
  });
  
  allDays.forEach(dayKey => {
    recentHourly[dayKey] = new Array(24).fill(0);
    hourlyData[dayKey] = {};
  });

  // Process all transactions
  transactions.forEach(tx => {
    const txDate = new Date(tx.timestamp);
    const dayKey = toUTCDateKey(txDate);
    const monthKey = `${txDate.getUTCFullYear()}-${String(txDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const hour = txDate.getUTCHours();

    // Count daily and monthly totals
    dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + 1;
    monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + 1;

    // Add to hourly data
    recentHourly[dayKey][hour]++;
    hourlyData[dayKey][hour] = (hourlyData[dayKey][hour] || 0) + 1;
  });

  // Compute day status for all days with data
  Object.keys(dailyTotals).forEach(dayKey => {
    const total = dailyTotals[dayKey];
    const hourly = recentHourly[dayKey];
    dailyStatus[dayKey] = recomputeDayStatus(dayKey, total, hourly, todayKey);
  });

  // Find cursor (latest transaction)
  const sortedTxs = transactions.sort((a, b) => 
    b.block - a.block || (b.txIndex || 0) - (a.txIndex || 0) || b.hash.localeCompare(a.hash)
  );
  
  const cursor = sortedTxs.length > 0 
    ? {
        lastBlockNumber: sortedTxs[0].block,
        lastTxIndex: sortedTxs[0].txIndex || 0,
        lastTxHash: sortedTxs[0].hash
      }
    : {
        lastBlockNumber: 0,
        lastTxIndex: 0,
        lastTxHash: ''
      };

  console.log(`📈 CSV Processing Results:`);
  console.log(`   Days processed: ${Object.keys(dailyTotals).length}`);
  console.log(`   Daily totals:`, Object.keys(dailyTotals).sort().map(k => `${k}: ${dailyTotals[k]}`));
  console.log(`   Latest cursor: Block ${cursor.lastBlockNumber}, Tx ${cursor.lastTxHash.substring(0, 10)}...`);

  return {
    schemaVersion: '1.2.0',
    generatedAtUTC: nowUTC.toISOString(),
    source: 'csv-data-import',
    integrity: `sha256:csv-import-${Date.now()}`,
    dailyTotals,
    dailyStatus,
    monthlyTotals,
    recentHourly,
    hourlyData,
    cursor,
    lastUpdate: nowUTC.toISOString(),
    totalTransactions: transactions.length,
    totalDaysActive: Object.keys(dailyTotals).length
  };
}

async function updateFromCSVs() {
  try {
    console.log('🚀 Starting CSV import process...');
    
    // Read CSV files
    const dia12Path = path.join(process.cwd(), 'dia12.csv');
    const dia13Path = path.join(process.cwd(), 'dia13.csv');
    
    const allTransactions: Transaction[] = [];
    
    if (fs.existsSync(dia12Path)) {
      console.log('📄 Reading dia12.csv...');
      const dia12Content = fs.readFileSync(dia12Path, 'utf8');
      const dia12Data = parseCSV(dia12Content);
      const dia12Txs = dia12Data
        .filter(csv => csv.ToAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
        .filter(csv => csv.Status === 'ok')
        .map((csv, index) => csvToTransaction(csv, index));
      
      console.log(`✅ Dia 12: ${dia12Txs.length} valid transactions`);
      allTransactions.push(...dia12Txs);
    }
    
    if (fs.existsSync(dia13Path)) {
      console.log('📄 Reading dia13.csv...');
      const dia13Content = fs.readFileSync(dia13Path, 'utf8');
      const dia13Data = parseCSV(dia13Content);
      const dia13Txs = dia13Data
        .filter(csv => csv.ToAddress?.toLowerCase() === CONTRACT_ADDRESS.toLowerCase())
        .filter(csv => csv.Status === 'ok')
        .map((csv, index) => csvToTransaction(csv, index));
      
      console.log(`✅ Dia 13: ${dia13Txs.length} valid transactions`);
      allTransactions.push(...dia13Txs);
    }
    
    if (allTransactions.length === 0) {
      console.log('❌ No transactions found in CSVs');
      return;
    }
    
    // Sort transactions by block and timestamp
    allTransactions.sort((a, b) => a.block - b.block || a.timestamp.localeCompare(b.timestamp));
    
    console.log(`📊 Total transactions to process: ${allTransactions.length}`);
    
    // Build new cache from CSV data
    let newCache = buildCacheFromTransactions(allTransactions);
    
    // Load existing cache and merge if possible
    let existingCache: OptimizedCacheV2 | null = null;
    if (fs.existsSync(CACHE_V2_FILE)) {
      try {
        const existingData = fs.readFileSync(CACHE_V2_FILE, 'utf8');
        existingCache = JSON.parse(existingData);
        console.log('📦 Existing cache found, will merge data');
      } catch (error) {
        console.log('⚠️ Could not read existing cache, creating new one');
      }
    }
    
    // Merge with existing cache if available
    if (existingCache) {
      // Merge daily totals
      Object.keys(newCache.dailyTotals).forEach(dayKey => {
        existingCache!.dailyTotals[dayKey] = newCache.dailyTotals[dayKey];
        existingCache!.dailyStatus[dayKey] = newCache.dailyStatus[dayKey];
        existingCache!.recentHourly[dayKey] = newCache.recentHourly[dayKey];
        if (newCache.hourlyData && newCache.hourlyData[dayKey]) {
          if (!existingCache!.hourlyData) existingCache!.hourlyData = {};
          existingCache!.hourlyData[dayKey] = newCache.hourlyData[dayKey];
        }
      });
      
      // Update cursor if newer
      if (newCache.cursor.lastBlockNumber > existingCache.cursor.lastBlockNumber) {
        existingCache.cursor = newCache.cursor;
      }
      
      // Update metadata
      const now = new Date();
      existingCache.totalTransactions = Object.values(existingCache.dailyTotals).reduce((a, b) => a + b, 0);
      existingCache.totalDaysActive = Object.keys(existingCache.dailyTotals).length;
      existingCache.lastUpdate = now.toISOString();
      existingCache.generatedAtUTC = now.toISOString();
      
      console.log('🔄 Merged CSV data with existing cache');
      newCache = existingCache;
    }
    
    // Save updated cache
    fs.writeFileSync(CACHE_V2_FILE, JSON.stringify(newCache, null, 2));
    console.log(`💾 Cache updated and saved to ${CACHE_V2_FILE}`);
    
    console.log('🎉 CSV import completed successfully!');
    console.log('📊 Final statistics:');
    console.log(`   Total transactions: ${newCache.totalTransactions}`);
    console.log(`   Days active: ${newCache.totalDaysActive}`);
    console.log(`   Latest block: ${newCache.cursor.lastBlockNumber}`);
    
  } catch (error) {
    console.error('❌ CSV import failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  updateFromCSVs().catch(console.error);
}

export { updateFromCSVs };