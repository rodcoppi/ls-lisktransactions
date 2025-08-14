import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';
import { findMissingDays, isDayComplete, getDayTimestampRange } from '@/lib/logic';

export async function GET(request: NextRequest) {
  try {
    const cache = (cacheManagerV2 as any).loadCacheV2();
    
    if (!cache) {
      return NextResponse.json({ 
        error: 'No cache found',
        timestamp: new Date().toISOString()
      });
    }

    const nowUTC = new Date();
    const missingDays = findMissingDays(cache, nowUTC);
    
    // Generate debug info for each missing day
    const debugInfo = missingDays.map(dayKey => {
      const { start, end } = getDayTimestampRange(dayKey);
      const dayDate = new Date(dayKey + 'T00:00:00.000Z');
      
      return {
        dayKey,
        isComplete: isDayComplete(dayDate, nowUTC),
        timestampRange: { start, end },
        hasDataInCache: !!cache.dailyTotals[dayKey],
        currentTotal: cache.dailyTotals[dayKey] || 0,
        currentStatus: cache.dailyStatus?.[dayKey] || 'unknown'
      };
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        currentCache: {
          lastUpdate: cache.lastUpdate,
          totalTransactions: cache.totalTransactions,
          latestCompleteDate: Object.keys(cache.dailyTotals || {}).sort().pop()
        },
        missingDaysDetected: missingDays.length,
        missingDays: debugInfo,
        todayUTC: nowUTC.toISOString(),
        cacheKeys: Object.keys(cache.dailyTotals || {}).sort()
      }
    });
    
  } catch (error) {
    console.error('Debug missing days error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}