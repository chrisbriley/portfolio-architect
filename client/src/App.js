import React, { useState, useEffect } from 'react';
import './App.css';

// Components
import DiagnosisHeader from './components/DiagnosisHeader';
import StrategyCard from './components/StrategyCard';
import BenchmarkCard from './components/BenchmarkCard';
import PriceTable from './components/PriceTable';
import { CombinedChart } from './components/Shared';
import { DendrogramViewer, EfficientFrontierChart } from './components/Visualizations';
import { CorrelationHeatmap } from './components/Diagnostics';

function App() {
  // --- STATE ---
  const [tickersInput, setTickersInput] = useState('VTI, TLT, GLD, VNQ');
  const [minWeight, setMinWeight] = useState(0);
  const [maxWeight, setMaxWeight] = useState(100);
  
  // Leverage State
  const [targetVal, setTargetVal] = useState(0);
  const [targetMode, setTargetMode] = useState("volatility"); // 'volatility' or 'var'

  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Tab State
  const [activeTab, setActiveTab] = useState("Risk Parity");

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
        targetMode
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
            target_value: targetVal,     // Send raw number
            target_mode: targetMode      // Send mode (volatility vs var)
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server error');
      }

      const data = await response.json();
      setResults(data);

    } catch (err) {
      setError(err.message || "Connection failed. Is the backend running?");
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendedStrategy = (lookback, shrinkage) => {
    if (shrinkage > 0.4) return "HRP";
    if (lookback < 252) return "Risk Parity"; 
    return "Max Sharpe";
  };

  // --- RENDER ---
  return (
    <div className="App">
      <header className="App-header">
        <h1>Portfolio Architect</h1>
        <p>Robust Optimization • Regime Analysis • Drift Detection</p>
      </header>
      <main>
        {savedPortfolios.length > 0 && (
          <div className="saved-portfolios">
              {savedPortfolios.map((p, idx) => (
                  <div key={idx} onClick={() => handleLoadPortfolio(p)} className="portfolio-chip">
                      📂 {p.name} <span className="delete-x" onClick={(e) => handleDeletePortfolio(idx, e)}>×</span>
                  </div>
              ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="optimizer-form">
          <div className="form-row">
            {/* Left Column: Tickers */}
            <div style={{flex: 2}}>
              <label>Tickers:</label>
              <textarea value={tickersInput} onChange={(e) => setTickersInput(e.target.value)} rows="3" placeholder="e.g. VTI, TLT, GLD, VNQ" />
              <div className="save-controls">
                  <input type="text" placeholder="Save name (e.g. All Weather)" value={portfolioName} onChange={(e) => setPortfolioName(e.target.value)} />
                  <button type="button" onClick={handleSavePortfolio} className="save-btn">Save</button>
              </div>
            </div>

            {/* Right Column: Constraints & Leverage */}
            <div style={{flex: 1, display:'flex', flexDirection:'column', gap:'15px'}}>
              
              {/* Constraints Row */}
              <div style={{display:'flex', gap:'10px'}}>
                <div style={{flex:1}}>
                    <label>Min Wgt (%)</label>
                    <input type="number" value={minWeight} onChange={e => setMinWeight(Number(e.target.value))} />
                </div>
                <div style={{flex:1}}>
                    <label>Max Wgt (%)</label>
                    <input type="number" value={maxWeight} onChange={e => setMaxWeight(Number(e.target.value))} />
                </div>
              </div>

              {/* Leverage Control */}
              <div>
                <label>Leverage Target</label>
                <div className="leverage-control" style={{display:'flex', gap:'10px', alignItems:'center'}}>
                    <select 
                        value={targetMode} 
                        onChange={e => setTargetMode(e.target.value)}
                        style={{padding: '10px', borderRadius: '8px', border: '2px solid #ecf0f1', flex: 1, fontSize:'0.9rem'}}
                    >
                        <option value="volatility">Target Volatility (Ann.)</option>
                        <option value="var">Target VaR (Daily 95%)</option>
                    </select>
                    
                    <input 
                        type="number" 
                        placeholder="0 = None" 
                        value={targetVal} 
                        onChange={e => setTargetVal(Number(e.target.value))} 
                        style={{width: '80px'}}
                        title={targetMode === "volatility" ? "e.g. 15 for 15% Volatility" : "e.g. 1.5 for 1.5% Max Daily Loss"}
                    />
                </div>
                <div style={{fontSize:'0.75rem', color:'#7f8c8d', marginTop:'5px', fontStyle:'italic'}}>
                    {targetVal === 0 ? "No leverage applied." : 
                     targetMode === "volatility" 
                        ? `Scales portfolio to hit ${targetVal}% annualized volatility.` 
                        : `Scales portfolio so 95% of days lose < ${targetVal}%.`}
                </div>
              </div>

            </div>
          </div>
          <button type="submit" disabled={isLoading} className="run-btn">
            {isLoading ? 'Running Analysis...' : 'Run Analysis'}
          </button>
        </form>

        {error && <div className="error-message">⚠️ {error}</div>}

        {results && (
          <div className="results-container">
            {/* 1. Header Diagnosis */}
            <DiagnosisHeader lookback={results.meta.lookback} shrinkage={results.meta.shrinkage} />

            {/* 2. Combined Chart */}
            <CombinedChart strategies={results.strategies} benchmarks={results.benchmarks} />

            {/* 3. Global Visualization Area */}
            {results.meta.frontier && (
                <EfficientFrontierChart cloudData={results.meta.frontier} strategies={results.strategies} />
            )}

            {/* 4. Tab Navigation */}
            <div className="tabs-header">
                {["Risk Parity", "Max Sharpe", "HRP"].map(tab => {
                    const rec = getRecommendedStrategy(results.meta.lookback, results.meta.shrinkage);
                    const isRec = rec.includes(tab.split(" ")[0]);
                    return (
                        <button key={tab} className={`tab-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                            {tab} {isRec && <span className="tab-badge">⭐</span>}
                        </button>
                    );
                })}
                <button className={`tab-btn ${activeTab === "60/40" ? 'active' : ''}`} onClick={() => setActiveTab("60/40")}>60/40</button>
                <button className={`tab-btn ${activeTab === "Permanent" ? 'active' : ''}`} onClick={() => setActiveTab("Permanent")}>Permanent</button>
            </div>

            {/* 5. Tab Content */}
            <div className="tab-content">
                {activeTab === "Risk Parity" && 
                    <StrategyCard 
                        title="Risk Parity" 
                        data={results.strategies["Risk Parity"]} 
                        color="#27ae60" 
                        minWeight={minWeight} maxWeight={maxWeight}
                        isRecommended={getRecommendedStrategy(results.meta.lookback, results.meta.shrinkage) === "Risk Parity"} 
                        globalCorrelation={results.meta.diagnostics.correlation}
                    />
                }
                {activeTab === "Max Sharpe" && 
                    <StrategyCard 
                        title="Max Sharpe" 
                        data={results.strategies["Max Sharpe"]} 
                        color="#2980b9" 
                        minWeight={minWeight} maxWeight={maxWeight}
                        isRecommended={getRecommendedStrategy(results.meta.lookback, results.meta.shrinkage) === "Max Sharpe"} 
                        globalCorrelation={results.meta.diagnostics.correlation}
                    />
                }
                {activeTab === "HRP" && (
                    <>
                        <StrategyCard 
                            title="HRP (Unconstrained Only)" 
                            data={results.strategies["HRP"]} 
                            color="#8e44ad" 
                            minWeight={minWeight} maxWeight={maxWeight}
                            isRecommended={getRecommendedStrategy(results.meta.lookback, results.meta.shrinkage).includes("HRP")} 
                            globalCorrelation={results.meta.diagnostics.correlation}
                        />
                        {/* HRP Dendrogram */}
                        <DendrogramViewer imageBase64={results.meta.dendrogram} />
                    </>
                )}
                
                {/* Benchmarks */}
                {activeTab === "60/40" && results.benchmarks && (
                    <BenchmarkCard title="Classic 60/40" data={results.benchmarks["60/40"]} color="#7f8c8d" />
                )}
                {activeTab === "Permanent" && results.benchmarks && (
                    <BenchmarkCard title="Permanent Portfolio" data={results.benchmarks["Permanent"]} color="#d35400" />
                )}
            </div>

            {/* 6. Recent Prices */}
            <PriceTable prices={results.recent_prices} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;