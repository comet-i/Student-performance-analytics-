"""Trains tiny forests on generated rows: proves the pipelines handle NaN and round-trip through joblib."""
import numpy as np
import joblib

from app.features.builder import FEATURES
from app.ml.pipelines.cold_start import cold_start_risk, cold_start_score
from app.ml.pipelines.forest import make_classifier, make_regressor, risk_from_scores
from app.ml.predictor import load_predictor


def _dataset(n=120, seed=0):
    rng = np.random.default_rng(seed)
    X = rng.uniform(40, 95, size=(n, len(FEATURES)))
    y = X[:, FEATURES.index("weighted_score")] * 0.8 + 10 + rng.normal(0, 3, n)
    X[rng.random(X.shape) < 0.1] = np.nan  # unknown inputs must not break the pipeline
    labels = np.array([risk_from_scores(s, 85) for s in y])
    return X, y, labels


def test_regressor_and_classifier_fit_with_missing_values():
    X, y, labels = _dataset()
    assert make_regressor(n_estimators=20).fit(X, y).predict(X[:3]).shape == (3,)
    assert set(make_classifier(n_estimators=20).fit(X, labels).predict(X[:3])) <= {"low", "medium", "high"}


def test_saved_bundle_loads_and_predicts(tmp_path):
    X, y, labels = _dataset()
    joblib.dump({
        "regressor": make_regressor(n_estimators=20).fit(X, y),
        "classifier": make_classifier(n_estimators=20).fit(X, labels),
        "features": FEATURES,
        "baseline": {f: 70.0 for f in FEATURES},
        "metadata": {"version": "test", "mae": 3.0, "sklearn_version": "x"},
    }, tmp_path / "m.joblib")

    predictor = load_predictor(tmp_path / "m.joblib")
    row = {f: 70.0 for f in FEATURES}
    mean, spread = predictor.predict_with_spread([row])
    assert 0 <= mean[0] <= 100 and spread[0] >= 0
    assert set(predictor.predict_risk([row])[0]) == {"low", "medium", "high"}
    assert sum(predictor.importances().values()) > 0


def test_stale_feature_list_is_rejected(tmp_path):
    X, y, _ = _dataset()
    joblib.dump({
        "regressor": make_regressor(n_estimators=5).fit(X, y), "classifier": None,
        "features": ["dropped_feature"], "baseline": {}, "metadata": {"version": "old"},
    }, tmp_path / "old.joblib")
    assert load_predictor(tmp_path / "old.joblib") is None


def test_cold_start_rules_are_bounded():
    row = {f: float("nan") for f in FEATURES} | {"n_assessments": 0.0, "target_score": 85.0}
    score = cold_start_score(row)
    assert 0 <= score <= 100
    assert cold_start_risk(score, row)[0] in {"low", "medium", "high"}
