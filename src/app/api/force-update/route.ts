import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';
import { HistoricalDataManager } from '@/lib/historical-data-manager';

// Emergency force update endpoint
export async function GET(request: NextRequest) {
  try {
    console.log('🚨 Emergency force update started');
    
    // Force cache update using V2
    await cacheManagerV2.forceUpdate();
    
    // Save historical snapshot
    const contractData = cacheManagerV2.getCachedData();
    if (contractData) {
      await HistoricalDataManager.saveDailySnapshot(contractData);
      console.log('📊 Emergency historical data snapshot saved');
    }
    
    console.log('✅ Emergency force update completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Emergency update completed successfully',
      timestamp: new Date().toISOString(),
      totalTransactions: contractData?.totalTransactions || 0,
      latestCompleteDate: contractData?.analysis?.latestCompleteDate
    });
    
  } catch (error) {
    console.error('❌ Emergency force update failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Emergency update failed',
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