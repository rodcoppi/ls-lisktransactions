import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';
import { HistoricalDataManager } from '@/lib/historical-data-manager';

// 🎲 LuckySea Analytics - Daily Cache Update Cron Job
// Runs at 00:00 UTC daily to fetch new transactions
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Cron job started: Daily cache update com PROTEÇÃO V2');
    
    // STEP 1: Executar proteção automática contra gaps
    const protectionActivated = await cacheManagerV2.autoProtectAgainstGaps();
    
    // STEP 2: Se não houve proteção, executar update normal
    if (!protectionActivated) {
      await cacheManagerV2.forceUpdate();
    }
    
    // Save historical snapshot
    try {
      const contractData = cacheManagerV2.getCachedData();
      if (contractData) {
        await HistoricalDataManager.saveDailySnapshot(contractData);
        console.log('📊 Historical data snapshot saved');
      }
    } catch (histError) {
      console.error('⚠️ Failed to save historical data:', histError);
      // Don't fail the cron job if historical save fails
    }
    
    console.log('✅ Cron job completed successfully');
    
    return NextResponse.json({
      success: true,
      message: protectionActivated 
        ? 'CRON V2: Proteção anti-gap ativada - Re-sync completa realizada'
        : 'CRON V2: Update diário normal completado',
      protection_activated: protectionActivated,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update cache',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Vercel cron jobs use GET method
export async function POST(request: NextRequest) {
  return GET(request);
}