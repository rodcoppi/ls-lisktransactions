import { NextRequest, NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache-manager';

// 🎲 LuckySea Analytics - Daily Cache Update Cron Job
// Runs at 00:00 UTC daily to fetch new transactions
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Cron job started: Daily cache update');
    
    // Basic security check (optional)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('🚫 Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Force cache update
    await cacheManager.forceUpdate();
    
    console.log('✅ Cron job completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Cache updated successfully',
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