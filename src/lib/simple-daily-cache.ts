import fs from 'fs';
import path from 'path';

const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const SIMPLE_CACHE_FILE = path.join(process.cwd(), 'src/data/simple-daily-cache.json');
const TEMP_SIMPLE_CACHE = '/tmp/simple-daily-cache.json';

interface DailyData {
  date: string;
  transactions: number;
  hours: { [hour: number]: number };
}

interface SimpleDailyCache {
  lastUpdateDate: string;
  totalTransactions: number;
  dailyData: DailyData[];
  generatedAt: string;
}

export class SimpleDailyCacheManager {
  private static instance: SimpleDailyCacheManager;
  private readonly MAX_EXPECTED_DAILY_TXS = 50000; // Limite esperado por dia
  private readonly MIN_EXPECTED_DAILY_TXS = 10; // Mínimo esperado em dias ativos

  static getInstance(): SimpleDailyCacheManager {
    if (!SimpleDailyCacheManager.instance) {
      SimpleDailyCacheManager.instance = new SimpleDailyCacheManager();
    }
    return SimpleDailyCacheManager.instance;
  }

  /**
   * Conecta na API do Blockscout uma vez por dia e busca TODOS os dados
   * Sistema simples conforme solicitado pelo usuário
   */
  public async fetchAllDataFromBlockscout(): Promise<SimpleDailyCache> {
    console.log('🔥 SISTEMA SIMPLES: Conectando na API do Blockscout...');
    
    const allTransactions: any[] = [];
    let page = 1;
    let hasMorePages = true;

    // Buscar TODAS as transações da blockchain
    while (hasMorePages && page <= 100) { // Limite de segurança
      const url = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?page=${page}`;
      console.log(`📄 Buscando página ${page}...`);

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.items && data.items.length > 0) {
          // Filtrar apenas transações válidas
          const validTxs = data.items.filter((tx: any) => 
            tx.status === 'ok' && 
            tx.to && 
            tx.to.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
          );

          allTransactions.push(...validTxs);
          console.log(`✅ Página ${page}: +${validTxs.length} transações válidas`);

          hasMorePages = !!data.next_page_params;
          page++;
        } else {
          hasMorePages = false;
        }
      } catch (error) {
        console.error(`❌ Erro na página ${page}:`, error);
        break;
      }
    }

    console.log(`📊 Total de transações coletadas: ${allTransactions.length}`);

    // Processar dados por dia
    const dailyMap: { [date: string]: DailyData } = {};

    allTransactions.forEach(tx => {
      const txDate = new Date(tx.timestamp);
      const dateKey = txDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const hour = txDate.getUTCHours();

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          transactions: 0,
          hours: {}
        };
      }

      dailyMap[dateKey].transactions++;
      dailyMap[dateKey].hours[hour] = (dailyMap[dateKey].hours[hour] || 0) + 1;
    });

    // Converter para array ordenado
    const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const cache: SimpleDailyCache = {
      lastUpdateDate: new Date().toISOString().split('T')[0],
      totalTransactions: allTransactions.length,
      dailyData,
      generatedAt: new Date().toISOString()
    };

    this.saveSimpleCache(cache);

    console.log(`✅ SISTEMA SIMPLES COMPLETO: ${allTransactions.length} transações processadas`);
    console.log(`📅 Dados disponíveis de ${dailyData[0]?.date} até ${dailyData[dailyData.length - 1]?.date}`);

    return cache;
  }

  private saveSimpleCache(cache: SimpleDailyCache): void {
    try {
      const saveFile = process.env.NODE_ENV === 'production' ? TEMP_SIMPLE_CACHE : SIMPLE_CACHE_FILE;
      
      const dir = path.dirname(saveFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(saveFile, JSON.stringify(cache, null, 2));
      console.log(`💾 Cache simples salvo: ${cache.totalTransactions} transações`);
    } catch (error) {
      console.error('❌ Erro ao salvar cache simples:', error);
    }
  }

  public loadSimpleCache(): SimpleDailyCache | null {
    try {
      // Em produção, tentar cache temporário primeiro
      if (process.env.NODE_ENV === 'production') {
        if (fs.existsSync(TEMP_SIMPLE_CACHE)) {
          const data = fs.readFileSync(TEMP_SIMPLE_CACHE, 'utf8');
          return JSON.parse(data);
        }
      }
      
      // Tentar arquivo de cache padrão
      if (fs.existsSync(SIMPLE_CACHE_FILE)) {
        const data = fs.readFileSync(SIMPLE_CACHE_FILE, 'utf8');
        return JSON.parse(data);
      }
      
      console.warn('⚠️ Nenhum cache simples encontrado');
      return null;
    } catch (error) {
      console.error('❌ Erro ao carregar cache simples:', error);
      return null;
    }
  }

  /**
   * Verifica se precisa atualizar (uma vez por dia)
   */
  public needsUpdate(): boolean {
    const cache = this.loadSimpleCache();
    if (!cache) return true;

    const today = new Date().toISOString().split('T')[0];
    const needsUpdate = cache.lastUpdateDate !== today;

    console.log(`🔍 Verificando necessidade de atualização:`);
    console.log(`📅 Hoje: ${today}`);
    console.log(`📅 Última atualização: ${cache.lastUpdateDate}`);
    console.log(`🔄 Precisa atualizar: ${needsUpdate ? 'SIM' : 'NÃO'}`);

    return needsUpdate;
  }

  /**
   * PROTEÇÃO: Detecta gaps de transações e força re-sincronização
   * Se não houver transações da blockchain para um dia que deveria ter, resynca
   */
  public detectTransactionGaps(): { hasGaps: boolean; gapDetails: string[] } {
    const cache = this.loadSimpleCache();
    if (!cache || cache.dailyData.length === 0) {
      return { hasGaps: false, gapDetails: [] };
    }

    const gapDetails: string[] = [];
    const today = new Date().toISOString().split('T')[0];
    
    // Verificar se há dias sem transações quando era esperado ter
    const sortedDays = cache.dailyData.sort((a, b) => a.date.localeCompare(b.date));
    const firstDay = new Date(sortedDays[0].date);
    const todayDate = new Date(today);

    console.log(`🔍 DETECÇÃO DE GAPS: Analisando de ${sortedDays[0].date} até hoje (${today})`);

    // Verificar cada dia desde o primeiro registro
    for (let d = new Date(firstDay); d < todayDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = sortedDays.find(day => day.date === dateStr);
      
      if (!dayData) {
        gapDetails.push(`❌ ${dateStr}: Dia completamente ausente dos dados`);
      } else if (dayData.transactions === 0) {
        gapDetails.push(`⚠️ ${dateStr}: 0 transações (pode ser gap da blockchain)`);
      } else if (dayData.transactions < this.MIN_EXPECTED_DAILY_TXS) {
        gapDetails.push(`⚠️ ${dateStr}: Apenas ${dayData.transactions} transações (suspeito)`);
      }
    }

    // Verificar padrões suspeitos nos últimos 7 dias
    const recentDays = sortedDays.slice(-7);
    const avgRecentTxs = recentDays.reduce((sum, day) => sum + day.transactions, 0) / recentDays.length;

    recentDays.forEach(day => {
      if (day.transactions > 0 && day.transactions < (avgRecentTxs * 0.1)) {
        gapDetails.push(`🚨 ${day.date}: ${day.transactions} txs é muito baixo comparado à média (${Math.round(avgRecentTxs)})`);
      }
    });

    const hasGaps = gapDetails.length > 0;

    if (hasGaps) {
      console.log(`🚨 GAPS DETECTADOS (${gapDetails.length}):`);
      gapDetails.forEach(gap => console.log(gap));
    } else {
      console.log(`✅ Nenhum gap detectado nos dados`);
    }

    return { hasGaps, gapDetails };
  }

  /**
   * PROTEÇÃO: Força re-sincronização quando detecta problemas
   */
  public async forceResyncIfNeeded(): Promise<boolean> {
    console.log(`🛡️ PROTEÇÃO: Verificando necessidade de re-sincronização...`);
    
    const gapCheck = this.detectTransactionGaps();
    
    if (gapCheck.hasGaps) {
      console.log(`🔥 PROTEÇÃO ATIVADA: Gaps detectados, forçando re-sincronização completa...`);
      console.log(`📋 Problemas encontrados:`);
      gapCheck.gapDetails.forEach(detail => console.log(`   ${detail}`));
      
      try {
        await this.fetchAllDataFromBlockscout();
        console.log(`✅ PROTEÇÃO: Re-sincronização completa realizada com sucesso`);
        return true;
      } catch (error) {
        console.error(`❌ PROTEÇÃO: Falha na re-sincronização:`, error);
        return false;
      }
    } else {
      console.log(`✅ PROTEÇÃO: Dados íntegros, nenhuma re-sincronização necessária`);
      return false;
    }
  }

  /**
   * Retorna dados formatados compatíveis com o sistema existente
   */
  public getFormattedData(): any {
    const cache = this.loadSimpleCache();
    if (!cache) {
      console.warn('⚠️ No cache found, returning empty data structure');
      return {
        totalTransactions: 0,
        lastUpdate: new Date().toISOString(),
        cached: false,
        analysis: {
          latestCompleteDate: null,
          latestCompleteDateFormatted: 'No data available',
          latestDayTxs: 0,
          weeklyTxs: 0,
          monthlyTxs: 0,
          weeklyPeriod: 'No data',
          monthlyPeriod: 'No data',
          dailyData: {},
          recentHourly: {},
          totalDaysActive: 0
        }
      };
    }

    // Encontrar data mais recente completa (excluindo hoje)
    const today = new Date().toISOString().split('T')[0];
    const completeDays = cache.dailyData.filter(day => day.date < today);
    const latestCompleteDate = completeDays[completeDays.length - 1]?.date;

    // Preparar dados diários
    const dailyData: { [date: string]: number } = {};
    const recentHourly: { [date: string]: { [hour: number]: number } } = {};

    cache.dailyData.forEach(day => {
      dailyData[day.date] = day.transactions;
      recentHourly[day.date] = day.hours;
    });

    // Calcular métricas da semana atual
    const weeklyTxs = completeDays
      .slice(-7)
      .reduce((sum, day) => sum + day.transactions, 0);

    // Calcular métricas do mês atual
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const monthlyTxs = completeDays
      .filter(day => day.date.startsWith(currentMonth))
      .reduce((sum, day) => sum + day.transactions, 0);

    return {
      totalTransactions: cache.totalTransactions,
      lastUpdate: cache.generatedAt,
      cached: true,
      analysis: {
        latestCompleteDate,
        latestCompleteDateFormatted: latestCompleteDate ? 
          new Date(latestCompleteDate + 'T00:00:00Z').toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'UTC'
          }) : 'Sem dados completos',
        latestDayTxs: completeDays[completeDays.length - 1]?.transactions || 0,
        weeklyTxs,
        monthlyTxs,
        weeklyPeriod: `Últimos 7 dias completos`,
        monthlyPeriod: `${currentMonth} (até agora)`,
        dailyData,
        recentHourly,
        totalDaysActive: completeDays.length
      }
    };
  }
}

// Instância singleton
export const simpleDailyCacheManager = SimpleDailyCacheManager.getInstance();