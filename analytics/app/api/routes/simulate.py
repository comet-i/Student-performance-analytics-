from fastapi import APIRouter

from app.schemas.payload import SimulateRequest
from app.schemas.prediction import SimulationResponse
from app.services.simulation_service import simulate

router = APIRouter(tags=["simulate"])


@router.post("/simulate", response_model=SimulationResponse)
def simulate_scenario(request: SimulateRequest) -> SimulationResponse:
    """What-if for one subject. Not persisted: the planner calls this on every slider change."""
    return simulate(request)
