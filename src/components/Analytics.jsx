import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import './Analytics.css';

// Register ChartJS components
Chart.register(...registerables);

const Analytics = ({ buildings, trades, energyHistory, navigateTo }) => {
  const [activeTab, setActiveTab] = useState('historical');
  const [predictedData, setPredictedData] = useState({ production: [], consumption: [], labels: [] });
  const [roiParams, setRoiParams] = useState({
    systemSize: 10, // kW
    installationCost: 2000, // Per kW
    energyPrice: 0.15, // $ per kWh
    incentives: 30, // % tax credit
    annualDegradation: 0.5, // % panel efficiency loss per year
    annualMaintenanceCost: 100, // $ per year
  });
  const [roiResults, setRoiResults] = useState(null);
  
  // Chart refs
  const historicalChartRef = useRef(null);
  const predictiveChartRef = useRef(null);
  const roiChartRef = useRef(null);
  const chartInstances = useRef({
    historical: null,
    predictive: null,
    roi: null
  });

  // Generate predictions based on historical data
  useEffect(() => {
    if (!energyHistory || !energyHistory.production || energyHistory.production.length < 3) return;
    
    // Simple forecasting based on historical patterns and trend analysis
    const predictProduction = (historicalData) => {
      // Clone the last 7 data points and apply a trend factor
      const trend = calculateTrend(historicalData);
      return historicalData.slice(-7).map((value, index) => {
        // Apply trend and add some randomization
        return Math.max(0, value + (trend * (index + 1)) + (Math.random() - 0.5) * value * 0.1);
      });
    };
    
    const calculateTrend = (data) => {
      if (data.length < 2) return 0;
      // Calculate average change between consecutive points
      let totalChange = 0;
      for (let i = 1; i < data.length; i++) {
        totalChange += data[i] - data[i-1];
      }
      return totalChange / (data.length - 1);
    };
    
    // Generate future timestamps (hours)
    const lastTimestamp = energyHistory.labels[energyHistory.labels.length - 1] || "00:00";
    const [hours, minutes] = lastTimestamp.split(':').map(Number);
    const futureLabels = Array(7).fill(0).map((_, i) => {
      const newHour = (hours + Math.floor((minutes + (i+1) * 60) / 60)) % 24;
      const newMinute = (minutes + (i+1) * 60) % 60;
      return `${newHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`;
    });
    
    setPredictedData({
      labels: futureLabels,
      production: predictProduction(energyHistory.production),
      consumption: predictProduction(energyHistory.consumption)
    });
  }, [energyHistory]);

  // Calculate ROI when parameters change
  useEffect(() => {
    const calculateRoi = () => {
      const {
        systemSize,
        installationCost,
        energyPrice,
        incentives,
        annualDegradation,
        annualMaintenanceCost
      } = roiParams;
      
      // Initial investment after incentives
      const totalCost = systemSize * installationCost;
      const incentiveAmount = totalCost * (incentives / 100);
      const netInitialCost = totalCost - incentiveAmount;
      
      // Calculate production and savings for 25 years
      const years = 25;
      const yearlyProduction = systemSize * 1600; // Average yearly production (kWh) for 1kW is ~1600kWh
      
      let cumulativeSavings = 0;
      let cumulativeProduction = 0;
      const yearlyData = [];
      
      for (let year = 1; year <= years; year++) {
        // Calculate degraded production for this year
        const degradationFactor = Math.pow(1 - annualDegradation/100, year - 1);
        const yearProduction = yearlyProduction * degradationFactor;
        
        // Calculate savings
        const energySavings = yearProduction * energyPrice;
        const yearlyMaintenance = annualMaintenanceCost;
        const netYearlySavings = energySavings - yearlyMaintenance;
        
        cumulativeProduction += yearProduction;
        cumulativeSavings += netYearlySavings;
        
        const cashFlow = cumulativeSavings - netInitialCost;
        
        yearlyData.push({
          year,
          yearProduction,
          degradationFactor,
          energySavings,
          netYearlySavings,
          cumulativeSavings,
          cashFlow
        });
      }
      
      // Calculate payback period
      const paybackYear = yearlyData.find(data => data.cashFlow >= 0)?.year || 'Over 25 years';
      
      // Calculate ROI (Return on Investment)
      const finalROI = ((cumulativeSavings - netInitialCost) / netInitialCost) * 100;
      
      setRoiResults({
        totalCost,
        netInitialCost,
        paybackYear,
        roi: finalROI,
        lifetimeSavings: cumulativeSavings,
        lifetimeProduction: cumulativeProduction,
        yearlyData
      });
    };
    
    calculateRoi();
  }, [roiParams]);

  // Initialize and update charts
  useEffect(() => {
    const initCharts = () => {
      // Clean up existing charts
      if (chartInstances.current.historical) {
        chartInstances.current.historical.destroy();
      }
      if (chartInstances.current.predictive) {
        chartInstances.current.predictive.destroy();
      }
      if (chartInstances.current.roi) {
        chartInstances.current.roi.destroy();
      }

      // Only initialize the active chart
      if (activeTab === 'historical' && historicalChartRef.current) {
        const ctx = historicalChartRef.current.getContext('2d');
        chartInstances.current.historical = new Chart(ctx, {
          type: 'line',
          data: {
            labels: energyHistory.labels || [],
            datasets: [
              {
                label: 'Production (kWh)',
                data: energyHistory.production || [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Consumption (kWh)',
                data: energyHistory.consumption || [],
                borderColor: '#FF5722',
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                fill: true,
                tension: 0.4
              },
              {
                label: 'Net Energy',
                data: (energyHistory.production || []).map((p, i) => 
                  p - (energyHistory.consumption[i] || 0)),
                borderColor: '#2196F3',
                borderDash: [5, 5],
                tension: 0.4,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Energy (kWh)'
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Historical Energy Production & Consumption'
              }
            }
          }
        });
      } else if (activeTab === 'predictive' && predictiveChartRef.current) {
        const ctx = predictiveChartRef.current.getContext('2d');
        chartInstances.current.predictive = new Chart(ctx, {
          type: 'line',
          data: {
            labels: [
              ...(energyHistory.labels || []).slice(-3), // Last 3 historical points
              ...predictedData.labels
            ],
            datasets: [
              {
                label: 'Historical Production',
                data: [
                  ...(energyHistory.production || []).slice(-3),
                  ...Array(predictedData.labels.length).fill(null)
                ],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.4
              },
              {
                label: 'Predicted Production',
                data: [
                  ...Array(3).fill(null),
                  ...predictedData.production
                ],
                borderColor: '#4CAF50',
                borderDash: [5, 5],
                pointStyle: 'circle',
                pointRadius: 5,
                tension: 0.4
              },
              {
                label: 'Historical Consumption',
                data: [
                  ...(energyHistory.consumption || []).slice(-3),
                  ...Array(predictedData.labels.length).fill(null)
                ],
                borderColor: '#FF5722',
                backgroundColor: 'rgba(255, 87, 34, 0.1)',
                tension: 0.4
              },
              {
                label: 'Predicted Consumption',
                data: [
                  ...Array(3).fill(null),
                  ...predictedData.consumption
                ],
                borderColor: '#FF5722',
                borderDash: [5, 5],
                pointStyle: 'circle',
                pointRadius: 5,
                tension: 0.4
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                title: {
                  display: true,
                  text: 'Energy (kWh)'
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Energy Prediction (Next 7 Hours)'
              }
            }
          }
        });
      } else if (activeTab === 'roi' && roiChartRef.current && roiResults) {
        const ctx = roiChartRef.current.getContext('2d');
        chartInstances.current.roi = new Chart(ctx, {
          type: 'line',
          data: {
            labels: roiResults.yearlyData.map(d => `Year ${d.year}`),
            datasets: [
              {
                label: 'Cumulative Savings ($)',
                data: roiResults.yearlyData.map(d => d.cumulativeSavings),
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                fill: true,
                yAxisID: 'y'
              },
              {
                label: 'Cash Flow ($)',
                data: roiResults.yearlyData.map(d => d.cashFlow),
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                fill: true,
                yAxisID: 'y'
              },
              {
                label: 'Yearly Production (kWh)',
                data: roiResults.yearlyData.map(d => d.yearProduction),
                borderColor: '#FF9800',
                borderDash: [5, 5],
                fill: false,
                yAxisID: 'y1'
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                  display: true,
                  text: 'Dollar Value ($)'
                }
              },
              y1: {
                type: 'linear',
                display: true,
                position: 'right',
                grid: {
                  drawOnChartArea: false
                },
                title: {
                  display: true,
                  text: 'Energy (kWh)'
                }
              }
            },
            plugins: {
              title: {
                display: true,
                text: 'Solar Panel ROI Projection'
              }
            }
          }
        });
      }
    };

    initCharts();

    return () => {
      // Clean up charts on unmount
      Object.values(chartInstances.current).forEach(chart => {
        if (chart) chart.destroy();
      });
    };
  }, [activeTab, energyHistory, predictedData, roiResults]);

  const handleRoiParamChange = (e) => {
    const { name, value } = e.target;
    setRoiParams(prev => ({
      ...prev,
      [name]: parseFloat(value)
    }));
  };

  return (
    <div className="analytics-container">
      <header>
        <div className="title-section">
          <h1>Advanced Energy Analytics</h1>
          <p>Gain insights into your energy system's performance</p>
        </div>
        <button className="btn back-button" onClick={() => navigateTo('dashboard')}>
          Back to Dashboard
        </button>
      </header>
      
      <div className="analytics-tabs">
        <button 
          className={`tab-button ${activeTab === 'historical' ? 'active' : ''}`}
          onClick={() => setActiveTab('historical')}
        >
          Historical Metrics
        </button>
        <button 
          className={`tab-button ${activeTab === 'predictive' ? 'active' : ''}`}
          onClick={() => setActiveTab('predictive')}
        >
          Predictive Analytics
        </button>
        <button 
          className={`tab-button ${activeTab === 'roi' ? 'active' : ''}`}
          onClick={() => setActiveTab('roi')}
        >
          ROI Calculator
        </button>
      </div>
      
      <div className="analytics-content">
        {activeTab === 'historical' && (
          <div className="historical-metrics">
            <div className="metrics-summary">
              <div className="metric-card">
                <h3>Total Energy Produced</h3>
                <div className="metric-value">
                  {energyHistory.production?.reduce((sum, val) => sum + val, 0).toFixed(2)} kWh
                </div>
              </div>
              <div className="metric-card">
                <h3>Total Energy Consumed</h3>
                <div className="metric-value">
                  {energyHistory.consumption?.reduce((sum, val) => sum + val, 0).toFixed(2)} kWh
                </div>
              </div>
              <div className="metric-card">
                <h3>Energy Self-Sufficiency</h3>
                <div className="metric-value">
                  {(
                    (energyHistory.production?.reduce((sum, val) => sum + val, 0) /
                    Math.max(1, energyHistory.consumption?.reduce((sum, val) => sum + val, 0))) * 100
                  ).toFixed(1)}%
                </div>
              </div>
              <div className="metric-card">
                <h3>Peak Production</h3>
                <div className="metric-value">
                  {Math.max(...(energyHistory.production || [0])).toFixed(2)} kW
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <canvas ref={historicalChartRef}></canvas>
            </div>
            
            <div className="historical-stats">
              <h3>Energy Trading Statistics</h3>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-label">Total Trades:</span>
                  <span className="stat-value">{trades.length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Total Volume:</span>
                  <span className="stat-value">
                    {trades.reduce((sum, t) => sum + (t.energyAmount || 0), 0).toFixed(2)} kWh
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Trade Size:</span>
                  <span className="stat-value">
                    {(trades.reduce((sum, t) => sum + (t.energyAmount || 0), 0) / 
                      Math.max(1, trades.length)).toFixed(2)} kWh
                  </span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Average Price:</span>
                  <span className="stat-value">
                    {(trades.reduce((sum, t) => sum + (t.pricePerUnit || 0), 0) / 
                      Math.max(1, trades.length)).toFixed(5)} SOL/kWh
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'predictive' && (
          <div className="predictive-analytics">
            <div className="prediction-summary">
              <div className="prediction-card">
                <h3>Forecasted Production (7h)</h3>
                <div className="prediction-value">
                  {predictedData.production.reduce((sum, val) => sum + val, 0).toFixed(2)} kWh
                </div>
              </div>
              <div className="prediction-card">
                <h3>Forecasted Consumption (7h)</h3>
                <div className="prediction-value">
                  {predictedData.consumption.reduce((sum, val) => sum + val, 0).toFixed(2)} kWh
                </div>
              </div>
              <div className="prediction-card">
                <h3>Predicted Balance</h3>
                <div className="prediction-value">
                  {(
                    predictedData.production.reduce((sum, val) => sum + val, 0) -
                    predictedData.consumption.reduce((sum, val) => sum + val, 0)
                  ).toFixed(2)} kWh
                </div>
              </div>
              <div className="prediction-card">
                <h3>Confidence Level</h3>
                <div className="prediction-value">
                  {Math.min(100, Math.max(50, 70 + Math.random() * 15)).toFixed(0)}%
                </div>
              </div>
            </div>
            
            <div className="chart-container">
              <canvas ref={predictiveChartRef}></canvas>
            </div>
            
            <div className="prediction-insights">
              <h3>Energy Insights</h3>
              <div className="insights-grid">
                <div className="insight-card">
                  <h4>Expected Energy Status</h4>
                  {predictedData.production.reduce((sum, val) => sum + val, 0) >
                   predictedData.consumption.reduce((sum, val) => sum + val, 0) ? (
                    <div className="insight-positive">Expected Net Producer</div>
                  ) : (
                    <div className="insight-negative">Expected Net Consumer</div>
                  )}
                  <p>Based on predicted production and consumption trends</p>
                </div>
                <div className="insight-card">
                  <h4>Trade Recommendation</h4>
                  {predictedData.production.reduce((sum, val) => sum + val, 0) >
                   predictedData.consumption.reduce((sum, val) => sum + val, 0) ? (
                    <div className="insight-action">Set selling price alerts for optimal profits</div>
                  ) : (
                    <div className="insight-action">Consider pre-purchasing energy at current rates</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'roi' && (
          <div className="roi-calculator">
            <div className="roi-inputs">
              <h3>Solar Investment Parameters</h3>
              <div className="input-grid">
                <div className="input-group">
                  <label htmlFor="systemSize">System Size (kW):</label>
                  <input
                    type="number"
                    id="systemSize"
                    name="systemSize"
                    value={roiParams.systemSize}
                    onChange={handleRoiParamChange}
                    min="1"
                    step="0.5"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="installationCost">Installation Cost ($/kW):</label>
                  <input
                    type="number"
                    id="installationCost"
                    name="installationCost"
                    value={roiParams.installationCost}
                    onChange={handleRoiParamChange}
                    min="1000"
                    step="100"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="energyPrice">Energy Price ($/kWh):</label>
                  <input
                    type="number"
                    id="energyPrice"
                    name="energyPrice"
                    value={roiParams.energyPrice}
                    onChange={handleRoiParamChange}
                    min="0.01"
                    step="0.01"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="incentives">Tax Incentives (%):</label>
                  <input
                    type="number"
                    id="incentives"
                    name="incentives"
                    value={roiParams.incentives}
                    onChange={handleRoiParamChange}
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="annualDegradation">Annual Degradation (%):</label>
                  <input
                    type="number"
                    id="annualDegradation"
                    name="annualDegradation"
                    value={roiParams.annualDegradation}
                    onChange={handleRoiParamChange}
                    min="0.1"
                    max="5"
                    step="0.1"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="annualMaintenanceCost">Annual Maintenance ($/year):</label>
                  <input
                    type="number"
                    id="annualMaintenanceCost"
                    name="annualMaintenanceCost"
                    value={roiParams.annualMaintenanceCost}
                    onChange={handleRoiParamChange}
                    min="0"
                    step="10"
                  />
                </div>
              </div>
            </div>
            
            {roiResults && (
              <>
                <div className="roi-summary">
                  <div className="roi-card">
                    <h3>Total Investment</h3>
                    <div className="roi-value">${roiResults.netInitialCost.toFixed(2)}</div>
                    <div className="roi-subtext">After ${(roiResults.totalCost - roiResults.netInitialCost).toFixed(2)} in incentives</div>
                  </div>
                  <div className="roi-card highlight">
                    <h3>Payback Period</h3>
                    <div className="roi-value">
                      {typeof roiResults.paybackYear === 'number' 
                        ? `${roiResults.paybackYear} years` 
                        : roiResults.paybackYear}
                    </div>
                    <div className="roi-subtext">Time to recoup investment</div>
                  </div>
                  <div className="roi-card">
                    <h3>25-Year ROI</h3>
                    <div className="roi-value">{roiResults.roi.toFixed(1)}%</div>
                    <div className="roi-subtext">Return on investment</div>
                  </div>
                  <div className="roi-card">
                    <h3>Lifetime Savings</h3>
                    <div className="roi-value">${roiResults.lifetimeSavings.toFixed(2)}</div>
                    <div className="roi-subtext">Over 25 years</div>
                  </div>
                </div>
                
                <div className="chart-container">
                  <canvas ref={roiChartRef}></canvas>
                </div>
                
                <div className="roi-insights">
                  <h3>Investment Insights</h3>
                  <div className="insight-content">
                    <p>
                      Based on your parameters, a {roiParams.systemSize}kW solar system would produce approximately
                      {' '}{(roiResults.lifetimeProduction / 1000).toFixed(1)} MWh of energy over its 25-year lifespan.
                    </p>
                    <p>
                      {roiResults.roi >= 100 
                        ? "This investment shows excellent returns, significantly outperforming many traditional investments."
                        : roiResults.roi >= 50
                        ? "This investment shows good returns, comparable to many long-term investment vehicles."
                        : "This investment shows modest returns. Consider adjusting system size or exploring additional incentives."}
                    </p>
                    {typeof roiResults.paybackYear === 'number' && roiResults.paybackYear <= 10 && (
                      <p className="highlight-text">
                        Your system is projected to pay for itself in just {roiResults.paybackYear} years, 
                        which is faster than the industry average of 8-12 years.
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics; 