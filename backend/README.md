# BRICS-backend — Citizen Demand & Policy Decision-Support API

Backend for the multilingual AI Digital Public Good built for **Build with AI: Code for Communities (2nd edition)**, Track 01 — AI for Digital Public Infrastructure & Governance.

Core loop: citizen voice/text/message → Gemini understanding → structured request → clustering → government-data join → hotspots → transparent priority score → evidence-backed recommendation → analyst verification → policymaker → impact measurement.

## Stack
FastAPI · PostgreSQL + PostGIS · Gemini (extraction, embeddings, explanation) · Cloud Speech-to-Text · Cloud Translation · BigQuery (national datasets) · Firebase Auth · Cloud Run

## Run

Dependencies are installed into Homebrew Python 3.12 directly — there is no virtualenv to activate.

```bash
python3.12 -m pip install -r requirements.txt   # first time only
cp .env.example .env                            # fill in GEMINI_API_KEY
createdb brics && psql brics -c "CREATE EXTENSION IF NOT EXISTS postgis;"
python3.12 -m scripts.seed_all                  # build the demo database
python3.12 app.py                               # http://localhost:8000/docs
```

Tests:

```bash
python3.12 -m pytest -q
```

Python 3.12 is required: the code uses `X | None` type syntax, so macOS's bundled `python3` (3.9) will not run it.

## Deploy (Cloud Run)
```bash
gcloud run deploy brics-backend --source . --region asia-south1 --allow-unauthenticated
```

Frontend lives in [BRICS-frontend](https://github.com/heetkevadiya/BRICS-frontend).
