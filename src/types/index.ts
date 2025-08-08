// Global type definitions

export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LiskTransaction {
  id: string;
  blockId: string;
  height: number;
  timestamp: number;
  senderId: string;
  recipientId: string;
  amount: string;
  fee: string;
  signature: string;
  type: number;
}

export interface LiskAccount {
  address: string;
  publicKey: string;
  balance: string;
  nonce: string;
  username?: string;
}

export interface DashboardStats {
  totalTransactions: number;
  totalAccounts: number;
  totalBlocks: number;
  avgBlockTime: number;
  networkStatus: 'online' | 'offline' | 'syncing';
}

// Real-time system types
export interface RealtimeEvent<T = any> {
  id: string;
  type: EventType;
  data: T;
  timestamp: number;
  priority: EventPriority;
  retry?: number;
  clientId?: string;
  channelId?: string;
}

export enum EventType {
  TRANSACTION_COUNT_UPDATED = 'transaction.count.updated',
  STATS_UPDATED = 'stats.updated',
  ALERT_NOTIFICATION = 'alert.notification',
  CONNECTION_STATUS = 'connection.status',
  SYSTEM_HEALTH = 'system.health',
  BLOCK_MINED = 'block.mined',
  ACCOUNT_UPDATED = 'account.updated',
  ERROR_OCCURRED = 'error.occurred',
}

export enum EventPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3,
}

export interface ConnectionStatus {
  id: string;
  status: 'connected' | 'disconnected' | 'reconnecting' | 'error';
  lastSeen: number;
  reconnectAttempts: number;
  latency?: number;
  transport: 'sse' | 'websocket';
}

export interface RealtimeMessage {
  event: EventType;
  data: any;
  timestamp: number;
  compressed?: boolean;
  checksum?: string;
}

export interface SubscriptionFilter {
  eventTypes: EventType[];
  clientId?: string;
  channelId?: string;
  priority?: EventPriority;
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalThroughput: number;
  averageLatency: number;
}

export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  reconnections: number;
  averageLatency: number;
  messagesSent: number;
  messagesReceived: number;
  errors: number;
}

// Chart Data Types
export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  timestamp: number;
  [key: string]: number | string;
}

export interface TransactionTimeSeriesData extends TimeSeriesData {
  transactions: number;
  volume: number;
  fees: number;
  avgAmount: number;
  uniqueAddresses: number;
}

export interface VolumeAnalysisData {
  timestamp: number;
  totalVolume: number;
  incomingVolume: number;
  outgoingVolume: number;
  volumeChange: number;
  transactionCount: number;
}

export interface ComparisonData {
  period: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  label?: string;
}

export interface TransactionTypeDistribution {
  type: string;
  count: number;
  percentage: number;
  value: number;
  color?: string;
}

export interface MultiMetricData {
  timestamp: number;
  primary: number;
  secondary: number;
  tertiary?: number;
  quaternary?: number;
  [key: string]: number | string | undefined;
}

// Chart Component Props Types
export interface BaseChartProps {
  data: any[];
  width?: number | string;
  height?: number;
  loading?: boolean;
  error?: Error | null;
  theme?: 'light' | 'dark' | 'high-contrast';
  responsive?: boolean;
  animate?: boolean;
  className?: string;
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  exportEnabled?: boolean;
  onDataPointClick?: (data: any, index: number) => void;
  onZoom?: (domain: [number, number]) => void;
  onBrushChange?: (range: [number, number]) => void;
}

export interface LineChartProps extends BaseChartProps {
  data: TimeSeriesData[];
  xAxisKey: string;
  yAxisKey: string;
  additionalLines?: Array<{
    key: string;
    color?: string;
    strokeWidth?: number;
    strokeDashArray?: string;
  }>;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableBrush?: boolean;
  enableCrosshair?: boolean;
  smoothCurve?: boolean;
  connectNulls?: boolean;
  domain?: [number | 'auto', number | 'auto'];
}

export interface AreaChartProps extends BaseChartProps {
  data: VolumeAnalysisData[];
  areas: Array<{
    dataKey: string;
    stackId?: string;
    color?: string;
    gradient?: boolean;
  }>;
  stacked?: boolean;
  normalized?: boolean;
}

export interface BarChartProps extends BaseChartProps {
  data: ComparisonData[];
  xAxisKey: string;
  yAxisKey: string;
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  grouped?: boolean;
  maxBarSize?: number;
  barRadius?: number;
  showComparison?: boolean;
}

export interface ComposedChartProps extends BaseChartProps {
  data: MultiMetricData[];
  components: Array<{
    type: 'line' | 'bar' | 'area';
    dataKey: string;
    yAxisId?: string;
    color?: string;
    [key: string]: any;
  }>;
  enableDualYAxis?: boolean;
}

export interface PieChartProps extends BaseChartProps {
  data: TransactionTypeDistribution[];
  valueKey: string;
  labelKey: string;
  showLabels?: boolean;
  showValues?: boolean;
  donut?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
}

// Performance and Optimization Types
export interface ChartPerformanceMetrics {
  renderTime: number;
  dataProcessingTime: number;
  memoryUsage: number;
  frameRate: number;
  dataPointCount: number;
  lastUpdate: number;
}

export interface ChartOptimizationConfig {
  enableVirtualization: boolean;
  enableDecimation: boolean;
  enableMemoization: boolean;
  enableCanvasRendering: boolean;
  maxDataPoints: number;
  decimationFactor: number;
  updateThrottle: number;
}

// Export and Accessibility Types
export interface ChartExportOptions {
  format: 'png' | 'svg' | 'pdf';
  width?: number;
  height?: number;
  quality?: number;
  backgroundColor?: string;
  filename?: string;
}

export interface ChartAccessibilityConfig {
  ariaLabel?: string;
  ariaDescription?: string;
  keyboardNavigation: boolean;
  screenReaderSupport: boolean;
  highContrastMode: boolean;
  focusRing: boolean;
}