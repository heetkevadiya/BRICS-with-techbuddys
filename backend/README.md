# BRICS-backend — Citizen Demand & Policy Decision-Support API

Backend for the multilingual AI Digital Public Good built for **Build with AI: Code for Communities (2nd edition)**, Track 01 — AI for Digital Public Infrastructure & Governance.

Core loop: citizen voice/text/message → Gemini understanding → structured request → clustering → government-data join → hotspots → transparent priority score → evidence-backed recommendation → analyst verification → policymaker → impact measurement.

## Stack
FastAPI · PostgreSQL + PostGIS · Gemini (extraction, embeddings, explanation) · Cloud Speech-to-Text · Cloud Translation · BigQuery (national datasets) · Firebase Auth · Cloud Run

## Run locally
```bash
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # fill GEMINI_API_KEY etc.
createdb brics && psql brics -c "CREATE EXTENSION IF NOT EXISTS postgis;"
uvicorn app.main:app --reload    # http://localhost:8000/docs
pytest
```

## Deploy (Cloud Run)
```bash
gcloud run deploy brics-backend --source . --region asia-south1 --allow-unauthenticated
```

Frontend lives in [BRICS-frontend](https://github.com/heetkevadiya/BRICS-frontend).
