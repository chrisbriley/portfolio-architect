import time
import logging
import numpy as np
import pandas as pd
from portfolio_lib.optimizers import (
    find_optimal_allocations, 
    calculate_metrics, 
    get_portfolio_history, 
    get_risk_contribution, 
    calculate_historical_var
)
from portfolio_lib.visuals import generate_dendrogram_image, generate_efficient_frontier
from portfolio_lib.data import MarketDataProvider
from services.schemas import OptimizeRequest

logger = logging.getLogger(__name__)

class PortfolioService:
    def __init__(self, data_provider=None):
        self.data_provider = data_provider or MarketDataProvider()

    def optimize_portfolio(self, data: dict):
        start_total = time.time()
        
        # 0. Request Validation
        try:
            req = OptimizeRequest(**data)
        except Exception as e:
            logger.error(f"Validation error for tickers {data.get('tickers')}: {e}")
            return {"error": str(e)}, 400

        tickers = req.tickers
        min_w = req.min_weight / 100.0
        max_w = req.max_weight / 100.0
        target_mode = req.target_mode
        
        if req.target_value > 0:
            if target_mode == 'volatility':
                target_value = req.target_value / 100.0
            else:
                target_value = req.target_value
        else:
            target_value = None

        logger.info(f"Optimizing portfolio for tickers: {tickers} (mode: {target_mode})")

        rf_rate = self.data_provider.get_risk_free_rate()
        
        benchmark_tickers = ["SPY", "BND", "GLD", "SHY", "TLT"]
        all_tickers = list(set(tickers + benchmark_tickers))
        
        try:
            all_prices = self.data_provider.fetch_prices(all_tickers, period="3y")
        except Exception as e:
            logger.error(f"Error fetching prices: {e}")
            return {"error": "Failed to fetch market data."}, 500
        
        valid_tickers = [t for t in tickers if t in all_prices.columns]
        if len(valid_tickers) < 2:
            logger.warning(f"Insufficient valid tickers: {valid_tickers}")
            return {"error": "Need 2+ valid tickers."}, 400
        
        prices = all_prices[valid_tickers].dropna()
        if prices.shape[0] < 30:
            logger.warning(f"Insufficient history for tickers {valid_tickers}: {prices.shape[0]} days")
            return {"error": "Insufficient history."}, 400
        
        asset_names = self.data_provider.get_asset_names(valid_tickers)

        spy_rets = None
        if "SPY" in all_prices.columns:
            spy_rets = all_prices["SPY"].pct_change().dropna()

        # 1. Main Optimization
        try:
            result = find_optimal_allocations(prices, min_w, max_w, rf_rate, spy_rets, target_value, target_mode)
        except Exception as e:
            logger.error(f"Optimization failed: {e}")
            return {"error": "Optimization engine error."}, 500
        
        # 2. Visuals
        dendrogram_b64 = generate_dendrogram_image(result['debug_cov'])
        frontier_cloud = generate_efficient_frontier(result['debug_mean'], result['debug_cov'])

        # 3. Benchmarks
        benchmarks = self._get_benchmark_data(benchmark_tickers, all_prices, prices.index, rf_rate)

        # 4. Recent Prices
        sparklines = {}
        recent = prices.tail(result['lookback_days'])
        for col in recent.columns:
            vals = recent[col].values
            if len(vals) > 0:
                norm = (vals / vals[0]) * 100
                sparklines[col] = np.round(norm, 2).tolist()
        
        current_prices = {col: round(prices[col].iloc[-1], 2) for col in prices.columns}

        # 5. Format Strategies
        formatted = {}
        t_list = list(prices.columns)
        for s_name, s_data in result['strategies'].items():
            formatted[s_name] = {}
            for mode in ['unconstrained', 'constrained']:
                formatted[s_name][mode] = {
                    "allocation": {t: round(w*100, 1) for t, w in zip(t_list, s_data[mode]['weights'])},
                    "metrics": {
                        "return": round(s_data[mode]['metrics']['return']*100, 1),
                        "sharpe": round(s_data[mode]['metrics']['sharpe'], 2),
                        "volatility": round(s_data[mode]['metrics']['volatility']*100, 1),
                        "var": s_data[mode]['metrics']['var'],
                        "beta": round(s_data[mode]['metrics']['beta'], 2),
                        "corr_var": round(s_data[mode]['metrics']['corr_var'], 2)
                    },
                    "history": s_data[mode]['history'],
                    "drawdowns": s_data[mode]['drawdowns'],
                    "risk_decomposition": s_data[mode]['risk_decomposition']
                }

        logger.info(f"Optimization complete in {time.time() - start_total:.2f}s")
        return {
            "status": "success",
            "meta": {
                "lookback": result['lookback_days'], 
                "shrinkage": round(result['shrinkage'], 4),
                "diagnostics": {"correlation": result['correlation']},
                "dendrogram": dendrogram_b64,
                "frontier": frontier_cloud
            },
            "sparklines": sparklines,
            "current_prices": current_prices,
            "strategies": formatted,
            "benchmarks": benchmarks,
            "asset_names": asset_names
        }, 200

    def _get_benchmark_data(self, benchmark_tickers, all_prices, index, rf_rate):
        valid_bench = [b for b in benchmark_tickers if b in all_prices.columns]
        if not valid_bench: return {}
        b_subset = all_prices[valid_bench].reindex(index).ffill().dropna()
        if b_subset.empty: return {}
        r = b_subset.pct_change().dropna()
        b_cov = r.cov()
        b_defs = {"60/40": {"SPY":0.6, "BND":0.4}, "Permanent": {"SPY":0.25, "TLT":0.25, "GLD":0.25, "SHY":0.25}}
        b_out = {}
        for name, w_dict in b_defs.items():
            w_s = pd.Series(0.0, index=r.columns)
            for k,v in w_dict.items(): 
                if k in r.columns: w_s[k] = v
            if w_s.sum() > 0: w_s /= w_s.sum()
            ret, vol, sha = calculate_metrics(w_s, r.mean(), b_cov, rf_rate)
            hist, drawdowns = get_portfolio_history(w_s, r)
            b_var = calculate_historical_var(w_s, r)
            active = w_s[w_s > 0].index.tolist()
            w_active = w_s[active].values
            cov_slice = b_cov.loc[active, active]
            rc = get_risk_contribution(w_active, cov_slice)
            risk_data = {"tickers": active, "weights": np.round(w_active * 100, 1).tolist(), "risk_contribution": np.round(rc * 100, 1).tolist()}
            b_out[name] = {
                "return": round(ret*100,1), 
                "volatility": round(vol*100,1), 
                "sharpe": round(sha,2), 
                "var": b_var,
                "allocation": {k:v*100 for k,v in w_dict.items()}, 
                "history": hist, 
                "drawdowns": drawdowns, 
                "risk_decomposition": risk_data
            }
        return b_out
