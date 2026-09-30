# Architecture — Citizen Demand → Development Priorities

**Track 01 · AI for Digital Public Infrastructure & Governance · Build with AI: Code for Communities 2026**

One sentence: **Google AI understands unstructured citizen language, deterministic Python computes every
number, and a human makes every decision.** No model is ever inside the priority formula.

---

## 1. The request path

```
   CITIZEN                         GOOGLE AI                      DETERMINISTIC          HUMAN
   ───────                         ─────────                      ─────────────          ─────
 voice · text                                                                         
 WhatsApp · SMS  ──┐                                                                  
 IVR · web form    │                                                                  
                   │                                                                  
                   ▼                                                                  
         ┌──────────────────┐   ┌───────────────────────┐                             
         │ Firebase Hosting │   │ Cloud Speech-to-Text   │  audio → transcript         
         │  React 19 + Vite │   │        (Chirp)         │                             
         └────────┬─────────┘   └───────────┬───────────┘                             
                  │ HTTPS /api              │                                         
                  ▼                         ▼                                         
         ┌───────────────────────────────────────────────┐                            
         │            Cloud Run — FastAPI                │                            
         │  Firebase Auth verifies the ID token here     │                            
         └───────┬───────────────────────────────┬───────┘                            
                 │                               │                                    
                 ▼                               │                                    
     ┌───────────────────────────┐               │                                    
     │   Gemini 3.8 Flash        │               │                                    
     │   JSON schema mode        │               │                                    
     │   thinking_budget = 0     │               │                                    
     │                           │               │                                    
     │   language · translation  │               │                                    
     │   category · sub-category │               │                                    
     │   urgency 1–10 · district │               │                                    
     │   entities · confidence   │               │                                    
     └───────────┬───────────────┘               │                                    
                 ▼                               │                                    
     ┌───────────────────────────┐               │                                    
     │  Gemini Embedding (3072d) │               │                                    
     │  groups reports of one    │               │                                    
     │  issue by cosine ≥ 0.78   │               │                                    
     └───────────┬───────────────┘               │                                    
                 ▼                               ▼                                    
     ┌───────────────────────────────────────────────────┐                            
     │      PostgreSQL 18 + PostGIS  (Cloud SQL)         │                            
     │  requests · clusters · 640 districts · Census 2011 │                            
     │  infrastructure indices · budgets · projects       │                            
     └───────────┬───────────────────────────────┬───────┘                            
                 │                               │                                    
                 ▼                               ▼                                    
     ┌───────────────────────────┐   ┌──────────────────────────┐                     
     │  priority_service.py      │   │  BigQuery                │                     
     │  PURE PYTHON — NO MODEL   │   │  national analytical     │                     
     │                           │   │  tables, all 35 states   │                     
     │  0.30 demand              │   │  in one query            │                     
     │ +0.25 infrastructure gap  │   └──────────────────────────┘                     
     │ +0.20 population impact   │                                                    
     │ +0.15 urgency             │                                                    
     │ +0.10 policy alignment    │                                                    
     └───────────┬───────────────┘                                                    
                 ▼                                                                    
     ┌───────────────────────────┐        ┌──────────────────────────┐                
     │  Gemini 3.8 Flash writes  │        │  Google Maps Platform    │                
     │  a 3-sentence briefing    │        │  district choropleth     │                
     │  FROM the computed        │        └──────────────────────────┘                
     │  evidence. It cannot      │                                                    
     │  change a single number.  │                                                    
     └───────────┬───────────────┘                                                    
                 ▼                                                                    
        ANALYST verifies  ─────────────────────────────▶  POLICYMAKER decides         
        (audit trail: old value, new value, who, why)     (accepting freezes today's   
                                                           numbers for impact measurement)
```

---

## 2. Which Google service does what, and what it is forbidden to do

| Service | Does | Is never allowed to |
|---|---|---|
| **Gemini 3.8 Flash** (`app/services/extraction_service.py`) | Detects language incl. code-mixed Hinglish, translates to English, extracts category, sub-category, urgency 1–10, district, entities, self-reported confidence | Modify the citizen's original text; set or influence a priority score |
| **Gemini Embedding** (`gemini_client.embed`, 3072-dim) | Groups differently-worded reports of the same issue within one district × category | Merge across districts or categories; delete a report |
| **Cloud Speech-to-Text (Chirp)** | Transcribes voice notes in Indian languages; Gemini's native audio understanding is the fallback | Discard the audio — it is retained so a failed transcript can be retried by a human |
| **Cloud Translation** | Serves category and UI labels in 14 Indian languages | Touch stored citizen text |
| **BigQuery** | Holds `district_profile` (640 districts) and `demand_snapshot` (district × category) for national queries across all 35 states at once | Serve the operational write path — that is PostgreSQL |
| **Google Maps Platform** | Renders the district choropleth on the policymaker dashboard | Be the only map — an inline SVG choropleth works with no key, no network, no billing |
| **Firebase Auth** | Verifies the ID token on every guarded route (`app/api/deps.py`) | Grant a role the token does not carry |
| **Firebase Hosting** | Serves the React build | — |
| **Cloud Run** | Runs the FastAPI container, scales to zero between demos | — |

**The line that matters:** `app/services/priority_service.py` imports no AI client. The score is
`0.30·demand + 0.25·infra_gap + 0.20·population_impact + 0.15·urgency + 0.10·policy_alignment`,
computed in pure Python from database values. Identical inputs always produce an identical score, so
the ranking is auditable and arguable in a way a model's output is not.

---

## 3. Prompt configuration

The system instruction lives in `app/services/extraction_service.py` (`SYSTEM`). It is assembled at
request time, not hard-coded, so the category list always matches the database:

- Role: intake analyst for an Indian government citizen-feedback platform.
- Explicit instruction not to invent facts, and **never to guess a district from the language alone**
  — the single most damaging failure mode, since it would put demand in the wrong district and move
  real money.
- The allowed category codes are injected from the `categories` table (17 codes with sub-categories),
  so adding a category is a database row, not a code change.
- A calibrated urgency rubric: 1–3 cosmetic · 4–6 daily hardship · 7–8 health/safety/livelihood at
  risk · 9–10 emergency.
- Structured output is enforced with `response_schema=ExtractionResult` (Pydantic v2), validated on
  return, retried once, and a category outside the vocabulary is forced to `OTHER` with confidence
  capped at 0.5.
- `thinking_budget = 0`. Measured, not assumed: on 22 labelled cases across 4 languages, thinking
  changed no categorical outcome and was marginally worse on urgency, at 2.6× the cost
  ($0.000758 vs $0.002834 per request). `scripts/eval_thinking_budget.py` reproduces the comparison.

## 4. Edge cases the pipeline handles

| Case | Behaviour |
|---|---|
| Gemini returns malformed JSON | One retry, then the request is marked `FAILED` with the error stored; the citizen's text is untouched and it can be reprocessed |
| Confidence below 0.60 | Routed to the analyst queue, excluded from totals until a human approves |
| District not resolvable | Routed to a human rather than guessed |
| Category outside the vocabulary | Forced to `OTHER`, confidence capped, routed to a human |
| Unsupported language | Flagged for a human rather than silently mis-parsed |
| Same citizen reports twice in 14 days | Linked as a duplicate, counted once in unique-citizen totals |
| Maps key missing or rate-limited | Inline SVG choropleth renders instead |
| BigQuery unreachable | `status()` reports the real reason; the platform runs entirely on PostgreSQL |

## 5. Repository layout

```
backend/            FastAPI · SQLAlchemy 2 · Alembic · PostgreSQL 18 + PostGIS
  app/api/          HTTP routes, role dependencies
  app/services/     ai/gemini_client.py is the ONLY place that talks to Gemini
  app/analytics/    aggregation, alignment quadrants — pure pandas, no AI
  app/ingestion/    Census 2011 + district boundary loaders, data.gov.in connector
  scripts/          seeding, BigQuery sync, the thinking-budget evaluation
  tests/            21 tests: priority formula, analytics, warehouse, auth, clustering

frontend/           React 19 · Vite · Tailwind v4 · Recharts · MUI icons
  src/pages/        home · citizen · analyst · policymaker · ai
  src/theme.js      colour tokens validated against colour-blindness checks
```

Every Gemini call goes through one adapter (`app/services/ai/gemini_client.py`), so the model
provider can be replaced without touching business logic — a Digital Public Good requirement.

## 6. Data provenance

Measured and estimated figures are stored as **separate dataset records** and labelled differently in
the UI. Census 2011 figures for all 640 districts are official; infrastructure indices beyond the six
census-derived ones are stated linear formulas over census signals; the citizen corpus is generated
demo traffic. The full breakdown is in [DATA_PROVENANCE.md](DATA_PROVENANCE.md), and the policymaker
dashboard prints the provenance of every dataset it reads.
