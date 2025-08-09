import { NextResponse } from 'next/server';
import { fix0808Data } from '@/scripts/fix-0808-data';

export async function POST(request: Request) {
  try {
    // Simple token check (in production, use proper auth)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.includes('admin-token-2025')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🩹 Admin triggered 08/08 data fix');
    
    // Execute the fix
    await fix0808Data();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Data fix completed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin fix failed:', error);
    return NextResponse.json({ 
      error: 'Data fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET method for status check
export async function GET() {
  return NextResponse.json({
    endpoint: 'fix-0808-data',
    description: 'Manually fix the 08/08 incomplete transaction data',
    method: 'POST',
    auth: 'Bearer admin-token-2025',
    status: 'ready'
  });
}