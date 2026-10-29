"""Turns a backend payload into predictions. Uses the trained forests when an artifact is
present, and falls back to the cold-start rules otherwise, so the API never fails hard.
"""

from __future__ import annotations
import math
from datetime import date

import numpy as np

from app.features.builder import build_features, to_json
from app.ml.explain import drivers
from app.ml.pipelines.cold_start import COLD_START_ERROR, COLD_START_VERSION, cold_start_risk, cold_start_score
from app.ml.pipelines.forest import risk_from_scores
from app.ml.predictor import Predictor, get_predictor
from app.schemas.payload import Payload, Subject
from app.schemas.prediction import PredictionResponse, SubjectPrediction

RISK_HOURS = {"low": 0.8, "medium": 1.15, "high": 1.5}


def feature_rows(payload: Payload, as_of: date | None = None) -> list[dict[str, float]]:
    return [build_features(payload.student, s, as_of) for s in payload.subjects]


def _confidence(spread: float, expected_error: float, n_assessments: float) -> float:
    """High when the trees agree and the student has a track record."""
    agreement = 1 - min(1.0, spread / 25)
    evidence = min(1.0, n_assessments / 5)
    accuracy = 1 - min(1.0, expected_error / 25)
    return round(float(max(0.3, min(0.95, 0.5 * agreement + 0.25 * evidence + 0.25 * accuracy))), 3)


def _recommended_hours(subject: Subject, row: dict[str, float], predicted: float, risk: str) -> float:
    """Scale the student's usual effort by how far the prediction sits below the target."""
    base = row["weekly_study_hours"]
    if math.isnan(base) or base <= 0:
        base = 2.0 * subject.credits
    gap = max(0.0, subject.target_score - predicted)
    hours = base * RISK_HOURS[risk] + 0.15 * gap
    return round(float(min(40.0, max(1.0, hours))), 1)


def score_rows(
    rows: list[dict[str, float]], predictor: Predictor | None
) -> tuple[np.ndarray, np.ndarray, list[dict[str, float]] | None]:
    """(scores, spreads, risk probabilities) for a batch of feature rows."""
    if predictor is None:
        scores = np.array([cold_start_score(r) for r in rows])
        return scores, np.full(len(rows), COLD_START_ERROR), None
    scores, spreads = predictor.predict_with_spread(rows)
    return scores, spreads, predictor.predict_risk(rows)


def predict(payload: Payload, as_of: date | None = None, explain: bool = True) -> PredictionResponse:
    predictor = get_predictor()
    rows = feature_rows(payload, as_of)
    scores, spreads, probabilities = score_rows(rows, predictor)
    error = predictor.expected_error if predictor else COLD_START_ERROR

    predictions: list[SubjectPrediction] = []
    for i, subject in enumerate(payload.subjects):
        row, score = rows[i], float(scores[i])
        if probabilities is not None:
            probs = probabilities[i]
            risk = max(probs, key=probs.get)
        else:
            risk, probs = cold_start_risk(score, row)
        predictions.append(
            SubjectPrediction(
                enrollment_id=subject.enrollment_id,
                subject_name=subject.subject_name,
                predicted_score=round(score, 2),
                confidence=_confidence(float(spreads[i]), error, row["n_assessments"]),
                risk_level=risk,
                risk_probabilities=probs,
                recommended_weekly_hours=_recommended_hours(subject, row, score, risk),
                target_score=subject.target_score,
                drivers=drivers(predictor, row) if (explain and predictor) else [],
                features=to_json(row),
            )
        )

    predictions.insert(0, _overall(payload, predictions))
    return PredictionResponse(
        model_version=predictor.version if predictor else COLD_START_VERSION,
        predictions=predictions,
    )


def _overall(payload: Payload, per_subject: list[SubjectPrediction]) -> SubjectPrediction:
    """Credit-weighted aggregate across subjects: what the dashboard header shows."""
    credits = np.array([s.credits for s in payload.subjects], dtype=float)
    scores = np.array([p.predicted_score for p in per_subject])
    targets = np.array([p.target_score or 0.0 for p in per_subject])
    overall = float(scores @ credits / credits.sum())
    target = float(targets @ credits / credits.sum())
    worst = max(per_subject, key=lambda p: ("low", "medium", "high").index(p.risk_level))
    return SubjectPrediction(
        enrollment_id=None,
        subject_name="Overall",
        predicted_score=round(overall, 2),
        confidence=round(float(np.mean([p.confidence for p in per_subject])), 3),
        risk_level=risk_from_scores(overall, target) if worst.risk_level != "high" else "high",
        risk_probabilities={},
        recommended_weekly_hours=round(float(sum(p.recommended_weekly_hours for p in per_subject)), 1),
        target_score=round(target, 2),
    )
