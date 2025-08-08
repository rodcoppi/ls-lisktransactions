# ADR-004: Event-Driven Real-Time Updates

**Status**: Accepted  
**Date**: 2025-08-06  
**Deciders**: Architecture Team

## Context

The dashboard system requires real-time updates to display live metrics and
respond to data changes without page refreshes. We need a solution that scales
well and maintains consistency across multiple client connections.

## Decision

We will implement an event-driven architecture using:

### WebSocket Communication

- **Next.js API Routes**: WebSocket server implementation
- **Client-side WebSocket**: Real-time bidirectional communication
- **Connection Management**: Automatic reconnection and heartbeat

### Event Bus Pattern

```typescript
class EventBus {
  private static instance: EventBus
  private emitter = new EventEmitter()

  publish(event: EventType, data: any): void
  subscribe(event: EventType, handler: Function): void
  unsubscribe(event: EventType, handler: Function): void
}
```

### Event Types

```typescript
enum EventType {
  METRICS_UPDATED = 'metrics.updated',
  CHART_RENDERED = 'chart.rendered',
  USER_INTERACTION = 'user.interaction',
  CACHE_INVALIDATED = 'cache.invalidated',
  SYSTEM_STATUS_CHANGED = 'system.status.changed'
}
```

### Observer Pattern Implementation

- Components subscribe to relevant events
- Automatic cleanup on component unmount
- Selective updates to minimize re-renders

### Message Queue Integration

- **Redis Pub/Sub**: Cross-instance event distribution
- **Event Persistence**: Critical events stored for replay
- **Dead Letter Queue**: Failed event handling

## Real-Time Data Flow

1. **Data Source**: External API or database change
2. **Event Generation**: System publishes event to event bus
3. **Event Distribution**: Redis pub/sub distributes to all instances
4. **Client Notification**: WebSocket sends update to subscribed clients
5. **UI Update**: React components update based on received events

## Connection Management

### Client-side

```typescript
class WebSocketManager {
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  connect(): void
  disconnect(): void
  subscribe(channel: string): void
  unsubscribe(channel: string): void
  private handleReconnection(): void
}
```

### Server-side

```typescript
class ConnectionManager {
  private connections: Map<string, WebSocket> = new Map()

  addConnection(userId: string, socket: WebSocket): void
  removeConnection(userId: string): void
  broadcastToUser(userId: string, message: any): void
  broadcastToChannel(channel: string, message: any): void
}
```

## Alternatives Considered

### Option 1: Server-Sent Events (SSE)

```
Pros: Simple implementation, automatic reconnection
Cons: Unidirectional, limited browser connections
```

**Rejected**: Limited to one-way communication

### Option 2: HTTP Polling

```
Pros: Simple to implement, works with all proxies
Cons: High latency, resource intensive
```

**Rejected**: Poor user experience and resource usage

### Option 3: GraphQL Subscriptions

```
Pros: Type-safe, integrated with GraphQL schema
Cons: Additional complexity, learning curve
```

**Deferred**: Consider for future iterations

## Event Sourcing Considerations

### Event Store

- Events stored in TimescaleDB for audit and replay
- Immutable event log for system state reconstruction
- Event versioning for backward compatibility

### Event Replay

- Ability to replay events for debugging
- State reconstruction from event log
- Temporal queries on system state

## Consequences

### Positive

- **Real-time Experience**: Immediate updates without page refresh
- **Scalability**: Event-driven architecture scales horizontally
- **Decoupling**: Components loosely coupled through events
- **Auditability**: Complete event log for debugging and compliance
- **Resilience**: Automatic reconnection and error handling

### Negative

- **Complexity**: Event-driven systems are harder to debug
- **Resource Usage**: WebSocket connections consume server resources
- **State Management**: Ensuring consistency across distributed events
- **Testing Complexity**: Asynchronous event flows are harder to test

### Risk Mitigation

- **Circuit Breakers**: Prevent cascade failures
- **Rate Limiting**: Protect against event storms
- **Monitoring**: Comprehensive event flow monitoring
- **Graceful Degradation**: Fall back to polling if WebSocket fails

### Performance Considerations

- **Connection Pooling**: Efficient WebSocket connection management
- **Message Batching**: Reduce message frequency for high-volume events
- **Selective Subscriptions**: Only subscribe to relevant events
- **Memory Management**: Proper cleanup of event handlers
