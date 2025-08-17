interface DailySnapshot {
  date: string;
  totalTransactions: number;
  dailyCount: number;
  hourlyData: { [hour: number]: number };
  timestamp: string;
  weeklyTotal: number;
  monthlyTotal: number;
  avgTxsPerDay: number;
  peakHour: { hour: number; count: number };
  status: 'complete' | 'partial' | 'pending';
}

export class HistoricalDataManager {
  
  // Save daily snapshot - logs what WOULD be saved for monitoring
  static async saveDailySnapshot(contractData: any): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    if (!contractData || !contractData.analysis) {
      console.warn(`⚠️ Cannot save snapshot for ${today}: Invalid contract data`);
      return;
    }
    
    const snapshot: DailySnapshot = {
      date: today,
      totalTransactions: contractData.totalTransactions || 0,
      dailyCount: contractData.analysis.latestDayTxs || 0,
      hourlyData: contractData.analysis.hourlyData || {},
      timestamp: new Date().toISOString(),
      weeklyTotal: contractData.analysis.weeklyTxs || 0,
      monthlyTotal: contractData.analysis.monthlyTxs || 0,
      avgTxsPerDay: contractData.analysis.avgTxsPerDay || 0,
      peakHour: contractData.analysis.peakHour || { hour: 0, count: 0 },
      status: 'complete'
    };
    
    console.log(`📊 REAL SNAPSHOT for ${today}:`, {
      date: snapshot.date,
      totalTransactions: snapshot.totalTransactions,
      dailyCount: snapshot.dailyCount,
      weeklyTotal: snapshot.weeklyTotal,
      monthlyTotal: snapshot.monthlyTotal,
      avgTxsPerDay: snapshot.avgTxsPerDay,
      latestCompleteDate: contractData.analysis.latestCompleteDate
    });
  }
  
  // Get data for date range - derive from current cache manager data
  static getHistoricalData(startDate: string, endDate: string): DailySnapshot[] {
    console.log(`📊 Historical data requested for ${startDate} to ${endDate}`);
    
    try {
      // Import cache manager to get current data
      const { cacheManagerV2 } = require('./cache-manager-v2');
      const currentData = cacheManagerV2.getCachedData();
      
      if (!currentData || !currentData.analysis) {
        console.warn('⚠️ No current cache data available for historical derivation');
        return [];
      }
      
      return this.deriveHistoricalFromCache(currentData, startDate, endDate);
    } catch (error) {
      console.error('❌ Error getting historical data:', error);
      return [];
    }
  }
  
  // Get last N days - derive from current cache  
  static getLastNDays(days: number): DailySnapshot[] {
    console.log(`📊 Last ${days} days historical data requested`);
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days + 1);
    
    return this.getHistoricalData(
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
  }
  
  // Get all available data - derive from current cache
  static getAllHistoricalData(): DailySnapshot[] {
    console.log(`📊 All historical data requested`);
    
    try {
      const { cacheManagerV2 } = require('./cache-manager-v2');
      const currentData = cacheManagerV2.getCachedData();
      
      if (!currentData || !currentData.analysis || !currentData.analysis.dailyData) {
        return [];
      }
      
      // Get all available dates from dailyData
      const availableDates = Object.keys(currentData.analysis.dailyData).sort();
      if (availableDates.length === 0) return [];
      
      const startDate = availableDates[0];
      const endDate = availableDates[availableDates.length - 1];
      
      return this.deriveHistoricalFromCache(currentData, startDate, endDate);
    } catch (error) {
      console.error('❌ Error getting all historical data:', error);
      return [];
    }
  }
  
  // Derive historical snapshots from current cache data
  private static deriveHistoricalFromCache(currentData: any, startDate: string, endDate: string): DailySnapshot[] {
    const snapshots: DailySnapshot[] = [];
    const dailyData = currentData.analysis.dailyData || {};
    const dailyStatus = currentData.analysis.dailyStatus || {};
    const recentHourly = currentData.analysis.recentHourly || {};
    
    // CRITICAL: Also get new hourlyData structure from cache V2
    const cache = require('./cache-manager-v2').cacheManagerV2.loadCacheV2();
    const newHourlyData = cache?.hourlyData || {};
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      if (dailyData[dateStr]) {
        // Priority: use newHourlyData first, then recentHourly as fallback
        let dayHourlyData = {};
        if (newHourlyData[dateStr]) {
          // Use new hourlyData structure (object with hour keys)
          dayHourlyData = newHourlyData[dateStr];
        } else if (recentHourly[dateStr]) {
          // Use legacy recentHourly structure (array with hour indices)  
          dayHourlyData = recentHourly[dateStr];
        }
        
        // Calculate peak hour for this specific day
        let dayPeakHour = { hour: 0, count: 0 };
        if (dayHourlyData && typeof dayHourlyData === 'object') {
          const hourlyEntries = Array.isArray(dayHourlyData) 
            ? dayHourlyData.map((count, hour) => ({ hour, count }))
            : Object.entries(dayHourlyData).map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }));
          
          if (hourlyEntries.length > 0) {
            dayPeakHour = hourlyEntries.reduce((max, current) => 
              current.count > max.count ? current : max
            );
          }
        }
        
        const snapshot: DailySnapshot = {
          date: dateStr,
          totalTransactions: currentData.totalTransactions || 0,
          dailyCount: dailyData[dateStr],
          hourlyData: dayHourlyData,
          timestamp: `${dateStr}T23:59:59.000Z`,
          weeklyTotal: currentData.analysis.weeklyTxs || 0,
          monthlyTotal: currentData.analysis.monthlyTxs || 0,
          avgTxsPerDay: currentData.analysis.avgTxsPerDay || 0,
          peakHour: dayPeakHour,
          status: (dailyStatus[dateStr] as 'complete' | 'partial' | 'pending') || 'complete'
        };
        
        snapshots.push(snapshot);
      }
    }
    
    return snapshots.sort((a, b) => a.date.localeCompare(b.date));
  }
  
  // Calculate analytics from historical data
  static calculateHistoricalAnalytics(data: DailySnapshot[]) {
    if (data.length === 0) return null;
    
    const totalDays = data.length;
    const totalTransactions = data.reduce((sum, day) => sum + day.dailyCount, 0);
    const averageDailyTxs = totalTransactions / totalDays;
    
    const peakDay = data.reduce((best, day) => 
      day.dailyCount > best.dailyCount ? day : best
    );
    
    // Calculate most active hour across all days
    const hourlyTotals: { [hour: number]: number[] } = {};
    data.forEach(day => {
      if (day.hourlyData) {
        Object.entries(day.hourlyData).forEach(([hour, count]) => {
          const h = parseInt(hour);
          if (!hourlyTotals[h]) hourlyTotals[h] = [];
          hourlyTotals[h].push(count);
        });
      }
    });
    
    let mostActiveHour = { hour: 0, avgCount: 0 };
    Object.entries(hourlyTotals).forEach(([hour, counts]) => {
      const avgCount = counts.reduce((sum, count) => sum + count, 0) / counts.length;
      if (avgCount > mostActiveHour.avgCount) {
        mostActiveHour = { hour: parseInt(hour), avgCount };
      }
    });
    
    // Week over week growth
    const recent7Days = data.slice(-7);
    const previous7Days = data.slice(-14, -7);
    
    const recent7Total = recent7Days.reduce((sum, day) => sum + day.dailyCount, 0);
    const previous7Total = previous7Days.reduce((sum, day) => sum + day.dailyCount, 0);
    
    const weeklyGrowthRate = previous7Total > 0 
      ? ((recent7Total - previous7Total) / previous7Total) * 100 
      : 0;
    
    // Calculate consistency (how consistent daily activity is)
    const variance = data.reduce((sum, day) => {
      const diff = day.dailyCount - averageDailyTxs;
      return sum + (diff * diff);
    }, 0) / totalDays;
    const stdDev = Math.sqrt(variance);
    const consistency = Math.max(0, 1 - (stdDev / averageDailyTxs));
    
    return {
      totalDays,
      totalTransactions,
      averageDailyTxs,
      peakDay: {
        date: peakDay.date,
        count: peakDay.dailyCount
      },
      mostActiveHour,
      weeklyGrowthRate,
      consistency: Math.min(1, consistency), // Cap at 1
      dataAvailableFrom: data[0].date,
      lastUpdated: data[data.length - 1].date
    };
  }
}