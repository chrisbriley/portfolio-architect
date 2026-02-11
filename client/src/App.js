import React, { useState } from 'react';
import './App.css';

// Components
import DiagnosisHeader from './components/DiagnosisHeader';
import ModernStrategyCard from './components/ModernStrategyCard';
import { CombinedChart } from './components/Shared';
import { DendrogramViewer, EfficientFrontierChart } from './components/Visualizations';
import CorrelationHeatmap from './components/CorrelationHeatmap';

// Hooks & Context
import { usePortfolio } from './context/PortfolioContext';
import { usePortfolioOptimization } from './hooks/usePortfolioOptimization';
import { useLeverageScaling } from './hooks/useLeverageScaling';

function App() {
  const { 
    savedPortfolios, 
    savePortfolio, 
    deletePortfolio, 
    borrowCost, 
    setBorrowCost 
  } = usePortfolio();

  const {
    results,
    isLoading,
    error,
    runAnalysis
  } = usePortfolioOptimization();

  // --- LOCAL STATE (UI Only) ---
  const [tickersInput, setTickersInput] = useState('VTI, TLT, GLD, VNQ');
  const [minWeight, setMinWeight] = useState(0);
  const [maxWeight, setMaxWeight] = useState(100);
  const [targetVal, setTargetVal] = useState(0);
  const [targetMode, setTargetMode] = useState("volatility");
  const [activeTab, setActiveTab] = useState("Risk Parity");
  const [isConstrained, setIsConstrained] = useState(true);
  const [portfolioName, setPortfolioName] = useState('');

  // --- DYNAMIC LEVERAGE SCALING HOOK ---
  const processedResults = useLeverageScaling(results, { 
    targetVal, 
    targetMode, 
    borrowCost 
  });

  // --- HANDLERS ---
  const handleSavePortfolio = () => {
    if (!portfolioName.trim()) return;
    savePortfolio({ 
        name: portfolioName, 
        tickers: tickersInput, 
        min: minWeight, 
        max: maxWeight,
        targetVal,
        targetMode,
        borrowCost
    });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    runAnalysis({ tickers: tickersInput, minWeight, maxWeight });
  };

  const getRecommendedStrategy = (lookback, shrinkage) => {
    if (shrinkage > 0.4) return "HRP";
    if (lookback < 252) return "Risk Parity"; 
    return "Max Sharpe";
  };

  return (
    <div className="App">
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
                      <span onClick={(e) => { e.stopPropagation(); deletePortfolio(idx); }} style={{color:'#e74c3c'}}>×</span>
                  </div>
              ))}
          </div>
        )}
        
        <div className="sidebar-group">
            <input type="text" placeholder="Save current as..." value={portfolioName} onChange={(e) => setPortfolioName(e.target.value)} />
            <button type="button" onClick={handleSavePortfolio} style={{background:'#27ae60', border:'none', color:'white', padding:'8px', borderRadius:'4px', cursor:'pointer', marginTop:'5px'}}>Save</button>
        </div>
      </aside>

      <main className="main-content">
        {error && <div className="error-message">⚠️ {error}</div>}

        {processedResults && (
          <div className="results-container">
            <DiagnosisHeader lookback={processedResults.meta.lookback} shrinkage={processedResults.meta.shrinkage} />

            <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                <div className="diag-card" style={{padding:'20px', background:'white'}}>
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
                
                <div className="toggle-container">
                    <div className={`toggle-btn ${!isConstrained ? 'active' : ''}`} onClick={() => setIsConstrained(false)}>Unconstrained</div>
                    <div className={`toggle-btn ${isConstrained ? 'active' : ''}`} onClick={() => setIsConstrained(true)}>Constrained</div>
                </div>
            </div>

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
