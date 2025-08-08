/**
 * K6 WebSocket Real-time Connection Testing
 * Tests 10,000+ simultaneous WebSocket connections for real-time updates
 */

import ws from 'k6/ws';
import { check, sleep, group } from 'k6';
import { Counter, Gauge, Trend, Rate } from 'k6/metrics';
import { 
  customMetrics, 
  environment, 
  testData, 
  utils 
} from '../config.js';

// WebSocket specific metrics
const wsConnectionsActive = new Gauge('ws_connections_active');
const wsConnectionTime = new Trend('ws_connection_time');
const wsMessageLatency = new Trend('ws_message_latency');
const wsMessagesReceived = new Counter('ws_messages_received');
const wsMessagesSent = new Counter('ws_messages_sent');
const wsConnectionErrors = new Counter('ws_connection_errors');
const wsReconnections = new Counter('ws_reconnections');

// Test configuration for WebSocket load testing
export let options = {
  scenarios: {
    // WebSocket connection stress test
    websocket_connections: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },    // Initial connections
        { duration: '1m', target: 200 },    // Ramp up
        { duration: '2m', target: 500 },    // Medium load
        { duration: '3m', target: 1000 },   // High load
        { duration: '5m', target: 2500 },   // Very high load
        { duration: '10m', target: 5000 },  // Maximum load
        { duration: '15m', target: 10000 }, // Peak load (10k connections)
        { duration: '10m', target: 5000 },  // Scale down
        { duration: '2m', target: 0 },      // Cleanup
      ],
      gracefulRampDown: '30s',
      tags: { testType: 'websocket_stress' },
    },
    
    // WebSocket message throughput test
    websocket_messaging: {
      executor: 'constant-vus',
      vus: 1000,
      duration: '10m',
      tags: { testType: 'websocket_messaging' },
    },
    
    // WebSocket stability test (long duration)
    websocket_stability: {
      executor: 'constant-vus',
      vus: 500,
      duration: '30m',
      tags: { testType: 'websocket_stability' },
    },
  },
  
  thresholds: {
    // WebSocket connection thresholds
    'ws_connection_time': [
      'p(95)<100',      // Connection time < 100ms
      'p(99)<200',      // 99th percentile < 200ms
    ],
    
    // Message latency thresholds
    'ws_message_latency': [
      'p(95)<50',       // Message latency < 50ms
      'p(99)<100',      // 99th percentile < 100ms
    ],
    
    // Connection success rate
    'ws_connection_errors': [
      'rate<0.01',      // < 1% connection errors
    ],
    
    // Message delivery reliability
    'checks{scenario:websocket_messaging}': [
      'rate>0.99',      // > 99% successful message delivery
    ],
  },
};

// Message types for testing different scenarios
const messageTypes = [
  'metrics_update',
  'alert_notification', 
  'system_event',
  'user_activity',
  'performance_data',
  'health_check',
];

// Setup function
export function setup() {
  console.log('Starting WebSocket Real-time Test Setup');
  console.log(`Environment: ${utils.getEnvironment()}`);
  console.log(`WebSocket URL: ${getWebSocketUrl()}`);
  
  return {
    wsUrl: getWebSocketUrl(),
    startTime: Date.now(),
  };
}

// Main test function
export default function(data) {
  const wsUrl = data.wsUrl;
  const connectionStart = Date.now();
  
  group('WebSocket Connection Tests', function() {
    testWebSocketConnection(wsUrl, connectionStart);
  });
}

/**
 * Test WebSocket connection and messaging
 */
function testWebSocketConnection(wsUrl, connectionStart) {
  const res = ws.connect(wsUrl, {
    headers: {
      'Origin': utils.getBaseUrl(),
      'User-Agent': 'K6-WebSocket-LoadTest/1.0',
    },
    tags: { protocol: 'websocket' },
  }, function(socket) {
    
    const connectionTime = Date.now() - connectionStart;
    wsConnectionTime.add(connectionTime);
    wsConnectionsActive.add(1);
    
    // Connection established successfully
    socket.on('open', function() {
      console.log(`WebSocket connection established in ${connectionTime}ms`);
      
      // Subscribe to different channels
      subscribeToChannels(socket);
      
      // Start message testing based on scenario
      const testType = __ENV.TEST_TYPE || 'mixed';
      switch (testType) {
        case 'messaging':
          startMessagingTest(socket);
          break;
        case 'stability':
          startStabilityTest(socket);
          break;
        default:
          startMixedTest(socket);
      }
    });
    
    // Handle incoming messages
    socket.on('message', function(message) {
      handleIncomingMessage(socket, message);
    });
    
    // Handle connection errors
    socket.on('error', function(e) {
      console.error('WebSocket error:', e.error());
      wsConnectionErrors.add(1);
    });
    
    // Handle connection close
    socket.on('close', function() {
      wsConnectionsActive.add(-1);
      console.log('WebSocket connection closed');
    });
    
    // Keep connection alive for test duration
    const testDuration = parseInt(__ENV.WS_TEST_DURATION) || 60;
    sleep(testDuration);
  });
  
  check(res, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}

/**
 * Subscribe to various channels for comprehensive testing
 */
function subscribeToChannels(socket) {
  const channels = [
    'metrics.system',
    'alerts.critical', 
    'events.user',
    'performance.realtime',
    'health.status'
  ];
  
  channels.forEach(channel => {
    const subscribeMessage = {
      type: 'subscribe',
      channel: channel,
      timestamp: Date.now(),
    };
    
    socket.send(JSON.stringify(subscribeMessage));
    wsMessagesSent.add(1);
  });
}

/**
 * Start messaging throughput test
 */
function startMessagingTest(socket) {
  const messageInterval = parseInt(__ENV.WS_MESSAGE_INTERVAL) || 1000;
  const messagesPerSecond = 1000 / messageInterval;
  
  console.log(`Starting messaging test: ${messagesPerSecond} msg/sec`);
  
  const messageTimer = setInterval(() => {
    sendTestMessage(socket);
  }, messageInterval);
  
  // Cleanup timer when test ends
  setTimeout(() => {
    clearInterval(messageTimer);
  }, 60000);
}

/**
 * Start stability test (long-running connections)
 */
function startStabilityTest(socket) {
  console.log('Starting stability test (30 minutes)');
  
  // Send periodic heartbeat messages
  const heartbeatInterval = setInterval(() => {
    const heartbeat = {
      type: 'heartbeat',
      timestamp: Date.now(),
      connectionId: socket.id || 'unknown',
    };
    
    socket.send(JSON.stringify(heartbeat));
    wsMessagesSent.add(1);
  }, 30000); // Every 30 seconds
  
  // Send random messages at varying intervals
  const randomMessageInterval = setInterval(() => {
    if (Math.random() < 0.3) { // 30% chance
      sendTestMessage(socket);
    }
  }, 5000);
  
  // Cleanup after 30 minutes
  setTimeout(() => {
    clearInterval(heartbeatInterval);
    clearInterval(randomMessageInterval);
  }, 30 * 60 * 1000);
}

/**
 * Start mixed test (combination of messaging and stability)
 */
function startMixedTest(socket) {
  const testPattern = Math.random();
  
  if (testPattern < 0.4) {
    // 40% - High frequency messaging
    startHighFrequencyMessaging(socket);
  } else if (testPattern < 0.7) {
    // 30% - Medium frequency messaging  
    startMediumFrequencyMessaging(socket);
  } else {
    // 30% - Low frequency messaging (stability focused)
    startLowFrequencyMessaging(socket);
  }
}

/**
 * High frequency messaging pattern
 */
function startHighFrequencyMessaging(socket) {
  const interval = setInterval(() => {
    sendTestMessage(socket);
  }, 500); // Every 500ms
  
  setTimeout(() => clearInterval(interval), 60000);
}

/**
 * Medium frequency messaging pattern
 */
function startMediumFrequencyMessaging(socket) {
  const interval = setInterval(() => {
    sendTestMessage(socket);
  }, 2000); // Every 2 seconds
  
  setTimeout(() => clearInterval(interval), 60000);
}

/**
 * Low frequency messaging pattern
 */
function startLowFrequencyMessaging(socket) {
  const interval = setInterval(() => {
    sendTestMessage(socket);
  }, 10000); // Every 10 seconds
  
  setTimeout(() => clearInterval(interval), 60000);
}

/**
 * Send a test message
 */
function sendTestMessage(socket) {
  const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
  const message = {
    type: messageType,
    data: generateTestData(messageType),
    timestamp: Date.now(),
    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };
  
  socket.send(JSON.stringify(message));
  wsMessagesSent.add(1);
}

/**
 * Generate test data based on message type
 */
function generateTestData(messageType) {
  switch (messageType) {
    case 'metrics_update':
      return {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 1000,
      };
      
    case 'alert_notification':
      return {
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)],
        message: 'Test alert notification',
        source: 'load_test',
      };
      
    case 'system_event':
      return {
        event: 'system_status_change',
        status: ['online', 'degraded', 'offline'][Math.floor(Math.random() * 3)],
        component: 'test_component',
      };
      
    case 'user_activity':
      return {
        userId: Math.floor(Math.random() * 10000),
        action: 'page_view',
        page: '/dashboard',
      };
      
    case 'performance_data':
      return {
        endpoint: '/api/metrics',
        responseTime: Math.random() * 200,
        statusCode: [200, 201, 400, 500][Math.floor(Math.random() * 4)],
      };
      
    case 'health_check':
      return {
        status: 'healthy',
        services: {
          database: 'up',
          cache: 'up',
          api: 'up',
        },
      };
      
    default:
      return { test: true, random: Math.random() };
  }
}

/**
 * Handle incoming messages and measure latency
 */
function handleIncomingMessage(socket, message) {
  wsMessagesReceived.add(1);
  
  try {
    const parsedMessage = JSON.parse(message);
    const messageTimestamp = parsedMessage.timestamp;
    
    // Calculate message latency if timestamp available
    if (messageTimestamp) {
      const latency = Date.now() - messageTimestamp;
      wsMessageLatency.add(latency);
    }
    
    // Validate message structure
    const isValid = check(parsedMessage, {
      'message has type': (msg) => msg.type !== undefined,
      'message has timestamp': (msg) => msg.timestamp !== undefined,
      'message has valid structure': (msg) => typeof msg === 'object',
    });
    
    // Handle specific message types
    if (parsedMessage.type === 'heartbeat_response') {
      // Connection is healthy
    } else if (parsedMessage.type === 'error') {
      console.error('Server error:', parsedMessage.message);
      wsConnectionErrors.add(1);
    } else if (parsedMessage.type === 'subscription_confirmed') {
      console.log(`Subscribed to channel: ${parsedMessage.channel}`);
    }
    
  } catch (error) {
    console.error('Failed to parse message:', error);
    wsConnectionErrors.add(1);
  }
}

/**
 * Get WebSocket URL based on environment
 */
function getWebSocketUrl() {
  const baseUrl = utils.getBaseUrl();
  const wsProtocol = baseUrl.startsWith('https') ? 'wss' : 'ws';
  const wsUrl = baseUrl.replace(/^https?/, wsProtocol);
  
  return `${wsUrl}${environment.endpoints.websocket}`;
}

/**
 * Teardown function
 */
export function teardown(data) {
  const endTime = Date.now();
  const duration = endTime - data.startTime;
  
  console.log(`WebSocket Real-time Test completed in ${duration}ms`);
  console.log('WebSocket metrics summary:');
  console.log(`- Messages sent: ${wsMessagesSent.count}`);
  console.log(`- Messages received: ${wsMessagesReceived.count}`);
  console.log(`- Connection errors: ${wsConnectionErrors.count}`);
  console.log(`- Reconnections: ${wsReconnections.count}`);
  
  // Calculate message delivery rate
  const deliveryRate = wsMessagesReceived.count / Math.max(wsMessagesSent.count, 1);
  console.log(`- Message delivery rate: ${(deliveryRate * 100).toFixed(2)}%`);
}