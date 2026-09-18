"""Single place that talks to Google Gemini. Every other service goes through this adapter so the
provider can be swapped (DPG requirement) without touching business logic."""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from typing import TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import settings

log = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


@lru_cache(maxsize=1)
def client() -> genai.Client:
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")
    return genai.Client(api_key=settings.gemini_api_key)


def generate_structured(prompt: str | list, schema: type[T], *, temperature: float = 0.1, audio: bytes | None = None,
                        audio_mime: str | None = None) -> T:
    """Ask Gemini for JSON that matches `schema`, validate it with Pydantic, retry once on invalid output."""
    contents: list = [prompt] if isinstance(prompt, str) else list(prompt)
    if audio:
        contents.append(types.Part.from_bytes(data=audio, mime_type=audio_mime or "audio/webm"))
    cfg = types.GenerateContentConfig(
        temperature=temperature,
        response_mime_type="application/json",
        response_schema=schema,
    )
    last_err: Exception | None = None
    for attempt in range(2):
        resp = client().models.generate_content(model=settings.gemini_model, contents=contents, config=cfg)
        try:
            return schema.model_validate_json(resp.text)
        except Exception as e:  # invalid JSON / schema violation → retry once, then fail loudly
            last_err = e
            log.warning("Gemini structured output invalid (attempt %s): %s", attempt + 1, e)
    raise ValueError(f"Gemini returned invalid structured output: {last_err}")


def generate_text(prompt: str, *, temperature: float = 0.3) -> str:
    resp = client().models.generate_content(
        model=settings.gemini_model, contents=prompt, config=types.GenerateContentConfig(temperature=temperature)
    )
    return (resp.text or "").strip()


def embed(texts: list[str], *, task_type: str = "SEMANTIC_SIMILARITY", batch: int = 50) -> list[list[float]]:
    out: list[list[float]] = []
    for i in range(0, len(texts), batch):
        chunk = texts[i : i + batch]
        resp = client().models.embed_content(
            model=settings.gemini_embedding_model, contents=chunk, config=types.EmbedContentConfig(task_type=task_type)
        )
        out.extend([e.values for e in resp.embeddings])
    return out


def model_name() -> str:
    return settings.gemini_model
