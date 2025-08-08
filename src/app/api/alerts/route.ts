import { NextRequest, NextResponse } from 'next/server';
import { realtimeMonitor } from '@/lib/realtime/monitoring';

/**
 * Alerts management endpoint
 * GET /api/alerts - Get active alerts and alert rules
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'active'; // 'active', 'rules', 'all'

  try {
    const response: any = {};

    if (type === 'active' || type === 'all') {
      response.activeAlerts = realtimeMonitor.getActiveAlerts();
    }

    if (type === 'rules' || type === 'all') {
      response.alertRules = realtimeMonitor.getAlertRules();
    }

    if (type === 'all') {
      response.healthScore = realtimeMonitor.getHealthScore();
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Failed to get alerts:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve alerts' },
      { status: 500 }
    );
  }
}

/**
 * Alert actions endpoint
 * POST /api/alerts - Manage alerts (acknowledge, resolve, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, alertRuleId } = body;

    switch (action) {
      case 'acknowledge':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required for acknowledgment' },
            { status: 400 }
          );
        }
        
        const acknowledged = realtimeMonitor.acknowledgeAlert(alertId);
        return NextResponse.json({
          success: acknowledged,
          message: acknowledged ? 'Alert acknowledged' : 'Alert not found',
        });

      case 'resolve':
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID required for resolution' },
            { status: 400 }
          );
        }
        
        const resolved = realtimeMonitor.resolveAlert(alertId);
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Alert resolved' : 'Alert not found',
        });

      case 'addRule':
        if (!body.rule) {
          return NextResponse.json(
            { error: 'Alert rule configuration required' },
            { status: 400 }
          );
        }
        
        const ruleId = realtimeMonitor.addAlertRule(body.rule);
        return NextResponse.json({
          success: true,
          ruleId,
          message: 'Alert rule added',
        });

      case 'removeRule':
        if (!alertRuleId) {
          return NextResponse.json(
            { error: 'Alert rule ID required for removal' },
            { status: 400 }
          );
        }
        
        const removed = realtimeMonitor.removeAlertRule(alertRuleId);
        return NextResponse.json({
          success: removed,
          message: removed ? 'Alert rule removed' : 'Alert rule not found',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Failed to handle alert action:', error);
    return NextResponse.json(
      { error: 'Failed to process alert action' },
      { status: 500 }
    );
  }
}