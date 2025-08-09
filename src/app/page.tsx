"use client";

import { useEffect, useState } from "react";

interface LiskStats {
  secondary_coin_price: string;
}

interface ContractAnalysis {
  // Precise date-based data
  latestCompleteDate?: string;
  latestCompleteDateFormatted?: string;
  weeklyPeriod?: string;
  monthlyPeriod?: string;
  
  // Numerical data with precise calculations
  latestDayTxs?: number;
  weeklyTxs?: number;
  monthlyTxs?: number;
  
  // Chart data
  hourlyData: { [key: number]: number };
  dailyData: { [key: string]: number };
  weeklyData?: { [key: string]: number };
  monthlyData: { [key: string]: number };
  
  // Legacy fields (for compatibility)
  todayTxs: number;
  thisWeekTxs: number;
  lastWeekTxs?: number;
  thisMonthTxs: number;
  
  // Metadata
  totalDaysActive: number;
  totalMonthsActive?: number;
  avgTxsPerDay: number;
  avgTxsPerMonth: number;
  peakDay?: { day: string; count: number };
  peakHour?: { hour: number; count: number };
  lastTxTime?: string;
  deploymentDate?: string;
}

interface ContractData {
  totalTransactions: number;
  analysis: ContractAnalysis;
  lastUpdate: string;
}

function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const updated = new Date(timestamp);
  const diffMs = now.getTime() - updated.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export default function Dashboard() {
  const [, setStats] = useState<LiskStats | null>(null);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);

  const CONTRACT_ADDRESS = '0xf18485f75551FFCa4011C32a0885ea8C22336840';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Lisk stats first
        const statsResponse = await fetch('https://blockscout.lisk.com/api/v2/stats');
        const statsData = await statsResponse.json();
        setStats(statsData);

        // Try to fetch contract data
        const contractResponse = await fetch('/api/contract-data');
        const contractDataResponse = await contractResponse.json();
        
        // If data is not ready (0 transactions), show progress and use smart polling
        if (contractDataResponse.totalTransactions === 0 && contractDataResponse.error) {
          setFetchProgress('🔄 Fetching all historical transactions... This may take 2-3 minutes on first load.');
          
          // Smart polling with exponential backoff to reduce API calls
          let pollAttempts = 0;
          const maxAttempts = 20; // Max 20 attempts over ~8 minutes
          
          const smartPoll = async () => {
            try {
              pollAttempts++;
              console.log(`📡 Smart poll attempt ${pollAttempts}/${maxAttempts}`);
              
              const pollResponse = await fetch('/api/contract-data');
              const pollData = await pollResponse.json();
              
              if (pollData.totalTransactions > 0) {
                console.log('✅ Cache ready! Found transactions:', pollData.totalTransactions);
                setContractData(pollData);
                setFetchProgress(null);
                setLoading(false);
                return;
              }
              
              // Update progress message
              const progressMessages = [
                '🔄 Still fetching... Processing thousands of transactions from blockchain history.',
                '⏳ Building cache from scratch... This takes a while on first load.',
                '🚀 Almost there! Analyzing transaction patterns...',
                '📊 Final steps... Organizing data for dashboard...'
              ];
              const messageIndex = Math.min(Math.floor(pollAttempts / 5), progressMessages.length - 1);
              setFetchProgress(progressMessages[messageIndex] || 'Loading...');
              
              // Continue polling if under max attempts
              if (pollAttempts < maxAttempts) {
                // Exponential backoff: 10s, 15s, 20s, 25s, then 30s
                const delay = Math.min(10000 + (pollAttempts * 5000), 30000);
                console.log(`⏱️ Next poll in ${delay/1000}s`);
                setTimeout(smartPoll, delay);
              } else {
                setFetchProgress('⏰ Taking longer than expected. Please refresh the page in a few minutes.');
                console.log('❌ Max polling attempts reached');
              }
              
            } catch (pollError) {
              console.error('Polling error:', pollError);
              if (pollAttempts < maxAttempts) {
                setTimeout(smartPoll, 15000); // Retry in 15s on error
              }
            }
          };
          
          // Start smart polling after 10 seconds (give cache time to start)
          setTimeout(smartPoll, 10000);
          
        } else {
          setContractData(contractDataResponse);
          setLoading(false);
        }
        
      } catch (err) {
        setError('Error loading data: ' + (err instanceof Error ? err.message : 'Unknown error'));
        setLoading(false);
      }
    };

    fetchData();
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
          <p>Loading LuckySea contract data...</p>
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
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #05202E 0%, #041924 50%, #05202E 100%)',
      backgroundAttachment: 'fixed',
      padding: '20px', 
      color: '#E5E7EB',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle background elements */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '20%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, rgba(2,255,210,0.04) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float1 8s ease-in-out infinite'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '25%',
        left: '15%',
        width: '150px',
        height: '150px',
        background: 'radial-gradient(circle, rgba(4,25,36,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'float2 10s ease-in-out infinite reverse'
      }}></div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes float1 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes float2 {
            0%, 100% { transform: translateX(0px) rotate(0deg); }
            50% { transform: translateX(15px) rotate(-180deg); }
          }
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes slideInDown {
            from {
              opacity: 0;
              transform: translateY(-50px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes expandLine {
            to {
              width: 100%;
            }
          }
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.2);
            }
          }
        `
      }} />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ 
          marginBottom: '60px',
          padding: '50px 40px',
          background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '12px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'slideInDown 0.8s ease-out'
        }}>
          <div style={{
            content: '',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'radial-gradient(circle at center, rgba(2, 255, 210, 0.03) 0%, transparent 60%)',
            pointerEvents: 'none'
          }}></div>
          {/* Logos Section - Centered */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '20px', 
            marginBottom: '25px', 
            position: 'relative', 
            zIndex: 2 
          }}>
            <svg width="80" height="28" viewBox="0 0 114 40" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M71.1139 18.063H64.4346V39.6471H71.1139V18.063Z"></path>
              <path d="M87.6884 27.794C86.7201 27.3527 85.5011 26.9209 84.0344 26.5083C83.2598 26.2606 82.609 26.0384 82.082 25.8448C81.555 25.6511 81.1392 25.4225 80.8376 25.159C80.5328 24.8956 80.3804 24.5717 80.3804 24.1844C80.3804 23.8257 80.5455 23.5051 80.8788 23.2289C81.2122 22.9527 81.682 22.813 82.2915 22.813C82.955 22.813 83.4757 23.0194 83.8471 23.4352C84.1296 23.7495 84.3391 24.1305 84.4693 24.5717H91.0344C90.8852 23.2606 90.4534 22.0924 89.7423 21.067C89.009 20.0162 87.9995 19.1908 86.7106 18.5971C85.4249 18.0035 83.9233 17.7051 82.2058 17.7051C80.3804 17.7051 78.8217 17.9749 77.536 18.5146C76.2503 19.0543 75.2788 19.8098 74.628 20.7781C73.9772 21.7463 73.6534 22.8416 73.6534 24.0575C73.6534 25.3876 73.9931 26.4797 74.6693 27.3368C75.3487 28.194 76.1645 28.8606 77.1201 29.3305C78.0757 29.8003 79.2725 30.2702 80.7106 30.7432C81.5138 31.0194 82.1836 31.2702 82.7233 31.4892C83.263 31.7114 83.6915 31.9749 84.009 32.2797C84.3265 32.5844 84.4852 32.9305 84.4852 33.3178C84.4852 33.7336 84.3042 34.086 83.9455 34.3749C83.5868 34.667 83.0471 34.8098 82.3264 34.8098C81.6058 34.8098 80.9614 34.5971 80.4788 34.1654C80.1423 33.867 79.8979 33.4924 79.7423 33.0384H73.1836C73.3296 34.3241 73.7455 35.4765 74.4376 36.4892C75.1836 37.5844 76.228 38.4416 77.5709 39.0638C78.9138 39.686 80.4979 39.9971 82.3233 39.9971C84.2598 39.9971 85.9011 39.7051 87.2439 39.1241C88.5868 38.5432 89.5899 37.7463 90.2534 36.7368C90.9169 35.7273 91.2503 34.5432 91.2503 33.1876C91.2503 31.8321 90.8979 30.6352 90.1931 29.7622C89.4884 28.8892 88.6503 28.2321 87.682 27.7908L87.6884 27.794Z"></path>
              <path d="M51.7809 10.9048L45.1016 18.0635V39.6445H62.4V33.0349H51.7809V10.9048Z"></path>
              <path d="M106.317 28.7715L113.314 18.0635L105.847 18.0603L100.003 27.0381V10.9048L93.3203 18.0635V39.6445H100.003V30.4857L106.393 39.6445H113.866L106.317 28.7715Z"></path>
              <g>
                <path d="M17.543 0.000976562L13.5557 6.55653L26.6033 27.9248L15.6795 39.6454H24.9239L35.0922 28.7534L17.543 0.000976562Z"></path>
                <path d="M13.2581 33.0349L8.49939 27.9237L16.5089 14.7968L12.5121 8.25391L0.000976562 28.7523L10.1692 39.6444H13.5407L19.7216 33.0349H13.2581Z"></path>
              </g>
            </svg>
            <div style={{ 
              width: '3px', 
              height: '40px', 
              background: 'linear-gradient(180deg, transparent 0%, #02FFD2 50%, transparent 100%)',
              borderRadius: '2px',
              boxShadow: '0 0 10px rgba(2,255,210,0.5)'
            }}></div>
            <img src="https://luckysea.gg/assets/logotipo.svg" alt="LuckySea" style={{ width: '90px', height: 'auto' }} />
          </div>
          {/* Title Section - Centered */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ 
              fontSize: '2.8rem', 
              fontWeight: 'bold', 
              color: '#ffffff', 
              marginBottom: '12px',
              textShadow: '0 0 30px rgba(2,255,210,0.3)',
              letterSpacing: '-0.5px'
            }}>
              🎲 LuckySea Analytics Dashboard
            </h1>
            <div style={{ 
              display: 'inline-block', 
              backgroundColor: 'rgba(2,255,210,0.2)', 
              border: '1px solid rgba(2,255,210,0.5)',
              borderRadius: '20px', 
              padding: '4px 12px', 
              fontSize: '0.85rem', 
              color: '#02FFD2',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              🌍 All times in UTC timezone
            </div>
          </div>
          {/* Status and Actions Section */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '25px', gap: '20px' }}>
            {/* Left: Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  backgroundColor: '#02FFD2', 
                  borderRadius: '50%',
                  boxShadow: '0 0 8px rgba(2,255,210,0.6)',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{ color: '#02FFD2', fontSize: '0.9rem', fontWeight: '500' }}>
                  System Online
                </span>
              </div>
              <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              <span style={{ color: '#E5E7EB', fontSize: '0.9rem' }}>
                Pre-loaded historical data
              </span>
            </div>
            
            {/* Right: Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a 
                href="https://blockscout.lisk.com/address/0xf18485f75551FFCa4011C32a0885ea8C22336840?tab=txs" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  backgroundColor: '#02FFD2',
                  color: '#041924',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#01E5C4';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#02FFD2';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                📈 Live Transactions
              </a>
              <a 
                href="https://blockscout.lisk.com/address/0xf18485f75551FFCa4011C32a0885ea8C22336840?tab=index" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: '#E5E7EB',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.85rem',
                  fontWeight: '500',
                  border: '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🔍 Contract Details
              </a>
            </div>
            <div style={{ 
              backgroundColor: 'rgba(2,255,210,0.1)', 
              padding: '6px 12px', 
              borderRadius: '8px', 
              border: '1px solid rgba(2,255,210,0.3)' 
            }}>
              <p style={{ color: '#02FFD2', fontSize: '0.9rem', fontWeight: '500', margin: 0 }}>
                📊 Last updated: {contractData?.lastUpdate ? getTimeAgo(contractData.lastUpdate) : 'Loading...'}
              </p>
              <p style={{ color: 'rgba(2,255,210,0.7)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Historical data • Daily snapshots at 00:00 UTC
              </p>
            </div>
          </div>
          
          {/* Contract Address - Smaller, Bottom */}
          <div style={{ 
            textAlign: 'center', 
            marginTop: '15px', 
            paddingTop: '15px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}>
            <p style={{ color: '#888', fontSize: '0.8rem', margin: 0 }}>
              Contract: <code style={{ backgroundColor: 'rgba(2,255,210,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#02FFD2', fontSize: '0.75rem' }}>{CONTRACT_ADDRESS}</code>
            </p>
          </div>
          {fetchProgress && (
            <div style={{ 
              marginTop: '15px', 
              padding: '15px', 
              backgroundColor: '#2a1a0a', 
              borderRadius: '8px', 
              border: '2px solid #ffd93d',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.1rem', color: '#ffd93d', fontWeight: '500' }}>
                {fetchProgress}
              </div>
              <div style={{ 
                width: '100%', 
                height: '4px', 
                backgroundColor: '#444', 
                borderRadius: '2px', 
                marginTop: '10px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #ffd93d, #00ff88)',
                  animation: 'progress 2s ease-in-out infinite',
                  borderRadius: '2px'
                }}></div>
              </div>
              <style dangerouslySetInnerHTML={{
                __html: `
                  @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 100%; }
                    100% { width: 0%; }
                  }
                `
              }} />
            </div>
          )}
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px',
          marginBottom: '30px'
        }}>
          {/* Total Transactions - PRIMARY CARD */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(2,255,210,0.08) 0%, rgba(4,25,36,1) 100%)',
            padding: '28px', 
            borderRadius: '16px', 
            boxShadow: '0 6px 24px rgba(2,255,210,0.12), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.4)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.2), inset 0 1px 0 rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(2,255,210,0.12), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              🎲 Total Transactions
            </h3>
            <p style={{ fontSize: '2.4rem', fontWeight: '700', color: '#02FFD2', position: 'relative' }}>
              {contractData?.totalTransactions?.toLocaleString() || 0}
            </p>
          </div>

          {/* Latest Complete Day Transactions - SECONDARY CARD */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '24px', 
            borderRadius: '12px', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)', 
            border: '1px solid rgba(255,255,255,0.15)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.2s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 1s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              📊 {analysis?.latestCompleteDateFormatted || 'Loading...'}
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.latestDayTxs?.toLocaleString() || 0} transactions
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(2,255,210,0.6)', marginTop: '8px', position: 'relative' }}>
              Complete 24h data
            </p>
          </div>

          {/* Weekly Transactions */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.3)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.3s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 1.5s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              📈 7-Day Period
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.weeklyTxs?.toLocaleString() || 0} transactions
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(2,255,210,0.6)', marginTop: '8px', position: 'relative' }}>
              {analysis?.weeklyPeriod || 'Loading period...'}
            </p>
          </div>

          {/* Monthly Transactions */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.3)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.4s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 2s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              🗓️ Month Progress
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.monthlyTxs?.toLocaleString() || 0} transactions
            </p>
            <p style={{ fontSize: '0.85rem', color: 'rgba(2,255,210,0.6)', marginTop: '8px', position: 'relative' }}>
              {analysis?.monthlyPeriod || 'Loading period...'}
            </p>
          </div>

          {/* Average per Day */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.3)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.5s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 2.5s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              📊 Average per Day
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.avgTxsPerDay?.toLocaleString() || 0}
            </p>
          </div>

          {/* Average per Month */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.3)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.6s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 3s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              📈 Average per Month
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.avgTxsPerMonth?.toLocaleString() || 0}
            </p>
          </div>

          {/* Total Days Active */}
          <div style={{ 
            background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
            padding: '25px', 
            borderRadius: '12px', 
            boxShadow: '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)', 
            border: '1px solid rgba(2,255,210,0.3)',
            position: 'relative',
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            animation: 'fadeInUp 0.6s ease-out 0.7s both'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(2,255,210,0.3), inset 0 1px 0 rgba(255,255,255,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(2,255,210,0.15), inset 0 1px 0 rgba(255,255,255,0.1)';
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
              animation: 'shimmer 3s infinite 3.5s'
            }}></div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: 'rgba(2,255,210,0.8)', marginBottom: '10px', position: 'relative' }}>
              🗓️ Total Days Active
            </h3>
            <p style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', position: 'relative' }}>
              {analysis?.totalDaysActive?.toLocaleString() || 0}
            </p>
          </div>
        </div>

        {/* Hourly Analysis - TERTIARY CARD */}
        <div style={{ 
          background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
          padding: '28px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', 
          border: '1px solid rgba(255,255,255,0.1)',
          marginTop: '30px',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.8s ease-out 0.8s both'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'shimmer 4s infinite'
          }}></div>
          <h2 style={{ 
            fontSize: '1.4rem', 
            fontWeight: '600', 
            marginBottom: '20px', 
            color: '#E5E7EB', 
            position: 'relative'
          }}>📈 Hourly Activity - {analysis?.latestCompleteDateFormatted || 'Loading...'} (UTC)</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const count = analysis?.hourlyData?.[hour] || 0;
              return (
                <div key={hour} style={{ 
                  textAlign: 'center', 
                  padding: '10px', 
                  backgroundColor: count > 0 ? 'rgba(2,255,210,0.2)' : 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  border: count > 0 ? '1px solid #02FFD2' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: count > 0 ? '0 4px 15px rgba(2,255,210,0.2)' : 'none',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{ fontSize: '0.8rem', color: '#E5E7EB' }}>{hour}h</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: '600', color: count > 0 ? '#02FFD2' : '#888' }}>
                    {count}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Analysis - TERTIARY CARD */}
        <div style={{ 
          background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
          padding: '28px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', 
          border: '1px solid rgba(255,255,255,0.1)',
          marginTop: '30px',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.8s ease-out 0.9s both'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'shimmer 4s infinite 1s'
          }}></div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '20px', 
            color: '#02FFD2', 
            textShadow: '0 0 20px rgba(2,255,210,0.3)',
            position: 'relative'
          }}>📅 Daily Breakdown (Last 7 days UTC)</h2>
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto' }}>
            {Object.keys(analysis?.dailyData || {}).length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                padding: '30px', 
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '2px dashed #666'
              }}>
                <div style={{ fontSize: '1.2rem', color: '#ffd93d', marginBottom: '10px' }}>⏳ Loading historical data...</div>
                <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>
                  Daily breakdown will appear here once all transactions are processed
                </div>
              </div>
            ) : (
              Object.entries(analysis?.dailyData || {})
                .sort(([a], [b]) => b.localeCompare(a))
                .slice(0, 7)
                .map(([date, count]) => (
                  <div key={date} style={{ 
                    minWidth: '120px', 
                    textAlign: 'center', 
                    padding: '15px', 
                    background: 'linear-gradient(135deg, rgba(2,255,210,0.15) 0%, rgba(2,255,210,0.05) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(2,255,210,0.4)',
                    boxShadow: '0 4px 20px rgba(2,255,210,0.2)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(2,255,210,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(2,255,210,0.2)';
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#E5E7EB', marginBottom: '5px' }}>
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#02FFD2' }}>
                      {count.toLocaleString()}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Monthly Breakdown - TERTIARY CARD */}
        <div style={{ 
          background: 'linear-gradient(135deg, #041924 0%, #052738 100%)',
          padding: '28px', 
          borderRadius: '12px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)', 
          border: '1px solid rgba(255,255,255,0.1)',
          marginTop: '30px',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.8s ease-out 1s both'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)',
            animation: 'shimmer 4s infinite 2s'
          }}></div>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            marginBottom: '25px', 
            color: '#02FFD2', 
            textShadow: '0 0 20px rgba(2,255,210,0.3)',
            position: 'relative'
          }}>📊 Monthly Breakdown (UTC)</h2>
          
          <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', marginBottom: '20px' }}>
            {Object.keys(analysis?.monthlyData || {}).length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                padding: '30px', 
                backgroundColor: '#2a2a2a',
                borderRadius: '8px',
                border: '2px dashed #666'
              }}>
                <div style={{ fontSize: '1.2rem', color: '#ffd93d', marginBottom: '10px' }}>⏳ Processing transaction history...</div>
                <div style={{ fontSize: '0.9rem', color: '#b3b3b3' }}>
                  Monthly breakdown will show once all historical data is analyzed
                </div>
              </div>
            ) : (
              Object.entries(analysis?.monthlyData || {})
                .sort(([a], [b]) => b.localeCompare(a))
                .map(([month, count]) => (
                  <div key={month} style={{ 
                    minWidth: '150px', 
                    textAlign: 'center', 
                    padding: '20px', 
                    background: 'linear-gradient(135deg, rgba(2,255,210,0.15) 0%, rgba(2,255,210,0.05) 100%)',
                    borderRadius: '12px',
                    border: '1px solid rgba(2,255,210,0.4)',
                    boxShadow: '0 4px 20px rgba(2,255,210,0.2)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(2,255,210,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(2,255,210,0.2)';
                  }}>
                    <div style={{ fontSize: '1rem', color: '#E5E7EB', marginBottom: '8px' }}>
                      {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: '600', color: '#02FFD2', marginBottom: '5px' }}>
                      {count.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#E5E7EB' }}>transactions</div>
                  </div>
                ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}