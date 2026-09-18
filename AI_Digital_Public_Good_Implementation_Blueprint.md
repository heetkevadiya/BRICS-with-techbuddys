# AI Digital Public Good for Citizen-Driven Development
## India Multilingual Citizen Demand & Policy Decision-Support Platform (scalable to BRICS)

**Document purpose:** This is the single implementation reference for the hackathon team.  
**Hackathon:** Build with AI: Code for Communities — Second Edition (Google Cloud + GDG India), Track 01 "AI for Digital Public Infrastructure & Governance". See `HACKATHON_BRIEF.md`.  
**Submission deadline:** 30 September 2026, 23:59 IST.  
**Team:** 2 people.  
**Status:** MVP architecture and implementation blueprint.

---

# 1. Executive Summary

Governments receive development-related complaints and requests through many disconnected channels: portals, phone calls, messaging apps, local offices, social media, surveys, and paper records.

At the same time, important government information such as population, infrastructure condition, existing projects, budgets, and investment plans may exist in separate datasets.

The result is a fragmented view of public needs.

Our platform converts this fragmented information into a structured decision-support system:

**Citizen voice → Structured problem → Geographic aggregation → Government-data integration → Priority analysis → Evidence-based recommendation → Policy decision → Impact measurement**

The platform does **not** replace policymakers and does not automatically approve government spending. It helps analysts and policymakers understand where the greatest development needs are and why.

---

# 2. Problem Statement

## Official track statement (judged against this, word for word)

**The Problem.** Governments across India struggle to consolidate citizen feedback and align it with national infrastructure priorities. Development requests live in fragmented systems, leading to misaligned public spending, unaddressed infrastructure gaps, and no way to measure the impact of large-scale digital public infrastructure initiatives.

**The Challenge.** Build a scalable, multilingual AI platform — designed as a Digital Public Good — that aggregates citizen development requests via voice, text, and messaging apps across diverse linguistic regions of India. The system should analyse large datasets combining citizen feedback with national demographic data, infrastructure indices, and public investment plans, surfacing demand hotspots and recommending high-priority development projects to national policymakers.

**Rule 04.** Solutions should be designed with cross-border applicability in mind — built for one context but scalable to others across BRICS nations.

So: **India is the product. BRICS is the scalability argument.**

## Questions the platform must answer

Governments need to answer questions such as:

- What problems are citizens reporting?
- Where are these problems concentrated?
- How many people are potentially affected?
- How urgent are the problems?
- Is the infrastructure in that location already weak?
- Is a project already planned there?
- How much investment is already allocated?
- Which areas should receive attention first?
- What evidence supports that recommendation?
- Did the situation improve after an intervention?

Today, these answers may require combining multiple disconnected systems and datasets manually.

## Our problem

There is no unified, multilingual platform that can combine:

1. citizen-generated development requests,
2. demographic information,
3. infrastructure indicators,
4. current and planned projects,
5. investment/budget information,

and convert them into transparent, geographically meaningful development priorities.

---

# 3. Proposed Solution

Build a multilingual AI-powered Digital Public Good that accepts citizen requests through:

- text,
- voice,
- messaging channels,

and transforms them into structured records.

The platform then combines citizen demand with authoritative external datasets and calculates:

- demand hotspots,
- problem clusters,
- trends,
- infrastructure gaps,
- affected population,
- urgency,
- existing project context,
- priority scores,
- recommended interventions.

The final output is shown through dashboards for:

- Government Analysts
- Policymakers

---

# 4. Core Principle

## Do NOT build this:

```text
All Data
   ↓
LLM
   ↓
Government Decision
```

This is risky, difficult to audit, and can produce unreliable decisions.

## Build this:

```text
Unstructured Citizen Input
        ↓
       AI
        ↓
Structured Citizen Data
        ↓
Deterministic Analysis
        ↓
Government Data Integration
        ↓
Priority Engine
        ↓
Recommendation Engine
        ↓
Evidence + Explanation
        ↓
Analyst Review
        ↓
Policymaker
```

### AI should understand data.

### Deterministic software should calculate important numbers.

### Humans should make final policy decisions.

---

# 5. Digital Public Good Compliance

The challenge requires the platform to be *designed as a Digital Public Good*. The DPG Alliance standard has nine indicators. The platform should satisfy each by design, not as an afterthought.

| DPG indicator | How the platform meets it |
|---|---|
| 1. Relevance to SDGs | Every category maps to an SDG (roads → SDG 9, water/sanitation → SDG 6, health → SDG 3, education → SDG 4, electricity → SDG 7). Every recommendation carries its SDG tag. |
| 2. Open licence | Code under an OSI-approved licence (Apache-2.0 or MIT). Documentation under CC-BY. |
| 3. Clear ownership | Ownership and governance model stated in the repository. |
| 4. Platform independence | No mandatory proprietary dependency. STT, translation, LLM and embedding providers sit behind an adapter interface so any country can swap in local or open models. Maps use OpenStreetMap. Database is PostgreSQL. |
| 5. Documentation | Setup guide, API docs, data-schema docs, country-onboarding guide. |
| 6. Mechanism for extracting data | All citizen, government and analysis data exportable in open formats (CSV / JSON / GeoJSON). No lock-in. |
| 7. Privacy and applicable laws | PII minimisation, consent at submission, retention rules, configurable per country's data-protection law (DPDP Act India, LGPD Brazil, POPIA South Africa, PIPL China, 152-FZ Russia). |
| 8. Open standards | REST / OpenAPI, GeoJSON, ISO 3166 country codes, ISO 639 language codes, published administrative-boundary codes. |
| 9. Do no harm by design | No profiling of individual citizens, content moderation of input, fairness normalisation of demand, human-in-the-loop on every decision. |

Design rules that follow from this:

```text
Every AI capability is a pluggable adapter with a documented interface.
Nothing in the core depends on one cloud vendor.
Open data in, open data out.
A country can run the whole platform on its own infrastructure.
```

---

# 6. Actors

## 5.1 Citizen

Can:

- submit a problem,
- use voice or text,
- communicate in local languages,
- provide location,
- optionally attach supporting information,
- receive acknowledgement,
- track the request.

## 5.2 Government Analyst

Can:

- view citizen requests,
- review AI classifications,
- correct incorrect AI results,
- inspect hotspots,
- inspect trends,
- compare citizen demand with government data,
- validate recommendations,
- generate reports.

## 5.3 Policymaker

Can:

- view national/regional overview,
- identify priority areas,
- inspect evidence,
- see affected population,
- see infrastructure gaps,
- see existing projects and investment,
- review recommendations,
- make final decisions.

## 5.4 Government Data Provider

Provides:

- demographic datasets,
- infrastructure datasets,
- project information,
- investment/budget information,
- geographic information.

---

# 7. End-to-End System Flow

The complete lifecycle is:

```text
                         CITIZEN
                            │
                 Voice / Text / Messaging
                            │
                            ▼
                  ┌──────────────────┐
                  │ Request Ingestion │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │  AI Understanding │
                  │                  │
                  │ Language         │
                  │ STT              │
                  │ Translation      │
                  │ Classification   │
                  │ Location         │
                  │ Urgency          │
                  └────────┬─────────┘
                           │
                           ▼
                  Structured Request
                           │
                           ▼
                  ┌──────────────────┐
                  │ Citizen Database │
                  └────────┬─────────┘
                           │
                           │
     ┌─────────────────────┴─────────────────────┐
     │                                           │
     │             EXTERNAL DATA                 │
     │                                           │
     │  Government APIs / CSV / Excel / PDF      │
     │  Demographics / Infrastructure / Projects │
     │  Investment / Budget / GIS                │
     │                                           │
     │                     ▼                     │
     │              Data Ingestion               │
     │                     ▼                     │
     │                Validation                 │
     │                     ▼                     │
     │               Transformation              │
     │                     ▼                     │
     │                Normalization              │
     │                     ▼                     │
     │            Government Data Store          │
     └─────────────────────┬─────────────────────┘
                           │
                           ▼
                    DATA INTEGRATION
                           │
                           ▼
                   DATA AGGREGATION
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Clusters         Hotspots          Trends
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                 Infrastructure Gap
                           │
                           ▼
                    Priority Engine
                           │
                           ▼
                Recommendation Engine
                           │
                           ▼
                     Explainability
                           │
                           ▼
                 Analyst Verification
                           │
                           ▼
                    POLICYMAKER
                           │
                           ▼
                   Policy Decision
                           │
                           ▼
                    Implementation
                           │
                           ▼
                  Outcome / Impact Data
                           │
                           ▼
                  Impact Measurement
                           │
                           └──────► Feedback Loop
```

---

# 8. Major System Modules

The system should be divided into these modules:

```text
1. Citizen Interface
2. Request Ingestion
3. AI Processing
4. Citizen Request Management
5. External Data Ingestion
6. Data Normalization & Integration
7. Analytics Engine
8. Priority Engine
9. Recommendation Engine
10. Analyst Verification
11. Dashboard
12. Authentication & Authorization
13. Audit & Observability
14. Impact Measurement
```

For the hackathon MVP, some modules can be implemented as services inside one backend instead of separate microservices.

---

# 9. Recommended MVP Technology Stack (Google AI mandatory)

The hackathon rules make Google AI integration mandatory and weight "Is Google AI doing meaningful work?" at 25% of the score. Every AI capability therefore runs on Google, behind the adapter interface described in the DPG section so it stays replaceable.

## AI (all Google)

| Capability | Google service | Where it is used |
|---|---|---|
| Structured extraction (category, problem, location, urgency, entities, confidence) | **Gemini** (Gemini API / Vertex AI), JSON-mode with schema | Request processing |
| Speech-to-text, Indian languages | **Cloud Speech-to-Text** (Chirp) | Voice channel, IVR |
| Language detection + translation (22 scheduled languages) | **Cloud Translation API** | Pipeline pivot to English, replies to citizens |
| Text-to-speech replies | **Cloud Text-to-Speech** | Voice acknowledgement in citizen's language |
| Embeddings for similarity / clustering | **Gemini Embedding** (Vertex AI text-embedding) | Duplicate detection, clusters |
| Grounded explanation of recommendations | **Gemini** with structured evidence as input only | Recommendation explanation |
| Citizen photo understanding (optional) | **Gemini multimodal** | Photo attached to a request |
| Conversational intake on messaging | **Dialogflow CX** (optional) or Gemini | WhatsApp / SMS bot |

## Frontend

- React + Vite + Tailwind CSS
- **Google Maps Platform** (Maps JavaScript API, data layer for district GeoJSON) — Leaflet/OSM as the open fallback for the DPG story
- Recharts for charts

## Backend

- Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2
- `google-genai` SDK, `google-cloud-speech`, `google-cloud-translate`, `google-cloud-texttospeech`

## Database

- PostgreSQL + PostGIS (operational store: requests, clusters, recommendations, audit)
- **BigQuery** for the national datasets layer (demographics, infrastructure indices, projects, investment) — this is where "large datasets" and "scale across India" is demonstrated

## Auth

- **Firebase Authentication** with custom claims for roles: citizen, analyst, policymaker, admin

## Data Processing

- Pandas, NumPy, Python ETL scripts loading data.gov.in CSVs into BigQuery / Postgres

## Background Processing

- FastAPI background tasks for the MVP; **Cloud Tasks / Pub/Sub** at scale

## Deployment (a live link is a submission requirement)

```text
Frontend → Firebase Hosting (or Cloud Run)
Backend  → Cloud Run (container, autoscaling)
Database → Cloud SQL for PostgreSQL (PostGIS enabled)
Datasets → BigQuery
AI       → Gemini API / Vertex AI, Cloud Speech, Cloud Translation
Secrets  → Secret Manager
```

Do not introduce Kubernetes, Kafka, or a large microservice architecture unless scale actually requires them.

## Two repositories

```text
BRICS-backend   FastAPI service, ETL scripts, datasets, tests
BRICS-frontend  React app (citizen, analyst, policymaker)
```

---

# 10. Data Model

The system has two major data worlds.

## World A: Citizen Data

```text
Citizen
Request
Message
Voice Input
Location
Language
Category
Urgency
Cluster
```

## World B: Government/External Data

```text
Demographics
Infrastructure
Government Project
Investment Plan
Budget
Geographic Entity
```

## World C: Analysis

```text
Hotspot
Trend
Priority Score
Recommendation
Evidence
Verification
Decision
Outcome
Impact Measurement
```

---

# 11. Category Taxonomy

Categories are the backbone of clustering, hotspots, the priority engine and the government-data join. They are citizen-facing, so they must match how people actually describe problems, and they map to government departments and SDGs for the policymaker view.

## Core categories (India MVP)

| Code | Category | Typical sub-categories | Dept. (typical) | SDG |
|---|---|---|---|---|
| ROADS | Roads & Transport | potholes, damaged road, missing road, bridge, footpath, traffic signal, bus service | PWD / Rural Roads / Transport | 9, 11 |
| WATER | Water Supply | no supply, irregular supply, contaminated water, low pressure, hand pump broken, tanker | Jal Jeevan / Water Board | 6 |
| SANITATION | Sanitation & Drainage | open drain, blocked drain, sewage overflow, no toilets, waterlogging | Urban Local Body / Swachh Bharat | 6 |
| WASTE | Waste Management | garbage not collected, dumping site, no bins, burning waste | Municipal Corporation | 11, 12 |
| ELECTRICITY | Electricity | power cuts, no connection, voltage, transformer fault, loose wires | DISCOM | 7 |
| STREETLIGHT | Street Lighting & Public Safety | dark streets, broken lights, unsafe area, stray dogs | Municipal / Police | 11, 16 |
| HEALTH | Healthcare | no PHC, no doctor, no medicines, no ambulance, maternal care | Health & Family Welfare | 3 |
| EDUCATION | Education | no school, no teachers, building unsafe, no toilets in school, no anganwadi | Education / WCD | 4 |
| HOUSING | Housing & Land | unsafe housing, PMAY pending, encroachment, slum conditions | Housing / Revenue | 11 |
| ENVIRONMENT | Environment & Pollution | air pollution, river pollution, noise, tree cutting, industrial effluent | Pollution Control Board | 13, 15 |
| DISASTER | Flood & Disaster | flooding, embankment, landslide, cyclone shelter | Disaster Management | 11, 13 |
| AGRI | Agriculture & Irrigation | canal, irrigation, crop loss, mandi access, cold storage | Agriculture / Irrigation | 2 |
| CONNECTIVITY | Digital & Telecom | no mobile network, no internet, CSC not working | Telecom / DoT | 9 |
| WELFARE | Social Welfare & Services | ration card, pension not received, scheme access, certificate delays | Social Justice / Food & Civil Supplies | 1, 10 |
| EMPLOYMENT | Employment & Skills | MGNREGA wages, no jobs, skill centre | Rural Development / Skill | 8 |
| PUBLIC_SPACE | Parks & Public Spaces | playground, community hall, crematorium, market | Municipal | 11 |
| OTHER | Other | anything not above (AI must still fill problem_description) | — | — |

## Rules

- The AI picks one primary category and optionally one secondary category.
- Sub-categories are free text suggested by the AI and normalised by the analyst; the list above is the seed, not a limit.
- Categories are **configuration** (a table, not code) so a state or another country can rename, add or map them. Local-language display names live in the same table.
- Each category carries an SDG tag and a default department so the policymaker view can group by sector and the recommendation can name an owner.
- Government datasets are mapped to categories (road_index → ROADS, water_index → WATER, healthcare_index → HEALTH ...) so the infrastructure-gap calculation knows which index to compare against.

---

# 12. Citizen Request Schema

Recommended `citizen_requests` table:

```text
id
original_text
translated_text
language
input_type
category
sub_category
problem_description
urgency_score
latitude
longitude
country
state
district
sub_district
locality
affected_population_estimate
cluster_id
processing_status
ai_confidence
created_at
updated_at
```

Important:

The original citizen message must always be preserved.

AI-generated fields should be distinguishable from original citizen data.

---

# 13. Request Processing Flow

When a citizen submits a request:

```text
Citizen Input
     ↓
Input Validation
     ↓
Identify Input Type
     ↓
Language Detection
     ↓
Speech-to-Text (if voice)
     ↓
Translation (if required)
     ↓
Normalization
     ↓
Problem Extraction
     ↓
Category Classification
     ↓
Location Extraction
     ↓
Urgency Estimation
     ↓
Entity Extraction
     ↓
Semantic Similarity
     ↓
Duplicate / Cluster Detection
     ↓
Confidence Validation
     ↓
Structured Request
     ↓
Database
```

---

# 14. AI Extraction Example

Citizen says:

> "The road near our village is completely damaged. Ambulances cannot reach the village during rain."

AI should produce structured output such as:

```json
{
  "category": "Roads",
  "sub_category": "Road Damage",
  "problem_description": "Severely damaged road affecting emergency access",
  "urgency_score": 9,
  "location": {
    "village": "Example Village",
    "district": "Example District"
  },
  "entities": [
    "road",
    "ambulance",
    "rain"
  ],
  "confidence": 0.91
}
```

The backend validates this output before storing it.

---

# 15. AI Reliability

LLMs can:

- misunderstand local languages,
- extract incorrect locations,
- misclassify categories,
- misunderstand urgency,
- produce invalid JSON,
- hallucinate information.

Therefore:

```text
LLM
 ↓
Structured Output
 ↓
Pydantic Schema Validation
 ↓
Business Rule Validation
 ↓
Confidence Check
 ↓
Human Review if Needed
```

Example:

```text
confidence = 0.52
```

The system should mark:

```text
verification_status = REVIEW_REQUIRED
```

rather than blindly accepting it.

---

# 16. Multilingual Strategy

"Diverse linguistic regions" is a core requirement, not a translation toggle.

## Language realities across BRICS

```text
India         Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Odia,
              Punjabi, Malayalam + English (22 scheduled languages)
Brazil        Portuguese (regional variants)
Russia        Russian + regional languages (Tatar, Bashkir, Chechen ...)
China         Mandarin (Simplified script) + Cantonese and regional dialects
South Africa  11 official languages (Zulu, Xhosa, Afrikaans, English, Sotho ...)
```

## What the pipeline must handle

1. **Language detection** including code-mixed input ("road bahut kharab hai, ambulance nahi aa sakti") and script variation (Hindi typed in Latin script vs Devanagari).
2. **Speech-to-text** in the citizen's language, tolerant of dialect and background noise.
3. **Translation to a pivot language** (English) for classification, while the original text is always preserved and shown to analysts side by side.
4. **Extraction in the source language** where the model supports it, so place names and local terms are not lost in translation.
5. **Place-name normalisation** across scripts: "સુરત", "सूरत" and "Surat" resolve to the same geographic entity.

## Language tiers

```text
Tier 1  Fully supported
        STT + translation + extraction validated against a labelled test set

Tier 2  Partially supported
        translation + extraction work; voice input routed to REVIEW_REQUIRED

Tier 3  Unsupported
        request stored, status = LANGUAGE_UNSUPPORTED,
        routed to a human translator queue
```

No citizen input is ever dropped because of language.

## Talk back in the citizen's language

Acknowledgement, status updates and the final outcome ("a road project in your area was approved on ...") are sent in the language the citizen used. The citizen interface and messaging bots are themselves localised.

## Dashboard localisation

Analyst and policymaker dashboards support the country's official languages. The analyst always sees the original message next to the translation.

## Evaluation per language

Maintain a labelled multilingual test set (at least 50 examples per Tier-1 language) and report classification, location and urgency accuracy **per language**. A good global average can hide a badly served language.

---

# 17. Asynchronous AI Processing

Do not make the citizen wait for every AI operation.

Preferred flow:

```text
Citizen
   ↓
POST /api/requests
   ↓
Store raw request
   ↓
Return acknowledgement
   ↓
Queue/background job
   ↓
AI Processing
   ↓
Save structured result
```

Example statuses:

```text
RECEIVED
PROCESSING
PROCESSED
REVIEW_REQUIRED
FAILED
```

If an AI provider is temporarily unavailable, the original request is still safe in the database and can be retried.

---

# 18. External Government Data

The platform needs information that citizens cannot provide reliably themselves.

Examples:

## Demographics

- population,
- density,
- literacy,
- urban/rural distribution,
- age groups.

## Infrastructure

- road condition,
- healthcare availability,
- school availability,
- water coverage,
- electricity coverage,
- sanitation,
- transport access.

## Projects

- existing projects,
- planned projects,
- project status,
- project location,
- planned completion year.

## Investment

- allocated budget,
- planned investment,
- spending,
- project category.

## National priorities

- national development plan targets (e.g. "100% rural road connectivity by 2030"),
- sector priority weights declared by the government,
- flagship programme definitions and their target regions,
- SDG commitments.

This dataset is what makes the *policy alignment* component of the priority score real. Without it, alignment is a guess.

---

# 19. Where Does External Data Come From?

It may come from:

1. Government open-data portals
2. Government department websites
3. Government APIs
4. CSV/Excel/JSON/XML downloads
5. Government reports/PDFs
6. GIS/geospatial datasets

For India, one important source is the official Open Government Data platform:

**data.gov.in**

Do not assume that all required information exists in one website or one API.

For the hackathon, use a small representative set of authoritative datasets rather than trying to integrate every government system.

---

# 20. External Data Ingestion Architecture

External data should never be directly connected to the dashboard.

Use:

```text
Government Source
      ↓
Data Connector
      ↓
Raw Data Store
      ↓
Validation
      ↓
Transformation
      ↓
Normalization
      ↓
Processed Government Data Store
      ↓
Data Integration
      ↓
Analytics
```

---

# 21. External Data Ingestion Step-by-Step

## Step 1 — Identify required information

Ask:

> What information do we need to make the decision?

Example:

To understand road problems:

```text
Citizen requests
Road condition
Population
Existing road project
Budget/project information
```

## Step 2 — Find authoritative source

Prefer:

```text
Official Government API
      >
Official Open Dataset
      >
Official Government Report
      >
Other trusted source
```

## Step 3 — Fetch data

Possible connector:

```text
API connector
CSV connector
Excel connector
PDF extraction connector
GIS connector
```

## Step 4 — Store raw data

Never immediately overwrite the source.

Store:

```text
raw dataset
source
source URL
retrieved_at
data_date
version
department
dataset name
```

## Step 5 — Validate

Examples:

```text
population > 0
budget >= 0
latitude valid
longitude valid
dates valid
required fields present
```

## Step 6 — Transform

Different sources may use different formats.

Example:

```text
Government:
"Road Condition Index (%)"

Our system:
road_index
```

Convert everything to the internal format.

## Step 7 — Normalize

Example:

```text
"Surat"
"SURAT"
"Surat District"
"Surat Dist."
```

must map to one geographic entity.

## Step 8 — Store processed data

Now it can safely be used by analytics.

---

# 22. Geographic Integration

Geography is one of the most important parts of the project.

Citizen data may contain:

```text
latitude
longitude
village
district
state
country
```

Government data may contain:

```text
district_code
state_code
project_location
```

Use stable geographic IDs wherever possible.

Example:

```text
Country
  ↓
State
  ↓
District
  ↓
Sub-district
  ↓
Village / City
```

This allows:

```text
Citizen Requests
      +
Population
      +
Infrastructure
      +
Projects
      +
Investment
```

to be joined correctly.

For the BRICS design, geographic hierarchy should be configurable because countries use different administrative structures.

---

# 23. Data Freshness

Different datasets change at different speeds.

Example:

```text
Citizen requests       → real-time
Project status         → daily/weekly
Infrastructure         → monthly/quarterly
Budget                 → monthly/quarterly/annual
Demographics           → annual/census-based
```

Every external dataset should contain:

```text
source
data_date
retrieved_at
version
```

If a source is temporarily unavailable:

```text
Use latest validated dataset
+
Show last updated date
+
Mark data as stale if required
```

---

# 24. Data Integration

After both data worlds are available:

```text
Citizen Data
     +
Government Data
     ↓
Data Integration
```

Example:

```text
District A

Citizen requests = 12,450
Population = 310,000
Road index = 32/100
Healthcare index = 45/100
Planned road project = Yes
Planned budget = ₹10 Cr
```

Now the system can reason about the development context.

---

# 25. Request Clustering

Thousands of citizens may report the same underlying problem.

Examples:

```text
"The road has potholes."

"The village road is broken."

"Road is very bad."

"Ambulance cannot reach because of road."

"Road becomes unusable during rain."
```

These should not necessarily become five unrelated problems.

Use embeddings/semantic similarity to identify related requests.

Example cluster:

```text
Cluster: Poor Road Infrastructure

request_count: 4,832
average_urgency: 8.2
district: Example District
```

The cluster represents a broader public issue.

---

# 26. Duplicate Handling

There are two concepts:

## Duplicate request

The same issue may be submitted repeatedly.

## Cluster

Different descriptions may represent the same broader problem.

Do not simply delete duplicates.

Instead:

```text
Original requests
      ↓
Similarity
      ↓
Duplicate detection / Cluster
```

Keep the original records for traceability.

Use request counts carefully so one citizen repeatedly submitting the same complaint does not artificially represent many unique citizens.

---

# 27. Demand Normalisation and Fairness

Raw request counts are biased. Urban, connected, smartphone-dense areas generate more requests per problem than rural, poorly connected areas, which are exactly the areas most likely to have infrastructure gaps.

If the platform ranks by raw counts, it systematically favours the already-advantaged.

## Rules

1. **Demand is measured per capita:**

```text
demand_rate = unique_citizens_reporting / population × 1,000
```

2. **Unique citizens, not raw messages.** Duplicate detection collapses repeat submissions from one source (hashed phone number / device / session) before counting.

3. **Connectivity adjustment** (configurable). Where a mobile/internet-penetration dataset exists, scale demand_rate by the inverse of penetration so low-connectivity regions are not under-represented. Always display both raw and adjusted values.

4. **Channel diversity signal.** A hotspot reported through several channels (voice, WhatsApp, web, field office) is stronger evidence than the same volume from one channel.

5. **Small-population guard.** Below a population threshold use a smoothed rate so one request in a village of 50 people does not produce a 20-per-1,000 spike.

## Anti-abuse

```text
Rate limiting per source
Burst detection: hundreds of near-identical messages in minutes from few sources
  → flagged COORDINATED, excluded from counts until analyst review
Content moderation for abusive or irrelevant input
Spam / bot score stored on every request
```

Flagged requests remain in the database for traceability but do not enter the priority calculation until cleared.

## Transparency

For any hotspot the dashboard shows how the number was derived:

```text
Raw requests:              12,450
Unique citizens:            8,120
Per 1,000 population:        26.2
Adjusted demand score:         84
```

---

# 28. Hotspot Detection

A hotspot is a geographic area where important problems are concentrated.

Potential signals:

```text
Request density
+
Urgency
+
Affected population
+
Infrastructure gap
+
Growth in requests
```

Example:

```text
District X
---------------------------
Road requests:       12,450
Average urgency:       8.6
Population affected: 310,000
Road index:              32
Request growth:         +42%
```

This becomes a strong candidate hotspot.

---

# 29. Trend Analysis

Do not only identify the largest problem.

Identify problems that are becoming worse.

Example:

```text
June      2,000 water requests
July      3,500
August    6,200
```

This indicates rapid growth.

Trend signals can be incorporated into analysis and alerts.

---

# 30. Infrastructure Gap

A citizen request alone is not enough.

Example:

```text
10,000 road complaints
```

is more meaningful when:

```text
Road infrastructure index = 25/100
```

The system can identify a gap:

```text
Strong demand
+
Weak infrastructure
=
Potential development gap
```

---

# 31. Investment Alignment Analysis

The problem statement names *misaligned public spending* directly. The platform must surface it as an explicit output, not leave it implicit inside the priority score.

For each region × category, compare:

```text
Demand      = normalised citizen demand + infrastructure gap
      vs
Investment  = planned + allocated + spent budget, per capita
```

## Four quadrants

```text
                        LOW INVESTMENT            HIGH INVESTMENT
                 ┌──────────────────────────┬──────────────────────────┐
  HIGH DEMAND    │  UNDERSERVED GAP         │  COVERED / MONITOR       │
                 │  → top candidate for     │  → verify delivery,      │
                 │    new investment        │    track impact          │
                 ├──────────────────────────┼──────────────────────────┤
  LOW DEMAND     │  STABLE                  │  POSSIBLE MISMATCH       │
                 │  → no action             │  → review allocation     │
                 └──────────────────────────┴──────────────────────────┘
```

## Outputs

- **Alignment map:** regions coloured by quadrant.
- **Misalignment index** per region: demand rank − investment rank.
- **Underserved gaps list:** top candidates for new projects.
- **Possible mismatches list:** spending-review candidates.
- **Sector view for national policymakers:** total demand vs total budget per category (roads, water, health, education ...).

## Rule

The platform flags mismatches; it never asserts that spending is wrong. Low demand with high investment may be a preventive or strategic project. The analyst annotates the reason and the annotation stays on the record.

---

# 32. Priority Engine

The priority engine converts multiple signals into a transparent score.

Example:

```text
Citizen Demand        30%
Infrastructure Gap    25%
Population Impact     20%
Urgency               15%
Policy Alignment      10%
```

Formula:

```text
Priority Score =
0.30 × Demand
+ 0.25 × Infrastructure Gap
+ 0.20 × Population Impact
+ 0.15 × Urgency
+ 0.10 × Policy Alignment
```

All inputs should be normalized to 0–100.

Example:

```text
Demand               = 90
Infrastructure Gap   = 85
Population Impact    = 80
Urgency              = 88
Policy Alignment     = 70
```

Result:

```text
Priority = 84.5   (27 + 21.25 + 16 + 13.2 + 7 = 84.45)
```

The weights are configurable and should eventually be decided with domain stakeholders.

## How policy alignment is computed

Policy alignment is not an opinion. It is derived from the National Priorities dataset:

```text
Category is a declared national priority sector           +40
Region is a target region of a flagship programme         +30
Problem maps to a quantified national target              +20
Aligned with a committed SDG target                       +10
```

Scores are additive and capped at 100. The rules live in country configuration so each government sets its own.

## Demand input

The Demand input to the formula is the **adjusted demand score** from Demand Normalisation (per capita, unique citizens, connectivity-adjusted), never the raw request count.

---

# 33. Why Priority Must Be Deterministic

Do not ask an LLM:

> "Which district should receive the budget?"

Instead:

```text
Backend calculates score
        ↓
Evidence is attached
        ↓
LLM can explain the result
```

This provides:

- reproducibility,
- transparency,
- auditability,
- easier debugging,
- easier policy review.

---

# 34. Recommendation Engine

The recommendation engine combines:

```text
Citizen demand
+
Location
+
Population
+
Infrastructure gap
+
Urgency
+
Existing projects
+
Investment plans
+
Policy alignment
```

Example:

```text
Location: District X
Category: Healthcare

Requests: 12,450
Population affected: 310,000
Healthcare index: 32/100
Urgency: High
Existing major project: None
```

Possible recommendation:

```text
Expand primary healthcare capacity in District X.
```

But if a major project is already planned:

```text
Existing project:
Primary Healthcare Expansion
Budget: ₹20 Cr
Status: Under Construction
```

the recommendation should account for that.

It should not blindly recommend creating another project.

---

# 35. Recommendation Output

Every recommendation should contain:

```text
Recommendation title
Problem category
Location
Priority score
Reason
Supporting evidence
Existing project context
Affected population
Infrastructure indicators
Citizen demand
Confidence
```

Example:

```text
Recommendation:
Accelerate rural healthcare expansion.

Priority:
89

Evidence:
- 12,450 citizen requests
- 310,000 potentially affected population
- Healthcare index: 32/100
- High urgency
- No major planned project

Reason:
Citizen demand and infrastructure deficiency are both high.
```

---

# 36. Explainability

Never show:

```text
Priority = 89
```

only.

Show:

```text
Priority = 89

Demand             92
Infrastructure     88
Population impact  90
Urgency            85
Policy alignment   82
```

Then show the underlying evidence.

The LLM can generate a readable explanation, but it must be grounded in these structured values.

---

# 37. Analyst Verification

AI is not authoritative.

Flow:

```text
AI Processing
      ↓
Confidence Check
      ↓
Analyst Review
      ↓
Approve / Correct
      ↓
Analysis
```

Analyst may correct:

```text
Category
Location
Urgency
Problem description
Cluster
```

Keep both:

```text
AI value
Corrected value
Analyst ID
Timestamp
Reason
```

This creates an audit trail and can later help improve the AI system.

---

# 38. Dashboard Design

## Citizen Dashboard

Minimal:

```text
Submit Problem
Track Requests
Request Status
Acknowledgement
```

## Analyst Dashboard

Main sections:

```text
Overview
Requests
Map
Hotspots
Clusters
Trends
Infrastructure
Projects
Recommendations
Verification
```

Filters:

```text
Country
State
District
Category
Date
Urgency
Status
```

## Policymaker Dashboard

Focus on decisions:

```text
National Overview
Priority Regions
Top Problems
Hotspots
Affected Population
Infrastructure Gaps
Current Projects
Investment
Recommendations
Evidence
Trends
```

---

# 39. Map-Based Experience

The map is a major part of the product.

Possible visualization:

```text
Country
 ↓
State
 ↓
District
 ↓
Hotspot
```

Map markers/areas can represent:

- request density,
- severity,
- category,
- priority.

Clicking a hotspot should show:

```text
Location
Problem
Request count
Affected population
Infrastructure score
Urgency
Existing projects
Budget
Priority score
Recommendation
```

---

# 40. Database Design

## citizen_requests

```text
id
original_text
translated_text
language
input_type
category
sub_category
problem_description
urgency_score
latitude
longitude
country
state
district
sub_district
locality
cluster_id
ai_confidence
processing_status
created_at
updated_at
```

## request_clusters

```text
id
name
category
country
state
district
request_count
average_urgency
affected_population
representative_problem
created_at
```

## demographics

```text
id
geographic_entity_id
population
population_density
literacy_rate
urban_population_percentage
rural_population_percentage
children_percentage
elderly_percentage
source
data_date
```

## infrastructure

```text
id
geographic_entity_id
healthcare_index
education_index
road_index
water_index
electricity_index
transport_index
sanitation_index
overall_index
source
data_date
```

## government_projects

```text
id
project_name
category
geographic_entity_id
budget
planned_year
status
start_date
expected_completion_date
source
data_date
```

## recommendations

```text
id
geographic_entity_id
category
title
description
priority_score
demand_score
infrastructure_gap_score
population_impact_score
urgency_score
policy_alignment_score
explanation
evidence
created_at
```

## verifications

```text
id
request_id
analyst_id
field_name
old_value
new_value
reason
created_at
```

## dataset_metadata

```text
id
dataset_name
source
source_url
department
version
data_date
retrieved_at
status
```

---

# 41. API Design

## Citizen Requests

```http
POST /api/requests
GET /api/requests
GET /api/requests/{id}
```

## AI

```http
POST /api/ai/analyze
```

## Dashboard

```http
GET /api/dashboard/summary
GET /api/dashboard/hotspots
GET /api/dashboard/categories
GET /api/dashboard/trends
```

## Recommendations

```http
GET /api/recommendations
GET /api/recommendations/{id}
```

## Verification

```http
POST /api/requests/{id}/verify
```

## Government Data

For internal/admin use:

```http
POST /api/datasets/import
GET /api/datasets
GET /api/datasets/{id}
```

---

# 42. Suggested Backend Folder Structure

```text
backend/
│
├── app/
│   ├── main.py
│   │
│   ├── api/
│   │   ├── requests.py
│   │   ├── dashboard.py
│   │   ├── recommendations.py
│   │   ├── datasets.py
│   │   └── verification.py
│   │
│   ├── models/
│   │   ├── request.py
│   │   ├── cluster.py
│   │   ├── infrastructure.py
│   │   ├── demographics.py
│   │   ├── project.py
│   │   └── recommendation.py
│   │
│   ├── schemas/
│   │
│   ├── services/
│   │   ├── ai_service.py
│   │   ├── speech_service.py
│   │   ├── translation_service.py
│   │   ├── clustering_service.py
│   │   ├── hotspot_service.py
│   │   ├── priority_service.py
│   │   └── recommendation_service.py
│   │
│   ├── ingestion/
│   │   ├── api_connector.py
│   │   ├── csv_connector.py
│   │   ├── excel_connector.py
│   │   └── pdf_connector.py
│   │
│   ├── analytics/
│   │   ├── aggregation.py
│   │   ├── trends.py
│   │   └── hotspots.py
│   │
│   ├── db/
│   │
│   └── utils/
│
├── tests/
├── scripts/
├── requirements.txt
└── README.md
```

---

# 43. Frontend Folder Structure

```text
frontend/
│
├── src/
│   ├── components/
│   │   ├── Map/
│   │   ├── Charts/
│   │   ├── Cards/
│   │   └── Tables/
│   │
│   ├── pages/
│   │   ├── Citizen/
│   │   ├── Analyst/
│   │   └── Policymaker/
│   │
│   ├── services/
│   │   └── api.js
│   │
│   ├── hooks/
│   ├── utils/
│   └── App.jsx
│
└── package.json
```

---

# 44. Implementation Order

Do NOT build everything simultaneously.

Build one complete vertical slice first.

## Phase 1 — Foundation

Set up:

```text
Git repository
Backend
Frontend
PostgreSQL
PostGIS
Environment variables
Basic authentication
```

Deliverable:

```text
Frontend ↔ Backend ↔ Database
```

works.

---

# 45. Phase 2 — Citizen Request

Build:

```text
Citizen form
    ↓
POST /api/requests
    ↓
Database
```

Support initially:

- text,
- location,
- category optional.

Do not start with voice and messaging.

Deliverable:

A citizen can submit a request and the request is stored.

---

# 46. Phase 3 — AI Processing

Add:

```text
Request
  ↓
Language Detection
  ↓
LLM Extraction
  ↓
Structured JSON
  ↓
Pydantic Validation
  ↓
Database
```

Implement:

- category,
- problem,
- urgency,
- location,
- language.

Deliverable:

Raw citizen message becomes structured data.

---

# 47. Phase 4 — Clustering

Implement semantic similarity.

Example:

```text
Road is broken
Bad road
Potholes everywhere
Ambulance cannot reach
```

→

```text
Poor Road Infrastructure
```

Deliverable:

Requests can be grouped.

---

# 48. Phase 5 — Government Data

For MVP, import only a few datasets.

Recommended:

```text
1. Demographics
2. Infrastructure index
3. Existing/planned projects
4. Investment/budget
```

Start with CSV files if live APIs are difficult.

The architecture must still treat them as external government datasets.

Deliverable:

Government data exists in PostgreSQL and can be joined with citizen data.

---

# 49. Phase 6 — Analytics

Implement:

```text
Request counts
Category counts
Location aggregation
Clusters
Hotspots
Trends
```

Deliverable:

Dashboard can answer:

> Where are the biggest problems?

---

# 50. Phase 7 — Infrastructure Gap

Join:

```text
Citizen demand
+
Infrastructure
+
Population
```

Calculate:

```text
Demand
Infrastructure gap
Population impact
```

Deliverable:

Dashboard can answer:

> Where is citizen demand combined with weak infrastructure?

---

# 51. Phase 8 — Priority Engine

Implement deterministic scoring.

Example:

```python
priority = (
    0.30 * demand_score +
    0.25 * infrastructure_gap_score +
    0.20 * population_impact_score +
    0.15 * urgency_score +
    0.10 * policy_alignment_score
)
```

Deliverable:

Every important location/problem has an explainable priority score.

---

# 52. Phase 9 — Recommendation Engine

Use structured data:

```text
Problem
Location
Demand
Population
Infrastructure
Urgency
Existing project
Budget
Policy alignment
```

Generate a recommendation.

Important:

The recommendation must reference actual evidence.

Deliverable:

Policymaker sees:

```text
What?
Where?
Why?
How urgent?
How many affected?
What already exists?
What is recommended?
```

---

# 53. Phase 10 — Analyst Verification

Add:

```text
Approve
Correct
Reject
```

Store audit history.

Deliverable:

AI is supervised rather than treated as unquestionable truth.

---

# 54. Phase 11 — Voice and Messaging

Only after text flow works:

```text
Voice
 ↓
Speech-to-text
 ↓
Normal AI pipeline
```

Messaging:

```text
WhatsApp/SMS/etc.
 ↓
Webhook
 ↓
Request ingestion
 ↓
Normal AI pipeline
```

This avoids building multiple independent processing pipelines.

## Channel adapters per country

Each channel is a thin adapter that converts an incoming message into the standard ingestion payload:

```text
text or audio
sender hash (never the raw phone number in analytics tables)
channel
timestamp
optional location
```

```text
India         WhatsApp, SMS, IVR voice line, web
Brazil        WhatsApp, Telegram, web
Russia        Telegram, VK, web
China         WeChat, web
South Africa  WhatsApp, SMS, USSD, web
```

## Inclusion

- Voice and IVR serve low-literacy citizens.
- SMS / USSD serve feature phones and no-data areas.
- Field-office and paper intake are entered by a clerk through the same web form, tagged `channel = OFFICE`.
- Every channel can deliver acknowledgement and status back to the citizen in their language.

Adding a channel never changes the AI pipeline. It only adds an adapter.

---

# 55. Phase 12 — Impact Measurement

The problem statement says there is *no way to measure the impact of large-scale digital public infrastructure initiatives*. Impact measurement is therefore a core output, not a nice-to-have.

## Baseline snapshot

When a recommendation is accepted or a project is approved, the platform freezes a baseline for that region × category:

```text
unique citizens reporting
demand per 1,000 population
average urgency
infrastructure index
cluster size
snapshot date
```

## Tracking

The project record links to its baseline. As the project moves through statuses (planned → in progress → completed) the same indicators are recomputed on a schedule.

```text
Before intervention
        ↓
Project
        ↓
After intervention
        ↓
Citizen feedback
        ↓
Impact measurement
```

## Impact indicators per project

```text
Change in demand per 1,000         4.8  →  1.2
Change in average urgency          8.2  →  4.1
Change in infrastructure index      32  →   61   (when the government dataset updates)
Citizen-confirmed resolution       % of original reporters who confirm improvement
                                   when asked, in their own language
Time from first report → decision → completion
```

## Attribution caution

A drop in complaints may have other causes (season, migration, a channel outage). The platform shows the change together with context (overall request volume, channel health) and lets the analyst annotate. It reports **evidence of impact, not proof of causation**.

## Platform-level indicators (impact of the DPI itself)

```text
Requests received per channel and per language
Share of population with at least one request
Median time from submission to structured record
AI confidence and analyst correction rate per language
Recommendations reviewed / accepted / rejected by policymakers
Projects influenced and budget aligned
Citizens notified of an outcome in their own language
```

## Feedback loop

Impact data feeds back into the priority engine. A region whose project completed and whose demand dropped is deprioritised. A region whose project completed but whose demand did not drop is flagged for review.

---

# 56. MVP Demo Story

The strongest hackathon demo should follow one real scenario.

Example:

## Step 1

Citizen submits:

> "Our village road is broken and ambulances cannot reach us during rain."

## Step 2

AI extracts:

```text
Category: Roads
Urgency: 9
Location: Village X
Problem: Severe road damage affecting emergency access
```

## Step 3

System finds similar requests:

```text
4,832 related requests
```

## Step 4

Government data:

```text
Population: 45,000
Road index: 32/100
```

## Step 5

Project data:

```text
Road upgrade project: Planned
Budget: ₹10 Cr
Status: Not started
```

## Step 6

Priority engine:

```text
Priority: 89
```

## Step 7

Recommendation:

```text
Accelerate the planned road upgrade project
rather than creating a duplicate project.
```

## Step 8

Dashboard shows:

```text
Hotspot
Evidence
Priority
Existing project
Recommendation
```

This tells the entire story in a few minutes.

---

# 57. What Should Be AI vs Normal Code?

## AI

Use AI for:

```text
Language detection
Speech-to-text
Translation
Problem extraction
Category classification
Location/entity extraction
Urgency interpretation
Semantic similarity
Clustering support
Summarization
Recommendation explanation
```

All of the above run on Google AI (Gemini, Cloud Speech-to-Text, Cloud Translation, Gemini Embedding) — see the technology stack section. The pitch and demo must make it visible that Google AI is doing this work.

## Normal backend/data engineering

Use normal code for:

```text
Database
Validation
Authentication
Authorization
Counting
Aggregation
Population calculations
Geographic joins
Priority formula
Business rules
Audit logs
Dataset metadata
API logic
```

This separation is one of the most important architecture decisions.

---

# 58. Security and Privacy

Citizen data can contain:

- name,
- phone number,
- location,
- voice,
- messages.

Implement:

```text
Authentication
Role-based authorization
PII minimization
Encryption
Secure environment variables
Access control
Audit logs
Retention rules
```

Roles:

```text
Citizen
Analyst
Policymaker
Admin
```

Do not expose citizen personal information unnecessarily to policymakers.

---

# 59. Failure Handling

## AI unavailable

```text
Store request
 ↓
Status = PROCESSING
 ↓
Retry
```

## Speech-to-text failure

```text
Keep original audio
 ↓
Status = FAILED
 ↓
Retry / Manual processing
```

## Government API unavailable

```text
Use latest validated dataset
+
Display last updated date
```

## Invalid AI output

```text
Schema validation fails
 ↓
Retry
 ↓
If still invalid → REVIEW_REQUIRED
```

## Wrong AI classification

```text
Analyst corrects
 ↓
Save correction
 ↓
Continue analysis
```

---

# 60. Observability

Monitor:

```text
API latency
API errors
AI latency
AI failures
Queue failures
Database performance
Requests processed
Requests failed
AI confidence
Human correction rate
Recommendation generation failures
```

Important metrics:

```text
Total requests
Processed requests
Failed requests
Average AI confidence
Percentage manually corrected
Average processing time
```

---

# 61. Auditability

For every important change, record:

```text
Who
What
When
Old value
New value
Why
```

Example:

```text
AI category:
Healthcare

Analyst correction:
Emergency Healthcare

Analyst:
A123

Time:
2026-09-10 14:32

Reason:
Citizen specifically described emergency treatment access.
```

---

# 62. Scalability

Do not design for 100 million records on day one.

## MVP

```text
React
 ↓
FastAPI
 ↓
PostgreSQL
 ↓
AI API
```

## Larger scale

```text
Load Balancer
      ↓
Multiple API servers
      ↓
Message Queue
      ↓
AI Workers
      ↓
PostgreSQL / Analytics DB
```

## National scale

```text
API Gateway
      ↓
Request Services
      ↓
Event Queue
      ↓
AI Workers / ETL
      ↓
Operational Database
      +
Data Warehouse / Data Lake
      ↓
Analytics
      ↓
Recommendation
      ↓
Dashboard
```

The architecture is scalable without forcing unnecessary infrastructure into the MVP.

---

# 63. Scaling Across India, then BRICS

The hackathon judges "Depth & Reach Across India" (20%) and "Deployability" (20%). The primary scaling story is **one state → every state**. The BRICS story (Rule 04) is the same mechanism applied one level up.

## India first: state onboarding

Onboarding a new state should be configuration, not code:

```text
State profile
  languages            e.g. Gujarat: Gujarati, Hindi, English
  admin levels         State → District → Taluka → Village / Ward
  district boundaries  GeoJSON (Survey of India / data.gov.in / Bhuvan)
  category names       local-language display names
  datasets             census, infrastructure indices, project lists, budget for that state
  departments          who owns which category
```

The MVP demonstrates Gujarat (Surat district in depth) and shows a second state loaded from configuration to prove the mechanism.

## Then BRICS

Do not create five separate systems.

Use configurable geography:

```text
Country
 ↓
Administrative Level 1
 ↓
Administrative Level 2
 ↓
Administrative Level 3
```

Example India:

```text
India
 ↓
Gujarat
 ↓
Surat
 ↓
Taluka
 ↓
Village
```

Another country may use:

```text
Country
 ↓
Province
 ↓
District
 ↓
Municipality
```

The core platform remains the same.

Only:

- data connectors,
- geography mappings,
- language support,
- source-specific schemas,

need to change.

## Country configuration

Each deployment is defined by a country profile:

```text
country_code             ISO 3166
languages                ISO 639 list with tier (1/2/3)
administrative_levels    names and codes per level
category_taxonomy        local category names mapped to the shared core categories
currency                 for budget display
data_protection_regime   consent, retention and access rules
channels                 enabled messaging adapters
priority_weights         national override of the default weights
national_priorities      dataset reference
```

## Deployment and data sovereignty

```text
One open-source codebase
        ↓
One instance per country, hosted inside that country
        ↓
Citizen data never leaves the national instance
        ↓
Optional BRICS-level view built only from aggregated,
anonymised indicators that each country shares voluntarily
```

## Cross-country comparability

Core categories and 0–100 indices are shared, so a BRICS-level dashboard can compare "road demand vs road investment" across countries without any raw citizen data crossing a border.

## BRICS+

The same country-profile model covers the expanded membership (Egypt, Ethiopia, Iran, UAE, Indonesia and future members). Onboarding a country is configuration plus connectors, not new code.

---

# 64. Data Governance

Every external dataset should have metadata.

Required:

```text
dataset_name
source
source_url
department
data_date
retrieved_at
version
update_frequency
license/usage information
```

This answers:

> Where did this number come from?

A policymaker should be able to trace important evidence back to its source.

---

# 65. Important Business Rules

1. Preserve original citizen input.
2. Never present AI-generated information as authoritative government data.
3. Priority scores must be reproducible.
4. LLM cannot authorize spending.
5. Recommendations must have supporting evidence.
6. Analysts can correct AI results.
7. Government datasets must have source and date.
8. Duplicate requests must not be interpreted as unique citizens automatically.
9. Stale datasets must be clearly identified.
10. Sensitive citizen information should be minimized.
11. Critical decisions require human review.
12. All important changes must be auditable.
13. Demand is measured per unique citizen and per capita, never by raw message count.
14. Every AI provider is a replaceable adapter; the core never depends on one vendor.
15. Citizen data stays inside the national instance; only aggregated indicators may be shared.
16. Citizens are informed of the outcome of their request in their own language.
17. Spending misalignment is flagged for review, never asserted as an error.

---

# 66. What We Should NOT Build for the MVP

Avoid:

```text
Every BRICS country
Every language
50+ government integrations
Custom foundation model
Kubernetes
Kafka
Complex microservices
Automatic government budget approval
Automatic policy creation
Full project-management system
Perfect GIS platform
```

Instead prove the core loop:

```text
Citizen Voice
      ↓
AI Understanding
      ↓
Structured Data
      ↓
Government Data
      ↓
Hotspot
      ↓
Priority
      ↓
Recommendation
      ↓
Policymaker
```

---

# 67. Team Division (2 people)

Two people, twelve days. Each owns one repository end to end and both own the demo.

## Person A — Backend, AI & Data (`BRICS-backend`)

```text
FastAPI service, PostgreSQL/PostGIS schema
Gemini extraction pipeline + Pydantic validation
Cloud Speech-to-Text / Translation adapters
Embeddings, duplicate detection, clustering
Government datasets: data.gov.in CSVs → BigQuery/Postgres, normalisation, geo mapping
Analytics: aggregation, hotspots, trends, infrastructure gap, investment alignment
Priority engine, recommendation engine, explanation
Verification + audit endpoints
Cloud Run deployment
```

## Person B — Frontend, Product & Submission (`BRICS-frontend`)

```text
Citizen interface: text + voice submission, language picker, tracking
Analyst dashboard: requests, review/correct, clusters
Policymaker dashboard: map (Google Maps + district GeoJSON), hotspots, priority, evidence, recommendations, investment alignment, impact
Firebase auth + role handling
Firebase Hosting deployment
Demo script, 3–5 min video, 10–12 slide deck, 2–3 line description, README
```

## Shared

```text
API contract (OpenAPI) agreed on day 1
Synthetic multilingual request dataset (both use it)
Daily 15-minute sync: what is blocked, what is demo-ready
```

---

# 68. Git Workflow

Recommended:

```text
main
develop
feature/*
```

Examples:

```text
feature/citizen-request
feature/ai-processing
feature/data-ingestion
feature/hotspot-analysis
feature/dashboard
feature/recommendation-engine
```

Every feature should include:

```text
Code
Tests
API documentation
README update if required
```

---

# 69. Definition of Done

A feature is not done because the code runs.

It is done when:

```text
Requirement implemented
+
API works
+
Database works
+
Error handling exists
+
Basic tests pass
+
Frontend integration works
+
Relevant logs exist
+
Team documentation updated
```

---

# 70. Testing Strategy

## Unit Tests

Test:

```text
Priority calculation
Validation
Normalization
Scoring
Business rules
```

## Integration Tests

Test:

```text
API → Database
API → AI
Data ingestion → Database
Dashboard → API
```

## AI Evaluation

Create a small labelled dataset:

```text
Input
Expected category
Expected location
Expected urgency
```

Measure:

```text
classification accuracy
location accuracy
structured-output validity
confidence calibration
```

## End-to-End Test

Run:

```text
Citizen request
 ↓
AI
 ↓
Database
 ↓
Cluster
 ↓
Government data join
 ↓
Priority
 ↓
Recommendation
 ↓
Dashboard
```

---

# 71. Architecture Decision Rules

Whenever the team is unsure about a technical decision, ask:

## Question 1

What problem are we solving?

## Question 2

Who needs this information?

## Question 3

What data is required?

## Question 4

Where does the data come from?

## Question 5

Is this AI or deterministic logic?

## Question 6

Does this need to happen synchronously?

## Question 7

How will we validate it?

## Question 8

How will we handle failure?

## Question 9

How will we audit it?

## Question 10

Does the solution actually improve the user journey?

This prevents technology-first architecture.

---

# 72. The Core Architecture Mental Model

When designing any new feature, think:

```text
INPUT
 ↓
VALIDATE
 ↓
PROCESS
 ↓
STORE
 ↓
CONNECT
 ↓
ANALYZE
 ↓
DECIDE / RECOMMEND
 ↓
VERIFY
 ↓
MEASURE IMPACT
```

For this project:

```text
Citizen input
 ↓
Validate
 ↓
AI understanding
 ↓
Store
 ↓
Connect with government data
 ↓
Analyze
 ↓
Priority + recommendation
 ↓
Analyst/policymaker verification
 ↓
Impact measurement
```

---

# 73. Final End-to-End Implementation Blueprint

```text
┌───────────────────────────────────────────────────────────────┐
│                         CITIZENS                              │
│              Text / Voice / Messaging                         │
└─────────────────────────────┬─────────────────────────────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Request Ingestion │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   AI Processing   │
                    │ Language / STT    │
                    │ Translation       │
                    │ Classification    │
                    │ Location / Urgency│
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Structured Request│
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ Citizen Database  │
                    └─────────┬─────────┘
                              │
                              │
       ┌──────────────────────┴──────────────────────┐
       │                                             │
       │            GOVERNMENT DATA                  │
       │                                             │
       │ APIs / CSV / Excel / PDF / GIS             │
       │                                             │
       │                    ▼                        │
       │              Data Connectors                │
       │                    ▼                        │
       │               Raw Storage                  │
       │                    ▼                        │
       │                Validation                  │
       │                    ▼                        │
       │               Transformation               │
       │                    ▼                        │
       │               Normalization                │
       │                    ▼                        │
       │          Government Data Store             │
       └──────────────────────┬──────────────────────┘
                              │
                              ▼
                     DATA INTEGRATION
                              │
                              ▼
                       AGGREGATION
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
          CLUSTERS         HOTSPOTS          TRENDS
              │               │                │
              └───────────────┼────────────────┘
                              ▼
                     INFRASTRUCTURE GAP
                              │
                              ▼
                       PRIORITY ENGINE
                              │
                              ▼
                    RECOMMENDATION ENGINE
                              │
                              ▼
                       EXPLANATION
                              │
                              ▼
                    ANALYST VERIFICATION
                              │
                              ▼
                       POLICYMAKER
                              │
                              ▼
                       POLICY DECISION
                              │
                              ▼
                       IMPLEMENTATION
                              │
                              ▼
                     OUTCOME / FEEDBACK
                              │
                              ▼
                     IMPACT MEASUREMENT
                              │
                              └──────────────► FEEDBACK LOOP
```

---

# 74. Evaluation Criteria Mapping

Every judged criterion must have something visible in the demo that earns it.

| Weight | Criterion | What the judges must see |
|---|---|---|
| 25% | AI / Technical Execution | Gemini extraction shown live on a Gujarati voice message; STT + translation visible; embeddings clustering 5 phrasings into one issue; the whole loop works end to end on the deployed link |
| 20% | Problem-Solution Fit | Fragmented feedback → one structured store; "misaligned spending" → investment alignment quadrant; "no way to measure impact" → before/after impact screen; hotspots + recommendations to a national view |
| 20% | Depth & Reach Across India | Gujarat in depth + a second state loaded from configuration; 22-language Translation; state onboarding is a config file; category taxonomy with local names |
| 20% | Deployability & Scalability | Live on Cloud Run + Firebase; data.gov.in datasets with provenance; role-based access; audit trail; BigQuery for national scale; DPG compliance (open licence, exportable data, replaceable adapters) |
| 15% | Impact Potential | Numbers on screen: population covered, requests per 1,000, budget aligned; the pitch quantifies what a national rollout would touch |

---

# 75. Submission Plan — 12 Days (18 → 30 September 2026)

Five deliverables are required: **GitHub repos, 3–5 minute demo video, 10–12 slide deck, 2–3 line description, live deployed link.** The last three days are reserved for them.

```text
Day 1–2   (18–19 Sep)  Repos, DB schema, API contract, synthetic data generator,
                        Gemini extraction working on text, citizen text form → DB → analyst list
Day 3–4   (20–21 Sep)  Voice (Cloud STT) + Translation, clustering with embeddings,
                        Gujarat district GeoJSON on the map, hotspot aggregation
Day 5–6   (22–23 Sep)  Government datasets loaded (demographics, infra indices, projects, budget),
                        infrastructure gap, priority engine, recommendation + Gemini explanation
Day 7–8   (24–25 Sep)  Policymaker dashboard complete (map, evidence, investment alignment, impact),
                        analyst verification + audit, Firebase auth, second-state config
Day 9     (26 Sep)     Deploy to Cloud Run + Firebase Hosting, seed production data, end-to-end test
Day 10    (27 Sep)     Freeze features. Bug fixes, polish, README, DPG licence + docs
Day 11    (28 Sep)     Demo video recorded (3–5 min), pitch deck (10–12 slides)
Day 12    (29 Sep)     Final review of all 5 deliverables, submit — do not wait for 30 Sep
Buffer    (30 Sep)     Deadline day; nothing should be pending
```

## Rules for the 12 days

1. Something demo-able exists at the end of every day.
2. Feature freeze on Day 10 is real. After it, only fixes.
3. The deployed link is tested from a phone on mobile data, not only from localhost.
4. The video is recorded on the deployed link, not on localhost.
5. Submit on Day 12. The deadline day is a buffer, not a plan.

## Pitch deck skeleton (10–12 slides)

```text
1. Title + 2-line description
2. The problem (official statement, in the judges' words)
3. Who it serves: citizen, analyst, policymaker
4. The core loop (one diagram)
5. Live demo screenshots: citizen voice → structured record
6. Hotspots + clustering
7. Government data join + priority score (transparent formula)
8. Recommendation + investment alignment + impact
9. Google AI architecture (what does what)
10. Deployability: Cloud Run, data.gov.in, DPG compliance, audit
11. Reach: Gujarat → every state → BRICS (configuration, not code)
12. Team, ask, next steps (ministry pilot)
```

---

# 76. The MVP Success Criterion

At the end of the hackathon, we should be able to demonstrate one complete scenario:

> A citizen reports a problem in their own language.

The platform:

1. understands the input,
2. extracts the problem,
3. identifies its location,
4. estimates urgency,
5. groups it with similar citizen requests,
6. identifies a geographic hotspot,
7. joins demographic information,
8. joins infrastructure information,
9. checks current/planned projects,
10. checks investment/budget context,
11. calculates a transparent priority score,
12. generates an evidence-backed recommendation,
13. allows an analyst to verify it,
14. shows the result to a policymaker,
15. provides a path to measuring impact later.
16. shows whether existing investment is aligned with that demand,
17. acknowledges the citizen in their own language.

If we can demonstrate this loop reliably, the architecture has proven the core value of the platform.

---

# 77. One-Line Product Definition

**A multilingual AI decision-support platform that turns citizen voices into geographically grounded, evidence-based development priorities for policymakers.**
