# GEMINI.md - Portfolio Architect Context

This file provides essential context for AI assistants working on the Portfolio Architect project.

## Project Overview

Portfolio Architect is a full-stack application designed for robust portfolio optimization, risk analysis, and regime-based strategy evaluation. It allows users to input multiple tickers, apply allocation constraints, and visualize optimal portfolios based on various mathematical models.

### Architecture
- **Frontend**: React-based SPA (Single Page Application) located in `client/`.
- **Backend**: Python Flask API located in `backend/`.
- **Logic Layer**: Specialized finance and math utilities in `backend/portfolio_lib/`.

### Core Technologies
- **Backend**: Python, Flask, yfinance (data sourcing), Pandas/NumPy (data processing), Scipy/Scikit-learn (optimization and clustering).
- **Frontend**: React, Recharts (visualizations), CSS for modern UI.
- **Optimization Strategies**:
  - **Risk Parity**: Equalizes risk contribution across assets.
  - **Max Sharpe**: Maximizes the return-to-volatility ratio.
  - **HRP (Hierarchical Risk Parity)**: Uses graph theory/clustering for diversification.
  - **MDP (Maximum Diversification Portfolio)**: Maximizes the diversification ratio.

## Building and Running

### Backend
- **Directory**: `backend/`
- **Setup**:
  ```bash
  python -m venv venv
  source venv/bin/activate
  pip install -r requirements.txt
  ```
- **Run**: `python app.py` (Starts on port 5001 by default).
- **Testing**:
  ```bash
  python -m unittest backend/portfolio_lib/test_portfolio_lib.py
  ```

### Frontend
- **Directory**: `client/`
- **Setup**: `npm install`
- **Run**: `npm start`
- **Build**: `npm run build`
- **Testing**: `npm test`

## Key Files & Directories

- `backend/app.py`: Main Flask entry point and API route definitions.
- `backend/portfolio_lib/optimizers.py`: Core logic for the different optimization algorithms.
- `backend/portfolio_lib/math_utils.py`: Financial math functions (Sharpe, Volatility, VaR, Beta).
- `client/src/App.js`: Main React application entry point and state management for leverage/scaling.
- `client/src/components/`: Reusable React components for visualizations and strategy cards.

## Development Conventions

- **API Communication**: The frontend expects the backend at `http://localhost:5001` unless `REACT_APP_API_URL` is set.
- **Data Handling**: Financial data is sourced via `yfinance`. Prices are adjusted for splits and dividends.
- **State Management**: React `useMemo` is used heavily for dynamic leverage scaling on the frontend to avoid unnecessary API calls.
- **Error Handling**: The backend provides detailed error messages for insufficient data or invalid tickers.
- **Testing**: Unit tests are expected for all new mathematical utilities in `backend/portfolio_lib/`.

## Roadmap / TODOs
### Phase 0: Workflow & Safety
- [ ] **Backup to GitHub**: Ensure all significant changes are committed and pushed to the remote repository.

### Phase 1: Professionalization & Refactoring
- [ ] **Backend: Decouple and Modularize**
  - Extract business logic from `app.py` into a Service Layer (`PortfolioService`).
  - Abstract data fetching into a Data Access Object (DAO) or Provider pattern.
  - Implement structured logging and request validation (e.g., Pydantic).
- [ ] **Frontend: State Management & Architecture**
  - Extract logic into Custom Hooks (`usePortfolioOptimization`).
  - Centralize API calls in a dedicated client module.
  - Implement Context API for global state (e.g., settings, saved portfolios).
- [ ] **Infrastructure & DevOps**
  - Add Dockerization (`Dockerfile`, `docker-compose.yml`).
  - Set up CI/CD for automated testing and linting.
  - Implement comprehensive environment variable management.

### Feature Enhancements
- [ ] Add support for international exchanges.
- [ ] Implement user authentication for saving portfolios in a database.
- [ ] Add more benchmark options beyond SPY/BND.
- [ ] Enhance HRP visualization interactivity.
