#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Dados reais do 08/08 baseados no CSV
const hourlyData0808 = {
  0: 0,   // 00h
  1: 0,   // 01h  
  2: 0,   // 02h
  3: 0,   // 03h
  4: 983, // 04h
  5: 57,  // 05h
  6: 45,  // 06h
  7: 222, // 07h
  8: 0,   // 08h
  9: 9,   // 09h
  10: 0,  // 10h
  11: 755, // 11h
  12: 12, // 12h
  13: 57, // 13h
  14: 81, // 14h
  15: 45, // 15h
  16: 808, // 16h
  17: 33, // 17h
  18: 11, // 18h
  19: 607, // 19h
  20: 954, // 20h
  21: 538, // 21h
  22: 800, // 22h
  23: 224  // 23h
};

const total0808 = Object.values(hourlyData0808).reduce((a, b) => a + b, 0);
console.log(`🔧 Corrigindo 08/08: ${total0808} transações (era 407)`);

// Atualizar cache V2
const cacheV2Path = path.join(__dirname, 'src/data/contract-cache-v2.json');

try {
  const cache = JSON.parse(fs.readFileSync(cacheV2Path, 'utf8'));
  
  // Atualizar dados do 08/08
  cache.dailyTotals['2025-08-08'] = total0808;
  cache.dailyStatus['2025-08-08'] = 'complete';
  cache.recentHourly['2025-08-08'] = Array.from({ length: 24 }, (_, i) => hourlyData0808[i] || 0);
  
  // Atualizar totais gerais
  const oldTotal = cache.totalTransactions || 0;
  const difference = total0808 - 407; // Diferença do que estava antes
  cache.totalTransactions = oldTotal + difference;
  
  // Recalcular monthly total
  cache.monthlyTotals['2025-08'] = (cache.monthlyTotals['2025-08'] || 0) + difference;
  
  // Atualizar metadata
  cache.generatedAtUTC = new Date().toISOString();
  cache.lastUpdate = new Date().toISOString();
  
  // Recalcular integrity
  const crypto = require('crypto');
  const contentHash = crypto.createHash('sha256')
    .update(JSON.stringify({ 
      dailyTotals: cache.dailyTotals, 
      monthlyTotals: cache.monthlyTotals,
      cursor: cache.cursor 
    }))
    .digest('hex');
  cache.integrity = `sha256:${contentHash}`;
  
  // Salvar
  fs.writeFileSync(cacheV2Path, JSON.stringify(cache, null, 2));
  
  console.log(`✅ Cache V2 atualizado:`);
  console.log(`   08/08: 407 → ${total0808} transações`);
  console.log(`   Total: ${oldTotal} → ${cache.totalTransactions} transações`);
  console.log(`   Diferença: +${difference} transações`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}