import { useState } from 'react';
import { optimizePortfolio } from '../api/portfolioApi';

export const usePortfolioOptimization = () => {
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = async ({ tickers, minWeight, maxWeight }) => {
    const tickersArray = tickers
      .split(',')
      .map(t => t.trim().toUpperCase())
      .filter(t => t !== '');

    if (tickersArray.length < 2) {
      setError("Please enter at least two tickers.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const data = await optimizePortfolio({
        tickers: tickersArray,
        min_weight: minWeight,
        max_weight: maxWeight,
      });
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    results,
    setResults,
    isLoading,
    error,
    setError,
    runAnalysis
  };
};
