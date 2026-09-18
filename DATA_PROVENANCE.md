# Data provenance

Every figure this platform shows comes from one of two places: a government dataset that was
downloaded, or data that was generated for the demo. This document says exactly which is which.

The same distinction is enforced in the product, not just in this file — the dashboard labels each
dataset `official` or `estimated`, and the API returns `is_synthetic` on every dataset record.

---

## A. Downloaded — real government data

Fetched by `python -m scripts.fetch_open_data`, which records the URL, byte size, SHA-256 and
retrieval time in `backend/data/raw/india/MANIFEST.json`. Re-running reproduces them exactly.

### A1. Census of India 2011 — district tables
- **Publisher:** Office of the Registrar General & Census Commissioner, Ministry of Home Affairs
- **Landing page:** https://censusindia.gov.in/census.website/data/census-tables
- **File:** `census_2011_districts.csv`, 447,908 bytes, sha256 `88c924d78dc7d8b2`
- **Licence:** Government Open Data License – India (GODL)
- **Coverage:** 640 districts, 35 states/UTs, 1,210,854,977 people (the Census 2011 India total)

Used directly for:

| Field | Census column |
|---|---|
| population | Population |
| literacy_rate | Literate ÷ Population |
| urban_population_pct | Urban_Households ÷ total households |
| mobile_penetration_pct | Households_with_Telephone_Mobile_Phone ÷ Households |

And for six of the sixteen infrastructure indices, computed as a percentage of households:

| Index | Census column |
|---|---|
| `electricity_index` | Housholds_with_Electric_Lighting |
| `water_index` | Main_source_of_drinking_water_Tapwater_Households |
| `sanitation_index` | Having_latrine_facility_within_the_premises_Total_Households |
| `connectivity_index` | Households_with_Telephone_Mobile_Phone |
| `housing_index` | 100 − (Condition_of_occupied_census_houses_Dilapidated_Households ÷ Households) |
| `education_index` | literacy rate |

Verified against the source to the decimal: Kachchh 49.7, Surat 55.1, Dohad 8.6, The Dangs 14.2.

### A2. District boundaries
- **Source:** Survey of India boundaries, keyed to Census 2011 district codes
- **File:** `india_districts.geojson`, 4,089,052 bytes, sha256 `e724c14bc5ee68bc`
- **Coverage:** 630 of 640 districts matched (98.4%) — 622 by census code, 8 by name

The 10 unmatched are Delhi's nine sub-districts and Mumbai Suburban, which the boundary file treats
differently. They still carry full demographics and indices; they have no map polygon.

### A3. National priority programmes
- **Source:** Union and state flagship programmes, from public government documents
  (PMGSY, Jal Jeevan Mission, Swachh Bharat, Ayushman Bharat / PM-ABHIM, Samagra Shiksha, Saubhagya,
  PMAY, BharatNet, MGNREGA, NDMP, PM-KUSUM, Aspirational Districts Programme)
- **What is real:** the programmes, their objectives and their stated targets
- **What was curated:** which districts are listed as targets, and the mapping from programme to
  category. That curation is ours, not an official designation.

---

## B. Generated — made for this demo

All of it is labelled `estimated` in the dashboard and carries `is_synthetic: true` in the API.

### B1. Citizen requests — 20,000 records
- **Script:** `scripts/generate_synthetic_requests.py`
- **What it is:** messages written by us across 25 issue templates, in Gujarati, Hindi, Hinglish and
  English, distributed across 26 Gujarat districts and six channels over 180 days.
- **Why synthetic:** no platform like this exists yet, so there is no real corpus of citizen
  development requests to draw on. The hackathon rules permit sample data for exactly this case.
- **What is genuinely real inside it:** the cluster centroids are true Gemini embeddings, so a live
  message submitted during a demo lands in the correct pre-existing cluster.
- **Deliberate storylines:** certain district × category pairs were given elevated demand so the
  analysis has something meaningful to find — e.g. Dohad healthcare, The Dangs roads, Kachchh water.
  These are plausible, and they are invented.
- **Confidence is seeded, not measured:** these rows carry `ai_model = "seed-template"` and an
  `ai_confidence` drawn from a distribution that puts ~6% below the 0.60 review threshold, so the
  analyst queue has realistic volume. Only messages submitted live carry `ai_model =
  "gemini-2.5-flash"` and a confidence Gemini actually reported. The AI accuracy page prints this
  split. **The measured accuracy figures come from `scripts/eval_thinking_budget.py` running live
  Gemini over 22 labelled cases — never from these seeded confidences.**

### B2. Ten infrastructure indices — 640 districts
- **Script:** `app/ingestion/india_loader.py`
- **Indices:** road, healthcare, waste, lighting/safety, environment, disaster resilience,
  irrigation, welfare access, employment, public space
- **Method:** each is a stated linear formula over real census signals (urbanisation, literacy,
  electrification, sanitation, connectivity) plus a seeded ±6 point jitter. The formulas are in the
  source, not hidden.
- **Why:** the census does not measure these. Real alternatives exist — PMGSY district road length
  and the Rural Health Statistics facility counts on data.gov.in — and the connector to ingest them
  is written; it is blocked only on an API key.
- **This matters:** roads and healthcare drive the top-ranked recommendations, and both are
  currently estimates.

### B3. Government projects — 40 records
- **File:** `data/seed/government_projects.csv`
- **What it is:** project names, budgets, statuses and dates written by us, modelled on the shape of
  real schemes (PMGSY, AMRUT 2.0, NCRMP, SBM-U, PM-ABHIM, Smart Cities).
- **Not** an extract from any state's project MIS.

### B4. Public investment plan FY2026-27 — 544 records
- **File:** `data/seed/investment_plans.csv`
- **Method:** a per-capita norm per sector, multiplied by district population, with deliberate
  overrides so the alignment analysis has both underserved gaps and possible mismatches to find.
- **Not** an extract from any budget document.

### B5. Category taxonomy and district aliases
- **Files:** `data/seed/categories.json`, `data/seed/district_aliases.json`
- **What it is:** the 17 categories, their local-language names, owning departments and SDG tags;
  and the map from citizen spellings and post-2011 district names onto Census 2011 districts.
- **Status:** our editorial work. The department names and SDG mappings follow real conventions;
  the grouping is ours.

---

## C. Not data — measured results

`data/eval/extraction_report.json` holds the output of `python -m scripts.eval_thinking_budget`,
which runs Gemini against 22 labelled cases in `tests/eval/extraction_cases.json`. The labels were
written by us; the accuracy numbers are measured, and re-running reproduces them.

---

## Summary

| | Rows | Source |
|---|---|---|
| Census demographics | 640 | **Downloaded** — Census of India 2011 |
| Six infrastructure indices | 640 | **Downloaded** — computed from Census 2011 |
| District boundaries | 630 | **Downloaded** — Survey of India / Census codes |
| National priority programmes | 13 | **Downloaded** (curated mapping) |
| Ten infrastructure indices | 640 | **Generated** — estimated from census signals |
| Citizen requests | 20,000 | **Generated** |
| Government projects | 40 | **Generated** |
| Investment plan | 544 | **Generated** |

**Real government data covers the population and geography of all of India.**
**Everything about citizen demand, current projects and budgets is generated, and labelled as such.**
