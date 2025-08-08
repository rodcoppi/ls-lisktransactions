import { NextResponse } from 'next/server';
import { cacheManager } from '@/lib/cache-manager';

export async function GET(request: Request) {
  try {
    // Verificar se a request vem do Vercel Cron (segurança básica)
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔄 Vercel Cron: Starting scheduled cache update...');
    
    // Forçar update do cache (método público para cron)
    await cacheManager.forceUpdate();

    const lastUpdate = cacheManager.getLastUpdateTime();
    const cachedData = cacheManager.getCachedData();

    return NextResponse.json({
      success: true,
      message: 'Cache updated successfully',
      lastUpdate,
      totalTransactions: cachedData?.totalTransactions || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Cron update failed:', error);
    return NextResponse.json({ 
      error: 'Cache update failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Permitir trigger manual via POST para debugging
  return GET(request);
}