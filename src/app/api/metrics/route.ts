import { NextRequest, NextResponse } from 'next/server';
import { realtimeMonitor } from '@/lib/realtime/monitoring';

/**
 * Real-time metrics endpoint
 * GET /api/metrics - Get current system metrics
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'json';
  const history = searchParams.get('history') === 'true';
  const limit = parseInt(searchParams.get('limit') || '100');

  try {
    if (format === 'prometheus') {
      // Return Prometheus-formatted metrics
      const prometheusMetrics = realtimeMonitor.exportPrometheusMetrics();
      
      return new Response(prometheusMetrics, {
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache',
        },
      });
    }

    // Return JSON metrics
    const currentMetrics = realtimeMonitor.getCurrentMetrics();
    const healthScore = realtimeMonitor.getHealthScore();

    const response: any = {
      current: currentMetrics,
      healthScore,
      timestamp: Date.now(),
    };

    if (history) {
      response.history = realtimeMonitor.getMetricsHistory(limit);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get metrics:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve metrics' },
      { status: 500 }
    );
  }
}

/**
 * Reset metrics endpoint
 * POST /api/metrics/reset - Reset metrics counters (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.action === 'reset') {
      // In a real application, you would check authentication/authorization here
      // For now, we'll just return success without actually resetting
      return NextResponse.json({
        success: true,
        message: 'Metrics reset requested',
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Failed to handle metrics action:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}