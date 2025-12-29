import React from 'react';

const DiagnosisHeader = ({ lookback, shrinkage }) => {
  const getRegimeDiagnosis = (lookback, shrinkage) => {
    let timeframe = lookback >= 252 ? "Long-term trends are stable." : (lookback >= 126 ? "Medium-term trends are dominant." : "Recent shifts have made history obsolete.");
    let dataQuality = shrinkage < 0.2 ? "Correlations are clear." : (shrinkage < 0.5 ? "Market noise is moderate." : "Market is chaotic/highly correlated.");
    let action = shrinkage < 0.5 ? "High confidence." : "Aggressive dampening applied.";
    return {
      title: lookback >= 252 ? "Stable Regime" : "Transitional Regime",
      description: `${timeframe} ${dataQuality}`,
      implication: action,
      isStable: lookback >= 252 && shrinkage < 0.5
    };
  };

  const diagnosis = getRegimeDiagnosis(lookback, shrinkage);

  // Logic for picking the recommended strategy string
  let recommended = "Max Sharpe";
  if (shrinkage > 0.4) recommended = "HRP (Unconstrained Only)";
  else if (lookback < 252) recommended = "Risk Parity";

  return (
    <div className="diagnosis-card" style={{borderLeftColor: diagnosis.isStable ? '#27ae60' : '#f39c12'}}>
      <div className="diagnosis-header">
        <span className="diagnosis-icon">{diagnosis.isStable ? "🌊" : "⚠️"}</span>
        <div>
          <strong>Market Diagnosis: {diagnosis.title}</strong>
          <div className="diagnosis-sub">Based on {lookback} day lookback & {shrinkage} shrinkage</div>
        </div>
      </div>
      <div className="diagnosis-body">
        <p>{diagnosis.description}</p>
        <p className="diagnosis-action"><strong>Context:</strong> {diagnosis.implication} <br/> <strong>Top Pick:</strong> {recommended}</p>
      </div>
    </div>
  );
};

export default DiagnosisHeader;