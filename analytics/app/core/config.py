from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # shared secret, also configured on the Express backend as ML_ENGINE_API_KEY
    ml_engine_api_key: str = Field(min_length=16)
    model_path: Path = ROOT / "artifacts" / "model_v1.joblib"
    enable_docs: bool = False


settings = Settings()
