export type DayStatus = 'complete' | 'partial' | 'unknown';

export interface OptimizedCacheV2 {
  schemaVersion: string;
  generatedAtUTC: string;
  source: string;
  integrity: string;
  
  // Data structures
  dailyTotals: Record<string, number>;
  dailyStatus: Record<string, DayStatus>;
  monthlyTotals: Record<string, number>;
  recentHourly: Record<string, number[]>; // Always 24 slots
  
  // Cursor for robust pagination
  cursor: { 
    lastBlockNumber: number; 
    lastTxIndex: number; 
    lastTxHash: string;
  };
  
  // Metadata
  lastUpdate: string;
  totalTransactions: number;
  totalDaysActive: number;
}

// UTC date utilities
export const toUTCDateKey = (d: Date): string => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const startOfUTCDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export const addUTCDays = (d: Date, n: number): Date =>
  new Date(startOfUTCDay(d).getTime() + n * 86400_000);

export const formatDateLongUTC = (dateKey: string): string => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dd = String(d).padStart(2, '0');
  const date = new Date(Date.UTC(y, m - 1, d));
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${dd} ${month}, ${y}`;
};

// Legacy interface for backward compatibility
export interface OptimizedCache {
  dailyTotals: { [date: string]: number };
  monthlyTotals: { [month: string]: number };
  recentHourly: { [date: string]: number[] };
  lastUpdate: string;
  lastBlockNumber: number;
  totalTransactions: number;
  totalDaysActive: number;
}

// Transaction interface
export interface Transaction {
  hash: string;
  timestamp: string;
  block: number;
  method: string;
  gas_used: string;
  fee: { value: string };
  to: string;
  status: any; // Can be boolean, string, or number
  txIndex?: number; // For cursor
}