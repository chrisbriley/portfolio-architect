import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- Tooltip & Metrics ---
export const InfoTooltip = ({ text, children }) => (
  <div className="tooltip-container">
    {children}
    <div className="tooltip-text">{text}</div>
  </div>
);

export const MetricItem = ({ icon, label, value, tooltip }) => (
  <InfoTooltip text={tooltip}>
    <div className="metric">
      <span className="metric-label">{icon} {label}</span>
      <span className="metric-value">{value}</span>
    </div>
  </InfoTooltip>
);

// --- NEW: Combined Price History Chart ---
export const CombinedChart = ({ strategies, benchmarks }) => {
  if (!strategies) return null;

  // 1. Merge Data
  // We need a single array of objects: [{date: '2023-01-01', RP: 100, MS: 100, HRP: 100, 6040: 100...}]
  // We'll assume all histories share the same dates (which they do from the backend).
  
  // Base data on the first strategy's history
  const baseHistory = strategies["Risk Parity"].constrained.history;
  
  const mergedData = baseHistory.map((day, index) => {
    const row = { date: day.date };
    
    // Add Strategies (Constrained usually)
    row["Risk Parity"] = strategies["Risk Parity"].constrained.history[index]?.value;
    row["Max Sharpe"] = strategies["Max Sharpe"].constrained.history[index]?.value;
    row["HRP"] = strategies["HRP"].unconstrained.history[index]?.value; // HRP is unconstrained
    
    // Add Benchmarks
    if (benchmarks) {
        row["60/40"] = benchmarks["60/40"].history[index]?.value;
        row["Permanent"] = benchmarks["Permanent"].history[index]?.value;
    }
    return row;
  });

  return (
    <div className="diag-card" style={{ marginBottom: '30px', padding: '20px' }}>
      <h4>Historical Performance (Growth of $100)</h4>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={mergedData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <XAxis dataKey="date" minTickGap={30} tick={{fontSize: 12}} />
            <YAxis domain={['auto', 'auto']} tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #ddd' }}
              itemStyle={{ fontSize: '0.85rem' }}
              labelStyle={{ color: '#888', marginBottom: '5px' }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            
            {/* Strategies */}
            <Line type="monotone" dataKey="Risk Parity" stroke="#27ae60" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Max Sharpe" stroke="#2980b9" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="HRP" stroke="#8e44ad" strokeWidth={2} dot={false} />
            
            {/* Benchmarks (Dashed/Lighter) */}
            {benchmarks && (
                <>
                <Line type="monotone" dataKey="60/40" stroke="#95a5a6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="Permanent" stroke="#d35400" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </>
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};