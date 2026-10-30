from fastapi import APIRouter

from app.ml.pipelines.cold_start import COLD_START_VERSION
from app.ml.predictor import get_predictor

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict:
    """Unauthenticated: Render's health check and the backend's circuit breaker both poll this."""
    predictor = get_predictor()
    return {
        "status": "ok",
        "model_loaded": predictor is not None,
        "model_version": predictor.version if predictor else COLD_START_VERSION,
    }
