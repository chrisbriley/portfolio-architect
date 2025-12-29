from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from portfolio_lib.optimizers import find_optimal_allocations, calculate_metrics, get_portfolio_history, get_risk_contribution, calculate_historical_var
from portfolio_lib.visuals import generate_dendrogram_image, generate_efficient_frontier

app = Flask(__name__)
CORS(app)

def get_risk_free_rate():
    try:
        ticker = yf.Ticker("^IRX")
        hist = ticker.history(period="5d")
        if hist.empty: return 0.045
        return hist['Close'].iloc[-1] / 100.0
    except: return 0.045

@app.route('/')
def home():
    return "Portfolio Optimizer API is running. Please use the frontend application."

@app.route('/api/optimize', methods=['POST'])
def optimize_portfolio():
    try:
        data = request.json
        tickers = data.get('tickers', [])
        min_w = float(data.get('min_weight', 0)) / 100.0
        max_w = float(data.get('max_weight', 100)) / 100.0
        target_mode = data.get('target_mode', 'volatility') # 'volatility' or 'var'
        target_val_input = float(data.get('target_value', 0))
        target_vol_input = float(data.get('target_volatility', 0))
        target_vol = target_vol_input / 100.0 if target_vol_input > 0 else None

        if not tickers or len(tickers) < 2: return jsonify({"error": "Need 2+ tickers."}), 400

        if target_val_input > 0:
            if target_mode == 'volatility':
                target_value = target_val_input / 100.0 # Annual Vol (15 -> 0.15)
            else:
                target_value = target_val_input # Daily VaR (Keep as 1.5 for the math function)
        else:
            target_value = None

        rf_rate = get_risk_free_rate()
        print(f"Risk Free Rate: {rf_rate*100:.2f}%")

        # Optimization: Download User Tickers AND Benchmarks together to save time
        benchmark_tickers = ["SPY", "BND", "GLD", "SHY", "TLT"]
        all_tickers = list(set(tickers + benchmark_tickers))
        
        raw = yf.download(all_tickers, period="3y", auto_adjust=True)
        try: all_prices = raw['Close'] if 'Close' in raw.columns and isinstance(raw.columns, pd.MultiIndex) else raw['Close']
        except: all_prices = raw
        
        valid_tickers = [t for t in tickers if t in all_prices.columns]
        if len(valid_tickers) < 2: return jsonify({"error": "Need 2+ valid tickers."}), 400
        
        prices = all_prices[valid_tickers].dropna()
        if prices.shape[0] < 30: return jsonify({"error": "Insufficient history."}), 400

        # 1. Main Optimization
        result = find_optimal_allocations(prices, min_w, max_w, rf_rate, target_value, target_mode)

        # 2. Visuals
        dendrogram_b64 = generate_dendrogram_image(result['debug_cov'])
        frontier_cloud = generate_efficient_frontier(result['debug_mean'], result['debug_cov'])

        # 3. Benchmarks
        benchmarks = {}
        def get_benchmark_data():
            valid_bench = [b for b in benchmark_tickers if b in all_prices.columns]
            if not valid_bench: return {}
            b_subset = all_prices[valid_bench].reindex(prices.index).ffill().dropna()
            if b_subset.empty: return {}
            r = b_subset.pct_change().dropna()
            b_cov = r.cov()
            b_defs = {"60/40": {"SPY":0.6, "BND":0.4}, "Permanent": {"SPY":0.25, "TLT":0.25, "GLD":0.25, "SHY":0.25}}
            b_out = {}
            for name, w_dict in b_defs.items():
                w_s = pd.Series(0, index=r.columns)
                for k,v in w_dict.items(): 
                    if k in r.columns: w_s[k] = v
                if w_s.sum() > 0: w_s /= w_s.sum()
                ret, vol, sha = calculate_metrics(w_s, r.mean(), b_cov, rf_rate)
                hist, drawdowns = get_portfolio_history(w_s, r)
                
                # NEW: Calculate Benchmark VaR
                b_var = calculate_historical_var(w_s, r)

                # Risk Decomp
                active = w_s[w_s > 0].index.tolist()
                w_active = w_s[active].values
                cov_slice = b_cov.loc[active, active]
                rc = get_risk_contribution(w_active, cov_slice)
                risk_data = {"tickers": active, "weights": np.round(w_active * 100, 1).tolist(), "risk_contribution": np.round(rc * 100, 1).tolist()}
                
                b_out[name] = {
                    "return": round(ret*100,1), 
                    "volatility": round(vol*100,1), 
                    "sharpe": round(sha,2), 
                    "var": b_var, # Pass Benchmark VaR
                    "allocation": {k:v*100 for k,v in w_dict.items()}, 
                    "history": hist, 
                    "drawdowns": drawdowns, 
                    "risk_decomposition": risk_data
                }
            return b_out
            
        benchmarks = get_benchmark_data()

        # 4. Recent Prices
        last_prices = []
        for date, row in prices.tail(5).sort_index(ascending=False).iterrows():
            row_dict = {"date": date.strftime('%Y-%m-%d')}
            row_dict.update({k: round(v, 2) for k, v in row.items()})
            last_prices.append(row_dict)

        # 5. Format Strategies (CRITICAL FIX HERE)
        formatted = {}
        t_list = list(prices.columns)
        for s_name, s_data in result['strategies'].items():
            formatted[s_name] = {}
            # Simplified Rebalance check
            # For simplicity, calculate rebalance for constrained only, apply to top level
            # In production, move rebalance calculation outside this loop or keep it separate
            
            for mode in ['unconstrained', 'constrained']:
                formatted[s_name][mode] = {
                    "allocation": {t: round(w*100, 1) for t, w in zip(t_list, s_data[mode]['weights'])},
                    "metrics": {
                        "return": round(s_data[mode]['metrics']['return']*100, 1),
                        "sharpe": round(s_data[mode]['metrics']['sharpe'], 2),
                        "volatility": round(s_data[mode]['metrics']['volatility']*100, 1),
                        "var": s_data[mode]['metrics']['var'] # <--- THIS WAS MISSING
                    },
                    "history": s_data[mode]['history'],
                    "drawdowns": s_data[mode]['drawdowns'],
                    "risk_decomposition": s_data[mode]['risk_decomposition']
                }

        return jsonify({
            "status": "success",
            "meta": {
                "lookback": result['lookback_days'], 
                "shrinkage": round(result['shrinkage'], 4),
                "diagnostics": {"correlation": result['correlation']},
                "dendrogram": dendrogram_b64,
                "frontier": frontier_cloud
            },
            "recent_prices": last_prices,
            "strategies": formatted,
            "benchmarks": benchmarks
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)