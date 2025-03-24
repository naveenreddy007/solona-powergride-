import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import Analytics from './components/Analytics';
import SmartContracts from './components/SmartContracts';
import Community from './components/Community';
import WalletLogin from './components/WalletLogin';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [buildings, setBuildings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [energyHistory, setEnergyHistory] = useState({ labels: [], production: [], consumption: [] });
  const [wallet, setWallet] = useState(null);
  
  // Load saved wallet information on startup
  useEffect(() => {
    const savedWallet = localStorage.getItem('currentWallet');
    if (savedWallet) {
      try {
        setWallet(JSON.parse(savedWallet));
      } catch (err) {
        console.error('Failed to load saved wallet:', err);
      }
    }
  }, []);

  // Simple navigation without router
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  // Callback to update shared state
  const updateAppState = (newBuildings, newTrades, newEnergyHistory) => {
    if (newBuildings) setBuildings(newBuildings);
    if (newTrades) setTrades(newTrades);
    if (newEnergyHistory) setEnergyHistory(newEnergyHistory);
  };
  
  // Handle wallet connection
  const handleWalletConnect = (selectedWallet) => {
    setWallet(selectedWallet);
    localStorage.setItem('currentWallet', JSON.stringify(selectedWallet));
  };
  
  // Handle wallet disconnection
  const handleWalletDisconnect = () => {
    setWallet(null);
    localStorage.removeItem('currentWallet');
  };

  return (
    <div className="App">
      <WalletLogin 
        onWalletConnect={handleWalletConnect}
        onDisconnect={handleWalletDisconnect}
        connectedWallet={wallet}
      />
      
      <nav className="app-nav">
        <button 
          onClick={() => navigateTo('dashboard')}
          className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => navigateTo('analytics')}
          className={`nav-link ${currentPage === 'analytics' ? 'active' : ''}`}
        >
          Analytics
        </button>
        <button 
          onClick={() => navigateTo('smart-contracts')}
          className={`nav-link ${currentPage === 'smart-contracts' ? 'active' : ''}`}
        >
          Smart Contracts
        </button>
        <button 
          onClick={() => navigateTo('community')}
          className={`nav-link ${currentPage === 'community' ? 'active' : ''}`}
        >
          Community
        </button>
        <button 
          onClick={() => navigateTo('marketplace')}
          className={`nav-link ${currentPage === 'marketplace' ? 'active' : ''}`}
        >
          Marketplace
        </button>
      </nav>
      
      {currentPage === 'dashboard' && 
        <Dashboard 
          navigateTo={navigateTo} 
          updateAppState={updateAppState}
          connectedWallet={wallet}
        />
      }
      {currentPage === 'analytics' && 
        <Analytics 
          buildings={buildings} 
          trades={trades} 
          energyHistory={energyHistory} 
          navigateTo={navigateTo} 
          connectedWallet={wallet}
        />
      }
      {currentPage === 'smart-contracts' && 
        <SmartContracts 
          buildings={buildings} 
          navigateTo={navigateTo} 
          walletBalance={wallet ? wallet.balance : '0.00'}
          connectedWallet={wallet}
        />
      }
      {currentPage === 'community' && 
        <Community 
          buildings={buildings} 
          navigateTo={navigateTo} 
          trades={trades}
          connectedWallet={wallet}
        />
      }
      {currentPage === 'marketplace' && 
        <Marketplace 
          navigateTo={navigateTo} 
          buildings={buildings && buildings.length > 0 ? buildings : []}
          connectedWallet={wallet}
        />
      }
    </div>
  );
}

export default App; 