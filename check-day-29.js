const CONTRACT = '0xf18485f75551FFCa4011C32a0885ea8C22336840';
const API = 'https://blockscout.lisk.com/api/v2';
const today = '2025-08-29';

async function fetchDay29() {
  let count = 0;
  let nextParams = null;
  let pages = 0;
  
  console.log('🔍 Fetching transactions for August 29, 2025...\n');
  
  while (pages < 200) {
    pages++;
    
    let url = `${API}/addresses/${CONTRACT}/transactions?filter=to`;
    if (nextParams) {
      const params = new URLSearchParams(nextParams);
      url += '&' + params.toString();
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.items || data.items.length === 0) break;
      
      let foundOlder = false;
      for (const tx of data.items) {
        const date = tx.timestamp.split('T')[0];
        if (date === today) {
          count++;
        } else if (date < today) {
          foundOlder = true;
          break;
        }
      }
      
      if (pages % 20 === 0) {
        console.log(`Pages processed: ${pages}, Transactions found: ${count}`);
      }
      
      if (foundOlder || !data.next_page_params) break;
      
      nextParams = data.next_page_params;
      await new Promise(r => setTimeout(r, 30));
      
    } catch (error) {
      console.error('Error:', error.message);
      break;
    }
  }
  
  console.log(`\n✅ Day 29 total: ${count} transactions`);
  console.log(`📄 Pages scanned: ${pages}`);
  
  // Get hourly distribution
  console.log('\n📊 Getting hourly distribution...');
  const hourlyData = new Array(24).fill(0);
  let txCount = 0;
  
  // Fetch first few pages to get hourly sample
  let samplePages = 0;
  nextParams = null;
  
  while (samplePages < 10 && txCount < count) {
    samplePages++;
    
    let url = `${API}/addresses/${CONTRACT}/transactions?filter=to`;
    if (nextParams) {
      const params = new URLSearchParams(nextParams);
      url += '&' + params.toString();
    }
    
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      if (!data.items) break;
      
      for (const tx of data.items) {
        const date = tx.timestamp.split('T')[0];
        if (date === today) {
          const hour = new Date(tx.timestamp).getUTCHours();
          hourlyData[hour]++;
          txCount++;
        } else if (date < today) {
          break;
        }
      }
      
      nextParams = data.next_page_params;
      
    } catch (error) {
      break;
    }
  }
  
  console.log('\nHourly sample (first 500 txs):');
  hourlyData.forEach((count, hour) => {
    if (count > 0) {
      console.log(`  Hour ${hour.toString().padStart(2, '0')}:00 - ${count} txs`);
    }
  });
  
  return { total: count, hourlyData };
}

fetchDay29().catch(console.error);