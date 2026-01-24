import React, { useState } from 'react';
import { InfoTooltip } from './Shared';

const CorrelationHeatmap = ({ correlationData, assetNames, shrinkage }) => {
    const [view, setView] = useState('shrunk');
    if (!correlationData) return null;

    const { shrunk, raw } = correlationData;
    const data = view === 'shrunk' ? shrunk : raw;
    const { tickers, matrix } = data;
    
    const getColor = (val) => {
        // Red for positive (correlated), Green for negative (inverse)
        if (val >= 0) return `rgba(231, 76, 60, ${val})`; // #e74c3c (Red)
        return `rgba(46, 204, 113, ${Math.abs(val)})`; // #2ecc71 (Green)
    };

    // Helper to calculate average correlation for a row (excluding self)
    const getAvgCorrelation = (rowIndex) => {
        const row = matrix[rowIndex];
        if (row.length < 2) return 1.0;
        // Sum of row minus 1.0 (self-correlation)
        const sum = row.reduce((a, b) => a + b, 0);
        return (sum - 1) / (row.length - 1);
    };

    return (
        <div className="diag-card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h4>Correlation Matrix</h4>
                <div className="view-toggle">
                    <button 
                        onClick={() => setView('shrunk')} 
                        className={view === 'shrunk' ? 'active' : ''}
                    >Shrunk</button>
                    <button 
                        onClick={() => setView('raw')} 
                        className={view === 'raw' ? 'active' : ''}
                    >Raw</button>
                </div>
            </div>

            <div className="heatmap-grid" style={{
                gridTemplateColumns: `auto repeat(${tickers.length}, 1fr)`
            }}>
                {/* Top Left Corner */}
                <div className="hm-header" style={{fontSize:'0.7rem', color:'#95a5a6'}}>Avg</div>
                
                {/* Column Headers */}
                {tickers.map(t => (
                    <div key={t} className="hm-header">
                        <InfoTooltip text={(assetNames && assetNames[t]) || t}>
                            {t}
                        </InfoTooltip>
                    </div>
                ))}

                {/* Rows */}
                {matrix.map((row, i) => {
                    const avg = getAvgCorrelation(i);
                    return (
                        <React.Fragment key={i}>
                            <div className="hm-row-header" style={{justifyContent:'space-between', gap:'10px'}}>
                                <span style={{fontSize:'0.7rem', color: avg > 0.7 ? '#e74c3c' : '#95a5a6', fontWeight:'bold', minWidth:'25px', textAlign:'right'}}>
                                    {avg.toFixed(2)}
                                </span>
                                <InfoTooltip text={(assetNames && assetNames[tickers[i]]) || tickers[i]}>
                                    {tickers[i]}
                                </InfoTooltip>
                            </div>
                            {row.map((val, j) => (
                                <div key={j} className="hm-cell" style={{
                                    backgroundColor: getColor(val),
                                    color: Math.abs(val) > 0.6 ? 'white' : '#2c3e50'
                                }} title={`${(assetNames && assetNames[tickers[i]]) || tickers[i]} vs ${(assetNames && assetNames[tickers[j]]) || tickers[j]}: ${val}`}>
                                    {val.toFixed(2)}
                                </div>
                            ))}
                        </React.Fragment>
                    );
                })}
            </div>
            <div className="diag-note" style={{marginTop:'20px'}}>
                <strong>Avg:</strong> Average correlation with other assets. &gt;0.7 indicates high redundancy.
                <br />
                {view === 'shrunk'
                    ? `Showing SHRUNK correlations. Raw data was adjusted by ${(shrinkage * 100).toFixed(1)}% towards a stable target to reduce noise.`
                    : 'Showing RAW historical correlations. This data may be noisy and is not used in optimizations.'
                }
            </div>
        </div>
    );
};

export default CorrelationHeatmap;