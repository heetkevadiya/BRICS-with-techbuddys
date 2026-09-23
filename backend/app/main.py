import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import config as config_api
from app.api import dashboard, datasets, recommendations, requests
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

app = FastAPI(
    title="Citizen Demand & Policy Decision-Support API",
    description=(
        "Multilingual AI Digital Public Good that turns citizen voices into "
        "geographically grounded, evidence-based development priorities. "
        "AI (Gemini) understands; deterministic code calculates; humans decide."
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (requests.router, dashboard.router, recommendations.router, datasets.router, config_api.router):
    app.include_router(r, prefix="/api")


@app.get("/health", tags=["system"])
@app.get("/api/health", include_in_schema=False)
def health() -> dict:
    return {"status": "ok", "env": settings.app_env, "model": settings.gemini_model}
