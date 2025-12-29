import yfinance as yf
import pandas as pd

def get_risk_free_rate():
    """Fetches the current 13-week Treasury Bill rate (^IRX)."""
    try:
        ticker = yf.Ticker("^IRX")
        hist = ticker.history(period="5d")
        if hist.empty: return 0.045
        return hist['Close'].iloc[-1] / 100.0
    except: return 0.045

def fetch_market_data(tickers, period="3y"):
    """Robust data fetching with error handling."""
    raw = yf.download(tickers, period=period, progress=False, auto_adjust=True)
    try:
        # Handle MultiIndex columns if multiple tickers are returned
        prices = raw['Close'] if 'Close' in raw.columns and isinstance(raw.columns, pd.MultiIndex) else raw['Close']
    except:
        prices = raw
    
    # Cleaning
    prices = prices.dropna()
    return prices