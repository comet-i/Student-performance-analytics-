from fastapi import APIRouter

from app.schemas.payload import Payload
from app.schemas.prediction import PredictionResponse
from app.services.prediction_service import predict

router = APIRouter(tags=["predict"])


@router.post("/predict", response_model=PredictionResponse)
def predict_scores(payload: Payload) -> PredictionResponse:
    """One prediction per subject, plus a credit-weighted 'Overall' row first.

    The backend writes these into `predictions` and mirrors predicted_score /
    recommended_weekly_hours onto `enrollments`.
    """
    return predict(payload)
