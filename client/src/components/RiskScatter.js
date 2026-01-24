import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const RiskScatter = ({ data }) => {
    // data: { tickers: [], weights: [], risk_contribution: [] }
    const scatterData = data.tickers.map((t, i) => ({
        ticker: t,
        x: data.weights[i],
        y: data.risk_contribution[i]
    }));

    return (
        <div style={{height: '300px', width: '100%'}}>
            <h4 style={{textAlign:'center', margin:'0 0 10px 0', color:'#7f8c8d', fontSize:'0.9rem'}}>Risk Efficiency (Weight vs Risk)</h4>
            <ResponsiveContainer>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid />
                    <XAxis type="number" dataKey="x" name="Weight" unit="%" label={{ value: 'Weight %', position: 'insideBottom', offset: -10 }} />
                    <YAxis type="number" dataKey="y" name="Risk Contrib" unit="%" label={{ value: 'Risk Contrib %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({active, payload}) => {
                        if (active && payload && payload.length) {
                            const d = payload[0].payload;
                            return (
                                <div style={{background:'white', padding:'10px', border:'1px solid #ccc', borderRadius:'4px'}}>
                                    <strong>{d.ticker}</strong><br/>
                                    Weight: {d.x}%<br/>
                                    Risk: {d.y}%
                                </div>
                            );
                        }
                        return null;
                    }} />
                    <Scatter data={scatterData} fill="#8884d8">
                        {scatterData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.x > entry.y ? '#27ae60' : '#e74c3c'} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>
            <div style={{textAlign:'center', fontSize:'0.75rem', color:'#7f8c8d'}}>
                Green: Weight {'>'} Risk (Efficient) • Red: Risk {'>'} Weight (Inefficient)
            </div>
        </div>
    );
};

export default RiskScatter;