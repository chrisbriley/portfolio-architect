# Portfolio App

This is a portfolio application with a React frontend and a Flask backend.

## Project Structure

- **backend/**: Python Flask application serving the API.
  - Uses `yfinance` for data, `pandas`/`scikit-learn` for analysis.
- **client/**: React application for the user interface.
  - Uses `recharts` for visualizations.

## Getting Started

### Backend

1. Navigate to the `backend` directory.
2. Create a virtual environment: `python -m venv venv`
3. Activate it: `source venv/bin/activate` (or `venv\Scripts\activate` on Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Run the server: `python app.py`

### Client

1. Navigate to the `client` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm start`
