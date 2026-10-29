from fastapi import APIRouter

from app.schemas.payload import Payload
from app.schemas.recommendation import RecommendationResponse
from app.services.recommendation_service import recommend

router = APIRouter(tags=["recommendations"])


@router.post("/recommendations", response_model=RecommendationResponse)
def get_recommendations(payload: Payload) -> RecommendationResponse:
    """Prioritised, actionable items. The backend inserts them into `recommendations`."""
    return recommend(payload)
