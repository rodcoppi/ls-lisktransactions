import { NextRequest, NextResponse } from 'next/server';
import { HistoricalDataManager } from '@/lib/historical-data-manager';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const analytics = searchParams.get('analytics') === 'true';
    
    let data;
    
    if (startDate && endDate) {
      // Get data for specific date range
      data = HistoricalDataManager.getHistoricalData(startDate, endDate);
    } else if (days) {
      // Get last N days
      data = HistoricalDataManager.getLastNDays(parseInt(days));
    } else {
      // Get all historical data
      data = HistoricalDataManager.getAllHistoricalData();
    }
    
    const response: any = {
      success: true,
      data,
      count: data.length,
      dateRange: data.length > 0 ? {
        from: data[0].date,
        to: data[data.length - 1].date
      } : null
    };
    
    // Include analytics if requested
    if (analytics && data.length > 0) {
      response.analytics = HistoricalDataManager.calculateHistoricalAnalytics(data);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Historical data API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch historical data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}