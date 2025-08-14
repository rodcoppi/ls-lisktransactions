import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { OptimizedCacheV2, Transaction } from '../../../lib/types';
import { toUTCDateKey } from '../../../lib/types';
import { recomputeDayStatus } from '../../../lib/logic';

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
    gas_used: '0',
    fee: { value: csv.Fee },
    to: csv.ToAddress,
    status: csv.Status === 'ok' ? true : false,
    txIndex: index
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting CSV import from API...');
    
    // Find ALL dia*.csv files in root
    const rootDir = process.cwd();
    const allFiles = fs.readdirSync(rootDir);
    const csvFiles = allFiles.filter(file => file.match(/^dia\d+\.csv$/i));
    
    console.log(`📂 Found ${csvFiles.length} CSV files:`, csvFiles);
    
    const allTransactions: Transaction[] = [];
    const importResults: Record<string, number> = {
      total: 0,
    };
    const dailyTotals: Record<string, number> = {};
    
    // Process each CSV file
    for (const csvFile of csvFiles) {
      const csvPath = path.join(rootDir, csvFile);
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
      return NextResponse.json({
        success: false,
        error: 'No CSV files found or no valid transactions',
        filesFound: csvFiles,
        timestamp: new Date().toISOString()
      });
    }
    
    importResults.total = allTransactions.length;
    
    // Sort transactions
    allTransactions.sort((a, b) => a.block - b.block || a.timestamp.localeCompare(b.timestamp));
    
    console.log(`📊 Processing ${allTransactions.length} total transactions...`);
    
    // Load existing cache
    let cache: OptimizedCacheV2;
    if (fs.existsSync(CACHE_V2_FILE)) {
      const existingData = fs.readFileSync(CACHE_V2_FILE, 'utf8');
      cache = JSON.parse(existingData);
      console.log('📦 Loaded existing cache');
    } else {
      // Create minimal cache structure
      cache = {
        schemaVersion: '1.2.0',
        generatedAtUTC: new Date().toISOString(),
        source: 'csv-import',
        integrity: `sha256:csv-${Date.now()}`,
        dailyTotals: {},
        dailyStatus: {},
        monthlyTotals: {},
        recentHourly: {},
        hourlyData: {},
        cursor: { lastBlockNumber: 0, lastTxIndex: 0, lastTxHash: '' },
        lastUpdate: new Date().toISOString(),
        totalTransactions: 0,
        totalDaysActive: 0
      };
    }
    
    // Process transactions into cache
    const processedDays = new Set<string>();
    
    allTransactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = toUTCDateKey(txDate);
      const monthKey = `${txDate.getUTCFullYear()}-${String(txDate.getUTCMonth() + 1).padStart(2, '0')}`;
      const hour = txDate.getUTCHours();
      
      processedDays.add(dayKey);
      
      // Initialize day structures if needed
      if (!cache.recentHourly[dayKey]) {
        cache.recentHourly[dayKey] = new Array(24).fill(0);
      }
      if (!cache.hourlyData) cache.hourlyData = {};
      if (!cache.hourlyData[dayKey]) {
        cache.hourlyData[dayKey] = {};
      }
      
      // Count transactions
      cache.dailyTotals[dayKey] = (cache.dailyTotals[dayKey] || 0) + 1;
      cache.monthlyTotals[monthKey] = (cache.monthlyTotals[monthKey] || 0) + 1;
      cache.recentHourly[dayKey][hour]++;
      cache.hourlyData[dayKey][hour] = (cache.hourlyData[dayKey][hour] || 0) + 1;
      
      // Update cursor if this is latest transaction
      if (tx.block > cache.cursor.lastBlockNumber) {
        cache.cursor = {
          lastBlockNumber: tx.block,
          lastTxIndex: tx.txIndex || 0,
          lastTxHash: tx.hash
        };
      }
    });
    
    // Update day status for processed days
    const todayKey = toUTCDateKey(new Date());
    processedDays.forEach(dayKey => {
      const total = cache.dailyTotals[dayKey];
      const hourly = cache.recentHourly[dayKey];
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
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      filesProcessed: csvFiles,
      importResults,
      dailyTotals,
      finalStats: {
        totalTransactions: cache.totalTransactions,
        totalDaysActive: cache.totalDaysActive,
        latestBlock: cache.cursor.lastBlockNumber,
        processedDays: Array.from(processedDays).sort()
      },
      message: `Successfully imported ${allTransactions.length} transactions from ${csvFiles.length} CSV files`
    });
    
  } catch (error) {
    console.error('❌ CSV import failed:', error);
    return NextResponse.json({
      success: false,
      error: 'CSV import failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}