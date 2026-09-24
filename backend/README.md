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
python3.12 -m scripts.fetch_open_data           # download Census 2011 + district boundaries
python3.12 -m scripts.seed_all                  # build the demo database
python3.12 app.py                               # http://localhost:8000/docs
```

Tests:

```bash
python3.12 -m pytest -q
```

Python 3.12 is required: the code uses `X | None` type syntax, so macOS's bundled `python3` (3.9) will not run it.

## Data

| Layer | Source | Coverage |
|---|---|---|
| Population, literacy, urbanisation | **Census of India 2011** (Registrar General), via `scripts/fetch_open_data.py` | 35 states/UTs, 640 districts |
| Electricity, tap water, latrines, telephone, housing, literacy indices | Computed directly from Census 2011 household-amenity tables | same |
| Roads, healthcare, waste, lighting, environment, disaster, irrigation, welfare, employment, public space indices | Estimated from census signals — **labelled `estimated` everywhere it is shown** | same |
| District boundaries | Survey of India boundaries keyed to Census 2011 district codes | 630 of 640 districts |
| Projects, budgets | Modelled on state budget and PMGSY/JJM/SBM project lists | Gujarat (pilot state) |
| National priority programmes | Union and state flagship programmes (public documents) | India |

`data/raw/india/MANIFEST.json` records the URL, size, SHA-256 and retrieval time of every downloaded file.
Measured and estimated figures are kept in separate dataset records so a policymaker can always tell them apart.

## National layer (BigQuery)

Postgres runs the operational loop. BigQuery holds the two analytical tables a ministry would query
across every state at once — `district_profile` (640 districts) and `demand_snapshot` (district × category).
Without credentials the platform runs entirely on Postgres and the dashboards say so.

```bash
python3.12 -m scripts.sync_bigquery
```

## Deploy (Cloud Run)
```bash
gcloud run deploy brics-backend --source . --region asia-south1 --allow-unauthenticated
```

Frontend lives in [BRICS-frontend](https://github.com/heetkevadiya/BRICS-frontend).
