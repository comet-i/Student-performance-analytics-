from fastapi import APIRouter

from app.schemas.insight import InsightResponse
from app.schemas.payload import Payload
from app.services.insight_service import insights

router = APIRouter(tags=["insights"])


@router.post("/insights", response_model=InsightResponse)
def get_insights(payload: Payload) -> InsightResponse:
    """Chart-ready series and global feature importances for the analytics page."""
    return insights(payload)
