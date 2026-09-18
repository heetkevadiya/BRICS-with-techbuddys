# Google Cloud setup — 10 minutes

Everything below is inside the free tier. BigQuery gives 1 TB of queries and 10 GB storage free every month; Maps gives $200/month credit; Speech-to-Text gives 60 min/month free.

## 1. Create the project
1. Go to https://console.cloud.google.com
2. Top bar → project dropdown → **New Project**
3. Name: `brics-citizen-demand` → **Create**
4. Copy the **Project ID** (looks like `brics-citizen-demand-482913`, not the display name)

## 2. Enable the APIs
Open each link with your new project selected and press **Enable**:

| Service | Link |
|---|---|
| BigQuery | https://console.cloud.google.com/apis/library/bigquery.googleapis.com |
| Cloud Speech-to-Text | https://console.cloud.google.com/apis/library/speech.googleapis.com |
| Cloud Translation | https://console.cloud.google.com/apis/library/translate.googleapis.com |
| Cloud Text-to-Speech | https://console.cloud.google.com/apis/library/texttospeech.googleapis.com |
| Maps JavaScript API | https://console.cloud.google.com/apis/library/maps-backend.googleapis.com |

## 3. Service account (for the backend)
1. https://console.cloud.google.com/iam-admin/serviceaccounts → **Create service account**
2. Name: `brics-backend` → **Create and continue**
3. Grant these roles, then **Done**:
   - `BigQuery User` — lets it create the dataset
   - `BigQuery Data Editor` — lets it write the tables
   - `BigQuery Job User` — lets it run load jobs

   (`Data Editor` alone can create tables but **not** datasets, which fails with
   `does not have bigquery.datasets.create permission`.)
4. Click the new account → **Keys** → **Add key** → **Create new key** → **JSON** → it downloads
5. Move it into the backend folder and keep it out of git:
   ```bash
   mv ~/Downloads/brics-citizen-demand-*.json "/Users/heetkevadiya/projects/BRICS Multilingual Citizen/backend/service-account.json"
   ```
   `.gitignore` already excludes `service-account*.json`.

## 4. Maps API key (for the frontend)
1. https://console.cloud.google.com/apis/credentials → **Create credentials** → **API key**
2. Copy it, then **Edit API key** → Application restrictions → **Websites** → add `http://localhost:5173/*`
3. API restrictions → **Restrict key** → select **Maps JavaScript API** → Save

## 5. Paste into the env files

`backend/.env`:
```
GOOGLE_APPLICATION_CREDENTIALS=service-account.json
GOOGLE_CLOUD_PROJECT=<your project id from step 1>
BIGQUERY_DATASET=citizen_demand
```

`frontend/.env.local`:
```
VITE_GOOGLE_MAPS_API_KEY=<your key from step 4>
```

## 6. Tell me when done
I will then load the national datasets into BigQuery, switch voice to Cloud Speech-to-Text, and turn on the Google Maps layer. Until then everything runs on Postgres, Gemini and the SVG map, so nothing is blocked.

## Billing note
A billing account must be attached for Maps and BigQuery beyond the sandbox, but the free monthly credit covers this project many times over. You can set a $1 budget alert at https://console.cloud.google.com/billing/budgets if you want a hard safety net.
