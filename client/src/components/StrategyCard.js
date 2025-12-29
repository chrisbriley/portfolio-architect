import React from 'react';
import { MetricItem } from './Shared'; 
import { RiskChart, CorrelationHeatmap } from './Diagnostics';
import { DrawdownChart } from './Visualizations';

const StrategyCard = ({ title, data, color, isRecommended, globalCorrelation, minWeight, maxWeight }) => {
  // 1. Data Prep
  const drawdownData = data.constrained ? data.constrained.drawdowns : data.unconstrained.drawdowns;
  const isHRP = title.includes("HRP");
  
  const riskData = data.constrained ? data.constrained.risk_decomposition : data.unconstrained.risk_decomposition;
  // Filter for active tickers to clean up the heatmap
  const activeTickers = riskData.tickers.filter((_, i) => riskData.weights[i] > 0);

  const getSignalColor = (signal) => {
    if (signal === "REBALANCE REQUIRED") return "#e74c3c";
    if (signal === "HOLD") return "#27ae60";
    return "#95a5a6";
  };

  return (
    <>
      <div className={`strategy-card ${isRecommended ? 'recommended-card' : ''}`}>
        <div className="card-header" style={{ borderBottom: `4px solid ${color}` }}>
          <div style={{width: '100%', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
            <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
              <h3>{title}</h3>
              {isRecommended && <span className="rec-badge">⭐ Recommended</span>}
            </div>
            {data.rebalance && (
              <div className="signal-badge" style={{ backgroundColor: getSignalColor(data.rebalance.signal) + '20', color: getSignalColor(data.rebalance.signal), border: `1px solid ${getSignalColor(data.rebalance.signal)}` }}>
                <span className="signal-icon">{data.rebalance.signal === "REBALANCE REQUIRED" ? "⚡" : "✓"}</span>
                <strong>{data.rebalance.signal}</strong>
              </div>
            )}
          </div>
        </div>
        
        <div className="compare-container">
          {/* Unconstrained Column */}
          <div className="compare-col">
            <h4>Unconstrained</h4>
            <div className="mini-metrics">
              <MetricItem icon="📈" label="Ret" value={data.unconstrained.metrics.return + "%"} tooltip="Annualized Return" />
              <MetricItem icon="⚡" label="SR" value={data.unconstrained.metrics.sharpe} tooltip="Sharpe Ratio" />
              <MetricItem icon="🌊" label="Vol" value={data.unconstrained.metrics.volatility + "%"} tooltip="Volatility" />
              <MetricItem icon="🔻" label="VaR" value={"-" + data.unconstrained.metrics.var + "%"} tooltip="95% Daily Value at Risk. In the worst 5% of days, expect to lose at least this much." />
            </div>
            <ul className="allocation-list compact">
              {Object.entries(data.unconstrained.allocation).sort(([,a], [,b]) => b - a).map(([t, w]) => (
                <li key={t}><span>{t}</span><span>{w}%</span></li>
              ))}
            </ul>
          </div>

          {/* Constrained Column */}
          <div className="compare-col highlight">
            <h4>{isHRP ? "Unconstrained (HRP)" : "Constrained"}</h4>
            <div className="mini-metrics">
              <MetricItem icon="📈" label="Ret" value={data.constrained.metrics.return + "%"} tooltip="Annualized Return" />
              <MetricItem icon="⚡" label="SR" value={data.constrained.metrics.sharpe} tooltip="Sharpe Ratio" />
              <MetricItem icon="🌊" label="Vol" value={data.constrained.metrics.volatility + "%"} tooltip="Volatility" />
              <MetricItem icon="🔻" label="VaR" value={"-" + data.unconstrained.metrics.var + "%"} tooltip="95% Daily Value at Risk. In the worst 5% of days, expect to lose at least this much." />
            </div>
            <ul className="allocation-list compact">
              {Object.entries(data.constrained.allocation).sort(([,a], [,b]) => b - a).map(([t, w]) => (
                <li key={t} style={!isHRP && (w === minWeight || w === maxWeight) ? {color: color, fontWeight:'bold'} : {}}>
                  <span>{t}</span><span>{w}%</span>
                </li>
              ))}
            </ul>
            {isHRP && <div style={{fontSize:'0.65rem', color:'#999', marginTop:'5px', fontStyle:'italic', textAlign:'center'}}>*HRP does not support hard bounds</div>}
          </div>
        </div>

        {/* Drawdown Chart (Performance Chart moved to Diagnosis Header) */}
        <div style={{padding: '0 15px 15px 15px'}}>
            <DrawdownChart data={drawdownData} color="#c0392b" />
        </div>
      </div>
      
      {/* Diagnostics Below Card */}
      <RiskChart data={riskData} title={`Risk Analysis: ${title}`} />
      <CorrelationHeatmap data={globalCorrelation} filterTickers={activeTickers} />
    </>
  );
};

export default StrategyCard;