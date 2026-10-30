import math

from app.features.builder import FEATURES, LABELS
from app.ml.predictor import Predictor


def drivers(predictor: Predictor, row: dict[str, float], k: int = 3, min_impact: float = 0.5) -> list[dict]:
    """Model-agnostic explanation: how many points each input moves the prediction relative to a
    typical student (replace the input with its training median and re-predict).
    One batched forest call, no SHAP dependency.
    """
    variants = [row] + [{**row, f: predictor.baseline[f]} for f in FEATURES]
    preds = predictor.predict(variants)
    impacts = preds[0] - preds[1:]
    ranked = sorted(zip(FEATURES, impacts), key=lambda pair: -abs(pair[1]))
    return [
        {"feature": f, "label": LABELS[f], "impact": round(float(i), 2)}
        for f, i in ranked
        if abs(i) >= min_impact and not math.isnan(row[f])
    ][:k]


def describe(driver: dict) -> str:
    verb = "raised" if driver["impact"] > 0 else "lowered"
    return f"{driver['label']} {verb} the prediction by {abs(driver['impact']):.1f} points"
