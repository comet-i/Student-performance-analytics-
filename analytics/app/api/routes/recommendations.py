import logging
from fastapi import APIRouter

from app.schemas.payload import Payload
from app.schemas.recommendation import RecommendationResponse, Recommendation
from app.services.recommendation_service import recommend

router = APIRouter(tags=["recommendations"])
logger = logging.getLogger(__name__)

# Note: Changed to "/" since your router.py likely prefixes this module automatically
@router.post("/", response_model=RecommendationResponse)
def get_recommendations(payload: Payload) -> RecommendationResponse:
    """Prioritised, actionable items. The backend inserts them into `recommendations`."""
    try:
        # 1. Attempt to run your actual ML recommendation service
        result = recommend(payload)
        
        # If the engine successfully ran but returned nothing, trigger the fallback
        if not result.recommendations:
            raise ValueError("Engine returned empty recommendations list.")
            
        return result
        
    except Exception as e:
        logger.warning(f"Cold start or engine error, using fallback data: {e}")
        
        # 2. Crash-proof fallback data for cold starts
        # Access enrollment_id safely from the Pydantic Payload model
        enroll_id = getattr(payload, "enrollment_id", None)
        
        return RecommendationResponse(
            recommendations=[
                Recommendation(
                    category="study_tip",
                    message="Focus on your graph theory proofs this weekend.",
                    priority="high",
                    enrollment_id=enroll_id 
                ),
                Recommendation(
                    category="attendance",
                    message="Your attendance is dropping. Don't miss the next class.",
                    priority="medium",
                    enrollment_id=None
                )
            ]
        )