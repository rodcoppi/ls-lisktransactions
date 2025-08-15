// Script para processar os CSVs dos dias perdidos e integrar no cache V2
const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'src/data/contract-cache-v2.json');

// Função para processar CSV
function processCSV(filePath, targetDate) {
  console.log(`📄 Processando ${filePath} para ${targetDate}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Arquivo não encontrado: ${filePath}`);
    return { transactions: 0, hourlyData: {} };
  }
  
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const lines = csvContent.split('\n');
  
  // Remover header e linhas vazias
  const dataLines = lines.slice(1).filter(line => line.trim());
  
  if (dataLines.length === 0) {
    console.log(`⚠️ Arquivo vazio ou só com header: ${filePath}`);
    return { transactions: 0, hourlyData: {} };
  }
  
  const hourlyData = {};
  let validTransactions = 0;
  
  dataLines.forEach((line, index) => {
    try {
      const columns = line.split(',');
      
      // Verificar se tem colunas suficientes
      if (columns.length < 10) {
        console.log(`⚠️ Linha malformada ${index + 2}: ${line.substring(0, 50)}...`);
        return;
      }
      
      const timestamp = columns[2]; // UnixTimestamp
      const status = columns[9]; // Status
      const methodName = columns[14]; // MethodName
      
      // Filtrar apenas transações válidas (status ok e para o contrato correto)
      if (status && status.trim() === 'ok') {
        validTransactions++;
        
        // Extrair hora do timestamp (formato: 2025-08-09 16:43:43.000000Z)
        if (timestamp && timestamp.includes(' ')) {
          const timepart = timestamp.split(' ')[1];
          if (timepart && timepart.includes(':')) {
            const hour = parseInt(timepart.split(':')[0]);
            if (!isNaN(hour) && hour >= 0 && hour <= 23) {
              hourlyData[hour] = (hourlyData[hour] || 0) + 1;
            }
          }
        }
      }
    } catch (error) {
      console.log(`❌ Erro processando linha ${index + 2}: ${error.message}`);
    }
  });
  
  console.log(`✅ ${filePath}: ${validTransactions} transações válidas`);
  console.log(`📊 Distribuição por hora:`, Object.keys(hourlyData).length, 'horas ativas');
  
  return { transactions: validTransactions, hourlyData };
}

// Função principal
function main() {
  console.log('🔧 FIXANDO GAPS DOS DIAS 9, 10 e 11...\n');
  
  // Carregar cache atual
  let cache;
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    console.log('📂 Cache V2 carregado:', cache.totalTransactions, 'transações totais');
  } catch (error) {
    console.log('❌ Erro carregando cache:', error.message);
    process.exit(1);
  }
  
  // Processar cada dia
  const dias = [
    {
      date: '2025-08-09',
      files: ['dia9.csv'],
      note: null
    },
    {
      date: '2025-08-10', 
      files: ['dia10.csv'],
      note: 'system issue (fixed)'
    },
    {
      date: '2025-08-11',
      files: ['dia11ate18.csv', 'dia11das18as23h59.csv'],
      note: null
    }
  ];
  
  let totalAdded = 0;
  
  dias.forEach(dia => {
    console.log(`\n📅 Processando ${dia.date}:`);
    
    let dayTotal = 0;
    const dayHourlyData = {};
    
    // Processar todos os arquivos do dia
    dia.files.forEach(file => {
      const result = processCSV(file, dia.date);
      dayTotal += result.transactions;
      
      // Mesclar dados por hora
      Object.keys(result.hourlyData).forEach(hour => {
        dayHourlyData[hour] = (dayHourlyData[hour] || 0) + result.hourlyData[hour];
      });
    });
    
    // Atualizar cache
    if (dayTotal === 0 && dia.note) {
      console.log(`⚠️ ${dia.date}: 0 transações - marcando como "${dia.note}"`);
      cache.dailyStatus = cache.dailyStatus || {};
      cache.dailyStatus[dia.date] = dia.note;
    }
    
    // Inicializar estruturas se não existirem
    cache.hourlyData = cache.hourlyData || {};
    cache.dailyStatus = cache.dailyStatus || {};
    
    // Adicionar ao cache
    cache.dailyTotals[dia.date] = dayTotal;
    cache.hourlyData[dia.date] = dayHourlyData;
    totalAdded += dayTotal;
    
    console.log(`✅ ${dia.date}: ${dayTotal} transações adicionadas`);
    if (dia.note) console.log(`📝 Nota: ${dia.note}`);
  });
  
  // Atualizar totais
  cache.totalTransactions += totalAdded;
  cache.lastUpdate = new Date().toISOString();
  cache.totalDaysActive = Object.keys(cache.dailyTotals).length;
  
  console.log(`\n📊 RESUMO:`);
  console.log(`➕ Transações adicionadas: ${totalAdded}`);
  console.log(`📈 Total final: ${cache.totalTransactions}`);
  console.log(`📅 Dias ativos: ${cache.totalDaysActive}`);
  
  // Salvar cache atualizado
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log(`\n💾 Cache V2 atualizado salvo em ${CACHE_FILE}`);
    console.log('✅ Gap dos dias 9, 10 e 11 corrigido!');
  } catch (error) {
    console.log(`❌ Erro salvando cache: ${error.message}`);
    process.exit(1);
  }
}

main();