import { NextRequest, NextResponse } from 'next/server';
import { simpleDailyCacheManager } from '@/lib/simple-daily-cache';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('🚀 API SIMPLES SYNC: Iniciando...');

    // STEP 1: Verificar se precisa de update diário normal
    const needsRegularUpdate = simpleDailyCacheManager.needsUpdate();
    
    // STEP 2: Executar proteção contra gaps automaticamente
    const protectionActivated = await simpleDailyCacheManager.forceResyncIfNeeded();
    
    // STEP 3: Se não houve proteção E precisa de update regular, fazer update
    if (!protectionActivated && needsRegularUpdate) {
      console.log('⏰ Update diário regular necessário...');
      await simpleDailyCacheManager.fetchAllDataFromBlockscout();
    }
    
    // STEP 4: Retornar dados atualizados
    const data = simpleDailyCacheManager.getFormattedData();
    
    const processingTime = Date.now() - startTime;
    
    return NextResponse.json({
      success: true,
      message: protectionActivated 
        ? 'Proteção ativada - Re-sincronização completa realizada'
        : needsRegularUpdate 
          ? 'Update diário regular completado'
          : 'Dados já atualizados',
      data,
      meta: {
        processingTime: `${processingTime}ms`,
        protectionActivated,
        regularUpdateNeeded: needsRegularUpdate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ API SIMPLES SYNC ERROR:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Falha na sincronização simples',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      meta: {
        processingTime: `${Date.now() - startTime}ms`,
        timestamp: new Date().toISOString()
      }
    }, { status: 500 });
  }
}