import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav className="app-nav">
          <Link to="/" className="nav-link">Dashboard</Link>
          <Link to="/marketplace" className="nav-link">Marketplace</Link>
        </nav>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 