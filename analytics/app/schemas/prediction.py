from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]


class Driver(BaseModel):
    """One feature's signed contribution, in score points, for the frontend's explanation chips."""

    feature: str
    label: str
    impact: float


class SubjectPrediction(BaseModel):
    enrollment_id: Optional[UUID] = None   # None = overall (credit-weighted) prediction
    subject_name: Optional[str] = None
    predicted_score: float = Field(ge=0, le=100)
    confidence: float = Field(ge=0, le=1)
    risk_level: RiskLevel
    risk_probabilities: dict[str, float] = Field(default_factory=dict)
    recommended_weekly_hours: float = Field(ge=0, le=100)
    target_score: Optional[float] = None
    drivers: list[Driver] = Field(default_factory=list)
    features: dict[str, Optional[float]] = Field(default_factory=dict)


class PredictionResponse(BaseModel):
    model_version: str
    predictions: list[SubjectPrediction]


class Outcome(BaseModel):
    predicted_score: float
    risk_level: RiskLevel
    confidence: float


class SimulationResponse(BaseModel):
    model_version: str
    enrollment_id: UUID
    subject_name: str
    baseline: Outcome
    simulated: Outcome
    delta: float
    scenario: dict[str, float]
