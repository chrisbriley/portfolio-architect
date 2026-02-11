import yfinance as yf
import pandas as pd

class MarketDataProvider:
    def __init__(self):
        self._name_cache = {}

    def get_risk_free_rate(self):
        """Fetches the current 13-week Treasury Bill rate (^IRX)."""
        try:
            ticker = yf.Ticker("^IRX")
            hist = ticker.history(period="5d")
            if hist.empty: return 0.045
            return hist['Close'].iloc[-1] / 100.0
        except Exception:
            return 0.045

    def fetch_prices(self, tickers, period="3y"):
        """Robust data fetching with error handling."""
        raw = yf.download(tickers, period=period, progress=False, auto_adjust=True)
        try:
            # Handle MultiIndex columns if multiple tickers are returned
            prices = raw['Close'] if 'Close' in raw.columns and isinstance(raw.columns, pd.MultiIndex) else raw['Close']
        except Exception:
            prices = raw
        
        # Cleaning
        prices = prices.dropna()
        return prices

    def get_asset_names(self, tickers):
        """Fetches long names for tickers with caching."""
        asset_names = {}
        for t in tickers:
            if t in self._name_cache:
                asset_names[t] = self._name_cache[t]
            else:
                try:
                    name = yf.Ticker(t).info.get('longName', t)
                    asset_names[t] = name
                    self._name_cache[t] = name
                except Exception:
                    asset_names[t] = t
        return asset_names

# Functional interface for backward compatibility
_provider = MarketDataProvider()

def get_risk_free_rate():
    return _provider.get_risk_free_rate()

def fetch_market_data(tickers, period="3y"):
    return _provider.fetch_prices(tickers, period)
