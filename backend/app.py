from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback
from services.portfolio_service import PortfolioService

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
        print(f"Error in optimize_portfolio: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Defaulting to 5001 as previously used
    app.run(debug=True, port=5001)
