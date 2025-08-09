#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🔧 Limpando dados: removendo 08/04 e ajustando totais');

const cacheV2Path = path.join(__dirname, 'src/data/contract-cache-v2.json');

try {
  const cache = JSON.parse(fs.readFileSync(cacheV2Path, 'utf8'));
  
  // Remover 08/04 completamente
  delete cache.dailyTotals['2025-08-04'];
  delete cache.dailyStatus['2025-08-04'];
  delete cache.recentHourly['2025-08-04'];
  
  // Recalcular total (remover as 3 transações do 08/04)
  const oldTotal = cache.totalTransactions;
  cache.totalTransactions = oldTotal - 3; // 30676 - 3 = 30673
  
  // Recalcular monthly total
  cache.monthlyTotals['2025-08'] = cache.monthlyTotals['2025-08'] - 3;
  
  // Corrigir totalDaysActive: 5 → 4  
  cache.totalDaysActive = 4;
  
  // Atualizar metadata
  cache.generatedAtUTC = new Date().toISOString();
  cache.lastUpdate = new Date().toISOString();
  
  // Recalcular integrity
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
  
  console.log(`✅ Limpeza concluída:`);
  console.log(`   Removido: 08/04 (3 transações)`);
  console.log(`   Total: ${oldTotal} → ${cache.totalTransactions} transações`);
  console.log(`   Dias ativos: 5 → 4`);
  console.log(`   Período: 05/08 a 08/08`);
  
} catch (error) {
  console.error('❌ Erro:', error.message);
}