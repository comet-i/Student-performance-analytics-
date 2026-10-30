from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field

Category = Literal["study_tip", "attendance", "subject_focus", "time_management", "general"]
Priority = Literal["low", "medium", "high", "critical"]


class Recommendation(BaseModel):
    """Shape matches the `recommendations` table; the backend inserts these rows as-is."""

    enrollment_id: Optional[UUID] = None
    category: Category
    message: str = Field(max_length=500)
    priority: Priority


class RecommendationResponse(BaseModel):
    recommendations: list[Recommendation]
