from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
import logging
from services.portfolio_service import PortfolioService

import os

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

portfolio_service = PortfolioService()

@app.route('/')
def home():
    return "Portfolio Optimizer API is running. Please use the frontend application."

@app.route('/api/optimize', methods=['POST'])
def optimize_portfolio():
    try:
        result, status_code = portfolio_service.optimize_portfolio(request.json)
        return jsonify(result), status_code
    except Exception as e:
        logger.error(f"Error in optimize_portfolio: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=port)
