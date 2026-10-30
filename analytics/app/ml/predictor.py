from __future__ import annotations

import logging
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import sklearn

from app.core.config import settings
from app.features.builder import FEATURES
from app.ml.pipelines.forest import RISK_CLASSES

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class Predictor:
    regressor: object              # Pipeline(imputer -> RandomForestRegressor)
    classifier: object | None      # Pipeline(imputer -> RandomForestClassifier)
    baseline: dict[str, float]     # training medians: the "typical student" used to explain predictions
    metadata: dict

    @property
    def version(self) -> str:
        return self.metadata["version"]

    @property
    def expected_error(self) -> float:
        return float(self.metadata.get("mae", 8.0))  # cross-validated MAE, in points

    def _matrix(self, rows: list[dict[str, float]]) -> np.ndarray:
        return np.array([[row[f] for f in FEATURES] for row in rows], dtype=float)

    def predict(self, rows: list[dict[str, float]]) -> np.ndarray:
        return np.clip(self.regressor.predict(self._matrix(rows)), 0, 100)

    def predict_with_spread(self, rows: list[dict[str, float]]) -> tuple[np.ndarray, np.ndarray]:
        """Mean and standard deviation across the trees: the forest's own disagreement
        is our uncertainty estimate, no extra model needed."""
        X = self.regressor[:-1].transform(self._matrix(rows))
        forest = self.regressor[-1]
        per_tree = np.stack([tree.predict(X) for tree in forest.estimators_])
        return np.clip(per_tree.mean(axis=0), 0, 100), per_tree.std(axis=0)

    def predict_risk(self, rows: list[dict[str, float]]) -> list[dict[str, float]] | None:
        """Per-row {low, medium, high} probabilities, or None when no classifier was trained."""
        if self.classifier is None:
            return None
        proba = self.classifier.predict_proba(self._matrix(rows))
        classes = list(self.classifier[-1].classes_)
        return [
            {cls: round(float(row[classes.index(cls)]), 4) if cls in classes else 0.0 for cls in RISK_CLASSES}
            for row in proba
        ]

    def importances(self) -> dict[str, float]:
        """Global Gini importances from the regressor, for the insights page."""
        return dict(zip(FEATURES, (float(v) for v in self.regressor[-1].feature_importances_)))


def load_predictor(path: Path | str | None = None) -> Predictor | None:
    """Returns None (-> cold-start rules) instead of crashing when the artifact is missing or stale."""
    path = Path(path or settings.model_path)
    if not path.exists():
        log.warning("No model at %s: using cold-start rules", path)
        return None
    try:
        bundle = joblib.load(path)
    except Exception:
        log.exception("Could not load %s: using cold-start rules", path)
        return None
    if bundle.get("features") != FEATURES:
        log.error("Model features differ from the code (retrain needed): using cold-start rules")
        return None
    trained_with = bundle["metadata"].get("sklearn_version")
    if trained_with != sklearn.__version__:
        log.warning("Model trained with scikit-learn %s, running %s", trained_with, sklearn.__version__)
    return Predictor(
        regressor=bundle["regressor"],
        classifier=bundle.get("classifier"),
        baseline=bundle["baseline"],
        metadata=bundle["metadata"],
    )


@lru_cache(maxsize=1)
def get_predictor() -> Predictor | None:
    """Loaded once per process (Render keeps one worker warm)."""
    return load_predictor()
