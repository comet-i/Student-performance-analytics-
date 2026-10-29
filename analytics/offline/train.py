"""Train the two Random Forests and write artifacts/model_v1.joblib.

    python -m offline.train --data data/synthetic/training.csv --version v1

The CSV must contain every column in app.features.builder.FEATURES plus:
    final_score   numeric 0-100   -> regression target
    risk_level    low|medium|high -> classification target (derived if absent)

Commit the resulting artifacts/ files: the Render service loads them at startup and
never trains anything itself.
"""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.metrics import f1_score, mean_absolute_error, r2_score
from sklearn.model_selection import GroupKFold, cross_val_predict, train_test_split

from app.features.builder import FEATURES
from app.ml.pipelines.forest import make_classifier, make_regressor, risk_from_scores

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"


def load(path: Path) -> pd.DataFrame:
    frame = pd.read_csv(path)
    missing = [c for c in [*FEATURES, "final_score"] if c not in frame.columns]
    if missing:
        raise SystemExit(f"Training data is missing columns: {missing}")
    frame = frame.dropna(subset=["final_score"])
    if "risk_level" not in frame.columns:
        frame["risk_level"] = [
            risk_from_scores(s, t) for s, t in zip(frame["final_score"], frame["target_score"].fillna(85))
        ]
    if frame.empty:
        raise SystemExit("No usable training rows")
    return frame


def evaluate(X: np.ndarray, y: np.ndarray, labels: np.ndarray, groups: np.ndarray, seed: int) -> dict:
    """Grouped by student, so the same person never lands in both folds."""
    folds = min(5, len(np.unique(groups)))
    if folds < 2:
        return {}
    cv = GroupKFold(n_splits=folds)
    predicted = cross_val_predict(make_regressor(seed=seed), X, y, cv=cv, groups=groups)
    classified = cross_val_predict(make_classifier(seed=seed), X, labels, cv=cv, groups=groups)
    return {
        "mae": round(float(mean_absolute_error(y, predicted)), 3),
        "rmse": round(float(np.sqrt(np.mean((y - predicted) ** 2))), 3),
        "r2": round(float(r2_score(y, predicted)), 3),
        "risk_f1_macro": round(float(f1_score(labels, classified, average="macro")), 3),
        "cv_folds": folds,
    }


def train(data_path: Path, version: str, seed: int = 0) -> dict:
    frame = load(data_path)
    X = frame[FEATURES].to_numpy(dtype=float)
    y = frame["final_score"].to_numpy(dtype=float)
    labels = frame["risk_level"].to_numpy()
    groups = frame["user_id"].to_numpy() if "user_id" in frame.columns else np.arange(len(frame))

    metrics = evaluate(X, y, labels, groups, seed)

    # held-out split only for a sanity number; the shipped models are fit on everything
    if len(frame) >= 20:
        X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=seed)
        holdout = make_regressor(seed=seed).fit(X_tr, y_tr)
        metrics["holdout_mae"] = round(float(mean_absolute_error(y_te, holdout.predict(X_te))), 3)

    regressor = make_regressor(seed=seed).fit(X, y)
    classifier = make_classifier(seed=seed).fit(X, labels)

    baseline = {f: float(np.nanmedian(frame[f])) if frame[f].notna().any() else 0.0 for f in FEATURES}
    importance = dict(sorted(
        zip(FEATURES, (float(v) for v in regressor[-1].feature_importances_)),
        key=lambda kv: -kv[1],
    ))
    metadata = {
        "version": version,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "n_samples": int(len(frame)),
        "n_students": int(len(np.unique(groups))),
        "sklearn_version": sklearn.__version__,
        "algorithm": "RandomForestRegressor + RandomForestClassifier",
        "feature_importance": {k: round(v, 4) for k, v in importance.items()},
        **metrics,
    }

    ARTIFACTS.mkdir(exist_ok=True)
    joblib.dump(
        {"regressor": regressor, "classifier": classifier, "features": FEATURES,
         "baseline": baseline, "metadata": metadata},
        ARTIFACTS / f"model_{version}.joblib",
        compress=3,
    )
    (ARTIFACTS / f"metadata_{version}.json").write_text(json.dumps(metadata, indent=2))
    print(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, default=ROOT / "data" / "synthetic" / "training.csv")
    parser.add_argument("--version", default="v1")
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()
    train(args.data, args.version, args.seed)
