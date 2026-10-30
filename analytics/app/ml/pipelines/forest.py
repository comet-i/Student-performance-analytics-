"""The two Random Forests. Both are wrapped in a median imputer because
scikit-learn's forests do not accept NaN, and NaN is how we encode "unknown".
"""
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline

RISK_CLASSES = ("low", "medium", "high")


def _imputer() -> SimpleImputer:
    return SimpleImputer(strategy="median", keep_empty_features=True)


def make_regressor(n_estimators: int = 400, seed: int = 0) -> Pipeline:
    """Predicts the final score, 0-100."""
    return Pipeline([
        ("impute", _imputer()),
        ("forest", RandomForestRegressor(
            n_estimators=n_estimators,
            min_samples_leaf=3,
            max_features="sqrt",
            random_state=seed,
            n_jobs=-1,
        )),
    ])


def make_classifier(n_estimators: int = 400, seed: int = 0) -> Pipeline:
    """Predicts the risk level (low / medium / high) directly, with calibrated-ish probabilities."""
    return Pipeline([
        ("impute", _imputer()),
        ("forest", RandomForestClassifier(
            n_estimators=n_estimators,
            min_samples_leaf=3,
            max_features="sqrt",
            class_weight="balanced",
            random_state=seed,
            n_jobs=-1,
        )),
    ])


def risk_from_scores(predicted: float, target: float) -> str:
    """Training label, and the fallback when no classifier is available.

    Risk is about missing the target, not about the absolute score.
    """
    gap = target - predicted
    if predicted < 40 or gap >= 15:
        return "high"
    if gap >= 5:
        return "medium"
    return "low"
