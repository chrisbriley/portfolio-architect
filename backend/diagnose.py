import time
import yfinance as yf
import pandas as pd
import numpy as np
from portfolio_lib.optimizers import find_optimal_allocations

def run_diagnostic():
    print("--- Starting Diagnostic Run (25 Tickers) ---")
    
    # 1. Define 25 Tickers (Mix of sectors/assets)
    tickers = [
        "AAPL", "MSFT", "GOOG", "AMZN", "NVDA", "TSLA", "META", "BRK-B", "V", "JNJ",
        "WMT", "JPM", "PG", "MA", "UNH", "HD", "CVX", "MRK", "ABBV", "PEP",
        "KO", "LLY", "BAC", "AVGO", "COST"
    ]
    
    # 2. Test Download Speed
    print(f"Downloading data for {len(tickers)} tickers...")
    t0 = time.time()
    raw = yf.download(tickers, period="3y", auto_adjust=True, progress=True)
    print(f"Download took: {time.time() - t0:.2f}s")
    
    try: 
        prices = raw['Close'] if 'Close' in raw.columns and isinstance(raw.columns, pd.MultiIndex) else raw['Close']
    except: 
        prices = raw
    
    prices = prices.dropna()
    print(f"Data shape: {prices.shape}")
    
    # 3. Test Optimization Speed
    print("Running Optimization...")
    t1 = time.time()
    try:
        # Using default params from app
        find_optimal_allocations(prices, min_w=0.0, max_w=1.0, rf_rate=0.045)
        print(f"Optimization took: {time.time() - t1:.2f}s")
        print("✅ Optimization Successful")
    except Exception as e:
        print(f"❌ Optimization Failed: {e}")

if __name__ == "__main__":
    run_diagnostic()