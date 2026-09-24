"""Translation adapter for talking back to citizens in their language.
Cloud Translation when configured, else Gemini. Detection + English translation of incoming messages is done
inside the extraction call to save a round-trip."""
from __future__ import annotations

from app.core.config import settings
from app.services.ai import gemini_client

LANG_NAMES = {"gu": "Gujarati", "hi": "Hindi", "en": "English", "mr": "Marathi", "ta": "Tamil", "te": "Telugu",
              "bn": "Bengali", "kn": "Kannada", "ml": "Malayalam", "pa": "Punjabi", "or": "Odia", "ur": "Urdu",
              "hi-Latn": "Hinglish (Hindi written in Latin script)"}


def translate(text: str, target_lang: str) -> str:
    if target_lang in ("en", None) or not text:
        return text
    if settings.credentials_path:
        from google.cloud import translate_v2 as translate

        return translate.Client().translate(text, target_language=target_lang[:2])["translatedText"]
    name = LANG_NAMES.get(target_lang, target_lang)
    return gemini_client.generate_text(
        f"Translate the following message into {name} for an ordinary citizen. Keep it short and respectful. "
        f"Return only the translation.\n\n{text}", temperature=0.2
    )
