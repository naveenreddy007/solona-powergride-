import React, { useState, useEffect } from 'react';
import './Community.css';

const Community = ({ buildings, navigateTo, trades }) => {
  const [activeTab, setActiveTab] = useState('neighborhoods');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(null);
  
  // Sample data for neighborhoods
  const [neighborhoods, setNeighborhoods] = useState([
    {
      id: 1,
      name: 'Green Valley',
      description: 'A sustainable community focused on solar energy generation',
      memberCount: 8,
      totalCapacity: 240,
      avgPrice: 0.02,
      trades: 36,
      savings: 450,
      carbonReduction: 1200,
      members: [1, 2, 3, 5, 8, 13, 21, 34].filter(id => 
        buildings && buildings.some(b => b.id === id)
      ),
      createdAt: '2023-04-15'
    },
    {
      id: 2,
      name: 'Tech Hub District',
      description: 'Commercial buildings with advanced energy management',
      memberCount: 5,
      totalCapacity: 450,
      avgPrice: 0.018,
      trades: 52,
      savings: 720,
      carbonReduction: 1800,
      members: [4, 6, 9, 12, 15].filter(id => 
        buildings && buildings.some(b => b.id === id)
      ),
      createdAt: '2023-05-02'
    }
  ]);
  
  // Sample data for challenges
  const [challenges, setChallenges] = useState([
    {
      id: 1,
      title: 'Summer Energy Saver',
      description: 'Reduce peak energy consumption during summer afternoons',
      goal: 'Reduce consumption by 15% from 1-5 PM',
      reward: '100 SOL community pool + carbon credits',
      participants: 12,
      progress: 68,
      startDate: '2023-06-01',
      endDate: '2023-08-31',
      status: 'active'
    },
    {
      id: 2,
      title: 'Net-Zero Week',
      description: 'Achieve net-zero energy consumption for a full week',
      goal: 'Balance consumption with production across neighborhood',
      reward: '50 SOL + energy storage subsidies',
      participants: 8,
      progress: 100,
      startDate: '2023-05-10',
      endDate: '2023-05-17',
      status: 'completed'
    },
    {
      id: 3,
      title: 'Resilience Challenge',
      description: 'Create a microgrid that can operate off the main grid',
      goal: 'Maintain self-sufficiency for 24 consecutive hours',
      reward: '150 SOL + featured case study',
      participants: 0,
      progress: 0,
      startDate: '2023-09-15',
      endDate: '2023-10-15',
      status: 'upcoming'
    }
  ]);
  
  // Generate ranking data for leaderboard
  const [leaderboard, setLeaderboard] = useState([]);
  
  useEffect(() => {
    if (!buildings) return;
    
    // Generate leaderboard data based on buildings and trades
    const calculateBuildingStats = () => {
      return buildings.map(building => {
        // Find all trades where this building was a seller
        const sellerTrades = trades.filter(trade => trade.seller === building.id);
        const energyTraded = sellerTrades.reduce((sum, trade) => sum + (trade.energyAmount || 0), 0);
        const revenue = sellerTrades.reduce((sum, trade) => sum + ((trade.energyAmount || 0) * (trade.pricePerUnit || 0)), 0);
        
        // Calculate carbon offset (1 kWh of solar = 0.5 kg CO2 offset compared to grid)
        const carbonOffset = energyTraded * 0.5;
        
        // Calculate efficiency (production to consumption ratio)
        const efficiency = building.currentProduction ? 
          (building.currentProduction / Math.max(1, building.currentConsumption || 1)) * 100 : 0;
        
        return {
          id: building.id,
          name: `${building.type.charAt(0).toUpperCase() + building.type.slice(1)} #${building.id}`,
          type: building.type,
          energyTraded,
          revenue,
          carbonOffset,
          efficiency,
          neighborhood: neighborhoods.find(n => n.members.includes(building.id))?.name || 'Unaffiliated',
          score: energyTraded * 2 + carbonOffset * 0.5 + efficiency * 0.2 // Weighted score
        };
      }).sort((a, b) => b.score - a.score); // Sort by score descending
    };
    
    setLeaderboard(calculateBuildingStats());
  }, [buildings, trades, neighborhoods]);
  
  const [newNeighborhood, setNewNeighborhood] = useState({
    name: '',
    description: '',
    members: []
  });
  
  // Handle form inputs
  const handleNeighborhoodChange = (e) => {
    const { name, value } = e.target;
    setNewNeighborhood(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle member selection (multi-select)
  const handleMemberSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setNewNeighborhood(prev => ({
      ...prev,
      members: selectedOptions
    }));
  };
  
  // Create new neighborhood
  const handleCreateNeighborhood = (e) => {
    e.preventDefault();
    
    if (!newNeighborhood.name || newNeighborhood.members.length === 0) return;
    
    const neighborhood = {
      id: neighborhoods.length + 1,
      name: newNeighborhood.name,
      description: newNeighborhood.description,
      memberCount: newNeighborhood.members.length,
      totalCapacity: newNeighborhood.members.reduce((sum, memberId) => {
        const building = buildings.find(b => b.id === memberId);
        return sum + (building?.solarCapacity || 0);
      }, 0),
      avgPrice: 0.02,
      trades: 0,
      savings: 0,
      carbonReduction: 0,
      members: newNeighborhood.members,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setNeighborhoods([...neighborhoods, neighborhood]);
    
    // Reset form
    setNewNeighborhood({
      name: '',
      description: '',
      members: []
    });
  };
  
  // Join challenge
  const handleJoinChallenge = (challengeId) => {
    setChallenges(challenges.map(challenge => 
      challenge.id === challengeId 
        ? { ...challenge, participants: challenge.participants + 1 } 
        : challenge
    ));
  };
  
  // View neighborhood details
  const handleViewNeighborhood = (neighborhood) => {
    setSelectedNeighborhood(neighborhood);
  };
  
  // Format numbers for display
  const formatNumber = (num, decimal = 2) => {
    return num.toFixed(decimal).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get available buildings (not already in other neighborhoods)
  const getAvailableBuildings = () => {
    if (!buildings) return [];
    
    const neighborhoodMemberIds = neighborhoods.flatMap(n => n.members);
    return buildings.filter(building => !neighborhoodMemberIds.includes(building.id));
  };
  
  return (
    <div className="community-container">
      <header>
        <div className="title-section">
          <h1>Energy Community Hub</h1>
          <p>Connect, collaborate, and compete with other energy producers and consumers</p>
        </div>
        <button className="btn back-button" onClick={() => navigateTo('dashboard')}>
          Back to Dashboard
        </button>
      </header>
      
      <div className="community-tabs">
        <button 
          className={`tab-button ${activeTab === 'neighborhoods' ? 'active' : ''}`}
          onClick={() => setActiveTab('neighborhoods')}
        >
          Neighborhoods
        </button>
        <button 
          className={`tab-button ${activeTab === 'leaderboards' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboards')}
        >
          Leaderboards
        </button>
        <button 
          className={`tab-button ${activeTab === 'challenges' ? 'active' : ''}`}
          onClick={() => setActiveTab('challenges')}
        >
          Challenges & Incentives
        </button>
      </div>
      
      <div className="community-content">
        {/* Neighborhoods Tab */}
        {activeTab === 'neighborhoods' && (
          <div className="neighborhoods">
            {selectedNeighborhood ? (
              <div className="neighborhood-detail">
                <div className="detail-header">
                  <div>
                    <h2>{selectedNeighborhood.name}</h2>
                    <p className="detail-description">{selectedNeighborhood.description}</p>
                    <div className="detail-meta">
                      <span>Created: {selectedNeighborhood.createdAt}</span>
                      <span>Members: {selectedNeighborhood.memberCount}</span>
                    </div>
                  </div>
                  <button 
                    className="btn-secondary"
                    onClick={() => setSelectedNeighborhood(null)}
                  >
                    Back to List
                  </button>
                </div>
                
                <div className="stats-cards">
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(selectedNeighborhood.totalCapacity)} kW</div>
                    <div className="stat-label">Total Solar Capacity</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{selectedNeighborhood.trades}</div>
                    <div className="stat-label">Trading Transactions</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(selectedNeighborhood.savings)} SOL</div>
                    <div className="stat-label">Community Savings</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{formatNumber(selectedNeighborhood.carbonReduction)} kg</div>
                    <div className="stat-label">Carbon Reduced</div>
                  </div>
                </div>
                
                <div className="member-section">
                  <h3>Neighborhood Members</h3>
                  <div className="member-grid">
                    {selectedNeighborhood.members.map(memberId => {
                      const building = buildings && buildings.find(b => b.id === memberId);
                      if (!building) return null;
                      
                      return (
                        <div key={memberId} className="member-card">
                          <div className="member-type">{building.type.charAt(0).toUpperCase() + building.type.slice(1)}</div>
                          <div className="member-id">Building #{memberId}</div>
                          <div className="member-details">
                            <div><span>Capacity:</span> {building.solarCapacity || 0} kW</div>
                            <div><span>Production:</span> {formatNumber(building.currentProduction || 0)} kWh</div>
                            <div><span>Consumption:</span> {formatNumber(building.currentConsumption || 0)} kWh</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="neighborhood-actions">
                  <button className="btn-primary">Request to Join</button>
                  <button className="btn-secondary">Contact Admin</button>
                </div>
              </div>
            ) : (
              <>
                <div className="neighborhoods-grid">
                  {neighborhoods.map(neighborhood => (
                    <div key={neighborhood.id} className="neighborhood-card" onClick={() => handleViewNeighborhood(neighborhood)}>
                      <h3>{neighborhood.name}</h3>
                      <p>{neighborhood.description}</p>
                      <div className="neighborhood-stats">
                        <div className="stat">
                          <span className="stat-number">{neighborhood.memberCount}</span>
                          <span className="stat-label">Members</span>
                        </div>
                        <div className="stat">
                          <span className="stat-number">{formatNumber(neighborhood.totalCapacity)}</span>
                          <span className="stat-label">kW Capacity</span>
                        </div>
                        <div className="stat">
                          <span className="stat-number">{formatNumber(neighborhood.carbonReduction)}</span>
                          <span className="stat-label">kg CO2 Reduced</span>
                        </div>
                      </div>
                      <button className="btn-view">View Details</button>
                    </div>
                  ))}
                </div>
                
                <div className="create-neighborhood">
                  <h3>Create New Neighborhood</h3>
                  <form onSubmit={handleCreateNeighborhood}>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="name">Neighborhood Name:</label>
                        <input 
                          type="text" 
                          id="name" 
                          name="name" 
                          value={newNeighborhood.name}
                          onChange={handleNeighborhoodChange}
                          placeholder="e.g., Sunshine Valley Collective"
                          required
                        />
                      </div>
                      
                      <div className="form-group">
                        <label htmlFor="description">Description:</label>
                        <input 
                          type="text" 
                          id="description" 
                          name="description" 
                          value={newNeighborhood.description}
                          onChange={handleNeighborhoodChange}
                          placeholder="Brief description of your neighborhood group"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="members">Select Buildings to Include:</label>
                      <select 
                        id="members" 
                        name="members" 
                        multiple
                        value={newNeighborhood.members}
                        onChange={handleMemberSelection}
                        required
                        style={{ height: '120px' }}
                      >
                        {getAvailableBuildings().map(building => (
                          <option key={building.id} value={building.id}>
                            {building.type.charAt(0).toUpperCase() + building.type.slice(1)} (ID: {building.id})
                          </option>
                        ))}
                      </select>
                      <div className="form-help">Hold Ctrl/Cmd to select multiple buildings</div>
                    </div>
                    
                    <button type="submit" className="btn-primary">Create Neighborhood</button>
                  </form>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Leaderboards Tab */}
        {activeTab === 'leaderboards' && (
          <div className="leaderboards">
            <div className="leaderboard-card">
              <h3>Top Energy Producers & Traders</h3>
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Building</th>
                    <th>Neighborhood</th>
                    <th>Energy Traded</th>
                    <th>Carbon Offset</th>
                    <th>Revenue</th>
                    <th>Efficiency</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.slice(0, 10).map((building, index) => (
                    <tr key={building.id} className={index < 3 ? 'top-rank' : ''}>
                      <td>
                        <div className="rank">
                          {index + 1}
                          {index < 3 && <span className="rank-medal">🏆</span>}
                        </div>
                      </td>
                      <td>
                        <div className="building-name">
                          <span className={`building-type ${building.type}`}>{building.type.charAt(0).toUpperCase()}</span>
                          <span>{building.name}</span>
                        </div>
                      </td>
                      <td>{building.neighborhood}</td>
                      <td>{formatNumber(building.energyTraded)} kWh</td>
                      <td>{formatNumber(building.carbonOffset)} kg</td>
                      <td>{formatNumber(building.revenue, 5)} SOL</td>
                      <td>{formatNumber(building.efficiency, 1)}%</td>
                      <td>{formatNumber(building.score, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="leaderboard-cards">
              <div className="mini-leaderboard">
                <h3>Top Neighborhoods</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Neighborhood</th>
                      <th>Members</th>
                      <th>Carbon Reduction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {neighborhoods
                      .sort((a, b) => b.carbonReduction - a.carbonReduction)
                      .map((neighborhood, index) => (
                        <tr key={neighborhood.id}>
                          <td>{index + 1}</td>
                          <td>{neighborhood.name}</td>
                          <td>{neighborhood.memberCount}</td>
                          <td>{formatNumber(neighborhood.carbonReduction)} kg</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mini-leaderboard">
                <h3>Most Efficient Buildings</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Building</th>
                      <th>Type</th>
                      <th>Efficiency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard
                      .sort((a, b) => b.efficiency - a.efficiency)
                      .slice(0, 5)
                      .map((building, index) => (
                        <tr key={building.id}>
                          <td>{index + 1}</td>
                          <td>Building #{building.id}</td>
                          <td>{building.type.charAt(0).toUpperCase() + building.type.slice(1)}</td>
                          <td>{formatNumber(building.efficiency, 1)}%</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="achievements-section">
              <h3>Recent Achievements</h3>
              <div className="achievements-grid">
                <div className="achievement-card">
                  <div className="achievement-icon energy-icon">⚡</div>
                  <div className="achievement-details">
                    <h4>Energy Surplus Champion</h4>
                    <p>Produced over 50 kWh surplus energy in a single day</p>
                    <div className="achievement-building">
                      Awarded to: {leaderboard.length > 0 ? leaderboard[0].name : 'No buildings yet'}
                    </div>
                  </div>
                </div>
                
                <div className="achievement-card">
                  <div className="achievement-icon trade-icon">💰</div>
                  <div className="achievement-details">
                    <h4>Trading Maven</h4>
                    <p>Completed over 25 peer-to-peer energy trades</p>
                    <div className="achievement-building">
                      Awarded to: {leaderboard.length > 1 ? leaderboard[1].name : 'No buildings yet'}
                    </div>
                  </div>
                </div>
                
                <div className="achievement-card">
                  <div className="achievement-icon eco-icon">🌱</div>
                  <div className="achievement-details">
                    <h4>Carbon Reduction Pioneer</h4>
                    <p>Reduced carbon emissions by over 500 kg</p>
                    <div className="achievement-building">
                      Awarded to: {neighborhoods.length > 0 ? neighborhoods[0].name : 'No neighborhoods yet'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Challenges Tab */}
        {activeTab === 'challenges' && (
          <div className="challenges">
            <div className="challenge-categories">
              <div className="category active">All Challenges</div>
              <div className="category">Active</div>
              <div className="category">Upcoming</div>
              <div className="category">Completed</div>
            </div>
            
            <div className="challenges-grid">
              {challenges.map(challenge => (
                <div key={challenge.id} className={`challenge-card ${challenge.status}`}>
                  <div className="challenge-header">
                    <h3>{challenge.title}</h3>
                    <div className={`challenge-status ${challenge.status}`}>
                      {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                    </div>
                  </div>
                  
                  <p className="challenge-description">{challenge.description}</p>
                  
                  <div className="challenge-details">
                    <div className="detail">
                      <span className="label">Goal:</span>
                      <span>{challenge.goal}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Reward:</span>
                      <span>{challenge.reward}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Period:</span>
                      <span>{challenge.startDate} to {challenge.endDate}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Participants:</span>
                      <span>{challenge.participants}</span>
                    </div>
                  </div>
                  
                  {challenge.status !== 'upcoming' && (
                    <div className="progress-container">
                      <div className="progress-label">
                        <span>Progress</span>
                        <span>{challenge.progress}%</span>
                      </div>
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${challenge.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {challenge.status === 'active' && (
                    <button 
                      className="btn-primary"
                      onClick={() => handleJoinChallenge(challenge.id)}
                    >
                      Join Challenge
                    </button>
                  )}
                  
                  {challenge.status === 'upcoming' && (
                    <button className="btn-secondary">Remind Me</button>
                  )}
                  
                  {challenge.status === 'completed' && (
                    <button className="btn-tertiary">View Results</button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="incentives-section">
              <h3>Available Incentives & Programs</h3>
              <div className="incentives-grid">
                <div className="incentive-card">
                  <h4>Feed-in Tariff Program</h4>
                  <p>Earn premium rates for excess solar energy fed back to the grid</p>
                  <div className="incentive-details">
                    <div><span>Rate:</span> 0.05 SOL per kWh</div>
                    <div><span>Term:</span> 3-year contract</div>
                    <div><span>Eligibility:</span> All solar producers</div>
                  </div>
                  <button className="btn-secondary">Learn More</button>
                </div>
                
                <div className="incentive-card">
                  <h4>Battery Rebate Program</h4>
                  <p>Receive rebates for installing energy storage systems</p>
                  <div className="incentive-details">
                    <div><span>Rebate:</span> Up to 200 SOL</div>
                    <div><span>Requirement:</span> Min. 5kWh capacity</div>
                    <div><span>Deadline:</span> December 31, 2023</div>
                  </div>
                  <button className="btn-secondary">Apply Now</button>
                </div>
                
                <div className="incentive-card">
                  <h4>Neighborhood Microgrid Grant</h4>
                  <p>Funding for communities establishing self-sustaining microgrids</p>
                  <div className="incentive-details">
                    <div><span>Grant:</span> Up to 1000 SOL</div>
                    <div><span>Requirement:</span> Min. 5 buildings</div>
                    <div><span>Application:</span> Quarterly review</div>
                  </div>
                  <button className="btn-secondary">Check Eligibility</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Community; 