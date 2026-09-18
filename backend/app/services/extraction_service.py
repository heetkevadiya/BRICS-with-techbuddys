"""Gemini turns an unstructured citizen message (text or audio) into a validated ExtractionResult."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Category
from app.schemas.ai import ExtractionResult
from app.services.ai import gemini_client

SYSTEM = """You are the intake analyst for an Indian government citizen-feedback platform.
Citizens write or speak in any Indian language, often mixing languages (e.g. Hinglish, Gujarati in Latin script).
Your job: understand the message and fill the JSON schema exactly. Do not invent facts that are not in the message.
If the location is not mentioned, leave district null. Never guess a district from the language alone.

Allowed category codes (pick the closest; use OTHER only if nothing fits):
{categories}

Urgency guide: 1-3 cosmetic or minor inconvenience; 4-6 daily hardship for many; 7-8 health, safety or livelihood at risk;
9-10 emergency access blocked, contamination, collapse risk, or lives in danger.
"""


def _category_block(db: Session) -> str:
    cats = db.query(Category).filter_by(is_active=True).order_by(Category.sort_order).all()
    return "\n".join(f"- {c.code}: {c.name} ({', '.join(c.sub_categories[:5])})" for c in cats)


def extract(db: Session, *, text: str | None = None, audio: bytes | None = None, audio_mime: str | None = None,
            declared_language: str | None = None, known_district: str | None = None) -> ExtractionResult:
    prompt = SYSTEM.format(categories=_category_block(db))
    if declared_language:
        prompt += f"\nThe citizen declared their language as: {declared_language}."
    if known_district:
        prompt += f"\nThe submission form already says the district is: {known_district}. Use it unless the message clearly says otherwise."
    if text:
        prompt += f"\n\nCitizen message:\n\"\"\"\n{text.strip()}\n\"\"\""
    else:
        prompt += "\n\nThe citizen message is the attached audio. Transcribe it verbatim first (field `transcript`), then analyse."
    result = gemini_client.generate_structured(prompt, ExtractionResult, audio=audio, audio_mime=audio_mime)
    valid_codes = {c.code for c in db.query(Category.code)}
    if result.category_code not in valid_codes:
        result.category_code = "OTHER"
        result.confidence = min(result.confidence, 0.5)
    if result.secondary_category_code and result.secondary_category_code not in valid_codes:
        result.secondary_category_code = None
    return result
