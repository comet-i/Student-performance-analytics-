"""Chart-ready series for the /insights page. The frontend plots these directly."""
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class Point(BaseModel):
    x: str      # ISO date or week label
    y: float


class Series(BaseModel):
    key: str    # scores | attendance | study_hours | task_completion
    label: str
    unit: str
    points: list[Point]


class SubjectInsight(BaseModel):
    enrollment_id: UUID
    subject_name: str
    predicted_score: float
    target_score: float
    risk_level: str
    attendance_pct: Optional[float] = None
    syllabus_completion_pct: Optional[float] = None
    series: list[Series] = Field(default_factory=list)


class FeatureImportance(BaseModel):
    feature: str
    label: str
    importance: float   # 0-1, global, from the trained forest


class InsightResponse(BaseModel):
    model_version: str
    overall_predicted_score: float
    overall_risk_level: str
    subjects: list[SubjectInsight]
    feature_importance: list[FeatureImportance]
