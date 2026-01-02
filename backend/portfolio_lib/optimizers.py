import numpy as np
import pandas as pd
import time
from scipy.optimize import minimize
import scipy.cluster.hierarchy as sch
from scipy.spatial.distance import squareform
from .math_utils import (
    get_shrunk_covariance, get_ewma_means, calculate_metrics, 
    get_portfolio_history, get_risk_contribution, apply_target_volatility,
    calculate_historical_var, apply_target_var
)

def run_risk_parity(cov_matrix, min_w=0.0, max_w=1.0):
    cov_scaled = cov_matrix * 252
    n = cov_scaled.shape[0]
    initial_weights = np.ones(n) / n
    def objective(w):
        w = np.array(w)
        p_vol = np.sqrt(np.dot(w.T, np.dot(cov_scaled, w)))
        rc = w * (np.dot(cov_scaled, w) / p_vol)
        target = p_vol / n
        return np.sum(np.square(rc - target)) * 1000
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((min_w, max_w) for _ in range(n))
    try:
        res = minimize(objective, initial_weights, method='SLSQP', bounds=bounds, constraints=constraints, tol=1e-4)
        return res.x
    except: return initial_weights

def run_max_sharpe(mean_rets, cov_matrix, rf_rate, min_w=0.0, max_w=1.0, tol=1e-6):
    n = len(mean_rets)
    initial_weights = np.ones(n) / n
    def objective(w):
        w = np.array(w)
        ret = np.sum(mean_rets * w) * 252
        vol = np.sqrt(np.dot(w.T, np.dot(cov_matrix, w))) * np.sqrt(252)
        effective_vol = max(vol, 0.05)
        penalty = 0.5 * np.sum(w**2)
        excess_sharpe = (ret - rf_rate) / effective_vol
        return -excess_sharpe + penalty
    constraints = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((min_w, max_w) for _ in range(n))
    try:
        res = minimize(objective, initial_weights, method='SLSQP', bounds=bounds, constraints=constraints, tol=tol)
        return res.x
    except: return initial_weights

def run_hrp(cov_matrix):
    std_devs = np.sqrt(np.diag(cov_matrix))
    outer_v = np.outer(std_devs, std_devs)
    corr = (cov_matrix / outer_v).clip(-1, 1)
    dist = np.sqrt((1 - corr) / 2)
    link = sch.linkage(squareform(dist, checks=False), 'single')
    
    def get_ivp(cov):
        variances = np.diag(cov)
        floored_vars = np.maximum(variances, 1e-5)
        ivp = 1. / floored_vars
        return ivp / ivp.sum()

    def get_rec_bipart(cov, sort_ix):
        w = pd.Series(1.0, index=sort_ix); c_items = [sort_ix]
        while len(c_items) > 0:
            c_items = [i[j:k] for i in c_items for j, k in ((0, len(i) // 2), (len(i) // 2, len(i))) if len(i) > 1]
            for i in range(0, len(c_items), 2):
                c0 = c_items[i]; c1 = c_items[i + 1]
                w0 = get_ivp(cov.loc[c0, c0]); w1 = get_ivp(cov.loc[c1, c1])
                var0 = np.dot(np.dot(w0.T, cov.loc[c0, c0]), w0)
                var1 = np.dot(np.dot(w1.T, cov.loc[c1, c1]), w1)
                var0 = max(var0, 1e-5); var1 = max(var1, 1e-5)
                alpha = 1 - var0 / (var0 + var1)
                w[c0] *= alpha; w[c1] *= 1 - alpha
        return w

    def get_quasi_diag(link):
        link = link.astype(int)
        sort_ix = pd.Series([link[-1, 0], link[-1, 1]])
        num_items = link[-1, 3]
        while sort_ix.max() >= num_items:
            sort_ix.index = range(0, sort_ix.shape[0] * 2, 2)
            df0 = sort_ix[sort_ix >= num_items]
            i = df0.index; j = df0.values - num_items
            sort_ix[i] = link[j, 0]
            df0 = pd.Series(link[j, 1], index=i + 1)
            sort_ix = pd.concat([sort_ix, df0]).sort_index()
            sort_ix.index = range(sort_ix.shape[0])
        return sort_ix.tolist()

    sort_ix = get_quasi_diag(link)
    sort_ix = corr.index[sort_ix].tolist()
    hrp_weights = get_rec_bipart(cov_matrix, sort_ix)
    return hrp_weights[cov_matrix.columns].values

def find_optimal_allocations(prices, min_w, max_w, rf_rate, target_value=None, target_type="volatility"):
    windows = [63, 126, 252, 504]
    if len(prices) < 200: windows = [len(prices) - 5]
    best_score = -np.inf; best_window = 252; best_stats = {}

    t_regime = time.time()
    for w in windows:
        if w >= len(prices): continue
        recent = prices.iloc[-w:]
        rets = recent.pct_change().dropna()
        if rets.empty: continue
        
        t_w = time.time()
        cov, shrink = get_shrunk_covariance(rets)
        mean = get_ewma_means(rets, span=w)
        # Use a loose tolerance for the lookback search to improve speed
        w_ms = run_max_sharpe(mean, cov, rf_rate, tol=1e-3)
        _, _, score = calculate_metrics(w_ms, mean, cov, rf_rate)
        
        if score > best_score:
            best_score = score; best_window = w
            best_stats = {'returns': rets, 'mean': mean, 'cov': cov, 'shrink': shrink}
        print(f"  [Timing] Window {w}: {time.time() - t_w:.2f}s")
    print(f"[Timing] Regime Analysis: {time.time() - t_regime:.2f}s")
    
    if not best_stats: raise ValueError("Optimization failed")

    def bundle(w):
        w_final = w
        
        if target_value is not None and target_value > 0:
            if target_type == "volatility":
                # target_value is annual vol % (e.g. 0.15)
                w_final = apply_target_volatility(w, best_stats['cov'], target_value)
            elif target_type == "var":
                # target_value is daily VaR % (e.g. 1.5)
                w_final = apply_target_var(w, best_stats['returns'], target_value)


        r, v, s = calculate_metrics(w_final, best_stats['mean'], best_stats['cov'], rf_rate)
        rc = get_risk_contribution(w_final, best_stats['cov'])
        hist, drawdowns = get_portfolio_history(w_final, best_stats['returns'])
        
        # --- CALCULATE VAR ---
        var_95 = calculate_historical_var(w_final, best_stats['returns']) # <--- CALCULATION IS HERE
        
        risk_data = {"tickers": list(best_stats['cov'].columns), "weights": np.round(w_final * 100, 1).tolist(), "risk_contribution": np.round(rc * 100, 1).tolist()}
        
        return {
            "weights": w_final,
            "metrics": {
                "return": r, 
                "volatility": v, 
                "sharpe": s, 
                "var": var_95  # <--- PACKED INTO RESPONSE HERE
            },
            "history": hist,
            "drawdowns": drawdowns,
            "risk_decomposition": risk_data
        }

    t_strat = time.time()
    strategies = {
        "Risk Parity": {
            "unconstrained": bundle(run_risk_parity(best_stats['cov'])),
            "constrained": bundle(run_risk_parity(best_stats['cov'], min_w, max_w))
        },
        "Max Sharpe": {
            "unconstrained": bundle(run_max_sharpe(best_stats['mean'], best_stats['cov'], rf_rate)),
            "constrained": bundle(run_max_sharpe(best_stats['mean'], best_stats['cov'], rf_rate, min_w, max_w))
        },
        "HRP": {
            "unconstrained": bundle(run_hrp(best_stats['cov'])),
            "constrained": bundle(run_hrp(best_stats['cov']))
        }
    }
    print(f"[Timing] Strategy Calculation: {time.time() - t_strat:.2f}s")

    std = np.sqrt(np.diag(best_stats['cov']))
    corr_matrix = best_stats['cov'] / np.outer(std, std)
    corr_data = {"tickers": list(best_stats['cov'].columns), "matrix": np.round(corr_matrix.values, 2).tolist()}
    
    return {
        "lookback_days": int(best_window),
        "shrinkage": best_stats['shrink'],
        "strategies": strategies,
        "correlation": corr_data,
        "debug_cov": best_stats['cov'],
        "debug_mean": best_stats['mean']
    }