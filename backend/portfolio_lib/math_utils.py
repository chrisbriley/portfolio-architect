import numpy as np
import pandas as pd
from sklearn.covariance import LedoitWolf

def get_shrunk_covariance(returns_df):
    lw = LedoitWolf()
    lw.fit(returns_df)
    return pd.DataFrame(
        lw.covariance_, 
        index=returns_df.columns, 
        columns=returns_df.columns
    ), lw.shrinkage_

def get_ewma_means(returns_df, span):
    return returns_df.ewm(span=span).mean().iloc[-1]

def calculate_metrics(weights, mean_returns, cov_matrix, rf_rate=0.0):
    weights = np.array(weights)
    ret = np.sum(mean_returns * weights) * 252
    vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    effective_vol = max(vol, 0.05)
    excess_ret = ret - rf_rate
    sharpe = excess_ret / effective_vol
    return ret, vol, sharpe

def apply_target_volatility(weights, cov_matrix, target_vol=None):
    if target_vol is None: return weights
    current_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
    if current_vol == 0: return weights
    leverage = target_vol / current_vol
    leverage = min(leverage, 3.0)
    return weights * leverage

def get_portfolio_history(weights, returns_df):
    daily_rets = returns_df.dot(weights)
    cum_returns = (1 + daily_rets).cumprod()
    
    history_list = [{"date": (returns_df.index[0] - pd.Timedelta(days=1)).strftime('%Y-%m-%d'), "value": 100.0}]
    for date, val in (cum_returns * 100).items():
        history_list.append({"date": date.strftime('%Y-%m-%d'), "value": round(val, 2)})
        
    running_max = cum_returns.cummax()
    drawdown = (cum_returns - running_max) / running_max
    drawdown_list = [{"date": (returns_df.index[0] - pd.Timedelta(days=1)).strftime('%Y-%m-%d'), "value": 0.0}]
    for date, val in (drawdown * 100).items():
        drawdown_list.append({"date": date.strftime('%Y-%m-%d'), "value": round(val, 2)})
        
    return history_list, drawdown_list

def get_risk_contribution(weights, cov_matrix):
    weights = np.array(weights)
    port_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
    if port_vol == 0: return np.zeros_like(weights)
    mcr = np.dot(cov_matrix, weights) / port_vol
    rc = weights * mcr
    return rc / port_vol

# --- THIS IS THE MISSING PIECE ---
def calculate_historical_var(weights, returns_df, confidence_level=0.95):
    """Calculates 95% Historical Value at Risk."""
    daily_rets = returns_df.dot(weights)
    cutoff = (1.0 - confidence_level) * 100
    var_value = np.percentile(daily_rets, cutoff)
    # Return as positive percentage (e.g. 2.5)
    return round(abs(var_value) * 100, 2)

def apply_target_var(weights, returns_df, target_var_percent=None):
    """
    Scales weights to hit a specific 95% Daily VaR target.
    Target VaR should be a positive number (e.g., 1.5 for 1.5% loss).
    """
    if target_var_percent is None or target_var_percent <= 0: return weights
    
    # 1. Calculate Current Unlevered VaR
    # We use the full history to be robust
    daily_rets = returns_df.dot(weights)
    cutoff = (1.0 - 0.95) * 100
    current_var_value = np.percentile(daily_rets, cutoff)
    current_var_percent = abs(current_var_value) * 100
    
    if current_var_percent == 0: return weights
    
    # 2. Calculate Leverage Ratio
    # If current VaR is 0.5% and Target is 1.5%, leverage = 3.0x
    leverage = target_var_percent / current_var_percent
    
    # Cap leverage for safety (e.g., 4x max)
    leverage = min(leverage, 4.0)
    
    return weights * leverage