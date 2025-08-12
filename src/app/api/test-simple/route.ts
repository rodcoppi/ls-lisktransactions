import { NextRequest, NextResponse } from 'next/server';
import { simpleDailyCacheManager } from '@/lib/simple-daily-cache';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 TESTE SIMPLES: Iniciando testes...');

    // Step 1: Check existing cache
    const existingCache = simpleDailyCacheManager.loadSimpleCache();
    console.log('Cache existente:', existingCache ? 'Encontrado' : 'Nenhum');

    // Step 2: Check if update needed
    const needsUpdate = simpleDailyCacheManager.needsUpdate();
    console.log('Precisa update:', needsUpdate);

    // Step 3: Check for gaps
    const gapCheck = simpleDailyCacheManager.detectTransactionGaps();
    console.log('Gaps detectados:', gapCheck.hasGaps);

    // Step 4: Return test results
    return NextResponse.json({
      success: true,
      test_results: {
        existing_cache_found: !!existingCache,
        cache_info: existingCache ? {
          totalTransactions: existingCache.totalTransactions,
          lastUpdateDate: existingCache.lastUpdateDate,
          daysOfData: existingCache.dailyData.length,
          generatedAt: existingCache.generatedAt
        } : null,
        needs_update: needsUpdate,
        gap_check: gapCheck,
        formatted_data_available: !!simpleDailyCacheManager.getFormattedData()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no teste simples:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}