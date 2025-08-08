import fs from 'fs';
import path from 'path';

const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const CACHE_FILE = path.join(process.cwd(), 'src/data/contract-cache.json'); // Always use pre-populated cache
const TEMP_CACHE = '/tmp/contract-cache.json';  // For updates in production
const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas (Daily cron handles updates)

interface Transaction {
  hash: string;
  timestamp: string;
  block: number;
  method: string;
  gas_used: string;
  fee: { value: string };
}

interface OptimizedCache {
  // Dados históricos compactos (só totais diários)
  dailyTotals: { [date: string]: number };
  monthlyTotals: { [month: string]: number };
  
  // Dados recentes detalhados (só últimos 2 dias)
  recentHourly: { [date: string]: number[] }; // 24 números por dia
  
  // Metadados
  lastUpdate: string;
  lastBlockNumber: number;
  totalTransactions: number;
  totalDaysActive: number;
}

// Para processamento inicial
interface CacheData {
  transactions: Transaction[];
  lastUpdate: string;
  lastBlockNumber: number;
  totalTransactions: number;
  analysis: any;
}

interface BlockscoutResponse {
  items: Transaction[];
  next_page_params: any;
  total_count?: number; // Might be available
  has_more?: boolean;   // Alternative pagination info
}

export class CacheManager {
  private static instance: CacheManager;
  private updateTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutoUpdate();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private startAutoUpdate() {
    // NEVER auto-update in production - preserve Vercel limits
    // Only manual updates via daily cron job at /api/cron/update-cache
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Development mode: Starting auto-update timer');
      
      // Update imediatamente ao iniciar (mas sem bloquear)
      setTimeout(() => {
        this.updateCache();
      }, 1000);
      
      // Depois update a cada 24 horas (backup para development)
      this.updateTimer = setInterval(() => {
        this.updateCache();
      }, UPDATE_INTERVAL);
    } else {
      console.log('🎯 Production mode: Using ONLY pre-populated cache (no auto-updates)');
      // NO AUTO-UPDATE IN PRODUCTION - Preserve Vercel free tier limits
    }
  }

  private async updateCache(): Promise<void> {
    try {
      console.log('🔄 Starting cache update...');
      
      // Verificar se precisa de rotação de dados
      await this.rotateOldHourlyData();
      
      const existingCache = this.loadOptimizedCache();
      
      if (!existingCache) {
        // Cold start - buscar TUDO
        console.log('❄️ Cold start - fetching all transactions...');
        await this.fullCacheUpdate();
      } else {
        // Update incremental - só transações novas
        console.log('⚡ Incremental update - fetching new transactions...');
        await this.incrementalUpdateOptimized(existingCache);
      }
    } catch (error) {
      console.error('❌ Cache update failed:', error);
    }
  }

  private async rotateOldHourlyData(): Promise<void> {
    const cache = this.loadOptimizedCache();
    if (!cache || !cache.recentHourly) return;

    // Use UTC for consistent timezone handling
    const nowUTC = new Date();
    const todayKeyUTC = nowUTC.toISOString().split('T')[0];
    const yesterdayUTC = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKeyUTC = yesterdayUTC.toISOString().split('T')[0];

    const todayKey = todayKeyUTC;
    const yesterdayKey = yesterdayKeyUTC;

    // Verificar se há dados horários que precisam ser rotacionados
    const keysToRotate: string[] = [];
    for (const dateKey of Object.keys(cache.recentHourly)) {
      if (dateKey !== todayKey && dateKey !== yesterdayKey) {
        keysToRotate.push(dateKey);
      }
    }

    if (keysToRotate.length > 0) {
      console.log(`🗂️ Rotating ${keysToRotate.length} old hourly data entries...`);
      
      // Agregar dados horários antigos para dailyTotals
      keysToRotate.forEach(dateKey => {
        const hourlyData = cache.recentHourly[dateKey];
        const dailyTotal = hourlyData.reduce((sum, count) => sum + count, 0);
        
        // Só sobrescrever se não existir dados diários para esta data
        if (!cache.dailyTotals[dateKey] && dailyTotal > 0) {
          cache.dailyTotals[dateKey] = dailyTotal;
          console.log(`📊 Aggregated ${dateKey}: ${dailyTotal} transactions`);
        }
        
        // Remover dados horários antigos
        delete cache.recentHourly[dateKey];
      });

      // Garantir que hoje e ontem tenham arrays horários
      if (!cache.recentHourly[todayKey]) {
        cache.recentHourly[todayKey] = new Array(24).fill(0);
      }
      if (!cache.recentHourly[yesterdayKey]) {
        cache.recentHourly[yesterdayKey] = new Array(24).fill(0);
      }

      // Salvar cache atualizado
      this.saveOptimizedCache(cache);
    }
  }

  private async fullCacheUpdate(): Promise<void> {
    const allTransactions: Transaction[] = [];
    let nextPageParams = null;
    let page = 1;

    console.log('🔥 Starting SMART transaction fetch!');

    // First, fetch page 1 to get metadata
    const firstUrl = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;
    console.log('📄 Fetching page 1 to check total count...');
    
    const firstResponse = await fetch(firstUrl);
    const firstData: BlockscoutResponse = await firstResponse.json();
    
    if (firstData.items && firstData.items.length > 0) {
      allTransactions.push(...firstData.items);
      console.log(`✅ Page 1: +${firstData.items.length} transactions`);
      
      // Check if we can get total count
      if (firstData.total_count) {
        const totalPages = Math.ceil(firstData.total_count / 50);
        console.log(`🧠 SMART MODE: Found ${firstData.total_count} total transactions = ${totalPages} pages`);
        console.log(`🚀 Will fetch remaining ${totalPages - 1} pages...`);
      } else {
        console.log('🤔 No total_count available, using sequential mode...');
        console.log('📊 First page data keys:', Object.keys(firstData));
      }
    }

    nextPageParams = firstData.next_page_params;
    page++;

    // Continue with remaining pages - optimized for speed
    while (nextPageParams) {
      const url = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?${new URLSearchParams(nextPageParams)}`;
      
      // Show progress every 10 pages
      if (page % 10 === 0) {
        console.log(`🚀 FAST MODE: Page ${page} (${allTransactions.length} transactions so far)`);
      }
      
      const response = await fetch(url);
      const data: BlockscoutResponse = await response.json();
      
      if (data.items && data.items.length > 0) {
        allTransactions.push(...data.items);
      } else {
        console.log(`🛑 Page ${page}: No more transactions found`);
        break;
      }
      
      nextPageParams = data.next_page_params;
      page++;
    }

    console.log(`✅ Full cache complete: ${allTransactions.length} transactions`);
    
    const analysis = this.analyzeTransactions(allTransactions);
    const cacheData: CacheData = {
      transactions: allTransactions,
      lastUpdate: new Date().toISOString(),
      lastBlockNumber: Math.max(...allTransactions.map(tx => tx.block)),
      totalTransactions: allTransactions.length,
      analysis
    };

    this.saveCache(cacheData);
  }

  private async incrementalUpdateOptimized(existingCache: OptimizedCache): Promise<void> {
    const newTransactions: Transaction[] = [];
    let nextPageParams = null;
    let page = 1;
    const maxPages = 10; // Para updates incrementais, poucas páginas

    do {
      const url = nextPageParams 
        ? `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?${new URLSearchParams(nextPageParams)}`
        : `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;
      
      const response = await fetch(url);
      const data: BlockscoutResponse = await response.json();
      
      if (data.items && data.items.length > 0) {
        // Filtrar apenas transações NOVAS (bloco maior que o último conhecido)
        const filteredNew = data.items.filter(tx => tx.block > existingCache.lastBlockNumber);
        newTransactions.push(...filteredNew);

        // Se não há mais transações novas nesta página, parar
        if (filteredNew.length === 0) {
          break;
        }
      }
      
      nextPageParams = data.next_page_params;
      page++;

      if (!data.items || data.items.length === 0) {
        break;
      }

    } while (nextPageParams && page <= maxPages);

    if (newTransactions.length === 0) {
      console.log('✨ No new transactions found');
      return;
    }

    console.log(`🆕 Found ${newTransactions.length} new transactions`);

    // Atualizar cache otimizado com novas transações
    this.updateOptimizedCacheWithNewTransactions(existingCache, newTransactions);
  }

  private updateOptimizedCacheWithNewTransactions(cache: OptimizedCache, newTransactions: Transaction[]): void {
    // Use UTC for consistent timezone handling
    const nowUTC = new Date();
    const todayKeyUTC = nowUTC.toISOString().split('T')[0];
    const yesterdayUTC = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKeyUTC = yesterdayUTC.toISOString().split('T')[0];

    const todayKey = todayKeyUTC;
    const yesterdayKey = yesterdayKeyUTC;

    // Garantir que arrays horários existem
    if (!cache.recentHourly[todayKey]) {
      cache.recentHourly[todayKey] = new Array(24).fill(0);
    }
    if (!cache.recentHourly[yesterdayKey]) {
      cache.recentHourly[yesterdayKey] = new Array(24).fill(0);
    }

    let maxBlock = cache.lastBlockNumber;
    const daysUpdated = new Set<string>();

    newTransactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = txDate.toISOString().split('T')[0];
      const monthKey = txDate.getFullYear() + '-' + String(txDate.getMonth() + 1).padStart(2, '0');

      // Atualizar contadores diários e mensais
      cache.dailyTotals[dayKey] = (cache.dailyTotals[dayKey] || 0) + 1;
      cache.monthlyTotals[monthKey] = (cache.monthlyTotals[monthKey] || 0) + 1;
      daysUpdated.add(dayKey);

      // Atualizar dados horários se for hoje ou ontem (usando UTC)
      if (dayKey === todayKey || dayKey === yesterdayKey) {
        const hour = txDate.getUTCHours();
        if (cache.recentHourly[dayKey]) {
          cache.recentHourly[dayKey][hour]++;
        }
      }

      // Track maior bloco
      if (tx.block > maxBlock) {
        maxBlock = tx.block;
      }
    });

    // Atualizar metadados
    cache.lastBlockNumber = maxBlock;
    cache.totalTransactions += newTransactions.length;
    cache.totalDaysActive += daysUpdated.size;
    cache.lastUpdate = new Date().toISOString();

    console.log(`📊 Updated cache: +${newTransactions.length} transactions, ${daysUpdated.size} days affected`);
    
    // Salvar cache atualizado
    this.saveOptimizedCache(cache);
  }

  private loadOptimizedCache(): OptimizedCache | null {
    try {
      // In production, try temp cache first, then fallback to pre-populated
      if (process.env.NODE_ENV === 'production') {
        if (fs.existsSync(TEMP_CACHE)) {
          const data = fs.readFileSync(TEMP_CACHE, 'utf8');
          return JSON.parse(data);
        }
      }
      
      // Always use pre-populated cache as fallback/default
      if (!fs.existsSync(CACHE_FILE)) {
        console.error('❌ CRITICAL: Pre-populated cache not found at', CACHE_FILE);
        return null;
      }
      
      const data = fs.readFileSync(CACHE_FILE, 'utf8');
      const parsed = JSON.parse(data);
      console.log(`✅ Loaded pre-populated cache: ${parsed.totalTransactions} transactions`);
      return parsed;
    } catch (error) {
      console.error('❌ Failed to load cache:', error);
      return null;
    }
  }

  private loadCache(): CacheData | null {
    // Método legado para compatibilidade durante migração
    return this.loadOptimizedCache() as any;
  }

  private saveOptimizedCache(data: OptimizedCache): void {
    try {
      // In production, save updates to temp location to preserve pre-populated cache
      const saveFile = process.env.NODE_ENV === 'production' ? TEMP_CACHE : CACHE_FILE;
      
      const dir = path.dirname(saveFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(saveFile, JSON.stringify(data, null, 2));
      console.log(`💾 Optimized cache saved to ${saveFile}: ${data.totalTransactions} transactions`);
    } catch (error) {
      console.error('❌ Failed to save cache:', error);
    }
  }

  private saveCache(data: CacheData): void {
    // Converter para formato otimizado antes de salvar
    const optimized = this.convertToOptimizedFormat(data.transactions);
    this.saveOptimizedCache(optimized);
  }

  private convertToOptimizedFormat(transactions: Transaction[]): OptimizedCache {
    // Use UTC for consistent timezone handling
    const nowUTC = new Date();
    const todayKeyUTC = nowUTC.toISOString().split('T')[0];
    const yesterdayUTC = new Date(nowUTC.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKeyUTC = yesterdayUTC.toISOString().split('T')[0];

    const dailyTotals: { [date: string]: number } = {};
    const monthlyTotals: { [month: string]: number } = {};
    const recentHourly: { [date: string]: number[] } = {};
    
    // Inicializar arrays horários para hoje e ontem (UTC)
    const todayKey = todayKeyUTC;
    const yesterdayKey = yesterdayKeyUTC;
    recentHourly[todayKey] = new Array(24).fill(0);
    recentHourly[yesterdayKey] = new Array(24).fill(0);

    const daysWithTxs = new Set<string>();

    transactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = txDate.toISOString().split('T')[0];
      const monthKey = txDate.getFullYear() + '-' + String(txDate.getMonth() + 1).padStart(2, '0');

      // Contar por dia
      dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + 1;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + 1;
      daysWithTxs.add(dayKey);

      // Dados horários só para hoje e ontem (usando UTC)
      if (dayKey === todayKey || dayKey === yesterdayKey) {
        const hour = txDate.getUTCHours();
        if (recentHourly[dayKey]) {
          recentHourly[dayKey][hour]++;
        }
      }
    });

    return {
      dailyTotals,
      monthlyTotals,
      recentHourly,
      lastUpdate: new Date().toISOString(),
      lastBlockNumber: Math.max(...transactions.map(tx => tx.block), 0),
      totalTransactions: transactions.length,
      totalDaysActive: daysWithTxs.size
    };
  }

  public getCachedData(): any {
    const cache = this.loadOptimizedCache();
    if (!cache) return null;

    // Converter formato otimizado para formato esperado pela API
    return {
      totalTransactions: cache.totalTransactions,
      analysis: this.generateAnalysisFromOptimized(cache),
      lastUpdate: cache.lastUpdate,
      cached: true
    };
  }

  public getLastUpdateTime(): string | null {
    const cache = this.loadOptimizedCache();
    return cache?.lastUpdate || null;
  }

  // Date formatting utility for precise date display
  private formatDateLong(dateString: string): string {
    const date = new Date(dateString + 'T00:00:00Z');
    const day = date.getUTCDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    const year = date.getUTCFullYear();
    return `${day} ${month}, ${year}`;
  }

  // Find the latest date with complete 24h data
  private findLatestCompleteDate(cache: OptimizedCache): string {
    const now = new Date();
    
    // Check last 7 days to find the most recent complete day
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = checkDate.toISOString().split('T')[0];
      
      // Check if this date has complete hourly data (24 hours)
      if (cache.recentHourly && cache.recentHourly[dateKey]) {
        const hourlyArray = cache.recentHourly[dateKey];
        const totalTxs = hourlyArray.reduce((sum, count) => sum + count, 0);
        
        // Consider complete if has reasonable transaction count and matches daily total
        if (totalTxs > 1000 && cache.dailyTotals && cache.dailyTotals[dateKey] === totalTxs) {
          return dateKey;
        }
      }
    }
    
    // Fallback to most recent date with daily data
    if (cache.dailyTotals) {
      const dates = Object.keys(cache.dailyTotals).sort().reverse();
      for (const dateKey of dates) {
        if (cache.dailyTotals[dateKey] > 1000) {
          return dateKey;
        }
      }
    }
    
    // Ultimate fallback
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return yesterday.toISOString().split('T')[0];
  }

  private generateAnalysisFromOptimized(cache: OptimizedCache): any {
    const now = new Date();
    
    // Find the latest complete date instead of assuming yesterday
    const latestCompleteDate = this.findLatestCompleteDate(cache);
    const latestCompleteDateFormatted = this.formatDateLong(latestCompleteDate);
    
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate data for the latest complete date with cross-validation
    const hourlySum = (cache.recentHourly && cache.recentHourly[latestCompleteDate]) 
      ? cache.recentHourly[latestCompleteDate].reduce((sum, count) => sum + count, 0) 
      : 0;
    const dailyTotal = cache.dailyTotals?.[latestCompleteDate] || 0;
    
    // Cross-validation: hourly sum should match daily total
    if (hourlySum > 0 && dailyTotal > 0 && hourlySum !== dailyTotal) {
      console.warn(`⚠️ Data mismatch for ${latestCompleteDate}: hourly sum=${hourlySum}, daily total=${dailyTotal}`);
    }
    
    // Use hourly sum if available and matches, otherwise use daily total
    const latestDayTxs = (hourlySum > 0 && hourlySum === dailyTotal) ? hourlySum : dailyTotal;

    // Calculate precise weekly data (7 complete days ending with latest complete date)
    let weeklyTxs = 0;
    let weeklyPeriod = '';
    if (cache.dailyTotals) {
      const latestDate = new Date(latestCompleteDate + 'T00:00:00Z');
      const weekStartDate = new Date(latestDate.getTime() - 6 * 24 * 60 * 60 * 1000);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate.getTime() + i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        weeklyTxs += cache.dailyTotals[dateKey] || 0;
      }
      
      const weekStartFormatted = this.formatDateLong(weekStartDate.toISOString().split('T')[0]);
      weeklyPeriod = `${weekStartFormatted} - ${latestCompleteDateFormatted}`;
    }

    // Calculate precise monthly data (from start of month through latest complete date)
    let monthlyTxs = 0;
    let monthlyPeriod = '';
    if (cache.dailyTotals) {
      const latestDate = new Date(latestCompleteDate + 'T00:00:00Z');
      const monthStart = new Date(latestDate.getUTCFullYear(), latestDate.getUTCMonth(), 1);
      
      const currentDate = new Date(monthStart);
      while (currentDate <= latestDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        monthlyTxs += cache.dailyTotals[dateKey] || 0;
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
      
      const monthName = latestDate.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
      const year = latestDate.getUTCFullYear();
      const latestDay = latestDate.getUTCDate().toString().padStart(2, '0');
      monthlyPeriod = `${monthName} ${year} (through ${latestDay})`;
    }

    // Calculate average per day using ONLY complete days (UTC-based)
    const todayKeyUTC = now.toISOString().split('T')[0]; // Current day for exclusion from averages
    
    const completeDays: string[] = [];
    let completeDaysTransactions = 0;
    
    if (cache.dailyTotals) {
      Object.entries(cache.dailyTotals).forEach(([dateKey, count]) => {
        const isToday = dateKey === todayKeyUTC;
        
        // Include day if:
        // 1. It's not today (past days are always complete)
        // 2. AND it has reasonable transaction count (exclude deploy day with very few txs)
        const shouldInclude = !isToday && count >= 100;
        
        if (shouldInclude) {
          completeDays.push(dateKey);
          completeDaysTransactions += count;
        }
        
        // Debug log
        const dayStatus = isToday ? 'TODAY (incomplete - excluded)' : 'PAST DAY (complete)';
        const includeStatus = shouldInclude ? '✅' : '❌';
        console.log(`📅 ${dateKey}: ${count} txs - ${dayStatus} ${includeStatus}`);
      });
    }
    
    const avgTxsPerDay = completeDays.length > 0 
      ? Math.round(completeDaysTransactions / completeDays.length) 
      : 0;

    console.log(`📊 Complete days calculation (UTC-based):`);
    console.log(`   Current time UTC: ${now.toISOString()}`);
    console.log(`   Today UTC: ${todayKeyUTC} (excluded from average)`);
    console.log(`   Complete days: ${completeDays.length}`);
    console.log(`   Total transactions in complete days: ${completeDaysTransactions}`);
    console.log(`   Average: ${avgTxsPerDay} txs/day`);

    const totalMonthsActive = cache.monthlyTotals ? Object.keys(cache.monthlyTotals).length : 0;
    const avgTxsPerMonth = totalMonthsActive > 0 
      ? Math.round(cache.totalTransactions / totalMonthsActive)
      : 0;

    // Debug logging
    console.log('📊 Cache analysis debug:');
    console.log('dailyTotals keys:', cache.dailyTotals ? Object.keys(cache.dailyTotals).length : 0);
    console.log('monthlyTotals keys:', cache.monthlyTotals ? Object.keys(cache.monthlyTotals).length : 0);
    console.log('Sample daily data:', cache.dailyTotals ? Object.entries(cache.dailyTotals).slice(0, 3) : 'none');

    return {
      // Precise date-based data
      latestCompleteDate,
      latestCompleteDateFormatted,
      weeklyPeriod,
      monthlyPeriod,
      
      // Numerical data
      latestDayTxs,
      weeklyTxs,
      monthlyTxs,
      
      // Hourly data for the latest complete date
      hourlyData: (cache.recentHourly && cache.recentHourly[latestCompleteDate]) 
        ? Object.fromEntries(cache.recentHourly[latestCompleteDate].map((count, hour) => [hour, count]))
        : {},
      
      // Raw data for charts
      dailyData: cache.dailyTotals || {},
      monthlyData: cache.monthlyTotals || {},
      
      // Legacy compatibility (will be removed after frontend update)
      todayTxs: latestDayTxs,
      thisWeekTxs: weeklyTxs,
      thisMonthTxs: monthlyTxs,
      
      // Metadata
      totalDaysActive: cache.totalDaysActive || 0,
      avgTxsPerDay,
      avgTxsPerMonth
    };
  }

  private analyzeTransactions(txs: Transaction[]): any {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hourlyData: { [key: number]: number } = {};
    const dailyData: { [key: string]: number } = {};
    const monthlyData: { [key: string]: number } = {};

    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let todayTxs = 0;
    let thisWeekTxs = 0;
    let thisMonthTxs = 0;
    
    const daysWithTxs = new Set<string>();

    txs.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dayKey = txDate.toISOString().split('T')[0];
      const monthKey = txDate.getFullYear() + '-' + String(txDate.getMonth() + 1).padStart(2, '0');

      dailyData[dayKey] = (dailyData[dayKey] || 0) + 1;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      daysWithTxs.add(dayKey);

      if (txDate >= today) {
        const hour = txDate.getUTCHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
        todayTxs++;
      }

      if (txDate >= oneWeekAgo) {
        thisWeekTxs++;
      }

      if (txDate >= oneMonthAgo) {
        thisMonthTxs++;
      }
    });

    const totalDaysActive = daysWithTxs.size;
    const avgTxsPerDay = totalDaysActive > 0 ? Math.round(txs.length / totalDaysActive) : 0;

    return {
      hourlyData,
      dailyData,
      monthlyData,
      todayTxs,
      thisWeekTxs,
      thisMonthTxs,
      totalDaysActive,
      avgTxsPerDay
    };
  }

  public destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  // Método público para updates forçados (usado pelo Vercel Cron)
  public async forceUpdate(): Promise<void> {
    await this.updateCache();
  }
}

// Singleton instance
export const cacheManager = CacheManager.getInstance();