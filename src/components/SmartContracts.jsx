import React, { useState, useEffect } from 'react';
import './SmartContracts.css';
import './ClearButton.css';

const SmartContracts = ({ buildings, navigateTo, walletBalance, connectedWallet }) => {
  const [activeTab, setActiveTab] = useState('tradingRules');
  const [tradingRules, setTradingRules] = useState([
    { 
      id: 1,
      buildingId: buildings && buildings.length > 0 ? buildings[0].id : null,
      type: 'price',
      condition: 'above',
      value: 0.05,
      action: 'sell',
      amount: 'excess',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ]);
  const [futuresContracts, setFuturesContracts] = useState([
    {
      id: 1,
      seller: buildings && buildings.length > 0 ? buildings[0].id : null,
      buyer: buildings && buildings.length > 1 ? buildings[1].id : null,
      energyAmount: 10,
      pricePerUnit: 0.025,
      deliveryDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      status: 'pending',
      createdAt: new Date().toISOString()
    }
  ]);
  const [gridStabilization, setGridStabilization] = useState([
    {
      id: 1,
      buildingId: buildings && buildings.length > 0 ? buildings[0].id : null,
      capacity: 10,
      triggerType: 'peak',
      rewardRate: 0.1,
      duration: 2,
      status: 'ready',
      lastTriggered: null
    }
  ]);
  
  const [newRule, setNewRule] = useState({
    buildingId: buildings && buildings.length > 0 ? buildings[0].id : '',
    type: 'price',
    condition: 'above',
    value: 0.05,
    action: 'sell',
    amount: 'excess'
  });
  
  const [newContract, setNewContract] = useState({
    seller: buildings && buildings.length > 0 ? buildings[0].id : '',
    buyer: buildings && buildings.length > 1 ? buildings[1].id : '',
    energyAmount: 10,
    pricePerUnit: 0.025,
    deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
  });
  
  const [newStabilization, setNewStabilization] = useState({
    buildingId: buildings && buildings.length > 0 ? buildings[0].id : '',
    capacity: 10,
    triggerType: 'peak',
    rewardRate: 0.1,
    duration: 2
  });

  // Update form defaults when buildings change
  useEffect(() => {
    if (buildings && buildings.length > 0) {
      setNewRule(prev => ({
        ...prev,
        buildingId: buildings[0].id
      }));
      setNewContract(prev => ({
        ...prev,
        seller: buildings[0].id,
        buyer: buildings.length > 1 ? buildings[1].id : ''
      }));
      setNewStabilization(prev => ({
        ...prev,
        buildingId: buildings[0].id
      }));
    }
  }, [buildings]);

  const handleAddRule = (e) => {
    e.preventDefault();
    const rule = {
      id: tradingRules.length + 1,
      ...newRule,
      status: 'active',
      createdAt: new Date().toISOString()
    };
    setTradingRules([...tradingRules, rule]);
    // Reset form (but keep the selected building)
    setNewRule({
      buildingId: newRule.buildingId,
      type: 'price',
      condition: 'above',
      value: 0.05,
      action: 'sell',
      amount: 'excess'
    });
  };

  const handleAddContract = (e) => {
    e.preventDefault();
    const contract = {
      id: futuresContracts.length + 1,
      ...newContract,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    setFuturesContracts([...futuresContracts, contract]);
    // Reset form (but keep the selected buildings)
    setNewContract({
      seller: newContract.seller,
      buyer: newContract.buyer,
      energyAmount: 10,
      pricePerUnit: 0.025,
      deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    });
  };

  const handleAddStabilization = (e) => {
    e.preventDefault();
    const stabilization = {
      id: gridStabilization.length + 1,
      ...newStabilization,
      status: 'ready',
      lastTriggered: null
    };
    setGridStabilization([...gridStabilization, stabilization]);
    // Reset form (but keep the selected building)
    setNewStabilization({
      buildingId: newStabilization.buildingId,
      capacity: 10,
      triggerType: 'peak',
      rewardRate: 0.1,
      duration: 2
    });
  };

  const handleRuleChange = (e) => {
    const { name, value } = e.target;
    setNewRule(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleContractChange = (e) => {
    const { name, value } = e.target;
    setNewContract(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStabilizationChange = (e) => {
    const { name, value } = e.target;
    setNewStabilization(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'rewardRate' || name === 'duration' ? parseFloat(value) : value
    }));
  };

  const toggleRuleStatus = (id) => {
    setTradingRules(tradingRules.map(rule => 
      rule.id === id 
        ? { ...rule, status: rule.status === 'active' ? 'paused' : 'active' } 
        : rule
    ));
  };

  const cancelContract = (id) => {
    setFuturesContracts(futuresContracts.map(contract => 
      contract.id === id && contract.status === 'pending'
        ? { ...contract, status: 'cancelled' } 
        : contract
    ));
  };

  const triggerStabilization = (id) => {
    setGridStabilization(gridStabilization.map(stab => 
      stab.id === id && stab.status === 'ready'
        ? { ...stab, status: 'active', lastTriggered: new Date().toISOString() } 
        : stab
    ));
  };

  const getBuildingName = (id) => {
    if (!buildings) return 'Unknown Building';
    const building = buildings.find(b => b.id === id);
    return building ? `${building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: ${building.id})` : 'Unknown Building';
  };

  return (
    <div className="smart-contracts-container">
      <header>
        <div className="title-section">
          <h1>Smart Contract Management</h1>
          <p>Create and manage automated energy trading contracts</p>
        </div>
        <button className="btn back-button" onClick={() => navigateTo('dashboard')}>
          Back to Dashboard
        </button>
      </header>
      
      <div className="wallet-status">
        {connectedWallet ? (
          <>
            <div className="wallet-header">
              <span>Connected Wallet:</span>
              <span className="wallet-name">{connectedWallet.name}</span>
            </div>
            <div className="wallet-address">{connectedWallet.publicKey.toString().substring(0, 12)}...</div>
            <span className="balance">{connectedWallet.balance?.toFixed(3) || '0.000'} SOL</span>
          </>
        ) : (
          <>
            <span>Wallet Status:</span>
            <span className="no-wallet">No wallet connected</span>
          </>
        )}
      </div>
      
      <div className="contracts-tabs">
        <button 
          className={`tab-button ${activeTab === 'tradingRules' ? 'active' : ''}`}
          onClick={() => setActiveTab('tradingRules')}
        >
          Trading Rules
        </button>
        <button 
          className={`tab-button ${activeTab === 'futuresContracts' ? 'active' : ''}`}
          onClick={() => setActiveTab('futuresContracts')}
        >
          Futures Contracts
        </button>
        <button 
          className={`tab-button ${activeTab === 'gridStabilization' ? 'active' : ''}`}
          onClick={() => setActiveTab('gridStabilization')}
        >
          Grid Stabilization
        </button>
      </div>
      
      <div className="contracts-content">
        {/* Trading Rules Tab */}
        {activeTab === 'tradingRules' && (
          <div className="trading-rules">
            <div className="form-card">
              <h3>Create New Trading Rule</h3>
              <form onSubmit={handleAddRule}>
                <div className="form-group">
                  <label htmlFor="buildingId">Building:</label>
                  <select 
                    id="buildingId" 
                    name="buildingId" 
                    value={newRule.buildingId || ''}
                    onChange={handleRuleChange}
                    required
                  >
                    <option value="">Select Building</option>
                    {buildings && buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: {building.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="type">Trigger Type:</label>
                    <select 
                      id="type" 
                      name="type" 
                      value={newRule.type}
                      onChange={handleRuleChange}
                      required
                    >
                      <option value="price">Price</option>
                      <option value="time">Time of Day</option>
                      <option value="production">Production Level</option>
                      <option value="consumption">Consumption Level</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="condition">Condition:</label>
                    <select 
                      id="condition" 
                      name="condition" 
                      value={newRule.condition}
                      onChange={handleRuleChange}
                      required
                    >
                      <option value="above">Above</option>
                      <option value="below">Below</option>
                      <option value="equal">Equal to</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="value">Value:</label>
                    <div className="input-with-clear">
                      <input 
                        type="number" 
                        id="value" 
                        name="value" 
                        value={newRule.value}
                        onChange={handleRuleChange}
                        step="0.001"
                        min="0"
                        required
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => handleRuleChange({target: {name: 'value', value: ''}})}
                        title="Clear value"
                      >
                        ✕
                      </button>
                      <span className="unit">
                        {newRule.type === 'price' && 'SOL/kWh'}
                        {newRule.type === 'time' && 'hour (0-24)'}
                        {newRule.type === 'production' && 'kWh'}
                        {newRule.type === 'consumption' && 'kWh'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="action">Action:</label>
                    <select 
                      id="action" 
                      name="action" 
                      value={newRule.action}
                      onChange={handleRuleChange}
                      required
                    >
                      <option value="sell">Sell Energy</option>
                      <option value="buy">Buy Energy</option>
                      <option value="store">Store Energy</option>
                      <option value="use">Use Stored Energy</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="amount">Amount:</label>
                    <select 
                      id="amount" 
                      name="amount" 
                      value={newRule.amount}
                      onChange={handleRuleChange}
                      required
                    >
                      <option value="excess">Excess Energy</option>
                      <option value="all">All Available</option>
                      <option value="half">Half Available</option>
                      <option value="min">Minimum Need</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Create Rule</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setNewRule({
                        buildingId: '',
                        type: 'price',
                        condition: 'above',
                        value: '',
                        action: 'sell',
                        amount: 'excess',
                        status: 'active',
                        createdAt: Date.now(),
                      });
                    }}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>
            
            <div className="card-list">
              <h3>Active Trading Rules</h3>
              {tradingRules.length === 0 ? (
                <p className="empty-list">No trading rules created yet</p>
              ) : (
                tradingRules.map(rule => (
                  <div key={rule.id} className={`contract-card ${rule.status}`}>
                    <div className="card-header">
                      <h4>Rule #{rule.id}</h4>
                      <span className={`status-badge ${rule.status}`}>{rule.status}</span>
                    </div>
                    <div className="card-body">
                      <p><strong>Building:</strong> {getBuildingName(rule.buildingId)}</p>
                      <p><strong>Trigger:</strong> When {rule.type} is {rule.condition} {rule.value}
                        {rule.type === 'price' && ' SOL/kWh'}
                        {rule.type === 'time' && ':00 hours'}
                        {rule.type === 'production' && ' kWh'}
                        {rule.type === 'consumption' && ' kWh'}
                      </p>
                      <p><strong>Action:</strong> {rule.action.charAt(0).toUpperCase() + rule.action.slice(1)} {rule.amount} energy</p>
                      <p><strong>Created:</strong> {new Date(rule.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="card-actions">
                      <button 
                        className={`btn-${rule.status === 'active' ? 'warning' : 'success'}`}
                        onClick={() => toggleRuleStatus(rule.id)}
                      >
                        {rule.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button 
                        className="btn-danger"
                        onClick={() => setTradingRules(tradingRules.filter(r => r.id !== rule.id))}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Futures Contracts Tab */}
        {activeTab === 'futuresContracts' && (
          <div className="futures-contracts">
            <div className="form-card">
              <h3>Create New Futures Contract</h3>
              <form onSubmit={handleAddContract}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="seller">Seller Building:</label>
                    <select 
                      id="seller" 
                      name="seller" 
                      value={newContract.seller || ''}
                      onChange={handleContractChange}
                      required
                    >
                      <option value="">Select Seller Building</option>
                      {buildings && buildings.map(building => (
                        <option key={building.id} value={building.id}>
                          {building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: {building.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="buyer">Buyer Building:</label>
                    <select 
                      id="buyer" 
                      name="buyer" 
                      value={newContract.buyer || ''}
                      onChange={handleContractChange}
                      required
                    >
                      <option value="">Select Buyer Building</option>
                      {buildings && buildings.map(building => (
                        building.id !== newContract.seller && (
                          <option key={building.id} value={building.id}>
                            {building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: {building.id})
                          </option>
                        )
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="energyAmount">Energy Amount (kWh):</label>
                    <div className="input-with-clear">
                      <input 
                        type="number"
                        id="energyAmount"
                        name="energyAmount"
                        value={newContract.energyAmount}
                        onChange={handleContractChange}
                        min="0.1"
                        step="0.1"
                        required
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => handleContractChange({target: {name: 'energyAmount', value: ''}})}
                        title="Clear energy amount"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="pricePerUnit">Price per kWh (SOL):</label>
                    <div className="input-with-clear">
                      <input 
                        type="number"
                        id="pricePerUnit"
                        name="pricePerUnit"
                        value={newContract.pricePerUnit}
                        onChange={handleContractChange}
                        min="0.001"
                        step="0.001"
                        required
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => handleContractChange({target: {name: 'pricePerUnit', value: ''}})}
                        title="Clear price"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="deliveryDate">Delivery Date:</label>
                    <div className="input-with-clear">
                      <input 
                        type="date"
                        id="deliveryDate"
                        name="deliveryDate"
                        value={newContract.deliveryDate}
                        onChange={handleContractChange}
                        min={new Date().toISOString().split('T')[0]}
                        required
                      />
                      <button 
                        type="button"
                        className="btn-clear"
                        onClick={() => handleContractChange({target: {name: 'deliveryDate', value: ''}})}
                        title="Clear date"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="contract-summary">
                  <p>Total Contract Value: <strong>{(newContract.energyAmount * newContract.pricePerUnit).toFixed(5)} SOL</strong></p>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Create Futures Contract</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setNewContract({
                        seller: buildings && buildings.length > 0 ? buildings[0].id : '',
                        buyer: buildings && buildings.length > 1 ? buildings[1].id : '',
                        energyAmount: '',
                        pricePerUnit: '',
                        deliveryDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
                      });
                    }}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>
            
            <div className="card-list">
              <h3>Futures Contracts</h3>
              {futuresContracts.length === 0 ? (
                <p className="empty-list">No futures contracts created yet</p>
              ) : (
                futuresContracts.map(contract => (
                  <div key={contract.id} className={`contract-card ${contract.status}`}>
                    <div className="card-header">
                      <h4>Contract #{contract.id}</h4>
                      <span className={`status-badge ${contract.status}`}>{contract.status}</span>
                    </div>
                    <div className="card-body">
                      <p><strong>Seller:</strong> {getBuildingName(contract.seller)}</p>
                      <p><strong>Buyer:</strong> {getBuildingName(contract.buyer)}</p>
                      <p><strong>Energy Amount:</strong> {contract.energyAmount} kWh</p>
                      <p><strong>Price:</strong> {contract.pricePerUnit} SOL/kWh (Total: {(contract.energyAmount * contract.pricePerUnit).toFixed(5)} SOL)</p>
                      <p><strong>Delivery Date:</strong> {new Date(contract.deliveryDate).toLocaleDateString()}</p>
                      <p><strong>Created:</strong> {new Date(contract.createdAt).toLocaleString()}</p>
                    </div>
                    {contract.status === 'pending' && (
                      <div className="card-actions">
                        <button 
                          className="btn-warning"
                          onClick={() => cancelContract(contract.id)}
                        >
                          Cancel Contract
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {/* Grid Stabilization Tab */}
        {activeTab === 'gridStabilization' && (
          <div className="grid-stabilization">
            <div className="form-card">
              <h3>Add Grid Stabilization Service</h3>
              <form onSubmit={handleAddStabilization}>
                <div className="form-group">
                  <label htmlFor="buildingId">Building with Battery:</label>
                  <select 
                    id="buildingId" 
                    name="buildingId" 
                    value={newStabilization.buildingId || ''}
                    onChange={handleStabilizationChange}
                    required
                  >
                    <option value="">Select Building</option>
                    {buildings && buildings.map(building => (
                      <option key={building.id} value={building.id}>
                        {building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: {building.id})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="capacity">Available Capacity (kWh):</label>
                    <input 
                      type="number" 
                      id="capacity" 
                      name="capacity" 
                      value={newStabilization.capacity}
                      onChange={handleStabilizationChange}
                      step="0.1"
                      min="0.1"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="triggerType">Trigger Type:</label>
                    <select 
                      id="triggerType" 
                      name="triggerType" 
                      value={newStabilization.triggerType}
                      onChange={handleStabilizationChange}
                      required
                    >
                      <option value="peak">Peak Demand Response</option>
                      <option value="frequency">Frequency Regulation</option>
                      <option value="voltage">Voltage Support</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="rewardRate">Reward Rate (SOL/kWh):</label>
                    <input 
                      type="number" 
                      id="rewardRate" 
                      name="rewardRate" 
                      value={newStabilization.rewardRate}
                      onChange={handleStabilizationChange}
                      step="0.01"
                      min="0.01"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="duration">Maximum Duration (hours):</label>
                    <input 
                      type="number" 
                      id="duration" 
                      name="duration" 
                      value={newStabilization.duration}
                      onChange={handleStabilizationChange}
                      step="0.5"
                      min="0.5"
                      required
                    />
                  </div>
                </div>
                
                <div className="reward-summary">
                  <p>Maximum Potential Reward: <strong>{(newStabilization.capacity * newStabilization.rewardRate).toFixed(5)} SOL</strong></p>
                </div>
                
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Register Stabilization Service</button>
                  <button 
                    type="button" 
                    className="btn-secondary"
                    onClick={() => {
                      setNewStabilization({
                        buildingId: buildings && buildings.length > 0 ? buildings[0].id : '',
                        capacity: 10,
                        triggerType: 'peak',
                        rewardRate: 0.1,
                        duration: 2
                      });
                    }}
                  >
                    Reset Form
                  </button>
                </div>
              </form>
            </div>
            
            <div className="card-list">
              <h3>Grid Stabilization Services</h3>
              {gridStabilization.length === 0 ? (
                <p className="empty-list">No grid stabilization services registered yet</p>
              ) : (
                gridStabilization.map(stab => (
                  <div key={stab.id} className={`contract-card ${stab.status}`}>
                    <div className="card-header">
                      <h4>Service #{stab.id}</h4>
                      <span className={`status-badge ${stab.status}`}>{stab.status}</span>
                    </div>
                    <div className="card-body">
                      <p><strong>Building:</strong> {getBuildingName(stab.buildingId)}</p>
                      <p><strong>Service Type:</strong> {stab.triggerType === 'peak' ? 'Peak Demand Response' : 
                                                      stab.triggerType === 'frequency' ? 'Frequency Regulation' : 
                                                      'Voltage Support'}</p>
                      <p><strong>Capacity:</strong> {stab.capacity} kWh</p>
                      <p><strong>Reward Rate:</strong> {stab.rewardRate} SOL/kWh</p>
                      <p><strong>Max Duration:</strong> {stab.duration} hours</p>
                      {stab.lastTriggered && (
                        <p><strong>Last Triggered:</strong> {new Date(stab.lastTriggered).toLocaleString()}</p>
                      )}
                    </div>
                    {stab.status === 'ready' && (
                      <div className="card-actions">
                        <button 
                          className="btn-primary"
                          onClick={() => triggerStabilization(stab.id)}
                        >
                          Trigger Service
                        </button>
                      </div>
                    )}
                    {stab.status === 'active' && (
                      <div className="activation-info">
                        <p><strong>Status:</strong> Currently providing grid support</p>
                        <p><strong>Estimated Completion:</strong> {new Date(new Date(stab.lastTriggered).getTime() + stab.duration * 60 * 60 * 1000).toLocaleTimeString()}</p>
                        <p><strong>Expected Reward:</strong> {(stab.capacity * stab.rewardRate).toFixed(5)} SOL</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartContracts; 