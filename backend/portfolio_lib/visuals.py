import numpy as np
import scipy.cluster.hierarchy as sch
from scipy.spatial.distance import squareform
from scipy.optimize import minimize
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

def generate_dendrogram_image(cov_matrix):
    try:
        std_devs = np.sqrt(np.diag(cov_matrix))
        corr = (cov_matrix / np.outer(std_devs, std_devs)).clip(-1, 1)
        dist = np.sqrt((1 - corr) / 2)
        link = sch.linkage(squareform(dist, checks=False), 'single')
        
        plt.figure(figsize=(10, 5))
        sch.dendrogram(link, labels=cov_matrix.columns, leaf_rotation=90)
        plt.title("Asset Hierarchy (HRP Clustering)", fontsize=14)
        plt.ylabel("Distance (Correlation)", fontsize=10)
        plt.tight_layout()
        
        img = io.BytesIO()
        plt.savefig(img, format='png', transparent=True)
        img.seek(0)
        plt.close()
        return base64.b64encode(img.getvalue()).decode('utf8')
    except Exception as e:
        print(f"Dendrogram Error: {e}")
        return None

def generate_efficient_frontier(mean_returns, cov_matrix, points=20):
    """Generates the Efficient Frontier by minimizing volatility for target returns."""
    n = len(mean_returns)
    
    # 1. Find Min Volatility Portfolio (Global Minimum Variance)
    def get_vol(w): return np.sqrt(np.dot(w.T, np.dot(cov_matrix, w)))
    
    cons = ({'type': 'eq', 'fun': lambda x: np.sum(x) - 1})
    bounds = tuple((0, 1) for _ in range(n))
    init_w = np.ones(n) / n
    
    min_vol_res = minimize(get_vol, init_w, bounds=bounds, constraints=cons)
    if not min_vol_res.success: return []
    min_vol_ret = np.sum(mean_returns * min_vol_res.x) * 252
    
    # 2. Find Max Return (Single best asset)
    max_ret = np.max(mean_returns) * 252
    
    # 3. Optimize for range of returns
    frontier = []
    target_returns = np.linspace(min_vol_ret, max_ret, points)
    
    for r in target_returns:
        cons_r = (
            {'type': 'eq', 'fun': lambda x: np.sum(x) - 1},
            {'type': 'eq', 'fun': lambda x: np.sum(mean_returns * x) * 252 - r}
        )
        res = minimize(get_vol, init_w, bounds=bounds, constraints=cons_r)
        if res.success:
            vol = res.fun * np.sqrt(252)
            frontier.append({"x": round(vol * 100, 2), "y": round(r * 100, 2)})
            
    return frontier