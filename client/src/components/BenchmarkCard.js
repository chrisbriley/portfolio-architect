import React from 'react';
import { MetricItem } from './Shared'; 
import { RiskChart } from './Diagnostics';
// Note: Benchmarks don't have Drawdown data in the simple version yet, so we just skip the chart area for now.

const BenchmarkCard = ({ title, data, color }) => {
  return (
    <>
      <div className="strategy-card benchmark-card">
        <div className="card-header" style={{ borderBottom: `4px solid ${color}` }}>
          <h3>{title}</h3>
        </div>
        <div className="compare-container">
          <div className="compare-col highlight" style={{background: '#fffcf9'}}>
            <h4>Fixed Allocation</h4>
            <div className="mini-metrics">
              <MetricItem icon="📈" label="Ret" value={data.return + "%"} tooltip="Annualized Expected Return" />
              <MetricItem icon="⚡" label="SR" value={data.sharpe} tooltip="Sharpe Ratio" />
              <MetricItem icon="🌊" label="Vol" value={data.volatility + "%"} tooltip="Annualized Volatility" />
            </div>
            <ul className="allocation-list compact">
              {Object.entries(data.allocation).sort(([,a], [,b]) => b - a).map(([t, w]) => (
                <li key={t}><span>{t}</span><span>{Math.round(w)}%</span></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {data.risk_decomposition && <RiskChart data={data.risk_decomposition} title={`Risk Analysis: ${title}`} />}
    </>
  );
};

export default BenchmarkCard;