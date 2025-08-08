import { useState, useEffect, useCallback, useRef } from 'react';
import { EventType, RealtimeEvent, ConnectionStatus, EventPriority, SubscriptionFilter } from '@/types';
import { SSEClient, SSEClientFactory } from '@/lib/realtime/sse';
import { WebSocketClient, WebSocketPool } from '@/lib/realtime/websocket';
import { connectionManager } from '@/lib/realtime/connection-manager';
import { realtimeMonitor } from '@/lib/realtime/monitoring';

export interface UseRealtimeOptions {
  enabled?: boolean;
  transport?: 'sse' | 'websocket' | 'auto';
  subscriptions?: EventType[];
  filter?: Partial<SubscriptionFilter>;
  autoReconnect?: boolean;
  compression?: boolean;
  onError?: (error: Error) => void;
  onConnect?: (connectionId: string) => void;
  onDisconnect?: (connectionId: string) => void;
}

export interface UseRealtimeReturn<T = any> {
  data: T | null;
  events: RealtimeEvent[];
  isConnected: boolean;
  connectionStatus: ConnectionStatus | null;
  latency: number | undefined;
  error: Error | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  subscribe: (eventType: EventType, handler: (event: RealtimeEvent<T>) => void) => string;
  unsubscribe: (subscriptionId: string) => void;
  sendMessage: (message: any) => Promise<void>;
  clearEvents: () => void;
  retry: () => void;
}

/**
 * React hook for real-time data consumption with SSE/WebSocket support
 * Provides automatic reconnection, error handling, and state management
 */
export function useRealtime<T = any>(options: UseRealtimeOptions = {}): UseRealtimeReturn<T> {
  const {
    enabled = true,
    transport = 'auto',
    subscriptions = [],
    filter = {},
    autoReconnect = true,
    compression = false,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  // State management
  const [data, setData] = useState<T | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [latency, setLatency] = useState<number | undefined>();

  // Refs for cleanup and connection management
  const connectionIdRef = useRef<string | null>(null);
  const clientRef = useRef<SSEClient | WebSocketClient | null>(null);
  const eventHandlersRef = useRef<Map<string, (event: RealtimeEvent) => void>>(new Map());
  const mountedRef = useRef(true);

  // Connection management
  const connect = useCallback(async () => {
    if (!enabled || connectionIdRef.current) return;

    try {
      setError(null);

      // Create connection through connection manager
      const connectionId = await connectionManager.createConnection(
        `client_${Date.now()}`,
        {
          preferredTransport: transport === 'auto' ? undefined : transport,
          subscriptions,
        }
      );

      if (!mountedRef.current) return;

      connectionIdRef.current = connectionId;
      setIsConnected(true);

      // Set up event listeners
      const client = transport === 'websocket' 
        ? new WebSocketClient({ url: '/api/ws' })
        : SSEClientFactory.getClient('/api/events', {
            headers: {
              'X-Client-ID': connectionId,
            },
          });

      clientRef.current = client;

      // Handle connection status changes
      client.subscribe(EventType.CONNECTION_STATUS, (event) => {
        if (!mountedRef.current) return;

        const status = client.getStatus();
        setConnectionStatus(status);
        setLatency(status.latency);

        if (status.status === 'connected') {
          setIsConnected(true);
          onConnect?.(connectionId);
        } else if (status.status === 'disconnected') {
          setIsConnected(false);
          onDisconnect?.(connectionId);
        }
      });

      // Handle errors
      client.subscribe(EventType.ERROR_OCCURRED, (event) => {
        if (!mountedRef.current) return;

        const errorObj = new Error(event.data.message || 'Real-time connection error');
        setError(errorObj);
        onError?.(errorObj);
        realtimeMonitor.recordError(errorObj, 'realtime_hook');
      });

      // Subscribe to requested event types
      subscriptions.forEach(eventType => {
        const handlerId = client.subscribe(eventType, (event) => {
          if (!mountedRef.current) return;

          // Apply additional filtering
          if (filter.clientId && event.clientId !== filter.clientId) return;
          if (filter.channelId && event.channelId !== filter.channelId) return;
          if (filter.priority !== undefined && event.priority < filter.priority) return;

          // Update state
          setData(event.data);
          setEvents(prevEvents => {
            const newEvents = [...prevEvents, event];
            // Keep only last 100 events to prevent memory issues
            return newEvents.slice(-100);
          });

          // Record metrics
          const eventSize = JSON.stringify(event).length;
          realtimeMonitor.recordEvent(event, Date.now() - event.timestamp, eventSize);
        });

        eventHandlersRef.current.set(`${eventType}_default`, handlerId);
      });

      await client.connect();

    } catch (err) {
      if (!mountedRef.current) return;

      const errorObj = err instanceof Error ? err : new Error('Connection failed');
      setError(errorObj);
      onError?.(errorObj);
      realtimeMonitor.recordError(errorObj, 'realtime_connect');

      // Auto-retry if enabled
      if (autoReconnect) {
        setTimeout(() => {
          if (mountedRef.current && !connectionIdRef.current) {
            connect();
          }
        }, 5000);
      }
    }
  }, [enabled, transport, subscriptions, filter, autoReconnect, onConnect, onDisconnect, onError]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (connectionIdRef.current) {
      connectionManager.closeConnection(connectionIdRef.current);
      connectionIdRef.current = null;
    }

    if (clientRef.current) {
      if ('disconnect' in clientRef.current) {
        clientRef.current.disconnect();
      }
      clientRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus(null);
    setError(null);
    eventHandlersRef.current.clear();
  }, []);

  // Subscribe to additional events
  const subscribe = useCallback((eventType: EventType, handler: (event: RealtimeEvent<T>) => void) => {
    if (!clientRef.current) {
      throw new Error('Not connected to real-time service');
    }

    const subscriptionId = clientRef.current.subscribe(eventType, handler as any);
    const handlerKey = `${eventType}_${Date.now()}`;
    eventHandlersRef.current.set(handlerKey, handler as any);
    
    return handlerKey;
  }, []);

  // Unsubscribe from events
  const unsubscribe = useCallback((subscriptionId: string) => {
    if (clientRef.current) {
      // For SSE/WebSocket clients, we need to handle this differently
      // This is a simplified implementation
      eventHandlersRef.current.delete(subscriptionId);
    }
  }, []);

  // Send message (WebSocket only)
  const sendMessage = useCallback(async (message: any) => {
    if (!connectionIdRef.current) {
      throw new Error('Not connected to real-time service');
    }

    const event: RealtimeEvent = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: EventType.STATS_UPDATED, // Default event type
      data: message,
      timestamp: Date.now(),
      priority: EventPriority.NORMAL,
    };

    await connectionManager.sendMessage(connectionIdRef.current, event);
  }, []);

  // Clear events history
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Retry connection
  const retry = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [disconnect, connect]);

  // Effect to handle connection lifecycle
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [disconnect]);

  return {
    data,
    events,
    isConnected,
    connectionStatus,
    latency,
    error,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    sendMessage,
    clearEvents,
    retry,
  };
}

/**
 * Hook for subscribing to specific real-time events
 */
export function useRealtimeEvent<T = any>(
  eventType: EventType,
  options: Omit<UseRealtimeOptions, 'subscriptions'> = {}
): UseRealtimeReturn<T> {
  return useRealtime<T>({
    ...options,
    subscriptions: [eventType],
  });
}

/**
 * Hook for real-time dashboard statistics
 */
export function useRealtimeDashboard() {
  const { data, isConnected, error, retry } = useRealtimeEvent(EventType.STATS_UPDATED, {
    autoReconnect: true,
    compression: true,
  });

  return {
    stats: data,
    isConnected,
    error,
    retry,
  };
}

/**
 * Hook for real-time transaction count updates
 */
export function useRealtimeTransactionCount() {
  const { data, isConnected, error, events } = useRealtimeEvent(EventType.TRANSACTION_COUNT_UPDATED, {
    autoReconnect: true,
  });

  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (data && typeof data === 'object' && 'count' in data) {
      setCount(data.count as number);
    }
  }, [data]);

  return {
    count,
    isConnected,
    error,
    history: events.map(e => ({
      count: e.data.count,
      timestamp: e.timestamp,
    })),
  };
}

/**
 * Hook for real-time system health monitoring
 */
export function useRealtimeHealth() {
  const { data, isConnected, error } = useRealtimeEvent(EventType.SYSTEM_HEALTH, {
    autoReconnect: true,
  });

  const [metrics, setMetrics] = useState(null);
  const [healthScore, setHealthScore] = useState(100);

  useEffect(() => {
    if (data) {
      setMetrics(data);
      setHealthScore(data.healthScore || 100);
    }
  }, [data]);

  return {
    metrics,
    healthScore,
    isConnected,
    error,
  };
}

/**
 * Hook for real-time alert notifications
 */
export function useRealtimeAlerts() {
  const { events, isConnected, error } = useRealtimeEvent(EventType.ALERT_NOTIFICATION, {
    autoReconnect: true,
  });

  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    setAlerts(events.map(e => e.data));
  }, [events]);

  return {
    alerts,
    isConnected,
    error,
    latestAlert: alerts[alerts.length - 1] || null,
  };
}

/**
 * Hook for managing connection status across the application
 */
export function useConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Get initial metrics
    const updateMetrics = () => {
      const currentMetrics = realtimeMonitor.getCurrentMetrics();
      setMetrics(currentMetrics);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    status,
    metrics,
    isHealthy: status?.status === 'connected',
    latency: status?.latency,
  };
}