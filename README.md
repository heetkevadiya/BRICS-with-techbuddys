# BRICS Multilingual Citizen

AI-assisted multilingual citizen-grievance platform for Code for Communities 2026.
Gemini understands unstructured citizen input; deterministic code calculates every
number; humans decide. Census-measured figures and estimates stay labelled apart.

| Folder | Stack | Scope |
|---|---|---|
| `backend/` | FastAPI · SQLAlchemy · PostgreSQL/PostGIS · Gemini | API, AI pipeline, data, analytics |
| `frontend/` | React · Vite · Tailwind | citizen / analyst / policymaker UI, submission assets |

Reference documents:

- `AI_Digital_Public_Good_Implementation_Blueprint.md` — the product & architecture blueprint
- `HACKATHON_BRIEF.md` — official problem statement, rules, judging, timeline, submission package
- `API_CONTRACT.md` — the backend ↔ frontend contract both sides build against
- `DATA_PROVENANCE.md` — what is Census-measured versus generated
- `GCP_SETUP.md` — Google Cloud / Gemini credentials setup

## Run

- Backend: `cd backend && python3.12 app.py` → http://localhost:8000/docs
- Frontend: `cd frontend && npm run dev` → http://localhost:5173
- Tests: `cd backend && python3.12 -m pytest -q`
- Reseed: `cd backend && python3.12 -m scripts.seed_all`

Deadline: **30 September 2026, 23:59 IST**.
