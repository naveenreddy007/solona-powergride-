import React, { useState, useEffect } from 'react';
import { createNeighborhood } from '../models/EnergyModel';
import { setupWallets, matchEnergyNeeds, getTransactionHistory, verifySolanaConnection, getMarketStatistics, getExplorerLink } from '../solana/energyTrading';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import './Dashboard.css';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

function calculateEnergyBalance(building) {
  // If the building object has the getEnergyBalance method, use it
  if (building && typeof building.getEnergyBalance === 'function') {
    return building.getEnergyBalance();
  }
  
  // Otherwise calculate it directly
  if (building) {
    return (building.currentProduction || 0) - (building.currentConsumption || 0);
  }
  
  // Default value if building is undefined
  return 0;
}

function ensureBuildingMethods(building, timeOfDay, weather) {
  if (!building) return building;
  
  // Clone the building to avoid modifying the original
  const enhanced = {...building};
  
  // Add getEnergyBalance if missing
  if (typeof enhanced.getEnergyBalance !== 'function') {
    enhanced.getEnergyBalance = function() {
      return (this.currentProduction || 0) - (this.currentConsumption || 0);
    };
  }
  
  // Add simulateProduction if missing
  if (typeof enhanced.simulateProduction !== 'function') {
    enhanced.simulateProduction = function(timeOfDay, weatherCondition) {
      // Simple solar production model
      const hourFactor = Math.sin(((timeOfDay / 24) * Math.PI));
      const weatherFactor = weatherCondition === 'sunny' ? 1 : 
                            weatherCondition === 'cloudy' ? 0.6 : 0.3;
      
      this.currentProduction = (this.solarCapacity || 20) * Math.max(0, hourFactor) * weatherFactor;
      return this.currentProduction;
    };
  }
  
  // Add simulateConsumption if missing
  if (typeof enhanced.simulateConsumption !== 'function') {
    enhanced.simulateConsumption = function(timeOfDay) {
      // Simple consumption model based on building type
      const type = this.type || 'residential';
      let baseDemand;
      
      switch(type) {
        case 'residential':
          // Higher in morning and evening
          baseDemand = 2 + Math.sin(((timeOfDay - 7) / 24) * 2 * Math.PI) + 
                      Math.sin(((timeOfDay - 19) / 24) * 2 * Math.PI);
          break;
        case 'commercial':
          // Higher during work hours
          baseDemand = 5 + 8 * Math.sin(((timeOfDay - 13) / 24) * Math.PI);
          baseDemand = timeOfDay >= 8 && timeOfDay <= 18 ? baseDemand : baseDemand * 0.3;
          break;
        case 'industrial':
          // Relatively constant
          baseDemand = 15 + Math.random() * 5;
          break;
        default:
          baseDemand = 5;
      }
      
      this.currentConsumption = Math.max(0, baseDemand + (Math.random() - 0.5) * 2);
      return this.currentConsumption;
    };
  }
  
  return enhanced;
}

const Dashboard = () => {
  const [buildings, setBuildings] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState(12); // Noon
  const [weather, setWeather] = useState('sunny');
  const [simulationRunning, setSimulationRunning] = useState(true); // Start automatically
  const [trades, setTrades] = useState([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [energyHistory, setEnergyHistory] = useState({
    labels: [],
    production: [],
    consumption: [],
  });
  const [solanaStatus, setSolanaStatus] = useState({ connected: false, checking: true });
  const [marketStats, setMarketStats] = useState({
    totalVolume: 0,
    averagePrice: 0,
    highestPrice: 0,
    lowestPrice: 0,
    tradeCount: 0,
    realTransactions: 0,
    simulatedTransactions: 0
  });
  const [simulationSpeed, setSimulationSpeed] = useState(5000); // Slower default for real transactions
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  
  // Check Solana connection
  useEffect(() => {
    const checkConnection = async () => {
      setSolanaStatus({ connected: false, checking: true });
      try {
        const isConnected = await verifySolanaConnection();
        setSolanaStatus({ connected: isConnected, checking: false });
      } catch (error) {
        console.error('Error checking Solana connection:', error);
        setSolanaStatus({ connected: false, checking: false, error: error.message });
      }
    };
    
    checkConnection();
  }, []);
  
  // Initialize neighborhood
  useEffect(() => {
    const initializeSimulation = async () => {
      setIsInitializing(true);
      setError(null);
      
      try {
        console.log('Creating neighborhood...');
        const neighborhood = createNeighborhood(5); // Reduced to 5 buildings for real transactions
        
        console.log('Initializing buildings with production and consumption...');
        // Process each building to ensure it has all required methods
        const enhancedNeighborhood = neighborhood.map(building => {
          const enhanced = ensureBuildingMethods(building, timeOfDay, weather);
          
          // Initialize with some production and consumption
          try {
            enhanced.simulateProduction(timeOfDay, weather);
            enhanced.simulateConsumption(timeOfDay);
          } catch (err) {
            console.error(`Error initializing building ${building.id}:`, err);
          }
          
          return enhanced;
        });
        
        console.log('Setting up Solana wallets...');
        // Setup wallets and wait for completion
        const buildingsWithWallets = await setupWallets(enhancedNeighborhood);
        setBuildings(buildingsWithWallets);
        
        // Force an initial trade matching
        console.log('Executing initial energy trades...');
        const initialTrades = await matchEnergyNeeds(buildingsWithWallets);
        setTrades(initialTrades || []);
        
        // Calculate initial savings
        const gridPrice = 0.15; // Traditional grid price per kWh
        const p2pPrice = 0.01; // P2P energy price per kWh
        
        const initialTradedAmount = initialTrades?.reduce((sum, trade) => sum + trade.energyAmount, 0) || 0;
        setTotalSavings(initialTradedAmount * (gridPrice - p2pPrice));
        
        // Calculate initial market statistics
        setMarketStats(getMarketStatistics(initialTrades || []));
        console.log('Initialization complete!');
        setIsInitializing(false);
      } catch (error) {
        console.error('Error initializing simulation:', error);
        setError(`Failed to initialize: ${error.message}`);
        setIsInitializing(false);
      }
    };
    
    initializeSimulation();
  }, []);
  
  // Run simulation
  useEffect(() => {
    if (!simulationRunning || buildings.length === 0 || isInitializing) return;
    
    const interval = setInterval(async () => {
      // Advance time
      setTimeOfDay(time => (time + 0.5) % 24);
      
      // Update buildings' production and consumption
      const updatedBuildings = buildings.map(building => {
        try {
          // Ensure building has all required methods
          const enhancedBuilding = ensureBuildingMethods(building, timeOfDay, weather);
          
          // Now safely call the methods
          enhancedBuilding.simulateProduction(timeOfDay, weather);
          enhancedBuilding.simulateConsumption(timeOfDay);
          
          return enhancedBuilding;
        } catch (error) {
          console.error(`Error updating building ${building.id}:`, error);
          return building;
        }
      });
      
      setBuildings(updatedBuildings);
      
      // Update energy history for charts
      const totalProduction = updatedBuildings.reduce((sum, b) => sum + (b.currentProduction || 0), 0);
      const totalConsumption = updatedBuildings.reduce((sum, b) => sum + (b.currentConsumption || 0), 0);
      
      setEnergyHistory(prev => {
        const timeLabel = `${Math.floor(timeOfDay)}:${(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}`;
        
        // Keep only the last 20 data points to avoid chart overcrowding
        const labels = [...prev.labels, timeLabel].slice(-20);
        const production = [...prev.production, totalProduction].slice(-20);
        const consumption = [...prev.consumption, totalConsumption].slice(-20);
        
        return { labels, production, consumption };
      });
      
      try {
        // Match energy needs and execute trades
        const newTrades = await matchEnergyNeeds(updatedBuildings);
        if (newTrades && newTrades.length > 0) {
          setTrades(prev => [...prev, ...newTrades].slice(-50)); // Keep only recent trades
          
          // Update market statistics
          setMarketStats(getMarketStatistics([...trades, ...newTrades]));
          
          // Calculate savings compared to traditional grid
          const gridPrice = 0.15; // Traditional grid price per kWh
          const p2pPrice = 0.01; // P2P energy price per kWh
          
          const totalTraded = newTrades.reduce((sum, trade) => sum + trade.energyAmount, 0);
          const newSavings = totalTraded * (gridPrice - p2pPrice);
          setTotalSavings(prev => prev + newSavings);
        }
      } catch (error) {
        console.error('Error executing energy trades:', error);
      }
    }, simulationSpeed); // Update based on selected speed
    
    return () => clearInterval(interval);
  }, [simulationRunning, buildings, timeOfDay, weather, simulationSpeed, isInitializing, trades]);
  
  const toggleSimulation = () => {
    setSimulationRunning(!simulationRunning);
  };
  
  const handleSpeedChange = (e) => {
    setSimulationSpeed(parseInt(e.target.value));
  };
  
  const openExplorerLink = (signature) => {
    if (!signature || signature.startsWith('SIMULATED')) return;
    
    const explorerUrl = getExplorerLink(signature);
    window.open(explorerUrl, '_blank');
  };
  
  const renderBuildingCards = () => {
    if (!buildings || !Array.isArray(buildings) || buildings.length === 0) {
      return <div className="no-buildings">No buildings available</div>;
    }
    
    return buildings.map(building => {
      if (!building) return null;
      
      // Make sure we have the required values
      const production = typeof building.currentProduction === 'number' ? building.currentProduction : 0;
      const consumption = typeof building.currentConsumption === 'number' ? building.currentConsumption : 0;
      const balance = calculateEnergyBalance(building);
      const walletAddress = building.wallet?.publicKey?.toString() || 'No wallet';
      const walletBalance = typeof building.balance === 'number' ? building.balance : 0;
      
      return (
        <div 
          key={building.id || Math.random().toString()} 
          className={`building-card ${building.type || 'unknown'} ${balance > 0 ? 'seller' : 'buyer'}`}
        >
          <h3>Building {building.id || 'Unknown'} ({building.type || 'unknown'})</h3>
          <div className="energy-stats">
            <div>Production: {production.toFixed(2)} kW</div>
            <div>Consumption: {consumption.toFixed(2)} kW</div>
            <div>Balance: {balance.toFixed(2)} kW</div>
          </div>
          <div className="wallet-info">
            <div className="wallet-address">
              <span className="label">Wallet:</span> 
              <span className="value" title={walletAddress}>
                {walletAddress.substring(0, 8)}...
              </span>
            </div>
            <div className="wallet-balance">
              <span className="label">Balance:</span> 
              <span className={`value ${walletBalance < 0.5 ? 'low-balance' : ''}`}>
                {walletBalance.toFixed(3)} SOL
              </span>
            </div>
          </div>
        </div>
      );
    }).filter(Boolean); // Filter out any null buildings
  };
  
  // Energy flow chart configuration
  const energyChartData = {
    labels: energyHistory.labels.length > 0 ? energyHistory.labels : ['00:00'],
    datasets: [
      {
        label: 'Total Production',
        data: energyHistory.production.length > 0 ? energyHistory.production : [0],
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.2)',
        fill: true,
        tension: 0.3,
      },
      {
        label: 'Total Consumption',
        data: energyHistory.consumption.length > 0 ? energyHistory.consumption : [0],
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        fill: true,
        tension: 0.3,
      },
    ],
  };
  
  const energyChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Energy (kW)',
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Energy Production & Consumption',
      },
      legend: {
        position: 'top',
      },
    },
  };
  
  // Trade distribution chart by building type
  const getTradeDistributionData = () => {
    const buildingTypes = ['residential', 'commercial', 'industrial'];
    const tradeVolumes = buildingTypes.map(type => {
      return trades
        .filter(trade => {
          const sellerBuilding = buildings.find(b => b.id === trade.seller);
          return sellerBuilding?.type === type;
        })
        .reduce((sum, trade) => sum + trade.energyAmount, 0);
    });
    
    return {
      labels: buildingTypes.map(t => t.charAt(0).toUpperCase() + t.slice(1)),
      datasets: [
        {
          label: 'Energy Traded (kWh)',
          data: tradeVolumes,
          backgroundColor: ['#3498db', '#2ecc71', '#f1c40f'],
        },
      ],
    };
  };
  
  const tradeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Energy Trading by Building Type (Sellers)',
      },
      legend: {
        display: false,
      },
    },
  };
  
  // Energy price chart data
  const getPriceChartData = () => {
    // Get the last 10 trades
    const recentTrades = trades.slice(-10);
    
    return {
      labels: recentTrades.map((_, i) => `Trade ${i+1}`),
      datasets: [
        {
          label: 'Energy Price (SOL/kWh)',
          data: recentTrades.map(trade => trade.pricePerUnit || 0.01),
          borderColor: '#8e44ad',
          backgroundColor: 'rgba(142, 68, 173, 0.2)',
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.2,
        }
      ]
    };
  };
  
  const priceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Price (SOL/kWh)',
        },
      },
    },
    plugins: {
      title: {
        display: true,
        text: 'Real-time Energy Pricing',
      },
    },
  };
  
  // Transaction type pie chart
  const getTransactionTypeData = () => {
    return {
      labels: ['Real Blockchain', 'Simulated'],
      datasets: [
        {
          data: [marketStats.realTransactions, marketStats.simulatedTransactions],
          backgroundColor: ['#2ecc71', '#95a5a6'],
          hoverBackgroundColor: ['#27ae60', '#7f8c8d'],
        }
      ]
    };
  };
  
  const transactionTypeOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Transaction Types',
      },
      legend: {
        position: 'bottom',
      },
    },
  };
  
  if (isInitializing) {
    return (
      <div className="dashboard-container">
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h2>Initializing Solana Wallets...</h2>
            <p>Setting up blockchain connections and creating wallets for buildings.</p>
            <p>This may take a moment as we're connecting to the Solana Devnet.</p>
          </div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-overlay">
          <div className="error-content">
            <h2>Error Initializing System</h2>
            <p>{error}</p>
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="dashboard-container">
      <header>
        <div className="title-section">
          <h1>Decentralized Energy Management System</h1>
          <div className={`solana-status ${solanaStatus.connected ? 'connected' : 'disconnected'}`}>
            {solanaStatus.checking ? 'Checking Solana connection...' : 
             solanaStatus.connected ? 'Connected to Solana Devnet' : 'Failed to connect to Solana Devnet (using simulation)'}
          </div>
        </div>
        <div className="simulation-controls">
          <button 
            onClick={toggleSimulation}
            className={simulationRunning ? 'pause-btn' : 'start-btn'}
          >
            {simulationRunning ? 'Pause Simulation' : 'Start Simulation'}
          </button>
          <div className="speed-control">
            <label>Speed: </label>
            <select value={simulationSpeed} onChange={handleSpeedChange}>
              <option value="10000">Very Slow</option>
              <option value="5000">Slow</option>
              <option value="3000">Normal</option>
              <option value="1000">Fast</option>
            </select>
          </div>
          <div className="weather-control">
            <label>Weather: </label>
            <select value={weather} onChange={(e) => setWeather(e.target.value)}>
              <option value="sunny">Sunny</option>
              <option value="cloudy">Cloudy</option>
              <option value="rainy">Rainy</option>
            </select>
          </div>
          <div className="time-display">Time: {Math.floor(timeOfDay)}:{(timeOfDay % 1 * 60).toFixed(0).padStart(2, '0')}</div>
        </div>
      </header>
      
      <div className="stats-panel">
        <div className="stat-card">
          <h3>Total Energy Traded</h3>
          <div className="stat-value">{trades.reduce((sum, t) => sum + t.energyAmount, 0).toFixed(2)} kWh</div>
        </div>
        <div className="stat-card">
          <h3>Cost Savings vs. Grid</h3>
          <div className="stat-value">${totalSavings.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <h3>Total Transactions</h3>
          <div className="stat-value">{trades.length}</div>
          <div className="sub-stat">
            <span className="blockchain-count">{marketStats.realTransactions} on blockchain</span>
          </div>
        </div>
        <div className="stat-card">
          <h3>Avg. Energy Price</h3>
          <div className="stat-value">{marketStats.averagePrice.toFixed(3)} SOL/kWh</div>
        </div>
      </div>
      
      <div className="charts-container">
        <div className="chart-card">
          <h3>Energy Production & Consumption</h3>
          <div style={{ height: '300px' }}>
            <Line data={energyChartData} options={energyChartOptions} />
          </div>
        </div>
        <div className="chart-card">
          <h3>Energy Trading by Building Type</h3>
          <div style={{ height: '300px' }}>
            <Bar data={getTradeDistributionData()} options={tradeChartOptions} />
          </div>
        </div>
      </div>
      
      <div className="blockchain-section">
        <h2>Solana Blockchain Integration</h2>
        <div className="charts-container">
          <div className="chart-card">
            <h3>Real-time Energy Pricing</h3>
            <div style={{ height: '250px' }}>
              <Line data={getPriceChartData()} options={priceChartOptions} />
            </div>
          </div>
          <div className="market-stats-card">
            <h3>Energy Market Statistics</h3>
            <div className="market-stats">
              <div className="stat-item">
                <div className="stat-label">Trading Volume</div>
                <div className="stat-value">{marketStats.totalVolume.toFixed(2)} kWh</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Highest Price</div>
                <div className="stat-value">{marketStats.highestPrice.toFixed(3)} SOL/kWh</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Lowest Price</div>
                <div className="stat-value">{marketStats.lowestPrice.toFixed(3)} SOL/kWh</div>
              </div>
              <div className="stat-item">
                <div className="stat-label">Blockchain vs Simulated</div>
                <div className="stat-value">
                  <span className="blockchain-label">{marketStats.realTransactions} / {marketStats.simulatedTransactions}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="buildings-grid">
        <h2>Energy Node Network</h2>
        {renderBuildingCards()}
      </div>
      
      <div className="blockchain-section">
        <h2>Solana Transaction History</h2>
        <div className="chart-card transaction-history">
          <h3>Recent Energy Trades on Solana</h3>
          {trades && trades.length > 0 ? (
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Seller</th>
                  <th>Buyer</th>
                  <th>Energy (kWh)</th>
                  <th>Price (SOL)</th>
                  <th>Transaction</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {trades.slice(-10).reverse().map((trade, index) => {
                  if (!trade) return null;
                  
                  const sellerBuilding = buildings.find(b => b && b.id === trade.seller);
                  const buyerBuilding = buildings.find(b => b && b.id === trade.buyer);
                  const timestamp = trade.timestamp ? new Date(trade.timestamp) : new Date();
                  const energyAmount = typeof trade.energyAmount === 'number' ? trade.energyAmount : 0;
                  const price = typeof trade.price === 'number' ? trade.price : 0;
                  const signature = trade.signature || 'Unknown';
                  const isSimulated = Boolean(trade.simulated);
                  
                  return (
                    <tr key={index} className={isSimulated ? 'simulated-row' : 'blockchain-row'}>
                      <td>{timestamp.toLocaleTimeString()}</td>
                      <td>
                        Building {trade.seller || 'Unknown'} 
                        <span className="building-type">({sellerBuilding?.type || 'unknown'})</span>
                      </td>
                      <td>
                        Building {trade.buyer || 'Unknown'}
                        <span className="building-type">({buyerBuilding?.type || 'unknown'})</span>
                      </td>
                      <td className="numeric">{energyAmount.toFixed(2)}</td>
                      <td className="numeric">{price.toFixed(5)}</td>
                      <td 
                        className={`transaction-hash ${!isSimulated ? 'clickable' : ''}`}
                        onClick={() => !isSimulated && openExplorerLink(signature)}
                        title={isSimulated ? 'Simulated transaction' : 'Click to view on Solana Explorer'}
                      >
                        {signature ? 
                          <span className="hash-value">{signature.substring(0, 12)}...</span> : 
                          'Pending...'}
                      </td>
                      <td>
                        <span className={`transaction-type ${isSimulated ? 'simulated' : 'blockchain'}`}>
                          {isSimulated ? 'Simulated' : 'Blockchain'}
                        </span>
                      </td>
                    </tr>
                  );
                }).filter(Boolean)}
              </tbody>
            </table>
          ) : (
            <div className="no-trades">
              <p>No energy trades have been executed yet.</p>
              <p>Trades will appear here as buildings begin exchanging energy.</p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="dashboard-footer">
        <div className="footer-content">
          <p>Decentralized Energy Management System powered by Solana blockchain</p>
          <p className="depin-message">
            A DePIN (Decentralized Physical Infrastructure Network) Solution for Smart Cities
          </p>
          <div className="solana-disclaimer">
            Running on Solana Devnet - Transactions can be verified on the{' '}
            <a href="https://explorer.solana.com/?cluster=devnet" target="_blank" rel="noopener noreferrer">
              Solana Explorer
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard; 