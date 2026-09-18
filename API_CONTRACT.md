# API Contract v0.1 — agreed Day 1

Base URL: `/api`. All responses JSON. Auth: Firebase ID token in `Authorization: Bearer <token>` (role in custom claims). Citizen submission endpoints are public.

## Citizen requests
| Method | Path | Purpose |
|---|---|---|
| POST | `/requests` | Submit text request. Body: `{ text, language?, lat?, lng?, district?, channel: "WEB"\|"WHATSAPP"\|"SMS"\|"IVR"\|"OFFICE", citizen_ref? }` → `{ id, status: "RECEIVED", tracking_code }` (AI runs async) |
| POST | `/requests/voice` | Multipart audio (`audio`, `language?`, location fields) → same as above |
| GET | `/requests/{id}` | Full record: original_text, transcript, translated_text, language, category, sub_category, problem_description, urgency_score, location, cluster_id, ai_confidence, processing_status, verification_status |
| GET | `/requests/track/{tracking_code}` | Citizen-facing status in citizen's language |
| GET | `/requests?state&district&category&status&from&to&page` | Analyst list |

`processing_status`: RECEIVED → PROCESSING → PROCESSED | REVIEW_REQUIRED | FAILED | LANGUAGE_UNSUPPORTED

## Verification (analyst)
| POST | `/requests/{id}/verify` | `{ action: "APPROVE"\|"CORRECT"\|"REJECT", corrections?: { field: value }, reason }` — stores old/new/analyst/timestamp |

## Dashboard
| GET | `/dashboard/summary?state&district` | totals, unique citizens, per-1000, top categories, growth |
| GET | `/dashboard/hotspots?state&category` | list of `{ geo_id, name, category, unique_citizens, per_1000, avg_urgency, growth_pct, infra_index, priority_score }` |
| GET | `/dashboard/categories?state&district` | counts per category |
| GET | `/dashboard/trends?state&district&category&months=6` | monthly series |
| GET | `/dashboard/clusters?state&district&category` | clusters with representative_problem, request_count, avg_urgency |
| GET | `/dashboard/geo/{state}` | district GeoJSON with joined indicators (for the map) |
| GET | `/dashboard/alignment?state` | investment-alignment quadrant per district × category |

## Recommendations
| GET | `/recommendations?state&district&category&limit` | ranked; each has title, priority_score + 5 sub-scores, evidence[], existing_project?, explanation |
| GET | `/recommendations/{id}` | full detail |
| POST | `/recommendations/{id}/decision` | policymaker `{ decision: "ACCEPT"\|"DEFER"\|"REJECT", note }` → creates impact baseline on ACCEPT |

## Impact
| GET | `/impact/{recommendation_id}` | baseline vs current indicators |

## Datasets (admin)
| GET | `/datasets` | metadata: name, source, source_url, department, data_date, retrieved_at, version, status |
| POST | `/datasets/import` | CSV upload + mapping |

## National warehouse (BigQuery)
| GET | `/datasets/warehouse` | whether the BigQuery layer is live, and what it holds |
| POST | `/datasets/warehouse/sync` | rebuild `district_profile` + `demand_snapshot` and push them |
| GET | `/datasets/warehouse/national` | top 3 priorities per state, ranked in BigQuery across all states |

## Config
| GET | `/config/categories?lang=gu` | category taxonomy with local names |
| GET | `/config/states` | states loaded and their admin hierarchy |
