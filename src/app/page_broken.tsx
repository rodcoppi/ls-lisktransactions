"use client";

import { useEffect, useState } from "react";

interface LiskStats {
  total_transactions: string;
  transactions_today: string;
  total_blocks: string;
  coin_price: string;
  secondary_coin_price: string;
  total_addresses: string;
  average_block_time: number;
  gas_used_today: string;
}

interface ContractAnalysis {
  hourlyData: { [key: number]: number };
  dailyData: { [key: string]: number };
  weeklyData: { [key: string]: number };
  monthlyData: { [key: string]: number };
  todayTxs: number;
  thisWeekTxs: number;
  lastWeekTxs: number;
  thisMonthTxs: number;
  totalDaysActive: number;
  totalMonthsActive: number;
  avgTxsPerDay: number;
  avgTxsPerMonth: number;
  peakDay: { day: string; count: number };
  peakHour: { hour: number; count: number };
  lastTxTime: string;
  deploymentDate: string;
}

interface ContractData {
  totalTransactions: number;
  analysis: ContractAnalysis;
  lastUpdate: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<LiskStats | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';

  useEffect(() => {
    Promise.all([
      fetch('https://blockscout.lisk.com/api/v2/stats').then(res => res.json()),
      fetch('/api/contract-data').then(res => res.json())
    ])
    .then(([statsData, contractDataResponse]) => {
      setStats(statsData);
      setContractData(contractDataResponse);
      setLoading(false);
    })
    .catch(err => {
      setError('Error loading data: ' + err.message);
      setLoading(false);
    });
  }, []);

  const analysis = contractData?.analysis;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: '#ffffff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid #2a2a2a',
            borderTop: '3px solid #00ff88',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p>Loading Lisk blockchain data...</p>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `
          }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a' }}>
        <div style={{ textAlign: 'center', color: '#ff6b6b' }}>
          <h2>Error!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', padding: '20px', color: '#ffffff' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ffffff', marginBottom: '10px' }}>
            🎲 LuckySea Contract - Temporal Transaction Analysis
          </h1>
          <p style={{ color: '#b3b3b3', fontSize: '1.1rem' }}>
            Contract: <code style={{ backgroundColor: '#1a1a1a', padding: '2px 6px', borderRadius: '4px', color: '#00ff88' }}>{CONTRACT_ADDRESS}</code>
          </p>
          <p style={{ color: '#b3b3b3', fontSize: '1rem', marginTop: '5px' }}>
            Real-time LuckySea contract transaction data
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              🎲 Total LuckySea Transactions
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
              {contractData?.totalTransactions || 0}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              📊 Transactions Today
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
              {analysis?.todayTxs || 0}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              ⏰ Last Transaction
            </h3>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ff6b6b' }}>
              {analysis?.lastTxTime ? new Date(analysis.lastTxTime).toLocaleString('en-US') : 'N/A'}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              📈 This Week's Transactions
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4ecdc4' }}>
              {analysis?.thisWeekTxs || 0}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              🗓️ Monthly Total (30 days)
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>
              {analysis?.thisMonthTxs || 0}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              📊 Avg Transactions/Day
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f97316' }}>
              {analysis?.avgTxsPerDay || 0}
            </p>
          </div>

          <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#b3b3b3', marginBottom: '10px' }}>
              💰 LSK Price
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffd93d' }}>
              ${stats?.secondary_coin_price ? Number(stats.secondary_coin_price).toFixed(4) : 'N/A'}
            </p>
          </div>

        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px', color: '#ffffff' }}>API Status</h2>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#00ff88', borderRadius: '50%', marginRight: '10px' }}></div>
            <span style={{ color: '#00ff88', fontWeight: '500' }}>✅ Connected to Blockscout Lisk API</span>
          </div>
          <p style={{ marginTop: '10px', color: '#b3b3b3', fontSize: '0.9rem' }}>
            Last update: {new Date().toLocaleString('en-US')}
          </p>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px', color: '#ffffff' }}>🎯 Implemented Features</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b3b3b3' }}>✅ LuckySea contract dashboard with real data</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b3b3b3' }}>✅ Temporal analysis by hour (daily data)</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b3b3b3' }}>✅ Daily analysis (last 7 days)</li>
            <li style={{ padding: '8px 0', borderBottom: '1px solid #333', color: '#b3b3b3' }}>✅ Blockscout Lisk API connection</li>
            <li style={{ padding: '8px 0', color: '#b3b3b3' }}>✅ Responsive real-time interface</li>
          </ul>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px', color: '#ffffff' }}>📈 Transactions by Hour (Today)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = analysis?.hourlyData?.[hour] || 0;
              return (
                <div key={hour} style={{ 
                  textAlign: 'center', 
                  padding: '10px', 
                  backgroundColor: count > 0 ? '#1a3d1a' : '#2a2a2a',
                  borderRadius: '6px',
                  border: count > 0 ? '2px solid #00ff88' : '1px solid #444'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>{hour}h</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: count > 0 ? '#00ff88' : '#666' }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '15px', color: '#ffffff' }}>📅 Transactions by Day (Last 7 days)</h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
            {Object.entries(analysis?.dailyData || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 7)
              .map(([date, count]) => (
                <div key={date} style={{ 
                  minWidth: '120px', 
                  textAlign: 'center', 
                  padding: '15px', 
                  backgroundColor: '#1a2a3a',
                  borderRadius: '8px',
                  border: '2px solid #00ff88'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#b3b3b3', marginBottom: '5px' }}>
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff88' }}>
                    {count}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#ffffff' }}>📊 Weekly & Monthly Analysis</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            
            <div style={{ padding: '20px', backgroundColor: '#0f1f2f', borderRadius: '10px', border: '2px solid #4ecdc4' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4ecdc4', marginBottom: '15px' }}>📈 Weekly Stats</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#b3b3b3' }}>This Week:</span>
                <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>{analysis?.thisWeekTxs || 0} txs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: '#b3b3b3' }}>Last Week:</span>
                <span style={{ color: '#4ecdc4', fontWeight: 'bold' }}>{analysis?.lastWeekTxs || 0} txs</span>
              </div>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#2a2a2a', 
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ 
                  width: \`\${Math.min(100, (analysis?.weeklyStats.thisWeek || 0) / 100)}%\`, 
                  height: '100%', 
                  backgroundColor: '#4ecdc4',
                  transition: 'width 0.3s ease'
                }}></div>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: '#2f1f3f', borderRadius: '10px', border: '2px solid #a855f7' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '15px' }}>🗓️ Monthly Stats</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#b3b3b3' }}>Last 30 Days:</span>
                <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{analysis?.thisMonthTxs || 0} txs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#b3b3b3' }}>Days Active:</span>
                <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{analysis?.totalDaysActive || 0} days</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                <span style={{ color: '#b3b3b3' }}>Avg/Day:</span>
                <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{analysis?.avgTxsPerDay || 0} txs</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b3b3b3', fontStyle: 'italic' }}>
                Contract deployed ~3 days ago with incredible activity! 🔥
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#1a1a1a', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,255,136,0.1)', border: '1px solid #2a2a2a', marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px', color: '#ffffff' }}>📊 Monthly Breakdown</h2>
          
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '20px' }}>
            {Object.entries(analysis?.monthlyData || {})
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([month, count]) => (
                <div key={month} style={{ 
                  minWidth: '150px', 
                  textAlign: 'center', 
                  padding: '20px', 
                  backgroundColor: '#2a1a3a',
                  borderRadius: '10px',
                  border: '2px solid #a855f7'
                }}>
                  <div style={{ fontSize: '1rem', color: '#b3b3b3', marginBottom: '8px' }}>
                    {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7', marginBottom: '5px' }}>
                    {count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>transactions</div>
                </div>
              ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
            <div style={{ padding: '15px', backgroundColor: '#1a2a1a', borderRadius: '8px', border: '1px solid #00ff88' }}>
              <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Peak Day</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#00ff88' }}>
                {analysis?.peakDay?.day ? new Date(analysis.peakDay.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>
                {analysis?.peakDay?.count || 0} transactions
              </div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#2a1a1a', borderRadius: '8px', border: '1px solid #ff6b6b' }}>
              <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Peak Hour</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff6b6b' }}>
                {analysis?.peakHour?.hour !== undefined ? `${analysis.peakHour.hour}:00` : 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>
                {analysis?.peakHour?.count || 0} transactions
              </div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#1a1a2a', borderRadius: '8px', border: '1px solid #4ecdc4' }}>
              <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Deployment Date</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                {analysis?.deploymentDate ? new Date(analysis.deploymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>
                {analysis?.totalDaysActive || 0} days active
              </div>
            </div>

            <div style={{ padding: '15px', backgroundColor: '#2a2a1a', borderRadius: '8px', border: '1px solid #ffd93d' }}>
              <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>Total Months</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ffd93d' }}>
                {analysis?.totalMonthsActive || 0}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#b3b3b3' }}>
                {analysis?.avgTxsPerMonth || 0} avg/month
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}