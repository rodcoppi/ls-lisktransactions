import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // LEITURA DIRETA DO CACHE - SEM BULLSHIT
    const cacheFile = path.join(process.cwd(), 'src/data/contract-cache-v2.json');
    
    if (!fs.existsSync(cacheFile)) {
      return NextResponse.json({ error: 'Cache file not found' });
    }
    
    const rawData = fs.readFileSync(cacheFile, 'utf8');
    const cache = JSON.parse(rawData);
    
    // BUSCAR TOTAL REAL DA BLOCKCHAIN
    const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
    let blockchainTotalTransactions = 0;
    
    try {
      const response = await fetch(`https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/counters`);
      if (response.ok) {
        const data = await response.json();
        blockchainTotalTransactions = parseInt(data.transactions_count) || 0;
      }
    } catch (error) {
      console.warn('Failed to fetch blockchain total, using cache fallback');
    }
    
    // PROCESSAMENTO SIMPLES E DIRETO
    const dailyTotals = cache.dailyTotals || {};
    const totalTransactions = blockchainTotalTransactions || Object.values(dailyTotals).reduce((a: number, b: unknown) => a + (b as number), 0);
    
    // ENCONTRAR ÚLTIMO DIA COM DADOS (ignorar dias sem atividade)
    const dailyStatus = cache.dailyStatus || {};
    const sortedDates = Object.keys(dailyTotals).sort().reverse();
    
    // Procurar o último dia que tem transações (> 0) ou está marcado como "complete" ou "incomplete_data"
    const lastCompleteDate = sortedDates.find(date => {
      const hasTransactions = (dailyTotals[date] || 0) > 0;
      const hasValidStatus = dailyStatus[date] === 'complete' || dailyStatus[date] === 'incomplete_data';
      return hasTransactions || hasValidStatus;
    }) || sortedDates[1] || sortedDates[0];
    const lastCompleteKey = lastCompleteDate;
    
    const latestDayTxs = dailyTotals[lastCompleteKey] || 0;
    
    // CALCULAR SEMANA E MÊS
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    
    let weeklyTxs = 0;
    let monthlyTxs = 0;
    
    Object.entries(dailyTotals).forEach(([dateKey, txCount]) => {
      const date = new Date(dateKey);
      if (date >= weekAgo) weeklyTxs += txCount as number;
      if (date >= monthAgo) monthlyTxs += txCount as number;
    });
    
    // RESPOSTA LIMPA E DIRETA
    const lastCompleteFormatted = new Date(lastCompleteKey + 'T00:00:00Z').toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      timeZone: 'UTC'
    });
    
    return NextResponse.json({
      totalTransactions,
      latestCompleteDate: lastCompleteKey,
      latestCompleteDateFormatted: lastCompleteFormatted,
      latestDayTxs,
      weeklyTxs,
      monthlyTxs,
      dailyTotals,
      recentHourly: cache.recentHourly || {},
      dailyStatus: cache.dailyStatus || {},
      totalDaysActive: Object.keys(dailyTotals).length,
      avgTxsPerDay: (() => {
        // Calculate days since deploy (August 4, 2025) and divide total by (days - 1)
        const deployDate = new Date('2025-08-04');
        const today = new Date();
        const diffTime = today.getTime() - deployDate.getTime();
        const daysSinceDeploy = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return Math.round(totalTransactions / Math.max(1, daysSinceDeploy - 1));
      })(),
      lastUpdate: cache.lastUpdate || new Date().toISOString(),
      success: true
    });
    
  } catch (error) {
    console.error('❌ Simple data API failed:', error);
    return NextResponse.json({ 
      error: 'Failed to load simple data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}