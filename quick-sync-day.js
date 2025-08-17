const fs = require('fs');
const path = require('path');

async function quickSyncDay(targetDate) {
  console.log(`🚀 QUICK SYNC: ${targetDate}`);
  
  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
  const cacheFile = path.join(__dirname, 'src/data/contract-cache-v2.json');
  
  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    
    let allTransactions = [];
    let nextPageParams = null;
    let pageCount = 0;
    let foundTargetDate = false;
    
    console.log('📡 Buscando transações...');
    
    // Continue until we collect ALL transactions for the target date
    while (pageCount < 500) { // Generous limit
      pageCount++;
      
      let url = `https://blockscout.lisk.com/api/v2/addresses/${CONTRACT_ADDRESS}/transactions`;
      if (nextPageParams) {
        const params = new URLSearchParams();
        Object.entries(nextPageParams).forEach(([key, value]) => {
          params.append(key, value);
        });
        url += '?' + params.toString();
      }
      
      const response = await fetch(url);
      if (!response.ok) break;
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) break;
      
      // Filter for target date
      const targetTxs = data.items.filter(tx => {
        const txDate = new Date(tx.timestamp).toISOString().split('T')[0];
        return txDate === targetDate;
      });
      
      if (targetTxs.length > 0) {
        foundTargetDate = true;
        allTransactions.push(...targetTxs);
        
        if (pageCount % 10 === 0) {
          console.log(`   📄 Page ${pageCount}: +${targetTxs.length} txs (total: ${allTransactions.length})`);
        }
      }
      
      // Check if we've passed the target date
      const oldestTx = data.items[data.items.length - 1];
      const oldestDate = new Date(oldestTx.timestamp).toISOString().split('T')[0];
      
      if (oldestDate < targetDate) {
        if (foundTargetDate) {
          console.log(`✅ Coletadas TODAS as transações de ${targetDate}`);
          break;
        } else {
          console.log(`❌ Não encontrou transações para ${targetDate}`);
          return;
        }
      }
      
      nextPageParams = data.next_page_params;
      if (!nextPageParams) break;
      
      await new Promise(resolve => setTimeout(resolve, 50)); // Rate limit
    }
    
    if (allTransactions.length === 0) {
      console.log(`❌ Nenhuma transação encontrada para ${targetDate}`);
      return;
    }
    
    // Sort and process
    allTransactions.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Build hourly data
    const hourlyData = new Array(24).fill(0);
    allTransactions.forEach(tx => {
      const hour = new Date(tx.timestamp).getUTCHours();
      hourlyData[hour]++;
    });
    
    // Update cache
    cache.dailyTotals[targetDate] = allTransactions.length;
    cache.recentHourly[targetDate] = hourlyData;
    
    // Recalculate total
    cache.totalTransactions = Object.values(cache.dailyTotals).reduce((a,b) => a+b, 0);
    cache.lastUpdate = new Date().toISOString();
    
    // Determine status
    const activeHours = hourlyData.filter(h => h > 0).length;
    const lastActiveHour = hourlyData.map((count, hour) => count > 0 ? hour : -1).filter(h => h >= 0).pop();
    
    if (activeHours >= 15 && lastActiveHour >= 20) {
      cache.dailyStatus[targetDate] = 'complete';
    } else if (activeHours >= 8) {
      cache.dailyStatus[targetDate] = 'partial';
    } else {
      cache.dailyStatus[targetDate] = 'incomplete_data';
    }
    
    // Save
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
    
    console.log(`\\n✅ CONCLUÍDO:`);
    console.log(`${targetDate}: ${allTransactions.length} transações`);
    console.log(`Atividade: ${activeHours} horas (até ${lastActiveHour}:00)`);
    console.log(`Status: ${cache.dailyStatus[targetDate]}`);
    console.log(`Total projeto: ${cache.totalTransactions} transações`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Run with command line argument or default to Aug 16
const targetDate = process.argv[2] || '2025-08-16';
quickSyncDay(targetDate);