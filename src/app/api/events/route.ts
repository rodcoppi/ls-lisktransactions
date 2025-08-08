import { NextRequest, NextResponse } from 'next/server';
import { EventType, RealtimeEvent, EventPriority, SubscriptionFilter } from '@/types';
import { eventBus } from '@/lib/realtime/event-bus';
import { messageFilter } from '@/lib/realtime/filters';
import { realtimeMonitor } from '@/lib/realtime/monitoring';
import { defaultCompressor } from '@/lib/realtime/compression';

interface SSEConnection {
  id: string;
  clientId: string;
  controller: ReadableStreamDefaultController;
  subscriptions: Set<string>;
  lastPing: number;
  isAlive: boolean;
}

const connections = new Map<string, SSEConnection>();
const PING_INTERVAL = 30000; // 30 seconds
const CONNECTION_TIMEOUT = 180000; // 3 minutes

// Cleanup inactive connections periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, connection] of connections.entries()) {
    if (now - connection.lastPing > CONNECTION_TIMEOUT) {
      cleanupConnection(id);
    }
  }
}, 60000); // Check every minute

/**
 * SSE endpoint for real-time event streaming
 * GET /api/events - Establish SSE connection with optional filters
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Extract connection parameters
  const clientId = searchParams.get('clientId') || generateClientId();
  const eventTypes = searchParams.get('eventTypes')?.split(',') as EventType[] | undefined;
  const channelId = searchParams.get('channelId') || undefined;
  const priority = searchParams.get('priority') ? parseInt(searchParams.get('priority')!) : undefined;
  const compress = searchParams.get('compress') === 'true';

  // Validate event types
  if (eventTypes) {
    for (const eventType of eventTypes) {
      if (!Object.values(EventType).includes(eventType)) {
        return NextResponse.json(
          { error: `Invalid event type: ${eventType}` },
          { status: 400 }
        );
      }
    }
  }

  try {
    // Create readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = generateConnectionId();
        
        // Create connection record
        const connection: SSEConnection = {
          id: connectionId,
          clientId,
          controller,
          subscriptions: new Set(),
          lastPing: Date.now(),
          isAlive: true,
        };

        connections.set(connectionId, connection);
        realtimeMonitor.recordConnectionEvent('connect', { clientId });

        // Send initial connection acknowledgment
        sendSSEMessage(controller, {
          id: generateEventId(),
          type: EventType.CONNECTION_STATUS,
          data: {
            connectionId,
            clientId,
            status: 'connected',
            timestamp: Date.now(),
          },
          timestamp: Date.now(),
          priority: EventPriority.HIGH,
        }, compress);

        // Set up subscriptions based on filters
        const subscriptionFilter: SubscriptionFilter = {
          eventTypes: eventTypes || Object.values(EventType),
          clientId,
          channelId,
          priority,
        };

        // Create filter rule for this connection
        const filterRuleId = messageFilter.createSubscriptionFilter(subscriptionFilter);
        connection.subscriptions.add(filterRuleId);

        // Subscribe to filtered events
        const subscriptionId = eventBus.subscribeAll(async (event) => {
          try {
            // Apply connection-specific filtering
            const filterResult = messageFilter.processEvent(event);
            
            if (!filterResult.allowed) {
              return; // Event filtered out
            }

            const eventToSend = filterResult.transformed || event;
            
            if (connection.isAlive) {
              sendSSEMessage(controller, eventToSend, compress);
            }
          } catch (error) {
            console.error(`Error sending event to connection ${connectionId}:`, error);
            realtimeMonitor.recordError(error as Error, 'sse_send');
          }
        }, {
          filter: subscriptionFilter,
          priority: EventPriority.NORMAL,
        });

        connection.subscriptions.add(subscriptionId);

        // Set up ping mechanism
        const pingInterval = setInterval(() => {
          if (connection.isAlive) {
            sendPing(connection);
          } else {
            clearInterval(pingInterval);
            cleanupConnection(connectionId);
          }
        }, PING_INTERVAL);

        // Handle connection close
        request.signal.addEventListener('abort', () => {
          connection.isAlive = false;
          clearInterval(pingInterval);
          cleanupConnection(connectionId);
        });
      },

      cancel() {
        // This is called when the connection is closed
        // Cleanup is handled by the abort event listener
      }
    });

    // Return SSE response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET',
      },
    });

  } catch (error) {
    console.error('SSE connection setup failed:', error);
    realtimeMonitor.recordError(error as Error, 'sse_setup', true);

    return NextResponse.json(
      { error: 'Failed to establish SSE connection' },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for publishing events (for testing/admin)
 * POST /api/events - Publish event to all subscribers
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate event data
    if (!body.type || !Object.values(EventType).includes(body.type)) {
      return NextResponse.json(
        { error: 'Invalid or missing event type' },
        { status: 400 }
      );
    }

    const event: RealtimeEvent = {
      id: body.id || generateEventId(),
      type: body.type,
      data: body.data || {},
      timestamp: body.timestamp || Date.now(),
      priority: body.priority || EventPriority.NORMAL,
      retry: body.retry || 0,
      clientId: body.clientId,
      channelId: body.channelId,
    };

    // Publish event through event bus
    await eventBus.publish(event.type, event.data, event);

    // Record metrics
    const eventSize = JSON.stringify(event).length;
    realtimeMonitor.recordEvent(event, 0, eventSize);

    return NextResponse.json({
      success: true,
      eventId: event.id,
      timestamp: event.timestamp,
    });

  } catch (error) {
    console.error('Event publishing failed:', error);
    realtimeMonitor.recordError(error as Error, 'event_publish');

    return NextResponse.json(
      { error: 'Failed to publish event' },
      { status: 500 }
    );
  }
}

/**
 * Send SSE message to client
 */
async function sendSSEMessage(
  controller: ReadableStreamDefaultController, 
  event: RealtimeEvent, 
  compress = false
): Promise<void> {
  try {
    let data = event.data;

    // Apply compression if requested and data is large enough
    if (compress) {
      const message = {
        event: event.type,
        data: event.data,
        timestamp: event.timestamp,
      };
      
      const compressedMessage = await defaultCompressor.compress(message);
      if (compressedMessage.compressed) {
        data = compressedMessage.data;
      }
    }

    // Format SSE message
    const sseData = JSON.stringify({
      id: event.id,
      type: event.type,
      data,
      timestamp: event.timestamp,
      priority: event.priority,
      compressed: compress,
    });

    // Send as SSE event
    const message = `event: ${event.type}\ndata: ${sseData}\nid: ${event.id}\n\n`;
    
    controller.enqueue(new TextEncoder().encode(message));

    // Update metrics
    realtimeMonitor.recordLatency(Date.now() - event.timestamp);

  } catch (error) {
    console.error('Failed to send SSE message:', error);
    realtimeMonitor.recordError(error as Error, 'sse_send');
    throw error;
  }
}

/**
 * Send ping to maintain connection
 */
function sendPing(connection: SSEConnection): void {
  try {
    const pingData = JSON.stringify({
      type: 'ping',
      id: generateEventId(),
      timestamp: Date.now(),
    });

    const message = `event: ping\ndata: ${pingData}\n\n`;
    connection.controller.enqueue(new TextEncoder().encode(message));
    connection.lastPing = Date.now();

  } catch (error) {
    console.error(`Failed to send ping to connection ${connection.id}:`, error);
    connection.isAlive = false;
  }
}

/**
 * Clean up connection and subscriptions
 */
function cleanupConnection(connectionId: string): void {
  const connection = connections.get(connectionId);
  if (!connection) return;

  try {
    // Mark connection as dead
    connection.isAlive = false;

    // Unsubscribe from all events
    connection.subscriptions.forEach(subscriptionId => {
      eventBus.unsubscribe(subscriptionId);
      messageFilter.removeRule(subscriptionId);
    });

    // Remove from connections map
    connections.delete(connectionId);

    // Close controller if still active
    try {
      connection.controller.close();
    } catch (error) {
      // Controller might already be closed
    }

    // Record disconnection
    realtimeMonitor.recordConnectionEvent('disconnect', { 
      clientId: connection.clientId 
    });

    console.log(`Cleaned up SSE connection: ${connectionId}`);

  } catch (error) {
    console.error(`Error cleaning up connection ${connectionId}:`, error);
  }
}

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique client ID
 */
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Health check endpoint for SSE connections
 * GET /api/events/health - Get connection health metrics
 */
export async function OPTIONS(request: NextRequest) {
  // CORS preflight
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Cache-Control',
      'Access-Control-Max-Age': '86400',
    },
  });
}