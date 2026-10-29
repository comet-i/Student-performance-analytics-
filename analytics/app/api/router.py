from fastapi import APIRouter, Depends

from app.api.routes import health, insights, predict, recommendations, simulate
from app.core.security import verify_api_key

api_router = APIRouter()
api_router.include_router(health.router)

v1 = APIRouter(prefix="/v1", dependencies=[Depends(verify_api_key)])
for module in (predict, simulate, recommendations, insights):
    v1.include_router(module.router)
api_router.include_router(v1)
