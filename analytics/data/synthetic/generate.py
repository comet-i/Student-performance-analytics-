import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Point to the analytics root directory to allow importing your app module
ROOT = Path(__file__).resolve().parents[2]
sys.path.append(str(ROOT))

# Import your exact feature list so the CSV perfectly matches
from app.features.builder import FEATURES

def generate_synthetic_data(num_records=5000):
    np.random.seed(42)
    
    # 1. Create a dictionary to hold our generated columns
    data = {}
    
    # 2. Dynamically generate mock data for EVERY feature your train.py expects
    for feature in FEATURES:
        if "gpa" in feature.lower() or "score" in feature.lower() or "pct" in feature.lower():
            data[feature] = np.random.normal(75, 12, num_records).clip(0, 100)
        elif "hours" in feature.lower():
            data[feature] = np.random.normal(15, 5, num_records).clip(0, 40)
        elif "count" in feature.lower():
            data[feature] = np.random.poisson(5, num_records)
        else:
            data[feature] = np.random.normal(50, 15, num_records)
        
    # 3. Add the required target variables that your train.py explicitly checks for
    # final_score: the regression target
    data["final_score"] = (data.get(FEATURES[0], 75) * 0.8) + np.random.normal(5, 5, num_records)
    data["final_score"] = data["final_score"].clip(0, 100)
    
    # target_score: used to calculate risk_level in your train.py
    data["target_score"] = np.full(num_records, 85.0)
    
    # user_id: used for GroupKFold cross-validation to prevent data leakage
    data["user_id"] = np.random.randint(1, 800, num_records)
    
    # 4. Save it to the exact location your train.py expects (training.csv)
    df = pd.DataFrame(data)
    out_path = ROOT / "data" / "synthetic" / "training.csv"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    
    df.to_csv(out_path, index=False)
    
    print(f"✅ Generated {num_records} synthetic rows.")
    print(f"✅ Columns included: {len(FEATURES)} features + final_score, target_score, user_id.")
    print(f"✅ Saved securely to {out_path}")

if __name__ == "__main__":
    generate_synthetic_data()