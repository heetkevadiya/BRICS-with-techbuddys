"""Speech-to-text adapter. Cloud Speech-to-Text (Chirp) when a service account is configured; otherwise Gemini's
native audio understanding — both are Google AI, and the pipeline does not care which one answered."""
from __future__ import annotations

import logging

from app.core.config import settings
import os

log = logging.getLogger(__name__)

_LANG_HINTS = {"gu": "gu-IN", "hi": "hi-IN", "en": "en-IN", "mr": "mr-IN", "ta": "ta-IN", "te": "te-IN", "bn": "bn-IN",
               "kn": "kn-IN", "ml": "ml-IN", "pa": "pa-IN", "or": "or-IN", "ur": "ur-IN"}


def cloud_stt_available() -> bool:
    """A key file locally, or the ambient credentials Cloud Run provides."""
    return bool(settings.credentials_path or settings.google_cloud_project)


def transcribe_with_cloud_stt(audio: bytes, mime: str, language: str | None) -> tuple[str, str]:
    """Returns (transcript, language_code). Requires GOOGLE_APPLICATION_CREDENTIALS."""
    from google.cloud import speech

    client = speech.SpeechClient()
    encoding = speech.RecognitionConfig.AudioEncoding.WEBM_OPUS if "webm" in mime else speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED
    primary = _LANG_HINTS.get((language or "hi")[:2], "hi-IN")
    alternates = [c for c in ("gu-IN", "hi-IN", "en-IN") if c != primary]
    cfg = speech.RecognitionConfig(
        encoding=encoding, language_code=primary, alternative_language_codes=alternates,
        enable_automatic_punctuation=True, model="latest_long",
    )
    resp = client.recognize(config=cfg, audio=speech.RecognitionAudio(content=audio))
    transcript = " ".join(r.alternatives[0].transcript for r in resp.results if r.alternatives)
    lang = resp.results[0].language_code if resp.results else primary
    return transcript, lang[:2]
