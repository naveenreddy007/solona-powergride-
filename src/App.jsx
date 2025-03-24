import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Simple navigation without router
  const navigateTo = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="App">
      <nav className="app-nav">
        <button 
          onClick={() => navigateTo('dashboard')}
          className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => navigateTo('marketplace')}
          className={`nav-link ${currentPage === 'marketplace' ? 'active' : ''}`}
        >
          Marketplace
        </button>
      </nav>
      
      {currentPage === 'dashboard' && <Dashboard navigateTo={navigateTo} />}
      {currentPage === 'marketplace' && <Marketplace navigateTo={navigateTo} />}
    </div>
  );
}

export default App; 