"""Rule-based fallback, used when no trained artifact is available
(first deploy, feature-set change, scikit-learn version mismatch).
"""
import math

from app.ml.pipelines.forest import risk_from_scores

COLD_START_VERSION = "cold-start-v1"
COLD_START_ERROR = 12.0  # assumed average miss, in points


def cold_start_score(f: dict[str, float]) -> float:
    # Prior from earlier results: previous GPA, 12th, 10th (renormalised over what is known)
    parts = [(f["prev_gpa_pct"], 0.5), (f["board_12th_pct"], 0.3), (f["board_10th_pct"], 0.2)]
    known = [(v, w) for v, w in parts if not math.isnan(v)]
    prior = sum(v * w for v, w in known) / sum(w for _, w in known) if known else 60.0

    # Blend in current assessments as they accumulate (up to 80%)
    n = f["n_assessments"]
    weight = min(0.8, 0.2 * n)
    score = weight * f["weighted_score"] + (1 - weight) * prior if n else prior

    if not math.isnan(f["attendance_pct"]):
        score += max(-8.0, min(8.0, 0.15 * (f["attendance_pct"] - 80)))
    if not math.isnan(f["task_completion_rate"]):
        score += max(-4.0, min(4.0, 0.06 * (f["task_completion_rate"] - 70)))
    return max(0.0, min(100.0, score))


def cold_start_risk(score: float, f: dict[str, float]) -> tuple[str, dict[str, float]]:
    level = risk_from_scores(score, f["target_score"])
    if not math.isnan(f["attendance_margin"]) and f["attendance_margin"] < 0 and level == "low":
        level = "medium"  # short on attendance is a risk regardless of marks
    probs = {"low": 0.2, "medium": 0.2, "high": 0.2}
    probs[level] = 0.6
    return level, probs
