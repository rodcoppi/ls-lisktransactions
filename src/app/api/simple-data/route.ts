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
    
    // PROCESSAMENTO SIMPLES E DIRETO
    const dailyTotals = cache.dailyTotals || {};
    const totalTransactions = Object.values(dailyTotals).reduce((a: number, b: number) => a + b, 0);
    
    // ENCONTRAR ÚLTIMO DIA (ONTEM = HOJE-1)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toISOString().split('T')[0];
    
    const latestDayTxs = dailyTotals[yesterdayKey] || 0;
    
    // CALCULAR SEMANA E MÊS
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
    return NextResponse.json({
      totalTransactions,
      latestCompleteDate: yesterdayKey,
      latestCompleteDateFormatted: yesterday.toLocaleDateString('en-US', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }),
      latestDayTxs,
      weeklyTxs,
      monthlyTxs,
      dailyTotals,
      totalDaysActive: Object.keys(dailyTotals).length,
      avgTxsPerDay: Math.round(totalTransactions / Object.keys(dailyTotals).length),
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