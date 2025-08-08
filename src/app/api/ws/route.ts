import { NextRequest, NextResponse } from 'next/server';

/**
 * WebSocket endpoint information
 * This endpoint provides information about WebSocket connectivity
 * since Next.js App Router doesn't directly support WebSocket servers
 */
export async function GET(request: NextRequest) {
  const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'wss' : 'ws';
  const host = request.headers.get('host') || 'localhost:3000';
  
  return NextResponse.json({
    websocketUrl: `${protocol}://${host}/api/ws`,
    fallbackUrl: '/api/events',
    protocols: ['realtime-v1'],
    supportedFeatures: [
      'bidirectional-communication',
      'automatic-reconnection', 
      'message-compression',
      'heartbeat-monitoring',
      'priority-queuing'
    ],
    connectionLimits: {
      maxConnections: 1000,
      maxIdleTime: 300000, // 5 minutes
      heartbeatInterval: 30000 // 30 seconds
    }
  });
}

/**
 * WebSocket upgrade information for development
 * In production, this would be handled by a separate WebSocket server
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    message: 'WebSocket connections should be established through the WebSocket protocol',
    instructions: 'Use SSE endpoint at /api/events for real-time data streaming',
    fallbackAvailable: true
  }, { status: 400 });
}