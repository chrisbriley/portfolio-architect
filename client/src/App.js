import React, { useState, useEffect, useMemo } from 'react';
import './App.css';

// Components
import DiagnosisHeader from './components/DiagnosisHeader';
import ModernStrategyCard from './components/ModernStrategyCard';
import { CombinedChart } from './components/Shared';
import { DendrogramViewer, EfficientFrontierChart } from './components/Visualizations';
import CorrelationHeatmap from './components/CorrelationHeatmap';

function App() {
  // --- STATE ---
  const [tickersInput, setTickersInput] = useState('VTI, TLT, GLD, VNQ');
  const [minWeight, setMinWeight] = useState(0);
  const [maxWeight, setMaxWeight] = useState(100);
  
  // Leverage State
  const [targetVal, setTargetVal] = useState(0);
  const [targetMode, setTargetMode] = useState("volatility"); // 'volatility' or 'var'
  const [borrowCost, setBorrowCost] = useState(5.5); // Default 5.5%

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState("Risk Parity");
  const [isConstrained, setIsConstrained] = useState(true);

  // Portfolio Management
  const [savedPortfolios, setSavedPortfolios] = useState([]);
  const [portfolioName, setPortfolioName] = useState('');

  // --- LIFECYCLE ---
  useEffect(() => {
    const saved = localStorage.getItem('myPortfolios');
    if (saved) { try { setSavedPortfolios(JSON.parse(saved)); } catch (e) {} }
  }, []);

  // --- HANDLERS ---
  const handleSavePortfolio = () => {
    if (!portfolioName.trim()) return;
    const newPortfolio = { 
        name: portfolioName, 
        tickers: tickersInput, 
        min: minWeight, 
        max: maxWeight,
        targetVal,
        targetMode,
        borrowCost
    };
    const updated = [...savedPortfolios, newPortfolio];
    setSavedPortfolios(updated);
    localStorage.setItem('myPortfolios', JSON.stringify(updated));
    setPortfolioName('');
  };

  const handleLoadPortfolio = (p) => {
    setTickersInput(p.tickers);
    if (p.min !== undefined) setMinWeight(p.min);
    if (p.max !== undefined) setMaxWeight(p.max);
    if (p.targetVal !== undefined) setTargetVal(p.targetVal);
    if (p.targetMode !== undefined) setTargetMode(p.targetMode);
    if (p.borrowCost !== undefined) setBorrowCost(p.borrowCost);
  };

  const handleDeletePortfolio = (index, e) => {
    e.stopPropagation();
    const updated = savedPortfolios.filter((_, i) => i !== index);
    setSavedPortfolios(updated);
    localStorage.setItem('myPortfolios', JSON.stringify(updated));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    const tickersArray = tickersInput.split(',').map(t => t.trim().toUpperCase()).filter(t => t !== '');
    if (tickersArray.length < 2) { 
        setError("Please enter at least two tickers."); 
        setIsLoading(false); 
        return; 
    }

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${API_URL}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            tickers: tickersArray, 
            min_weight: minWeight, 
            max_weight: maxWeight,
            target_value: 0,             // Always fetch unlevered base
            target_mode: 'volatility'
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await response.json();
      
      // Validate data structure before setting state to prevent crashes
      if (!data || !data.strategies) {
        throw new Error("Invalid response format from server");
      }
      setResults(data);

    } catch (err) {
      let msg = err.message;
      if (msg === 'Failed to fetch') {
        msg = "Server timeout. The analysis took too long or the backend is waking up. Please try again.";
      }
      setError(msg || "Connection failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendedStrategy = (lookback, shrinkage) => {
    if (shrinkage > 0.4) return "HRP";
    if (lookback < 252) return "Risk Parity"; 
    return "Max Sharpe";
  };

  // --- DYNAMIC LEVERAGE SCALING ---
  const processedResults = useMemo(() => {
    if (!results || !results.strategies) return null;
    if (targetVal === 0) return results; // No leverage, return raw

    const scaleFactor = (current, target) => {
        if (current <= 0) return 1;
        let lev = target / current;
        return Math.min(lev, 4.0); // Cap at 4x leverage
    };

    const scaleHistory = (history, leverage) => {
        if (Math.abs(leverage - 1) < 0.01) return history;
        const dailyBorrowRate = (borrowCost / 100) / 252;
        const newHistory = [{date: history[0].date, value: 100}];
        for (let i = 1; i < history.length; i++) {
            const prevRaw = history[i-1].value;
            const currRaw = history[i].value;
            const ret = (prevRaw === 0) ? 0 : (currRaw / prevRaw) - 1;
            const levRet = ret * leverage - (leverage - 1) * dailyBorrowRate;
            const prevLev = newHistory[i-1].value;
            const currLev = prevLev * (1 + levRet);
            newHistory.push({date: history[i].date, value: currLev});
        }
        return newHistory;
    };

    const recalculateDrawdowns = (history) => {
        let runningMax = -Infinity;
        return history.map(point => {
            if (point.value > runningMax) runningMax = point.value;
            const dd = (point.value - runningMax) / runningMax;
            return { date: point.date, value: Number((dd * 100).toFixed(2)) };
        });
    };

    const newStrategies = {};
    
    Object.keys(results.strategies).forEach(stratName => {
        newStrategies[stratName] = {};
        ['constrained', 'unconstrained'].forEach(mode => {
            const base = results.strategies[stratName][mode];
            if (!base) return;

            // Calculate Leverage
            let leverage = 1.0;
            if (targetMode === 'volatility') {
                leverage = scaleFactor(base.metrics.volatility, targetVal);
            } else if (targetMode === 'var') {
                // VaR
                leverage = scaleFactor(base.metrics.var, targetVal);
            } else if (targetMode === 'leverage_ratio') {
                leverage = targetVal / 100.0;
            } 

            // Scale Metrics
            // R_levered = L * R_portfolio - (L-1) * R_borrow
            const newReturn = leverage * base.metrics.return - (leverage - 1) * borrowCost;

            const scaledHistory = scaleHistory(base.history, leverage);

            // Scale Allocation
            const newAllocation = {};
            Object.keys(base.allocation).forEach(key => {
                newAllocation[key] = Number((base.allocation[key] * leverage).toFixed(1));
            });

            newStrategies[stratName][mode] = {
                ...base,
                allocation: newAllocation,
                metrics: {
                    ...base.metrics,
                    volatility: Number((base.metrics.volatility * leverage).toFixed(1)),
                    return: Number(newReturn.toFixed(1)),
                    var: Number((base.metrics.var * leverage).toFixed(2)),
                    beta: Number((base.metrics.beta * leverage).toFixed(2)),
                    corr_var: base.metrics.corr_var, // Correlation structure doesn't change
                    leverage: Number((leverage * 100).toFixed(0))
                },
                history: scaledHistory,
                drawdowns: recalculateDrawdowns(scaledHistory)
            };
        });
    });

    return {
        ...results,
        strategies: newStrategies
    };
  }, [results, targetVal, targetMode, borrowCost]);

  // --- RENDER ---
  return (
    <div className="App">
      {/* 1. SIDEBAR */}
      <aside className="sidebar">
        <div>
            <h1>Portfolio Architect</h1>
            <p>Robust Optimization • Regime Analysis</p>
        </div>

        <form onSubmit={handleSubmit} className="sidebar-group">
            <div className="sidebar-group">
                <label>Tickers</label>
                <textarea 
                    value={tickersInput} 
                    onChange={(e) => setTickersInput(e.target.value)} 
                    rows="4" 
                    placeholder="e.g. VTI, TLT, GLD" 
                />
            </div>

            <div className="sidebar-group">
                <label>Constraints (%)</label>
                <div style={{display:'flex', gap:'10px'}}>
                    <input type="number" placeholder="Min" value={minWeight} onChange={e => setMinWeight(Number(e.target.value))} title="Min Weight" />
                    <input type="number" placeholder="Max" value={maxWeight} onChange={e => setMaxWeight(Number(e.target.value))} title="Max Weight" />
                </div>
            </div>

            <button type="submit" disabled={isLoading} className="run-btn">
                {isLoading ? 'Running...' : 'Run Analysis'}
            </button>
        </form>

        {savedPortfolios.length > 0 && (
          <div className="sidebar-group" style={{marginTop:'20px'}}>
              <label>Saved Portfolios</label>
              {savedPortfolios.map((p, idx) => (
                  <div key={idx} onClick={() => handleLoadPortfolio(p)} style={{background:'#34495e', padding:'8px', borderRadius:'4px', cursor:'pointer', display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
                      <span>{p.name}</span>
                      <span onClick={(e) => handleDeletePortfolio(idx, e)} style={{color:'#e74c3c'}}>×</span>
                  </div>
              ))}
          </div>
        )}
        
        <div className="sidebar-group">
            <input type="text" placeholder="Save current as..." value={portfolioName} onChange={(e) => setPortfolioName(e.target.value)} />
            <button type="button" onClick={handleSavePortfolio} style={{background:'#27ae60', border:'none', color:'white', padding:'8px', borderRadius:'4px', cursor:'pointer', marginTop:'5px'}}>Save</button>
        </div>
      </aside>

      {/* 2. MAIN CONTENT */}
      <main className="main-content">
        {error && <div className="error-message">⚠️ {error}</div>}

        {processedResults && (
          <div className="results-container">
            {/* 1. Header Diagnosis */}
            <DiagnosisHeader lookback={processedResults.meta.lookback} shrinkage={processedResults.meta.shrinkage} />

            {/* 2. Global Visuals Row */}
            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                
                {/* NEW: Combined Container for Performance & Frontier with Controls */}
                <div className="diag-card" style={{padding:'20px', background:'white'}}>
                    {/* Controls Header */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'15px'}}>
                        <h3 style={{margin:0, color:'#2c3e50'}}>Portfolio Performance & Risk</h3>
                        
                        <div style={{display:'flex', alignItems:'center', gap:'15px', background:'#f8f9fa', padding:'10px 20px', borderRadius:'8px'}}>
                            <span style={{fontSize:'0.85rem', fontWeight:'bold', color:'#7f8c8d', textTransform:'uppercase'}}>Leverage Target:</span>
                            <select 
                                value={targetMode} 
                                onChange={e => { setTargetMode(e.target.value); setTargetVal(0); }}
                                style={{padding:'5px', borderRadius:'4px', border:'1px solid #ddd'}}
                            >
                                <option value="volatility">Target Volatility</option>
                                <option value="var">Target VaR (95%)</option>
                                <option value="leverage_ratio">Target Leverage %</option>
                            </select>
                            <input 
                                type="range" 
                                min="0" 
                                max={targetMode === "volatility" ? "40" : targetMode === "var" ? "5" : "400"} 
                                step={targetMode === "volatility" ? "1" : targetMode === "var" ? "0.1" : "25"}
                                value={targetVal} 
                                onChange={e => setTargetVal(Number(e.target.value))} 
                                style={{width:'150px', cursor:'pointer'}}
                            />
                            <span style={{fontWeight:'bold', color:'#2c3e50', minWidth:'40px'}}>
                                {targetVal > 0 ? targetVal + "%" : "Off"}
                            </span>

                            <div style={{borderLeft: '2px solid #ddd', paddingLeft: '15px', marginLeft: '5px', display:'flex', alignItems:'center', gap:'10px'}}>
                                <span style={{fontSize:'0.85rem', fontWeight:'bold', color:'#7f8c8d', textTransform:'uppercase'}}>Borrow Cost:</span>
                                <input 
                                    type="number"
                                    value={borrowCost}
                                    onChange={e => setBorrowCost(Number(e.target.value))}
                                    style={{width:'60px', padding:'5px', borderRadius:'4px', border:'1px solid #ddd'}}
                                    step="0.1"
                                />
                                <span style={{fontWeight:'bold', color:'#2c3e50'}}>%</span>
                            </div>
                        </div>
                    </div>

                    <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
                        <div style={{flex:1, minWidth:'400px'}}>
                            <CombinedChart strategies={processedResults.strategies} benchmarks={processedResults.benchmarks} />
                        </div>
                        <div style={{flex:1, minWidth:'400px'}}>
                            <EfficientFrontierChart cloudData={processedResults.meta.frontier} strategies={processedResults.strategies} benchmarks={processedResults.benchmarks} />
                        </div>
                    </div>
                </div>

                <div style={{flex:1, minWidth:'400px'}}>
                    <CorrelationHeatmap 
                        correlationData={processedResults.meta.diagnostics.correlation} 
                        assetNames={processedResults.asset_names}
                        shrinkage={processedResults.meta.shrinkage}
                    />
                </div>
            </div>

            {/* 4. Tab Navigation */}
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'2px solid #eee', paddingBottom:'10px', marginTop:'30px'}}>
                <div className="tabs-header" style={{margin:0, border:0}}>
                {["Risk Parity", "Max Sharpe", "HRP", "MDP"].map(tab => {
                    const rec = getRecommendedStrategy(processedResults.meta.lookback, processedResults.meta.shrinkage);
                    const isRec = rec.includes(tab.split(" ")[0]);
                    return (
                        <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab} {isRec && <span className="tab-badge">⭐</span>}
                        </button>
                    );
                })}
                </div>
                
                {/* Constrained Toggle */}
                <div className="toggle-container">
                    <div className={`toggle-btn ${!isConstrained ? 'active' : ''}`} onClick={() => setIsConstrained(false)}>Unconstrained</div>
                    <div className={`toggle-btn ${isConstrained ? 'active' : ''}`} onClick={() => setIsConstrained(true)}>Constrained</div>
                </div>
            </div>

            {/* 5. Tab Content */}
            <div className="tab-content">
                {processedResults.strategies[activeTab] && (
                    <>
                        <ModernStrategyCard 
                            title={`${activeTab} (${isConstrained ? 'Constrained' : 'Unconstrained'})`}
                            data={processedResults.strategies[activeTab][isConstrained ? 'constrained' : 'unconstrained']} 
                            color={activeTab === "Risk Parity" ? "#27ae60" : activeTab === "Max Sharpe" ? "#2980b9" : activeTab === "MDP" ? "#d35400" : "#8e44ad"} 
                            sparklines={processedResults.sparklines}
                            lookback={processedResults.meta.lookback}
                            assetNames={processedResults.asset_names}
                            currentPrices={processedResults.current_prices}
                        />
                        {activeTab === "HRP" && <DendrogramViewer imageBase64={processedResults.meta.dendrogram} />}
                    </>
                )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;