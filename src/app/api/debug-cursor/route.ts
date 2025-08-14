import { NextRequest, NextResponse } from 'next/server';
import { cacheManagerV2 } from '@/lib/cache-manager-v2';

// Debug endpoint to investigate cursor and transaction fetching issues
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 DEBUG: Starting cursor investigation...');
    
    // Get current cache data
    const currentData = cacheManagerV2.getCachedData();
    const cache = (cacheManagerV2 as any).loadCacheV2();
    
    // Fetch latest transactions directly from blockchain
    const CONTRACT_ADDRESS = "0xf18485f75551FFCa4011C32a0885ea8C22336840";
    const response = await fetch(`https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions?page=1`);
    const blockchainData = await response.json();
    
    const latestTx = blockchainData.items?.[0];
    
    console.log('🔍 Current cursor info:', cache?.cursor);
    console.log('🔍 Latest blockchain tx:', latestTx?.timestamp, 'Block:', latestTx?.block);
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      debug: {
        currentCache: {
          latestCompleteDate: currentData?.analysis?.latestCompleteDate,
          totalTransactions: currentData?.totalTransactions,
          dailyDataKeys: Object.keys(currentData?.analysis?.dailyData || {}),
          lastUpdate: currentData?.lastUpdate
        },
        cursor: cache?.cursor || 'No cursor found',
        blockchain: {
          latestTransaction: {
            timestamp: latestTx?.timestamp,
            block_number: latestTx?.block_number,
            hash: latestTx?.hash,
            from: latestTx?.from?.hash,
            value: latestTx?.value
          },
          totalItemsInResponse: blockchainData.items?.length || 0,
          hasNextPage: !!blockchainData.next_page_params
        },
        comparison: {
          cursorBlock: cache?.cursor?.lastBlockNumber,
          latestBlock: latestTx?.block_number,
          blockGap: latestTx?.block_number ? latestTx.block_number - (cache?.cursor?.lastBlockNumber || 0) : null,
          shouldHaveNewData: latestTx?.block_number ? latestTx.block_number > (cache?.cursor?.lastBlockNumber || 0) : false
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Debug cursor failed:', error);
    
    return NextResponse.json(
      { 
        error: 'Debug cursor failed',
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