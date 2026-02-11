import React, { createContext, useContext, useState, useEffect } from 'react';

const PortfolioContext = createContext();

export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

export const PortfolioProvider = ({ children }) => {
  const [savedPortfolios, setSavedPortfolios] = useState([]);
  const [borrowCost, setBorrowCost] = useState(5.5);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('myPortfolios');
    if (saved) {
      try {
        setSavedPortfolios(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved portfolios', e);
      }
    }
  }, []);

  const savePortfolio = (portfolio) => {
    const updated = [...savedPortfolios, portfolio];
    setSavedPortfolios(updated);
    localStorage.setItem('myPortfolios', JSON.stringify(updated));
  };

  const deletePortfolio = (index) => {
    const updated = savedPortfolios.filter((_, i) => i !== index);
    setSavedPortfolios(updated);
    localStorage.setItem('myPortfolios', JSON.stringify(updated));
  };

  return (
    <PortfolioContext.Provider
      value={{
        savedPortfolios,
        savePortfolio,
        deletePortfolio,
        borrowCost,
        setBorrowCost
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
};
