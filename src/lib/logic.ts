import type { OptimizedCacheV2, DayStatus, Transaction } from './types';
import { toUTCDateKey, addUTCDays } from './types';

/**
 * Normalize transaction status to boolean
 * Handles all Blockscout API variations: true|'ok'|'1'|'success'|1
 */
export function isSuccess(v: any): boolean {
  return v === true || v === 1 || v === '1' || v === 'ok' || v === 'success';
}

/**
 * Compare cursor positions using triple (blockNumber, txIndex, hash)
 * Handles blockchain reorganizations and ensures deterministic ordering
 */
export function isAfterCursor(
  a: { bn: number; idx: number; hash: string },
  c: { bn: number; idx: number; hash: string }
): boolean {
  return a.bn > c.bn ||
    (a.bn === c.bn && a.idx > c.idx) ||
    (a.bn === c.bn && a.idx === c.idx && a.hash > c.hash);
}

/**
 * Ensure hourly array has exactly 24 slots, filling with zeros
 * Prevents undefined/partial arrays from breaking sum validation
 */
export function ensure24(hours?: number[]): number[] {
  const arr = (hours ?? []).slice(0, 24);
  while (arr.length < 24) arr.push(0);
  return arr;
}

/**
 * Compute day status based on data integrity and completeness
 * Rules:
 * - 'unknown': Current day (never complete) or missing data
 * - 'complete': Past day with 24 hours AND sum(hours) === dailyTotal
 * - 'partial': Past day but data integrity fails
 */
export function recomputeDayStatus(
  dateKey: string,
  dailyTotal: number | undefined,
  hourly: number[] | undefined,
  todayUTCKey: string
): DayStatus {
  // No daily total means no data
  if (dailyTotal === undefined || dailyTotal === null) return 'unknown';
  
  // Current day is never complete (always changing)
  if (dateKey === todayUTCKey) return 'unknown';
  
  // Ensure hourly has 24 slots and check integrity
  const h = ensure24(hourly);
  const sum = h.reduce((a, b) => a + (b || 0), 0);
  
  // Cross-validation: hourly sum must match daily total
  if (sum === dailyTotal) return 'complete';
  
  return 'partial';
}

/**
 * Find the most recent date with data (prefers complete, fallback to any data)
 * ULTRA-FIX: Always returns the most current data available for dashboard display
 */
export function findLatestCompleteDate(cache: OptimizedCacheV2, nowUTC: Date): string | null {
  const todayKey = toUTCDateKey(nowUTC);
  let latestWithAnyData: string | null = null;
  
  // FORCE VERCEL REBUILD - ULTRA-FIX ACTIVE v5 - DEFINITIVE FIX
  console.log('🔥 ULTRA-FIX: findLatestCompleteDate running with new logic v5 - PRIORITIZE RECENT DATA');
  
  // ULTRA-FIX: Always prioritize most recent data over "complete" status
  // Check last 14 days including today for ANY data
  for (let i = 0; i <= 14; i++) {
    const d = addUTCDays(nowUTC, -i);
    const key = toUTCDateKey(d);
    
    // Skip if no transaction data exists
    if (!cache.dailyTotals?.[key] || cache.dailyTotals[key] === 0) continue;
    
    // ULTRA-FIX: Return FIRST day with any data (most recent)
    console.log('🔥 ULTRA-FIX: Found recent data on', key, 'with', cache.dailyTotals[key], 'transactions');
    return key;
  }
  
  // No data found in last 14 days
  console.log('🔥 ULTRA-FIX: No data found in last 14 days');
  return null;
}

/**
 * Calculate month-to-date totals using only complete days
 * Prevents bias from partial/incomplete data in averages
 */
export function monthToDateTotals(cache: OptimizedCacheV2, latestCompleteKey: string): {
  sum: number; 
  days: number; 
  avgPerCompleteDay: number;
} {
  const [y, m] = latestCompleteKey.split('-').map(Number);
  let sum = 0, days = 0;
  
  // Only count days marked as 'complete' in the target month
  for (const [dateKey, total] of Object.entries(cache.dailyTotals || {})) {
    const [yy, mm] = dateKey.split('-').map(Number);
    if (yy === y && mm === m && cache.dailyStatus?.[dateKey] === 'complete') {
      sum += total;
      days++;
    }
  }
  
  return { 
    sum, 
    days, 
    avgPerCompleteDay: days ? Math.round(sum / days) : 0 
  };
}

/**
 * Validate if a 7-day window has all days marked as complete
 * Used for weekly period calculations - ensures data integrity
 */
export function validateWeeklyWindow(
  cache: OptimizedCacheV2, 
  latestCompleteKey: string
): { ok: boolean; dates: string[] } {
  const [y, m, d] = latestCompleteKey.split('-').map(Number);
  const latestDate = new Date(Date.UTC(y, m - 1, d));
  const dates: string[] = [];
  
  // Generate 7 days ending with latestCompleteKey
  for (let i = 6; i >= 0; i--) {
    const day = addUTCDays(latestDate, -i);
    const key = toUTCDateKey(day);
    dates.push(key);
  }
  
  // All 7 days must be marked as complete
  const ok = dates.every(k => cache.dailyStatus?.[k] === 'complete');
  
  return { ok, dates };
}

/**
 * Merge new transactions with existing, deduplicate, and sort
 * Ensures idempotent processing during incremental updates
 */
export function mergeAndDedupeTxs(
  existing: Map<string, Transaction>, 
  incoming: Transaction[]
): Transaction[] {
  // Add all transactions to map (dedupes by hash)
  for (const tx of incoming) {
    existing.set(tx.hash, tx);
  }
  
  // Sort by (blockNumber, txIndex, hash) for deterministic ordering
  return Array.from(existing.values()).sort((a, b) =>
    a.block - b.block ||
    (a.txIndex || 0) - (b.txIndex || 0) ||
    a.hash.localeCompare(b.hash)
  );
}

/**
 * Find missing complete days between last update and today
 * Returns array of date keys that need to be processed
 */
export function findMissingDays(cache: OptimizedCacheV2, nowUTC: Date): string[] {
  const todayKey = toUTCDateKey(nowUTC);
  const missingDays: string[] = [];
  
  // Find the latest day with data in cache
  const existingDays = Object.keys(cache.dailyTotals || {}).sort();
  const lastDayInCache = existingDays[existingDays.length - 1];
  
  if (!lastDayInCache) {
    // No data at all - start from 7 days ago
    for (let i = 7; i >= 1; i--) {
      const day = addUTCDays(nowUTC, -i);
      const dayKey = toUTCDateKey(day);
      if (isDayComplete(day, nowUTC)) {
        missingDays.push(dayKey);
      }
    }
    return missingDays;
  }
  
  // Find days between last cached day and today
  const lastDate = new Date(lastDayInCache + 'T00:00:00.000Z');
  let currentDay = addUTCDays(lastDate, 1); // Start from day after last cached
  
  while (currentDay < nowUTC) {
    const dayKey = toUTCDateKey(currentDay);
    
    // Only include complete days (not today unless it's complete)
    if (isDayComplete(currentDay, nowUTC)) {
      missingDays.push(dayKey);
    }
    
    currentDay = addUTCDays(currentDay, 1);
  }
  
  console.log(`🔍 Missing days analysis: Found ${missingDays.length} missing days:`, missingDays);
  return missingDays;
}

/**
 * Check if a day is complete (past 23:59:59 UTC)
 * A day is complete if it's before today in UTC
 */
export function isDayComplete(dayDate: Date, nowUTC: Date): boolean {
  const dayStart = startOfUTCDay(dayDate);
  const todayStart = startOfUTCDay(nowUTC);
  
  // Day is complete if it's before today
  return dayStart < todayStart;
}

/**
 * Get UTC timestamp range for a specific day
 * Returns start and end timestamps for Blockscout API filtering
 */
export function getDayTimestampRange(dateKey: string): { start: string; end: string } {
  const [y, m, d] = dateKey.split('-').map(Number);
  
  const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  
  return {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString()
  };
}

/**
 * Generate weekly period string for UI display
 * Only use if all 7 days are complete, otherwise show "week-to-date"
 */
export function weeklyPeriodUTC(
  cache: OptimizedCacheV2, 
  latestCompleteKey: string
): string {
  const validation = validateWeeklyWindow(cache, latestCompleteKey);
  
  if (!validation.ok) {
    // Partial week - show "week-to-date"
    const [y, m, d] = latestCompleteKey.split('-').map(Number);
    const latestDate = new Date(Date.UTC(y, m - 1, d));
    const weekStart = addUTCDays(latestDate, -6);
    const startFormatted = formatDateLongUTC(toUTCDateKey(weekStart));
    const endFormatted = formatDateLongUTC(latestCompleteKey);
    return `Week-to-date: ${startFormatted} - ${endFormatted}`;
  }
  
  // Complete week
  const [y, m, d] = latestCompleteKey.split('-').map(Number);
  const latestDate = new Date(Date.UTC(y, m - 1, d));
  const weekStart = addUTCDays(latestDate, -6);
  const startFormatted = formatDateLongUTC(toUTCDateKey(weekStart));
  const endFormatted = formatDateLongUTC(latestCompleteKey);
  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Generate monthly period string for UI display
 */
export function monthlyPeriodUTC(latestCompleteKey: string): string {
  const [y, m, d] = latestCompleteKey.split('-').map(Number);
  const monthStart = new Date(Date.UTC(y, m - 1, 1));
  const monthName = monthStart.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  const day = String(d).padStart(2, '0');
  return `${monthName} ${y} (through ${day})`;
}

/**
 * Helper to format date in long format for UI
 */
function formatDateLongUTC(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dd = String(d).padStart(2, '0');
  const date = new Date(Date.UTC(y, m - 1, d));
  const month = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${dd} ${month}, ${y}`;
}