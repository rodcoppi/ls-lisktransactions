import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test if frontend can reach this endpoint
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: 'Frontend debug endpoint working',
      environment: process.env.NODE_ENV,
      headers: Object.fromEntries(request.headers.entries()),
      test: {
        simpleData: {
          totalTransactions: 50969,
          analysis: {
            latestCompleteDate: '2025-08-13',
            latestDayTxs: 0,
            dailyData: { '2025-08-13': 0 },
            hourlyData: {},
            todayTxs: 0,
            thisWeekTxs: 100,
            thisMonthTxs: 1000,
            totalDaysActive: 5,
            avgTxsPerDay: 200,
            avgTxsPerMonth: 6000
          },
          lastUpdate: new Date().toISOString(),
          cached: true
        }
      }
    });
    
  } catch (error) {
    console.error('Frontend debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}