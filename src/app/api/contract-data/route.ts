import { NextResponse } from 'next/server';
import { cacheManager } from '../../../lib/cache-manager';

export async function GET() {
  try {
    console.log('🔍 API route called, checking cache...');
    const cachedData = cacheManager.getCachedData();
    
    if (!cachedData) {
      console.log('❌ No cached data available yet');
      return NextResponse.json({ 
        error: 'Data not ready yet. Cache is being initialized in background.',
        totalTransactions: 0,
        analysis: {
          hourlyData: {},
          dailyData: {},
          monthlyData: {},
          todayTxs: 0,
          thisWeekTxs: 0,
          thisMonthTxs: 0,
          totalDaysActive: 0,
          avgTxsPerDay: 0,
          avgTxsPerMonth: 0
        },
        lastUpdate: new Date().toISOString()
      });
    }

    console.log('✅ Returning cached data:', cachedData.totalTransactions, 'transactions');
    return NextResponse.json(cachedData);

  } catch (error) {
    console.error('❌ Error fetching contract data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contract data',
      totalTransactions: 0,
      analysis: {
        hourlyData: {},
        dailyData: {},
        monthlyData: {},
        todayTxs: 0,
        thisWeekTxs: 0,
        thisMonthTxs: 0,
        totalDaysActive: 0,
        avgTxsPerDay: 0,
        avgTxsPerMonth: 0
      },
      lastUpdate: new Date().toISOString()
    }, { status: 500 });
  }
}

