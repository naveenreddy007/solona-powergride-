import React, { useState, useEffect } from 'react';
import './Marketplace.css';
import './ClearButton.css';
import { setupWallets, executeEnergyTrade } from '../solana/energyTrading';

const Marketplace = ({ navigateTo, buildings, connectedWallet }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [offers, setOffers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [newOffer, setNewOffer] = useState({ amount: 1, price: 0.05 });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [localBuildings, setLocalBuildings] = useState([]);

  // Load buildings and marketplace data
  useEffect(() => {
    const loadMarketplace = async () => {
      try {
        // Load buildings from localStorage if available
        const storedBuildings = localStorage.getItem('buildings');
        let parsedBuildings = [];
        
        try {
          parsedBuildings = storedBuildings ? JSON.parse(storedBuildings) : [];
        } catch (error) {
          console.error('Failed to parse stored buildings:', error);
        }
        
        // Initialize buildings if none exist
        let buildingsWithWallets = parsedBuildings;
        if (!parsedBuildings.length) {
          // Create sample buildings if none exist
          buildingsWithWallets = [
            { id: 'B1', type: 'residential', name: 'Green Residence' },
            { id: 'B2', type: 'commercial', name: 'Solar Office Complex' },
            { id: 'B3', type: 'industrial', name: 'Eco Factory' },
            { id: 'B4', type: 'residential', name: 'Smart Home' }
          ];
        }
        
        // Ensure all buildings have wallets
        try {
          if (buildingsWithWallets.some(b => !b.wallet)) {
            // Pass all buildings to setupWallets at once
            buildingsWithWallets = await setupWallets(buildingsWithWallets);
          }
          
          // Save updated buildings
          localStorage.setItem('buildings', JSON.stringify(buildingsWithWallets));
        } catch (error) {
          console.error('Failed to setup wallets for buildings:', error);
        }
        
        setLocalBuildings(buildingsWithWallets);
        
        // Set first building as current user if none selected
        if (!currentUser && buildingsWithWallets.length > 0) {
          setCurrentUser(buildingsWithWallets[0]);
        }
        
        // Load marketplace offers
        const storedOffers = localStorage.getItem('energyOffers');
        if (storedOffers) {
          setOffers(JSON.parse(storedOffers));
        } else {
          // Create sample offers
          const sampleOffers = [
            { id: '1', seller: 'B2', amount: 5, price: 0.04, timestamp: Date.now() - 3600000 },
            { id: '2', seller: 'B3', amount: 10, price: 0.035, timestamp: Date.now() - 7200000 }
          ];
          localStorage.setItem('energyOffers', JSON.stringify(sampleOffers));
          setOffers(sampleOffers);
        }
        
        // Load transaction history
        const storedTransactions = localStorage.getItem('energyTransactions');
        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions));
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Failed to initialize marketplace:', error);
        setNotification({
          type: 'error',
          message: 'Failed to load marketplace data'
        });
        setLoading(false);
      }
    };
    
    loadMarketplace();
  }, [currentUser]);

  // Use buildings from props or local state
  const displayBuildings = buildings.length > 0 ? buildings : localBuildings;

  // Use connected wallet for marketplace
  useEffect(() => {
    if (connectedWallet && displayBuildings && displayBuildings.length > 0) {
      // Find if any existing building already has this wallet
      const buildingWithWallet = displayBuildings.find(b => 
        b.wallet && b.wallet.publicKey && 
        b.wallet.publicKey.toString() === connectedWallet.publicKey.toString()
      );
      
      if (buildingWithWallet) {
        setCurrentUser(buildingWithWallet);
      } else {
        // Associate the wallet with the first building for demo purposes
        const updatedBuilding = {
          ...displayBuildings[0],
          wallet: { 
            publicKey: connectedWallet.publicKey,
            toString: () => connectedWallet.publicKey.toString()
          },
          walletName: connectedWallet.name,
          balance: connectedWallet.balance
        };
        
        setCurrentUser(updatedBuilding);
      }
    }
  }, [connectedWallet, displayBuildings]);

  // Handle user selection change
  const handleUserChange = (buildingId) => {
    const selected = displayBuildings.find(b => b.id === buildingId);
    setCurrentUser(selected);
  };

  // Create a new energy offer
  const createOffer = async () => {
    try {
      setLoading(true);
      const offerId = `offer-${Date.now()}`;
      
      const offer = {
        id: offerId,
        seller: currentUser.id,
        sellerName: currentUser.name,
        amount: parseFloat(newOffer.amount),
        price: parseFloat(newOffer.price),
        timestamp: Date.now()
      };
      
      const updatedOffers = [...offers, offer];
      setOffers(updatedOffers);
      localStorage.setItem('energyOffers', JSON.stringify(updatedOffers));
      
      setNewOffer({ amount: 1, price: 0.05 });
      setNotification({
        type: 'success',
        message: 'Energy offer created successfully!'
      });
      
      setTimeout(() => setNotification(null), 3000);
      setLoading(false);
    } catch (error) {
      console.error('Failed to create offer:', error);
      setNotification({
        type: 'error',
        message: 'Failed to create offer'
      });
      setLoading(false);
    }
  };

  // Buy energy from an offer
  const buyEnergy = async (offer) => {
    try {
      setLoading(true);
      
      // Find seller building
      const sellerBuilding = displayBuildings.find(b => b.id === offer.seller);
      if (!sellerBuilding) {
        throw new Error('Seller building not found');
      }
      
      // Execute energy trade on blockchain
      let txRecord;
      try {
        // Ensure both buildings have valid wallet objects
        if (!sellerBuilding.wallet || !sellerBuilding.wallet.publicKey || 
            !currentUser.wallet || !currentUser.wallet.publicKey) {
          throw new Error('Invalid wallet configuration for energy trade');
        }
        
        txRecord = await executeEnergyTrade(
          sellerBuilding, 
          currentUser, 
          offer.amount, 
          offer.price
        );
      } catch (error) {
        console.error('Blockchain transaction failed, using simulation:', error);
        // Create simulated transaction record
        txRecord = {
          timestamp: new Date(),
          seller: offer.seller,
          buyer: currentUser.id,
          energyAmount: offer.amount,
          price: offer.amount * offer.price,
          pricePerUnit: offer.price,
          signature: `sim-${Math.random().toString(36).substring(2, 10)}`,
          simulated: true
        };
      }
      
      // Create transaction record for the UI
      const transaction = {
        id: `tx-${Date.now()}`,
        seller: offer.seller,
        sellerName: offer.sellerName || sellerBuilding.name || 'Unknown',
        buyer: currentUser.id,
        buyerName: currentUser.name,
        amount: offer.amount,
        price: offer.price,
        total: offer.amount * offer.price,
        timestamp: Date.now(),
        signature: txRecord.signature,
        simulated: txRecord.simulated
      };
      
      // Add to transactions
      const updatedTransactions = [...transactions, transaction];
      setTransactions(updatedTransactions);
      localStorage.setItem('energyTransactions', JSON.stringify(updatedTransactions));
      
      // Remove the offer
      const updatedOffers = offers.filter(o => o.id !== offer.id);
      setOffers(updatedOffers);
      localStorage.setItem('energyOffers', JSON.stringify(updatedOffers));
      
      setNotification({
        type: 'success',
        message: `Successfully purchased ${offer.amount} kWh of energy!`
      });
      
      setTimeout(() => setNotification(null), 3000);
      setLoading(false);
    } catch (error) {
      console.error('Failed to buy energy:', error);
      setNotification({
        type: 'error',
        message: 'Transaction failed'
      });
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Filter transactions for current user
  const userTransactions = transactions.filter(tx => 
    tx.buyer === currentUser?.id || tx.seller === currentUser?.id
  );

  if (loading && !displayBuildings.length) {
    return (
      <div className="marketplace-container loading">
        <div className="spinner"></div>
        <p>Loading marketplace...</p>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h1>Solana Energy Marketplace</h1>
        <button 
          onClick={() => navigateTo('dashboard')} 
          className="btn btn-secondary"
        >
          View Dashboard
        </button>
      </div>
      
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      
      <div className="marketplace-content">
        <div className="sidebar">
          <div className="user-selector">
            <h3>Select Building</h3>
            {connectedWallet ? (
              <div className="connected-wallet-info">
                <p>Using connected wallet:</p>
                <div className="wallet-badge">
                  <span>{connectedWallet.name}</span>
                  <span className="wallet-address">
                    {connectedWallet.publicKey.toString().substring(0, 8)}...
                  </span>
                </div>
              </div>
            ) : (
              <select 
                value={currentUser?.id || ''} 
                onChange={(e) => handleUserChange(e.target.value)}
                className="building-select"
              >
                {displayBuildings.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name || building.id} ({building.type})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          {currentUser && (
            <div className="user-details">
              <h3>Your Building</h3>
              <div className="user-card">
                <div className="user-avatar" data-type={currentUser.type}>
                  {currentUser.type === 'residential' ? '🏠' : 
                   currentUser.type === 'commercial' ? '🏢' : '🏭'}
                </div>
                <div className="user-info">
                  <h4>{currentUser.name || currentUser.id}</h4>
                  <p className="user-type">{currentUser.type}</p>
                  <p className="wallet-address">
                    Wallet: {currentUser.wallet && currentUser.wallet.publicKey ? 
                      `${currentUser.wallet.publicKey.toString().slice(0, 8)}...` : 
                      'Not initialized'}
                  </p>
                </div>
              </div>
              
              <div className="create-offer">
                <h3>Create Energy Offer</h3>
                <div className="offer-form">
                  <div className="form-group">
                    <label>Amount (kWh)</label>
                    <div className="input-with-clear">
                      <input 
                        type="number" 
                        min="0.1" 
                        step="0.1" 
                        value={newOffer.amount}
                        onChange={(e) => setNewOffer({...newOffer, amount: e.target.value})}
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => setNewOffer({...newOffer, amount: ''})}
                        title="Clear amount"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Price (SOL per kWh)</label>
                    <div className="input-with-clear">
                      <input 
                        type="number" 
                        min="0.001" 
                        step="0.001" 
                        value={newOffer.price}
                        onChange={(e) => setNewOffer({...newOffer, price: e.target.value})}
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => setNewOffer({...newOffer, price: ''})}
                        title="Clear price"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="button-group">
                    <button 
                      className="btn btn-primary" 
                      onClick={createOffer}
                      disabled={loading}
                    >
                      {loading ? 'Creating...' : 'Create Offer'}
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setNewOffer({amount: '', price: ''})}
                      type="button"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="main-content">
          <div className="marketplace-section">
            <h2>Available Energy Offers</h2>
            {offers.length === 0 ? (
              <div className="empty-state">
                <p>No energy offers available at the moment</p>
                <p className="hint">Create an offer to start trading!</p>
              </div>
            ) : (
              <div className="offers-grid">
                {offers.map(offer => (
                  <div className="offer-card" key={offer.id}>
                    <div className="offer-header">
                      <span className="energy-amount">{offer.amount} kWh</span>
                      <span className="energy-price">{offer.price} SOL/kWh</span>
                    </div>
                    <div className="offer-details">
                      <p>Seller: {(() => {
                        const seller = displayBuildings.find(b => b.id === offer.seller);
                        return seller ? (seller.name || seller.id) : offer.seller;
                      })()}</p>
                      <p>Total: {(offer.amount * offer.price).toFixed(4)} SOL</p>
                      <p className="offer-time">Listed: {formatDate(offer.timestamp)}</p>
                    </div>
                    <button 
                      className="btn btn-buy" 
                      onClick={() => buyEnergy(offer)}
                      disabled={loading || currentUser?.id === offer.seller}
                    >
                      {currentUser?.id === offer.seller ? 'Your Offer' : 'Buy Now'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="transaction-section">
            <h2>Your Transaction History</h2>
            {userTransactions.length === 0 ? (
              <div className="empty-state">
                <p>No transaction history yet</p>
                <p className="hint">Buy or sell energy to see transactions here</p>
              </div>
            ) : (
              <table className="transaction-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>With</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th>Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {userTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.timestamp)}</td>
                      <td className={tx.seller === currentUser?.id ? 'sold' : 'bought'}>
                        {tx.seller === currentUser?.id ? 'Sold' : 'Bought'}
                      </td>
                      <td>
                        {tx.seller === currentUser?.id ? tx.buyerName : tx.sellerName}
                      </td>
                      <td>{tx.amount} kWh</td>
                      <td>{tx.price} SOL</td>
                      <td>{tx.total.toFixed(4)} SOL</td>
                      <td>
                        <a 
                          href={tx.signature ? 
                            `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet` : 
                            '#'}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="tx-link"
                        >
                          {tx.signature ? `${tx.signature.slice(0, 8)}...` : 'N/A'}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;