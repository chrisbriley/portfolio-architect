import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import RiskScatter from './RiskScatter';
import UnderwaterPlot from './UnderwaterPlot';
import { InfoTooltip } from './Shared';

const Sparkline = ({ data, min, max }) => (
    <svg width="80" height="25" style={{overflow:'visible', verticalAlign:'middle'}}>
        <path 
            d={`M 0 ${25 - (data[0] - min) / (max - min || 1) * 25} ` + data.map((d, i) => `L ${i * (80/(data.length-1))} ${25 - (d - min) / (max - min || 1) * 25}`).join(' ')}
            fill="none" 
            stroke={data[data.length-1] >= 100 ? "#27ae60" : "#e74c3c"} 
            strokeWidth="1.5" 
        />
        <circle cx="80" cy={25 - (data[data.length-1] - min) / (max - min || 1) * 25} r="2" fill={data[data.length-1] >= 100 ? "#27ae60" : "#e74c3c"} />
    </svg>
);

const ModernStrategyCard = ({ title, data, color, sparklines, lookback, assetNames, currentPrices }) => {
    if (!data) return null;
    const { metrics, allocation, history, drawdowns, risk_decomposition } = data;

    // Calculate global min/max for sparklines normalization
    let globalMin = 0;
    let globalMax = 0;
    if (sparklines) {
        const allValues = Object.values(sparklines).flat();
        if (allValues.length > 0) {
            globalMin = Math.min(...allValues);
            globalMax = Math.max(...allValues);
        }
    }

    // Calculate Net Exposure
    const totalWeight = Object.values(allocation).reduce((sum, w) => sum + w, 0);

    return (
        <div className="strategy-card" style={{borderTop: `4px solid ${color}`}}>
            <div className="card-header">
                <h2>{title}</h2>
                <div className="metrics-grid">
                    <div className="metric">
                        <span className="label">Return</span>
                        <span className="value">{metrics.return}%</span>
                    </div>
                    <div className="metric">
                        <span className="label">Sharpe</span>
                        <span className="value">{metrics.sharpe}</span>
                    </div>
                    <div className="metric">
                        <span className="label">Vol</span>
                        <span className="value">{metrics.volatility}%</span>
                    </div>
                    <div className="metric">
                        <span className="label">VaR (95%)</span>
                        <span className="value" style={{color:'#e74c3c'}}>{metrics.var}%</span>
                    </div>
                    <div className="metric">
                        <span className="label">Beta</span>
                        <span className="value">{metrics.beta}</span>
                    </div>
                    <div className="metric">
                        <span className="label">Corr Var</span>
                        <span className="value">{metrics.corr_var}</span>
                    </div>
                    <div className="metric">
                        <span className="label">Lev %</span>
                        <span className="value">{metrics.leverage || 100}%</span>
                    </div>
                </div>
            </div>

            <div className="card-body" style={{padding:'20px'}}>
                <div className="viz-row" style={{display:'flex', gap:'30px', marginBottom:'30px', flexWrap:'wrap'}}>
                    {/* Allocation Table with Sparklines */}
                    <div className="allocation-table-container" style={{flex:1, minWidth:'300px'}}>
                        <h4 style={{color:'#7f8c8d', marginBottom:'10px', fontSize:'0.9rem'}}>Allocation Schedule</h4>
                        <table className="allocation-table" style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead>
                                <tr style={{borderBottom:'1px solid #eee', textAlign:'left', fontSize:'0.8rem', color:'#95a5a6'}}>
                                    <th style={{paddingBottom:'8px'}}>Ticker</th>
                                    <th style={{paddingBottom:'8px'}}>Price</th>
                                    <th style={{paddingBottom:'8px'}}>Weight</th>
                                    <th style={{paddingBottom:'8px', textAlign:'right'}}>Trend ({lookback || 30}d)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(allocation)
                                    .sort(([,a], [,b]) => b - a)
                                    .map(([ticker, weight]) => (
                                    <tr key={ticker} style={{borderBottom:'1px solid #f9f9f9'}}>
                                        <td style={{padding:'8px 0', fontWeight:'600', color:'#2c3e50'}}>
                                            <InfoTooltip text={(assetNames && assetNames[ticker]) || ticker}>
                                                {ticker}
                                            </InfoTooltip>
                                        </td>
                                        <td style={{padding:'8px 0', color:'#7f8c8d'}}>
                                            {currentPrices && currentPrices[ticker] ? `$${currentPrices[ticker]}` : '-'}
                                        </td>
                                        <td style={{padding:'8px 0'}}>{weight}%</td>
                                        <td style={{padding:'8px 0', textAlign:'right'}}>
                                            {sparklines && sparklines[ticker] && (
                                                <div style={{display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'8px'}}>
                                                    <Sparkline data={sparklines[ticker]} min={globalMin} max={globalMax} />
                                                    <span style={{fontSize:'0.85rem', fontWeight:'600', color: sparklines[ticker][sparklines[ticker].length-1] >= 100 ? '#27ae60' : '#e74c3c', minWidth:'30px'}}>
                                                        {Math.round(sparklines[ticker][sparklines[ticker].length-1])}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                <tr style={{borderTop:'2px solid #eee', fontWeight:'bold', backgroundColor:'#fafafa'}}>
                                    <td style={{padding:'12px 0', color:'#2c3e50'}}>Net Exposure</td>
                                    <td></td>
                                    <td style={{padding:'12px 0'}}>{Math.round(totalWeight)}%</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Risk Scatter */}
                    <div className="risk-chart-container" style={{flex:1, minWidth:'300px'}}>
                        <RiskScatter data={risk_decomposition} />
                    </div>
                </div>

                {/* Performance Charts */}
                <div className="charts-row" style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    <div style={{flex:1, minWidth:'300px'}}><UnderwaterPlot data={drawdowns} color={color} /></div>
                </div>
            </div>
        </div>
    );
};

export default ModernStrategyCard;