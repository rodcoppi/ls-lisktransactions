import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { OptimizedCacheV2, Transaction } from './types';
import { toUTCDateKey, addUTCDays, formatDateLongUTC } from './types';
import {
  isSuccess,
  ensure24,
  recomputeDayStatus,
  findLatestCompleteDate,
  monthToDateTotals,
  validateWeeklyWindow,
  isAfterCursor,
  mergeAndDedupeTxs,
  weeklyPeriodUTC,
  monthlyPeriodUTC
} from './logic';

const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const CACHE_FILE = path.join(process.cwd(), 'src/data/contract-cache.json');
const CACHE_V2_FILE = path.join(process.cwd(), 'src/data/contract-cache-v2.json');
const TEMP_CACHE = '/tmp/contract-cache-v2.json';
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const BACKFILL_BLOCKS = 2000; // Buffer for reorg protection

interface BlockscoutResponse {
  items: Transaction[];
  next_page_params: any;
  total_count?: number;
  has_more?: boolean;
}

export class CacheManagerV2 {
  private static instance: CacheManagerV2;
  private updateTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutoUpdate();
  }

  static getInstance(): CacheManagerV2 {
    if (!CacheManagerV2.instance) {
      CacheManagerV2.instance = new CacheManagerV2();
    }
    return CacheManagerV2.instance;
  }

  private startAutoUpdate() {
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Development mode: Starting auto-update timer');
      
      setTimeout(() => {
        this.updateCache();
      }, 1000);
      
      this.updateTimer = setInterval(() => {
        this.updateCache();
      }, UPDATE_INTERVAL);
    } else {
      console.log('🎯 Production mode: Using ONLY pre-populated cache (no auto-updates)');
    }
  }

  private forceColdStart: boolean = false;
  
  private async updateCache(): Promise<void> {
    try {
      console.log('🔄 Starting cache update with V2 logic...');
      
      const existingCache = this.loadCacheV2();
      
      if (!existingCache || this.forceColdStart) {
        if (this.forceColdStart) {
          console.log('🔥 FORCED COLD START - rebuilding entire cache...');
          this.forceColdStart = false; // Reset flag
        } else {
          console.log('❄️ Cold start - fetching all transactions...');
        }
        await this.fullCacheUpdate();
      } else {
        console.log('⚡ Incremental update - fetching new transactions...');
        await this.incrementalUpdate(existingCache);
      }
    } catch (error) {
      console.error('❌ Cache V2 update failed:', error);
    }
  }

  private async fullCacheUpdate(): Promise<void> {
    const allTransactions: Transaction[] = [];
    const seenTxs = new Map<string, Transaction>();
    let nextPageParams = null;
    let page = 1;

    console.log('🔥 Starting SMART transaction fetch with V2!');

    // First page to get metadata
    const firstUrl = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;
    console.log('📄 Fetching page 1 to check total count...');
    
    const firstResponse = await fetch(firstUrl);
    const firstData: BlockscoutResponse = await firstResponse.json();
    
    if (firstData.items && firstData.items.length > 0) {
      const validTxs = this.filterAndNormalizeTxs(firstData.items);
      for (const tx of validTxs) {
        seenTxs.set(tx.hash, tx);
      }
      
      console.log(`✅ Page 1: +${validTxs.length} valid transactions`);
      
      if (firstData.total_count) {
        const totalPages = Math.ceil(firstData.total_count / 50);
        console.log(`🧠 SMART MODE: Found ${firstData.total_count} total transactions = ${totalPages} pages`);
      }
    }

    nextPageParams = firstData.next_page_params;
    page++;

    // Continue with remaining pages
    while (nextPageParams) {
      const url = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?${new URLSearchParams(nextPageParams)}`;
      
      if (page % 10 === 0) {
        console.log(`🚀 FAST MODE: Page ${page} (${seenTxs.size} transactions so far)`);
      }
      
      const response = await fetch(url);
      const data: BlockscoutResponse = await response.json();
      
      if (data.items && data.items.length > 0) {
        const validTxs = this.filterAndNormalizeTxs(data.items);
        for (const tx of validTxs) {
          seenTxs.set(tx.hash, tx);
        }
      } else {
        console.log(`🛑 Page ${page}: No more transactions found`);
        break;
      }
      
      nextPageParams = data.next_page_params;
      page++;
    }

    // Convert to array and sort
    const finalTxs = mergeAndDedupeTxs(seenTxs, []);
    console.log(`✅ Full cache complete: ${finalTxs.length} valid transactions`);
    
    const cacheV2 = this.buildCacheV2FromTransactions(finalTxs);
    this.saveCacheV2(cacheV2);
  }

  private async incrementalUpdate(existingCache: OptimizedCacheV2): Promise<void> {
    const seenTxs = new Map<string, Transaction>();
    let nextPageParams = null;
    let page = 1;
    const maxPages = 10;

    console.log(`🔍 Incremental update from block ${existingCache.cursor.lastBlockNumber}`);

    // Backfill window to handle reorgs
    const minBlock = Math.max(0, existingCache.cursor.lastBlockNumber - BACKFILL_BLOCKS);
    console.log(`📈 Using backfill window: blocks ${minBlock} to current`);

    do {
      const url = nextPageParams 
        ? `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?${new URLSearchParams(nextPageParams)}`
        : `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;
      
      const response = await fetch(url);
      const data: BlockscoutResponse = await response.json();
      
      if (data.items && data.items.length > 0) {
        const validTxs = this.filterAndNormalizeTxs(data.items);
        
        // Filter for new transactions (with backfill buffer)
        const newTxs = validTxs.filter(tx => 
          tx.block > minBlock && 
          isAfterCursor(
            { bn: tx.block, idx: tx.txIndex || 0, hash: tx.hash },
            { bn: existingCache.cursor.lastBlockNumber, idx: existingCache.cursor.lastTxIndex, hash: existingCache.cursor.lastTxHash }
          )
        );

        for (const tx of newTxs) {
          seenTxs.set(tx.hash, tx);
        }

        // Stop if no new transactions in this page
        if (newTxs.length === 0) {
          break;
        }
      }
      
      nextPageParams = data.next_page_params;
      page++;

    } while (nextPageParams && page <= maxPages);

    if (seenTxs.size === 0) {
      console.log('✨ No new transactions found');
      return;
    }

    console.log(`🆕 Found ${seenTxs.size} new transactions`);

    // Merge with existing and update cache
    const updatedCache = this.updateCacheWithNewTransactions(existingCache, Array.from(seenTxs.values()));
    this.saveCacheV2(updatedCache);
  }

  private filterAndNormalizeTxs(rawTxs: any[]): Transaction[] {
    return rawTxs
      .filter(tx => {
        // Filter for successful transactions to our contract
        const toAddress = tx.to && typeof tx.to === 'string' ? tx.to.toLowerCase() : '';
        const success = isSuccess(tx.status);
        return toAddress === CONTRACT_ADDRESS.toLowerCase() && success;
      })
      .map((tx, index) => ({
        hash: tx.hash,
        timestamp: tx.timestamp,
        block: tx.block_number || tx.block,
        method: tx.method || 'unknown',
        gas_used: tx.gas_used?.toString() || '0',
        fee: tx.fee || { value: '0' },
        to: tx.to,
        status: tx.status,
        txIndex: tx.position || tx.transaction_index || index
      }));
  }

  private buildCacheV2FromTransactions(transactions: Transaction[]): OptimizedCacheV2 {
    const nowUTC = new Date();
    const todayKey = toUTCDateKey(nowUTC);
    
    const dailyTotals: Record<string, number> = {};
    const monthlyTotals: Record<string, number> = {};
    const recentHourly: Record<string, number[]> = {};
    const dailyStatus: Record<string, 'complete' | 'partial' | 'unknown'> = {};
    
    const daysWithTxs = new Set<string>();
    
    // Initialize hourly arrays for recent days
    for (let i = 0; i < 7; i++) {
      const day = addUTCDays(nowUTC, -i);
      const key = toUTCDateKey(day);
      recentHourly[key] = new Array(24).fill(0);
    }

    // Process transactions
    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = toUTCDateKey(txDate);
      const monthKey = `${txDate.getUTCFullYear()}-${String(txDate.getUTCMonth() + 1).padStart(2, '0')}`;

      // Count daily and monthly totals
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + 1;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + 1;
      daysWithTxs.add(dayKey);

      // Add to hourly data if recent
      if (recentHourly[dayKey]) {
        const hour = txDate.getUTCHours();
        recentHourly[dayKey][hour]++;
      }
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

    // Generate integrity hash
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify({ dailyTotals, monthlyTotals, cursor }))
      .digest('hex');

    return {
      schemaVersion: '1.2.0',
      generatedAtUTC: nowUTC.toISOString(),
      source: 'blockscout/lisk.com',
      integrity: `sha256:${contentHash}`,
      dailyTotals,
      dailyStatus,
      monthlyTotals,
      recentHourly,
      cursor,
      lastUpdate: nowUTC.toISOString(),
      totalTransactions: transactions.length,
      totalDaysActive: daysWithTxs.size
    };
  }

  private updateCacheWithNewTransactions(cache: OptimizedCacheV2, newTxs: Transaction[]): OptimizedCacheV2 {
    const nowUTC = new Date();
    const todayKey = toUTCDateKey(nowUTC);
    
    // Deep clone cache
    const updated: OptimizedCacheV2 = {
      ...cache,
      dailyTotals: { ...cache.dailyTotals },
      dailyStatus: { ...cache.dailyStatus },
      monthlyTotals: { ...cache.monthlyTotals },
      recentHourly: { ...cache.recentHourly }
    };

    const daysUpdated = new Set<string>();
    let maxBlock = cache.cursor.lastBlockNumber;
    let maxTxIndex = cache.cursor.lastTxIndex;
    let maxTxHash = cache.cursor.lastTxHash;

    // Process new transactions
    newTxs.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = toUTCDateKey(txDate);
      const monthKey = `${txDate.getUTCFullYear()}-${String(txDate.getUTCMonth() + 1).padStart(2, '0')}`;

      // Update daily and monthly totals
      updated.dailyTotals[dayKey] = (updated.dailyTotals[dayKey] || 0) + 1;
      updated.monthlyTotals[monthKey] = (updated.monthlyTotals[monthKey] || 0) + 1;
      daysUpdated.add(dayKey);

      // Update hourly data if recent
      if (!updated.recentHourly[dayKey]) {
        updated.recentHourly[dayKey] = new Array(24).fill(0);
      }
      const hour = txDate.getUTCHours();
      updated.recentHourly[dayKey][hour]++;

      // Track latest transaction
      if (tx.block > maxBlock || 
          (tx.block === maxBlock && (tx.txIndex || 0) > maxTxIndex) ||
          (tx.block === maxBlock && (tx.txIndex || 0) === maxTxIndex && tx.hash > maxTxHash)) {
        maxBlock = tx.block;
        maxTxIndex = tx.txIndex || 0;
        maxTxHash = tx.hash;
      }
    });

    // Recompute status for affected days
    daysUpdated.forEach(dayKey => {
      const total = updated.dailyTotals[dayKey];
      const hourly = updated.recentHourly[dayKey];
      updated.dailyStatus[dayKey] = recomputeDayStatus(dayKey, total, hourly, todayKey);
    });

    // Update metadata
    updated.cursor = { lastBlockNumber: maxBlock, lastTxIndex: maxTxIndex, lastTxHash: maxTxHash };
    updated.totalTransactions += newTxs.length;
    updated.totalDaysActive = new Set([...Object.keys(updated.dailyTotals)]).size;
    updated.lastUpdate = nowUTC.toISOString();
    updated.generatedAtUTC = nowUTC.toISOString();

    // Update integrity
    const contentHash = crypto.createHash('sha256')
      .update(JSON.stringify({ dailyTotals: updated.dailyTotals, monthlyTotals: updated.monthlyTotals, cursor: updated.cursor }))
      .digest('hex');
    updated.integrity = `sha256:${contentHash}`;

    console.log(`📊 Updated cache V2: +${newTxs.length} transactions, ${daysUpdated.size} days affected`);
    
    return updated;
  }

  private loadCacheV2(): OptimizedCacheV2 | null {
    try {
      // In production, try temp cache first, then fallback to pre-populated
      if (process.env.NODE_ENV === 'production') {
        if (fs.existsSync(TEMP_CACHE)) {
          const data = fs.readFileSync(TEMP_CACHE, 'utf8');
          return JSON.parse(data);
        }
      }
      
      // Try V2 cache file first
      if (fs.existsSync(CACHE_V2_FILE)) {
        const data = fs.readFileSync(CACHE_V2_FILE, 'utf8');
        const parsed = JSON.parse(data);
        console.log(`✅ Loaded V2 cache: ${parsed.totalTransactions} transactions`);
        return parsed;
      }

      // Fallback to V1 cache and migrate
      if (fs.existsSync(CACHE_FILE)) {
        console.log(`🔄 Migrating V1 cache to V2...`);
        return this.migrateV1ToV2();
      }
      
      console.error('❌ CRITICAL: No cache found');
      return null;
    } catch (error) {
      console.error('❌ Failed to load cache V2:', error);
      return null;
    }
  }

  private migrateV1ToV2(): OptimizedCacheV2 | null {
    try {
      const v1Data = fs.readFileSync(CACHE_FILE, 'utf8');
      const v1Cache = JSON.parse(v1Data);
      
      const nowUTC = new Date();
      const todayKey = toUTCDateKey(nowUTC);
      
      // Build dailyStatus from existing data
      const dailyStatus: Record<string, 'complete' | 'partial' | 'unknown'> = {};
      
      Object.keys(v1Cache.dailyTotals || {}).forEach(dayKey => {
        const total = v1Cache.dailyTotals[dayKey];
        const hourly = v1Cache.recentHourly?.[dayKey];
        dailyStatus[dayKey] = recomputeDayStatus(dayKey, total, hourly, todayKey);
      });

      // Ensure all hourly arrays are 24 slots
      const recentHourly: Record<string, number[]> = {};
      Object.keys(v1Cache.recentHourly || {}).forEach(dayKey => {
        recentHourly[dayKey] = ensure24(v1Cache.recentHourly[dayKey]);
      });

      const v2Cache: OptimizedCacheV2 = {
        schemaVersion: '1.2.0',
        generatedAtUTC: nowUTC.toISOString(),
        source: 'blockscout/lisk.com',
        integrity: 'sha256:migrated-from-v1',
        dailyTotals: v1Cache.dailyTotals || {},
        dailyStatus,
        monthlyTotals: v1Cache.monthlyTotals || {},
        recentHourly,
        cursor: {
          lastBlockNumber: v1Cache.lastBlockNumber || 0,
          lastTxIndex: 0,
          lastTxHash: ''
        },
        lastUpdate: v1Cache.lastUpdate || nowUTC.toISOString(),
        totalTransactions: v1Cache.totalTransactions || 0,
        totalDaysActive: v1Cache.totalDaysActive || 0
      };

      console.log(`✅ Migrated V1 to V2: ${v2Cache.totalTransactions} transactions`);
      this.saveCacheV2(v2Cache);
      return v2Cache;
    } catch (error) {
      console.error('❌ Failed to migrate V1 to V2:', error);
      return null;
    }
  }

  private saveCacheV2(data: OptimizedCacheV2): void {
    try {
      const saveFile = process.env.NODE_ENV === 'production' ? TEMP_CACHE : CACHE_V2_FILE;
      
      const dir = path.dirname(saveFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(saveFile, JSON.stringify(data, null, 2));
      console.log(`💾 Cache V2 saved to ${saveFile}: ${data.totalTransactions} transactions`);
    } catch (error) {
      console.error('❌ Failed to save cache V2:', error);
    }
  }

  public getCachedData(): any {
    const cache = this.loadCacheV2();
    if (!cache) return null;

    return {
      totalTransactions: cache.totalTransactions,
      analysis: this.generateAnalysisFromV2(cache),
      lastUpdate: cache.lastUpdate,
      cached: true,
      schemaVersion: cache.schemaVersion
    };
  }

  private generateAnalysisFromV2(cache: OptimizedCacheV2): any {
    const nowUTC = new Date();
    const latestCompleteDate = findLatestCompleteDate(cache, nowUTC);
    
    if (!latestCompleteDate) {
      console.warn('⚠️ No complete date found, using fallback data');
      return {
        latestCompleteDate: null,
        latestCompleteDateFormatted: 'No complete data available',
        latestDayTxs: 0,
        weeklyTxs: 0,
        monthlyTxs: 0,
        weeklyPeriod: 'No complete data',
        monthlyPeriod: 'No complete data',
        hourlyData: {},
        dailyData: cache.dailyTotals || {},
        monthlyData: cache.monthlyTotals || {},
        
        // Extended data for new components (empty fallbacks)
        recentHourly: {},
        dailyStatus: {},
        
        todayTxs: 0,
        thisWeekTxs: 0,
        thisMonthTxs: 0,
        totalDaysActive: cache.totalDaysActive || 0,
        avgTxsPerDay: 0,
        avgTxsPerMonth: 0
      };
    }

    const latestCompleteDateFormatted = formatDateLongUTC(latestCompleteDate);
    const latestDayTxs = cache.dailyTotals[latestCompleteDate] || 0;

    // Calculate weekly metrics - sum available days even if incomplete
    const weeklyValidation = validateWeeklyWindow(cache, latestCompleteDate);
    let weeklyTxs = 0;
    weeklyTxs = weeklyValidation.dates.reduce((sum, date) => 
      sum + (cache.dailyTotals[date] || 0), 0
    );
    
    const weeklyPeriod = weeklyPeriodUTC(cache, latestCompleteDate);

    // Calculate monthly metrics
    const monthlyData = monthToDateTotals(cache, latestCompleteDate);
    const monthlyPeriod = monthlyPeriodUTC(latestCompleteDate);

    // Get hourly data for latest complete date
    // Check both recentHourly (legacy) and hourlyData (new structure)
    const hourlyArray = cache.recentHourly[latestCompleteDate];
    const newHourlyData = cache.hourlyData?.[latestCompleteDate];
    
    let hourlyData = {};
    if (newHourlyData) {
      // Use new hourlyData structure (object with hour keys)
      hourlyData = newHourlyData;
    } else if (hourlyArray) {
      // Use legacy recentHourly structure (array with hour indices)
      hourlyData = Object.fromEntries(hourlyArray.map((count, hour) => [hour, count]));
    }

    console.log('📊 Analysis V2 generated:', {
      latestCompleteDate,
      latestDayTxs,
      weeklyTxs,
      monthlyTxs: monthlyData.sum,
      avgTxsPerDay: monthlyData.avgPerCompleteDay
    });

    // Format recentHourly as objects for new components
    const recentHourly: { [date: string]: { [hour: number]: number } } = {};
    Object.keys(cache.recentHourly || {}).forEach(date => {
      const hourlyArray = cache.recentHourly[date];
      recentHourly[date] = hourlyArray 
        ? Object.fromEntries(hourlyArray.map((count, hour) => [hour, count]))
        : {};
    });
    
    // CRITICAL: Merge with new hourlyData structure for complete coverage
    Object.keys(cache.hourlyData || {}).forEach(date => {
      if (!recentHourly[date]) {
        recentHourly[date] = cache.hourlyData[date];
      }
    });

    return {
      latestCompleteDate,
      latestCompleteDateFormatted,
      weeklyPeriod,
      monthlyPeriod,
      
      latestDayTxs,
      weeklyTxs,
      monthlyTxs: monthlyData.sum,
      
      hourlyData,
      dailyData: cache.dailyTotals || {},
      monthlyData: cache.monthlyTotals || {},
      
      // Extended data for new components
      recentHourly,
      dailyStatus: cache.dailyStatus || {},
      
      // Legacy compatibility
      todayTxs: latestDayTxs,
      thisWeekTxs: weeklyTxs,
      thisMonthTxs: monthlyData.sum,
      
      totalDaysActive: cache.totalDaysActive || 0,
      avgTxsPerDay: monthlyData.avgPerCompleteDay,
      avgTxsPerMonth: cache.monthlyTotals 
        ? Math.round(cache.totalTransactions / Object.keys(cache.monthlyTotals).length)
        : 0
    };
  }

  public getLastUpdateTime(): string | null {
    const cache = this.loadCacheV2();
    return cache?.lastUpdate || null;
  }

  public async forceUpdate(): Promise<void> {
    await this.updateCache();
  }
  
  public async clearCache(): Promise<void> {
    try {
      console.log('🧹 Clearing cache to force complete rebuild...');
      this.forceColdStart = true;
      console.log('🔄 Next update will ignore existing cache and rebuild from scratch');
    } catch (error) {
      console.warn('⚠️ Cache clear warning:', error);
    }
  }

  /**
   * PROTEÇÃO: Detecta gaps de transações e força re-sincronização
   * Protege contra casos onde a blockchain não salva transações temporariamente
   */
  public detectGapsAndResync(): { hasGaps: boolean; gapDetails: string[] } {
    const cache = this.loadCacheV2();
    if (!cache || !cache.dailyTotals) {
      return { hasGaps: false, gapDetails: [] };
    }

    const gapDetails: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Encontrar o último dia com dados
    const allDays = Object.keys(cache.dailyTotals).sort();
    const lastDayWithData = allDays[allDays.length - 1];
    
    if (!lastDayWithData) {
      gapDetails.push(`❌ Nenhum dado diário encontrado no cache`);
      return { hasGaps: true, gapDetails };
    }
    
    // Verificar quantos dias se passaram desde o último update
    const lastDate = new Date(lastDayWithData);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`📅 Último dia com dados: ${lastDayWithData}`);
    console.log(`📅 Hoje: ${today}`);
    console.log(`📅 Diferença: ${daysDiff} dias`);
    
    // Se passou mais de 1 dia, há gap crítico
    if (daysDiff > 1) {
      gapDetails.push(`🚨 GAP CRÍTICO: ${daysDiff} dias sem dados (último: ${lastDayWithData})`);
    }
    
    // Verificar os últimos 7 dias para gaps específicos
    const recentDays = Object.keys(cache.dailyTotals)
      .sort()
      .slice(-7);
    
    recentDays.forEach(date => {
      const dayTxs = cache.dailyTotals[date] || 0;
      
      // Se um dia tem 0 transações, pode ser gap da blockchain
      if (dayTxs === 0 && date < today) {
        gapDetails.push(`⚠️ ${date}: 0 transações (possível gap da blockchain)`);
      }
      
      // Se um dia tem muito poucas transações comparado ao normal
      if (dayTxs > 0 && dayTxs < 10 && date < today) {
        gapDetails.push(`⚠️ ${date}: Apenas ${dayTxs} transações (suspeito)`);
      }
    });

    const hasGaps = gapDetails.length > 0;

    if (hasGaps) {
      console.log(`🚨 PROTEÇÃO: Gaps detectados (${gapDetails.length}):`);
      gapDetails.forEach(gap => console.log(gap));
    } else {
      console.log(`✅ PROTEÇÃO: Nenhum gap detectado nos dados recentes`);
    }

    return { hasGaps, gapDetails };
  }

  /**
   * PROTEÇÃO: Executa verificação automática e re-sincronização se necessário
   */
  public async autoProtectAgainstGaps(): Promise<boolean> {
    console.log(`🛡️ PROTEÇÃO V2: Verificando gaps automaticamente...`);
    
    const gapCheck = this.detectGapsAndResync();
    
    if (gapCheck.hasGaps) {
      console.log(`🔥 PROTEÇÃO V2 ATIVADA: Gaps detectados, forçando re-sincronização...`);
      console.log(`📋 Problemas encontrados:`);
      gapCheck.gapDetails.forEach(detail => console.log(`   ${detail}`));
      
      try {
        this.forceColdStart = true;
        await this.updateCache();
        console.log(`✅ PROTEÇÃO V2: Re-sincronização completa realizada com sucesso`);
        return true;
      } catch (error) {
        console.error(`❌ PROTEÇÃO V2: Falha na re-sincronização:`, error);
        return false;
      }
    } else {
      console.log(`✅ PROTEÇÃO V2: Dados íntegros, nenhuma re-sincronização necessária`);
      return false;
    }
  }

  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
}

// Singleton instance
export const cacheManagerV2 = CacheManagerV2.getInstance();