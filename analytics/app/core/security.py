import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.core.config import settings


def verify_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    """Only the backend calls this service; the engine itself holds no database credentials."""
    if not x_api_key or not hmac.compare_digest(x_api_key.encode(), settings.ml_engine_api_key.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or missing API key")
