"""The contract between Gemini and the backend. Gemini must fill this; Pydantic enforces it.
No field defaults: the Gemini API rejects them in response schemas, so every key is explicit (null allowed)."""
from __future__ import annotations

from pydantic import BaseModel, Field


class LocationGuess(BaseModel):
    district: str | None = Field(description="District name if mentioned or clearly implied, in English; else null")
    locality: str | None = Field(description="Village, town, ward or landmark as written by the citizen; else null")


class ExtractionResult(BaseModel):
    detected_language: str = Field(description="BCP-47 code of the citizen's language, e.g. gu, hi, en, mr. Use 'hi-Latn' for Hinglish.")
    transcript: str | None = Field(description="If audio was given: verbatim transcript in the original language. Else null.")
    translated_text: str = Field(description="Faithful English translation of the citizen's message")
    category_code: str = Field(description="One primary category code from the allowed list")
    secondary_category_code: str | None = Field(description="Optional second category code from the allowed list, else null")
    sub_category: str | None = Field(description="Short sub-type, e.g. 'damaged road', 'no doctor'")
    problem_description: str = Field(description="One neutral English sentence describing the problem and its consequence")
    urgency_score: int = Field(ge=1, le=10, description="1 = cosmetic, 5 = daily inconvenience, 8 = safety/health risk, 10 = life-threatening or emergency access blocked")
    urgency_reason: str = Field(description="One phrase justifying the urgency")
    location: LocationGuess
    entities: list[str] = Field(description="Key nouns: road, ambulance, school, transformer ...")
    affected_population_estimate: int | None = Field(description="Rough number of people affected if the citizen implies it (a village ≈ 2000, a ward ≈ 15000), else null")
    is_spam_or_irrelevant: bool = Field(description="True if the message is abuse, advertising, or not a civic issue")
    confidence: float = Field(ge=0, le=1, description="Your confidence that category, location and urgency are correct")
