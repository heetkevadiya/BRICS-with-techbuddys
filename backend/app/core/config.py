import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/brics"
    cors_origins: str = "http://localhost:5173"

    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    # Gemini 2.5 spends "thinking" tokens before answering. For extraction it buys nothing:
    # `python -m scripts.eval_thinking_budget` over 22 labelled cases (4 languages, all 17
    # categories) scores 22/22 on category, district and language either way, and thinking is
    # marginally WORSE on urgency (MAE 1.23 vs 1.14) while costing 2.8x more (779 vs 232 output
    # tokens). Re-run that script before changing this. -1 lets the model decide, 0 disables it.
    gemini_thinking_budget: int = 0
    google_application_credentials: str = ""
    google_cloud_project: str = ""
    bigquery_dataset: str = "citizen_demand"
    bigquery_location: str = "asia-south1"
    firebase_project_id: str = ""
    role_switching: bool = True

    default_country: str = "IN"
    default_state: str = "Gujarat"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def credentials_path(self) -> Path | None:
        """The service-account file, resolved against the backend directory when given relatively."""
        if not self.google_application_credentials:
            return None
        p = Path(self.google_application_credentials)
        p = p if p.is_absolute() else BASE_DIR / p
        return p if p.exists() else None


settings = Settings()

# Google's client libraries read this from the process environment, not from our settings object,
# so publish it once at import time. Without this, BigQuery/Speech/Translation stay silently disabled
# even though the .env names a valid key file.
if settings.credentials_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str(settings.credentials_path)
if settings.google_cloud_project:
    os.environ.setdefault("GOOGLE_CLOUD_PROJECT", settings.google_cloud_project)
