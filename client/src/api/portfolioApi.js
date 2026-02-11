const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

/**
 * Sends a portfolio optimization request to the backend.
 * @param {Object} params - The optimization parameters.
 * @param {string[]} params.tickers - List of tickers.
 * @param {number} params.min_weight - Minimum weight (0-100).
 * @param {number} params.max_weight - Maximum weight (0-100).
 * @returns {Promise<Object>} The optimization results.
 */
export const optimizePortfolio = async ({ tickers, min_weight, max_weight }) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        tickers, 
        min_weight, 
        max_weight,
        target_value: 0, // Base unlevered
        target_mode: 'volatility'
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error("Server connection failed. Please ensure the backend is running.");
    }
    throw error;
  }
};
