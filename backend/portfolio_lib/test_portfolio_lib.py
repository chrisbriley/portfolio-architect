import unittest
import numpy as np
import pandas as pd
import sys
import os
from unittest.mock import MagicMock, patch

# Ensure backend is in path to allow imports from portfolio_lib
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from portfolio_lib import math_utils, optimizers, visuals, data

class TestMathUtils(unittest.TestCase):
    def setUp(self):
        self.dates = pd.date_range(start='2023-01-01', periods=50)
        self.returns = pd.DataFrame(np.random.normal(0.001, 0.02, (50, 2)), index=self.dates, columns=['A', 'B'])
        self.weights = np.array([0.5, 0.5])
        self.cov_matrix = self.returns.cov()
        self.mean_returns = self.returns.mean()

    def test_calculate_metrics_zero_vol(self):
        """Test metrics calculation when volatility is effectively zero (e.g. cash)."""
        # Force covariance to zero
        zero_cov = pd.DataFrame(np.zeros((2, 2)), index=['A', 'B'], columns=['A', 'B'])
        ret, vol, sharpe = math_utils.calculate_metrics(self.weights, self.mean_returns, zero_cov, rf_rate=0.0)
        
        self.assertEqual(vol, 0.0)
        # Effective vol is clamped to 0.05 in the function to prevent division by zero
        expected_sharpe = (np.sum(self.mean_returns * self.weights) * 252) / 0.05
        self.assertAlmostEqual(sharpe, expected_sharpe)

    def test_calculate_beta_edge_cases(self):
        """Test Beta calculation with insufficient or constant data."""
        # 1. Empty benchmark
        beta = math_utils.calculate_beta(self.weights, self.returns, pd.Series(dtype=float))
        self.assertEqual(beta, 0.0)

        # 2. No overlapping dates between portfolio and benchmark
        future_dates = pd.date_range(start='2025-01-01', periods=50)
        benchmark = pd.Series(np.random.normal(0, 0.01, 50), index=future_dates)
        beta = math_utils.calculate_beta(self.weights, self.returns, benchmark)
        self.assertEqual(beta, 0.0)

        # 3. Constant benchmark (Variance = 0)
        const_benchmark = pd.Series(np.zeros(50), index=self.dates)
        beta = math_utils.calculate_beta(self.weights, self.returns, const_benchmark)
        self.assertEqual(beta, 0.0)

    def test_apply_target_volatility_zero_current(self):
        """Test target volatility scaling when current volatility is zero."""
        zero_cov = pd.DataFrame(np.zeros((2, 2)), index=['A', 'B'], columns=['A', 'B'])
        # Should return original weights to avoid division by zero
        new_weights = math_utils.apply_target_volatility(self.weights, zero_cov, target_vol=0.10)
        np.testing.assert_array_equal(new_weights, self.weights)

    def test_calculate_historical_var(self):
        """Test VaR calculation with deterministic returns."""
        # Create returns that are definitely -1% every day
        fixed_returns = pd.DataFrame(np.full((100, 2), -0.01), columns=['A', 'B'])
        # Portfolio return is -0.01 daily
        # 95% VaR of a constant -0.01 series is 0.01 (1%)
        var = math_utils.calculate_historical_var(self.weights, fixed_returns)
        self.assertEqual(var, 1.0)

class TestOptimizers(unittest.TestCase):
    def setUp(self):
        self.dates = pd.date_range(start='2023-01-01', periods=60)
        self.prices = pd.DataFrame(np.random.uniform(100, 200, (60, 3)), index=self.dates, columns=['X', 'Y', 'Z'])
        self.returns = self.prices.pct_change().dropna()
        self.cov = self.returns.cov()
        self.mean = self.returns.mean()

    def test_run_risk_parity_robustness(self):
        """Test Risk Parity with a zero-variance asset."""
        # Make asset Z constant (zero variance)
        cov_zero = self.cov.copy()
        cov_zero.loc['Z', :] = 0
        cov_zero.loc[:, 'Z'] = 0
        
        weights = optimizers.run_risk_parity(cov_zero)
        self.assertAlmostEqual(np.sum(weights), 1.0)
        # Should not contain NaNs
        self.assertFalse(np.isnan(weights).any())

    def test_find_optimal_allocations_short_history(self):
        """Test optimization with very short history (edge case)."""
        short_prices = self.prices.iloc[:10] # Only 10 days of data
        # Mock print to suppress timing outputs
        with patch('builtins.print'):
            try:
                # Should not raise error, but might return result based on small window
                res = optimizers.find_optimal_allocations(short_prices, 0.0, 1.0, 0.0)
                self.assertIn("strategies", res)
            except ValueError:
                # It is acceptable if it raises ValueError for insufficient data, 
                # but we want to ensure it doesn't crash with unhandled exceptions.
                pass

    def test_run_max_sharpe_all_negative(self):
        """Test Max Sharpe when all expected returns are negative."""
        neg_mean = pd.Series([-0.01, -0.02, -0.03], index=['X', 'Y', 'Z'])
        weights = optimizers.run_max_sharpe(neg_mean, self.cov, rf_rate=0.0)
        self.assertAlmostEqual(np.sum(weights), 1.0)

    def test_run_hrp_validity(self):
        """Test HRP optimization runs without error on standard float data."""
        # HRP relies on clustering which involves linkage matrices of floats.
        # This ensures the int64 casting fix works.
        weights = optimizers.run_hrp(self.cov)
        self.assertAlmostEqual(np.sum(weights), 1.0)
        self.assertFalse(np.isnan(weights).any())

class TestVisuals(unittest.TestCase):
    def test_generate_dendrogram_empty(self):
        """Test dendrogram generation with invalid input."""
        # Should return None and print error (suppressed)
        with patch('builtins.print'):
            img = visuals.generate_dendrogram_image(pd.DataFrame())
            self.assertIsNone(img)

    def test_generate_efficient_frontier_single_asset(self):
        """Test efficient frontier generation with a single asset."""
        mean = pd.Series([0.1], index=['A'])
        cov = pd.DataFrame([[0.04]], index=['A'], columns=['A'])
        frontier = visuals.generate_efficient_frontier(mean, cov)
        self.assertTrue(isinstance(frontier, list))

class TestData(unittest.TestCase):
    @patch('portfolio_lib.data.yf.Ticker')
    def test_get_risk_free_rate_fallback(self, mock_ticker):
        """Test fallback value when YFinance API fails or returns empty."""
        mock_instance = mock_ticker.return_value
        # Simulate empty history
        mock_instance.history.return_value = pd.DataFrame()
        
        rate = data.get_risk_free_rate()
        self.assertEqual(rate, 0.045) # Expect default fallback

if __name__ == '__main__':
    unittest.main()