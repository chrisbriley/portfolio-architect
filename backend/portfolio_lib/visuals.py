import numpy as np
import scipy.cluster.hierarchy as sch
from scipy.spatial.distance import squareform
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

def generate_efficient_frontier(mean_returns, cov_matrix, num_portfolios=200):
    results = []
    n_assets = len(mean_returns)
    for _ in range(num_portfolios):
        weights = np.random.random(n_assets)
        weights /= np.sum(weights)
        ret = np.sum(mean_returns * weights) * 252
        vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights))) * np.sqrt(252)
        results.append({"x": round(vol * 100, 2), "y": round(ret * 100, 2)})
    return results