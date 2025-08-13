import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';
import { HistoricalDataManager } from '@/lib/historical-data-manager';

export async function POST(request: NextRequest) {
  try {
    // Security: Check for auth token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.AUTO_UPDATE_TOKEN;
    
    if (!expectedToken) {
      console.error('❌ AUTO_UPDATE_TOKEN not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      console.error('❌ Unauthorized auto-update attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔄 AUTO-UPDATE: Quick daily update started');
    
    // Quick update - just fetch latest transactions (no full resync)
    await cacheManagerV2.forceUpdate();
    
    // STEP 3: Save historical snapshot
    try {
      const contractData = cacheManagerV2.getCachedData();
      if (contractData) {
        await HistoricalDataManager.saveDailySnapshot(contractData);
        console.log('📊 Historical snapshot saved');
      }
    } catch (histError) {
      console.error('⚠️ Failed to save historical data:', histError);
      // Don't fail the entire update if historical save fails
    }
    
    console.log('✅ AUTO-UPDATE: Daily update completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'AUTO-UPDATE: Quick daily update completed',
      timestamp: new Date().toISOString(),
      trigger: 'github-actions'
    });
    
  } catch (error) {
    console.error('❌ AUTO-UPDATE: Failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Auto-update failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET method for health check
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'AUTO-UPDATE endpoint ready',
    timestamp: new Date().toISOString(),
    note: 'Use POST with Authorization header to trigger update'
  });
}