import { NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';

export async function GET() {
  try {
    console.log('🔍 API V2 route called, checking cache...');
    const cachedData = cacheManagerV2.getCachedData();
    
    if (!cachedData) {
      console.log('❌ No cached data available yet in V2');
      return NextResponse.json({ 
        error: 'Data not ready yet. Cache V2 is being initialized in background.',
        totalTransactions: 0,
        analysis: {
          latestCompleteDate: null,
          latestCompleteDateFormatted: 'No complete data available',
          latestDayTxs: 0,
          weeklyTxs: 0,
          monthlyTxs: 0,
          weeklyPeriod: 'No complete data',
          monthlyPeriod: 'No complete data',
          hourlyData: {},
          dailyData: {},
          monthlyData: {},
          recentHourly: {},
          dailyStatus: {},
          todayTxs: 0,
          thisWeekTxs: 0,
          thisMonthTxs: 0,
          totalDaysActive: 0,
          avgTxsPerDay: 0,
          avgTxsPerMonth: 0
        },
        lastUpdate: new Date().toISOString(),
        schemaVersion: '1.2.0'
      });
    }

    console.log('✅ Returning V2 cached data:', {
      totalTransactions: cachedData.totalTransactions,
      schemaVersion: cachedData.schemaVersion,
      latestComplete: cachedData.analysis?.latestCompleteDate
    });
    
    return NextResponse.json(cachedData);

  } catch (error) {
    console.error('❌ Error fetching contract data V2:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch contract data V2',
      totalTransactions: 0,
      analysis: {
        latestCompleteDate: null,
        latestCompleteDateFormatted: 'Error loading data',
        latestDayTxs: 0,
        weeklyTxs: 0,
        monthlyTxs: 0,
        weeklyPeriod: 'Error loading data',
        monthlyPeriod: 'Error loading data',
        hourlyData: {},
        dailyData: {},
        monthlyData: {},
        recentHourly: {},
        dailyStatus: {},
        todayTxs: 0,
        thisWeekTxs: 0,
        thisMonthTxs: 0,
        totalDaysActive: 0,
        avgTxsPerDay: 0,
        avgTxsPerMonth: 0
      },
      lastUpdate: new Date().toISOString(),
      schemaVersion: '1.2.0'
    }, { status: 500 });
  }
}