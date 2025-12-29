import React from 'react';
import { ScatterChart, Scatter, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend, ReferenceLine } from 'recharts';

export const DendrogramViewer = ({ imageBase64 }) => {
  if (!imageBase64) return null;
  return (
    <div className="diag-card" style={{ marginTop: '20px', textAlign: 'center' }}>
      <h4>HRP Clustering Tree (Dendrogram)</h4>
      <img src={`data:image/png;base64,${imageBase64}`} alt="Asset Dendrogram" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px' }} />
      <div className="diag-note">Assets joined at the <strong>bottom</strong> are Cousins (Correlated). Assets at the <strong>top</strong> are Diversifiers.</div>
    </div>
  );
};

export const EfficientFrontierChart = ({ cloudData, strategies }) => {
  if (!cloudData || !strategies) return null;
  const strategyPoints = [
    { name: "Risk Parity", x: strategies["Risk Parity"].constrained.metrics.volatility, y: strategies["Risk Parity"].constrained.metrics.return, color: "#27ae60" },
    { name: "Max Sharpe", x: strategies["Max Sharpe"].constrained.metrics.volatility, y: strategies["Max Sharpe"].constrained.metrics.return, color: "#2980b9" },
    { name: "HRP", x: strategies["HRP"].unconstrained.metrics.volatility, y: strategies["HRP"].unconstrained.metrics.return, color: "#8e44ad" },
  ];

  return (
    <div className="diag-card" style={{ marginTop: '20px' }}>
      <h4>Efficient Frontier Map</h4>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <XAxis type="number" dataKey="x" name="Volatility" unit="%" domain={['auto', 'auto']} label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -10 }} />
            <YAxis type="number" dataKey="y" name="Return" unit="%" domain={['auto', 'auto']} label={{ value: 'Return', angle: -90, position: 'insideLeft' }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Possible Portfolios" data={cloudData} fill="#e0e0e0" shape="circle" />
            {strategyPoints.map((point, index) => (
              <Scatter key={index} name={point.name} data={[point]} fill={point.color} shape="star" s={200}><Cell key={`cell-${index}`} fill={point.color} /></Scatter>
            ))}
            <Legend />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const DrawdownChart = ({ data, color }) => {
  if (!data || data.length === 0) return null;
  return (
    <div className="diag-card" style={{ marginTop: '20px' }}>
      <h4>Underwater Plot (Drawdowns)</h4>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id={`splitColor${color}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/><stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis hide domain={['auto', 0]} />
            <Tooltip contentStyle={{backgroundColor: '#fff', border:'1px solid #ddd'}} formatter={(val) => [`${Number(val).toFixed(2)}%`, 'Drawdown']} labelStyle={{color: '#888'}} />
            <ReferenceLine y={0} stroke="#000" />
            <Area type="monotone" dataKey="value" stroke={color} fill={`url(#splitColor${color})`} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="diag-note">Shows the % decline from the previous all-time high.</div>
    </div>
  );
};