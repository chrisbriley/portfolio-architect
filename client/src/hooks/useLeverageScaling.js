import { useMemo } from 'react';

export const useLeverageScaling = (results, { targetVal, targetMode, borrowCost }) => {
  return useMemo(() => {
    if (!results || !results.strategies) return null;
    if (targetVal === 0) return results;

    const scaleFactor = (current, target) => {
      if (current <= 0) return 1;
      let lev = target / current;
      return Math.min(lev, 4.0); // Cap at 4x leverage
    };

    const scaleHistory = (history, leverage) => {
      if (Math.abs(leverage - 1) < 0.01) return history;
      const dailyBorrowRate = borrowCost / 100 / 252;
      const newHistory = [{ date: history[0].date, value: 100 }];
      for (let i = 1; i < history.length; i++) {
        const prevRaw = history[i - 1].value;
        const currRaw = history[i].value;
        const ret = prevRaw === 0 ? 0 : currRaw / prevRaw - 1;
        const levRet = ret * leverage - (leverage - 1) * dailyBorrowRate;
        const prevLev = newHistory[i - 1].value;
        const currLev = prevLev * (1 + levRet);
        newHistory.push({ date: history[i].date, value: currLev });
      }
      return newHistory;
    };

    const recalculateDrawdowns = (history) => {
      let runningMax = -Infinity;
      return history.map((point) => {
        if (point.value > runningMax) runningMax = point.value;
        const dd = (point.value - runningMax) / runningMax;
        return { date: point.date, value: Number((dd * 100).toFixed(2)) };
      });
    };

    const newStrategies = {};

    Object.keys(results.strategies).forEach((stratName) => {
      newStrategies[stratName] = {};
      ['constrained', 'unconstrained'].forEach((mode) => {
        const base = results.strategies[stratName][mode];
        if (!base) return;

        let leverage = 1.0;
        if (targetMode === 'volatility') {
          leverage = scaleFactor(base.metrics.volatility, targetVal);
        } else if (targetMode === 'var') {
          leverage = scaleFactor(base.metrics.var, targetVal);
        } else if (targetMode === 'leverage_ratio') {
          leverage = targetVal / 100.0;
        }

        const newReturn = leverage * base.metrics.return - (leverage - 1) * borrowCost;
        const scaledHistory = scaleHistory(base.history, leverage);

        const newAllocation = {};
        Object.keys(base.allocation).forEach((key) => {
          newAllocation[key] = Number((base.allocation[key] * leverage).toFixed(1));
        });

        newStrategies[stratName][mode] = {
          ...base,
          allocation: newAllocation,
          metrics: {
            ...base.metrics,
            volatility: Number((base.metrics.volatility * leverage).toFixed(1)),
            return: Number(newReturn.toFixed(1)),
            var: Number((base.metrics.var * leverage).toFixed(2)),
            beta: Number((base.metrics.beta * leverage).toFixed(2)),
            corr_var: base.metrics.corr_var,
            leverage: Number((leverage * 100).toFixed(0)),
          },
          history: scaledHistory,
          drawdowns: recalculateDrawdowns(scaledHistory),
        };
      });
    });

    return {
      ...results,
      strategies: newStrategies,
    };
  }, [results, targetVal, targetMode, borrowCost]);
};
