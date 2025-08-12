import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';
import { HistoricalDataManager } from '@/lib/historical-data-manager';

// Reset cache endpoint - forces complete rebuild from scratch
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 CACHE RESET: Starting complete rebuild from scratch');
    console.log('🧹 This will ignore cursor and reprocess ALL blockchain transactions');
    
    // Clear cache and force cold start
    await cacheManagerV2.clearCache();
    
    // Force complete rebuild from scratch (ignoring cursor)
    await cacheManagerV2.forceUpdate();
    
    // Get fresh data and verify it worked
    const contractData = cacheManagerV2.getCachedData();
    const cache = (cacheManagerV2 as any).loadCacheV2();
    
    if (contractData) {
      await HistoricalDataManager.saveDailySnapshot(contractData);
      console.log('📊 Fresh historical data snapshot saved');
    }
    
    console.log('✅ Cache reset and rebuild completed successfully');
    console.log(`📊 New cursor: Block ${cache?.cursor?.lastBlockNumber}`);
    console.log(`📊 Latest complete date: ${contractData?.analysis?.latestCompleteDate}`);
    console.log(`📊 Total transactions: ${contractData?.totalTransactions}`);
    
    return NextResponse.json({
      success: true,
      message: 'Cache reset and rebuild completed successfully',
      timestamp: new Date().toISOString(),
      totalTransactions: contractData?.totalTransactions || 0,
      latestCompleteDate: contractData?.analysis?.latestCompleteDate,
      dailyData: contractData?.analysis?.dailyData || {},
      newCursor: cache?.cursor,
      rebuilt: true,
      debug: {
        oldProblem: 'Cursor was stuck at block 19,946,055',
        solution: 'Forced full rebuild ignoring cursor',
        expectedFix: 'Should now capture transactions from day 9-11'
      }
    });
    
  } catch (error) {
    console.error('❌ Cache reset failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Cache reset failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}