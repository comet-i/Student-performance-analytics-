import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.ml.predictor import get_predictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    predictor = get_predictor()
    log.info("Model: %s", predictor.version if predictor else "none (cold-start rules)")
    yield


app = FastAPI(
    title="Student Performance Analytics Engine",
    version="1.0.0",
    docs_url="/docs" if settings.enable_docs else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.enable_docs else None,
    lifespan=lifespan,
)
# No CORS: only the Render backend talks to this service, never the browser.
app.include_router(api_router)


@app.exception_handler(Exception)
def unhandled(request: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error on %s", request.url.path)
    return JSONResponse({"detail": "Internal error"}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
