import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const CorrelationHeatmap = ({ data, filterTickers }) => {
  if (!data) return null;
  const { tickers, matrix } = data;

  // --- Filter Logic ---
  // If filterTickers is provided, we need to map the indices
  let activeIndices = [];
  if (filterTickers && filterTickers.length > 0) {
      // Find indices of the requested tickers in the master list
      tickers.forEach((t, i) => {
          if (filterTickers.includes(t)) activeIndices.push(i);
      });
  } else {
      // Show all
      activeIndices = tickers.map((_, i) => i);
  }

  // Helper to get color
  const getColor = (val) => {
    if (val === 1) return '#eee';
    if (val > 0.7) return `rgba(231, 76, 60, ${val})`; 
    if (val > 0.3) return `rgba(241, 196, 15, ${val})`; 
    return `rgba(46, 204, 113, ${Math.abs(val) + 0.3})`;
  };

  return (
    <div className="diag-card" style={{marginTop: '20px'}}>
      <h4>Correlation Matrix {filterTickers ? "(Strategy Assets)" : "(All Assets)"}</h4>
      <div className="heatmap-grid" style={{gridTemplateColumns: `50px repeat(${activeIndices.length}, 1fr)`}}>
        {/* Header */}
        <div className="hm-cell empty"></div>
        {activeIndices.map(i => <div key={tickers[i]} className="hm-header">{tickers[i]}</div>)}
        
        {/* Rows */}
        {activeIndices.map(i => (
          <React.Fragment key={i}>
            <div className="hm-row-header">{tickers[i]}</div>
            {activeIndices.map(j => (
              <div key={j} className="hm-cell" style={{backgroundColor: getColor(matrix[i][j])}} title={`${tickers[i]} vs ${tickers[j]}: ${matrix[i][j]}`}>
                {matrix[i][j]}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const RiskChart = ({ data, title }) => {
  if (!data) return null;
  const chartData = data.tickers.map((t, i) => ({
    name: t,
    Weight: data.weights[i],
    Risk: data.risk_contribution[i]
  }));

  return (
    <div className="diag-card" style={{marginTop: '20px'}}>
      <h4>{title || "Risk Decomposition"}</h4>
      <div style={{width:'100%', height: 250}}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{top: 5, right: 30, left: 0, bottom: 5}}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip contentStyle={{background:'#fff', border:'1px solid #ddd'}} />
            <Legend />
            <Bar dataKey="Weight" fill="#3498db" name="Allocation %" />
            <Bar dataKey="Risk" fill="#e74c3c" name="Risk Contribution %" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="diag-note">
        If <strong>Risk</strong> bar > <strong>Weight</strong> bar, this asset is driving portfolio volatility.
      </div>
    </div>
  );
};