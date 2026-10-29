from __future__ import annotations

import math
from datetime import date

from app.features.extractors import (
    assessment_features,
    attendance_features,
    baseline_features,
    study_features,
)
from app.schemas.payload import Student, Subject

# Order matters: the forests are trained and queried with exactly this column order.
FEATURES = [
    "board_10th_pct", "board_12th_pct", "prev_gpa_pct", "weekly_study_hours", "current_semester",
    "credits", "target_score",
    "attendance_pct", "attendance_recent_pct", "attendance_margin", "absences",
    "n_assessments", "assessed_weightage", "avg_score", "weighted_score", "latest_score",
    "score_volatility", "score_trend_30d", "score_gap_to_target",
    "study_hours_30d", "avg_focus", "task_completion_rate", "tasks_overdue", "syllabus_completion_pct",
]

LABELS = {
    "board_10th_pct": "10th board marks",
    "board_12th_pct": "12th board marks",
    "prev_gpa_pct": "previous semester GPA",
    "weekly_study_hours": "available study time",
    "current_semester": "semester",
    "credits": "subject credits",
    "target_score": "target score",
    "attendance_pct": "attendance",
    "attendance_recent_pct": "recent attendance",
    "attendance_margin": "attendance vs. the minimum",
    "absences": "number of absences",
    "n_assessments": "number of assessments",
    "assessed_weightage": "portion of the term assessed",
    "avg_score": "average assessment score",
    "weighted_score": "assessment scores",
    "latest_score": "latest assessment",
    "score_volatility": "score consistency",
    "score_trend_30d": "score trend",
    "score_gap_to_target": "distance from the target",
    "study_hours_30d": "study hours",
    "avg_focus": "focus rating",
    "task_completion_rate": "task completion",
    "tasks_overdue": "overdue tasks",
    "syllabus_completion_pct": "syllabus coverage",
}


def build_features(student: Student, subject: Subject, as_of: date | None = None) -> dict[str, float]:
    """One model-ready row (NaN = unknown) for a student's subject as of a date."""
    as_of = as_of or date.today()
    row = {
        **baseline_features(student),
        "credits": float(subject.credits),
        "target_score": float(subject.target_score),
        **attendance_features(subject, as_of),
        **assessment_features(subject, as_of),
        **study_features(subject, as_of),
    }
    return {name: float(row[name]) for name in FEATURES}


def to_json(features: dict[str, float]) -> dict[str, float | None]:
    """NaN is not valid JSON; the backend stores this dict in predictions.features."""
    return {k: None if math.isnan(v) else round(v, 3) for k, v in features.items()}
