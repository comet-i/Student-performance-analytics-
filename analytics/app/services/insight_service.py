"""Chart-ready series for the frontend's /insights page, plus the forest's global
feature importances so the UI can show what actually drives the forecasts.
"""

from __future__ import annotations
import math
from collections import defaultdict
from datetime import date

from app.features.builder import LABELS, build_features
from app.ml.predictor import get_predictor
from app.schemas.insight import FeatureImportance, InsightResponse, Point, Series, SubjectInsight
from app.schemas.payload import Payload, Subject
from app.services.prediction_service import predict


def _score_series(subject: Subject) -> Series:
    points = [
        Point(x=a.recorded_at.isoformat(), y=round(a.score, 2))
        for a in sorted(subject.assessments, key=lambda a: a.recorded_at)
    ]
    return Series(key="scores", label="Assessment scores", unit="%", points=points)


def _attendance_series(subject: Subject) -> Series:
    """Running attendance percentage: what the student sees trending toward the minimum."""
    attended = total = 0
    points: list[Point] = []
    for log in sorted(subject.attendance_logs, key=lambda log: log.class_date):
        if log.status == "excused":
            continue
        total += 1
        attended += log.status in ("present", "late")
        points.append(Point(x=log.class_date.isoformat(), y=round(100 * attended / total, 2)))
    return Series(key="attendance", label="Attendance", unit="%", points=points)


def _study_series(subject: Subject) -> Series:
    weekly: dict[str, float] = defaultdict(float)
    for session in subject.study_sessions:
        year, week, _ = session.started_at.isocalendar()
        weekly[f"{year}-W{week:02d}"] += session.duration_minutes / 60
    points = [Point(x=k, y=round(v, 2)) for k, v in sorted(weekly.items())]
    return Series(key="study_hours", label="Study hours per week", unit="h", points=points)


def insights(payload: Payload, as_of: date | None = None) -> InsightResponse:
    predictor = get_predictor()
    result = predict(payload, as_of=as_of, explain=False)
    overall, by_enrollment = result.predictions[0], {p.enrollment_id: p for p in result.predictions[1:]}

    subjects = []
    for subject in payload.subjects:
        row = build_features(payload.student, subject, as_of)
        p = by_enrollment[subject.enrollment_id]
        subjects.append(SubjectInsight(
            enrollment_id=subject.enrollment_id,
            subject_name=subject.subject_name,
            predicted_score=p.predicted_score,
            target_score=subject.target_score,
            risk_level=p.risk_level,
            attendance_pct=None if math.isnan(row["attendance_pct"]) else round(row["attendance_pct"], 2),
            syllabus_completion_pct=(
                None if math.isnan(row["syllabus_completion_pct"]) else round(row["syllabus_completion_pct"], 2)
            ),
            series=[_score_series(subject), _attendance_series(subject), _study_series(subject)],
        ))

    importance = []
    if predictor:
        ranked = sorted(predictor.importances().items(), key=lambda kv: -kv[1])
        importance = [
            FeatureImportance(feature=f, label=LABELS[f], importance=round(v, 4))
            for f, v in ranked[:10]
            if v > 0
        ]

    return InsightResponse(
        model_version=result.model_version,
        overall_predicted_score=overall.predicted_score,
        overall_risk_level=overall.risk_level,
        subjects=subjects,
        feature_importance=importance,
    )
