"""Generate the synthetic (but realistic) government datasets as CSV files.

They are then loaded through the normal CSV connector, exactly as real data.gov.in exports would be.
Storylines are deliberate so the demo has honest, explainable hotspots and mismatches.
Run: python -m scripts.generate_seed_datasets
"""
from __future__ import annotations

import csv
import json
import random
from pathlib import Path

SEED_DIR = Path(__file__).resolve().parents[1] / "data" / "seed"
rng = random.Random(42)

# The pilot states: projects and budgets are curated for these, while census demographics
# and indices cover all of India. Adding a state here is the only change needed to extend the pilot.
PILOT_STATES = ["Gujarat"]
districts = [r for r in csv.DictReader(open(SEED_DIR / "gujarat_districts.csv"))]
categories = [c for c in json.loads((SEED_DIR / "categories.json").read_text()) if c["infra_index_field"]]

# ---- Government projects ----------------------------------------------------------------------
P = [
    # district, name, category, dept, scheme, budget_cr, status, year, start, expected
    ("Surat", "Surat bulk water augmentation & Tapi intake upgrade", "WATER", "Surat Municipal Corporation", "AMRUT 2.0", 850, "PLANNED", 2026, "", "2029-03-31"),
    ("Dang", "PMGSY-III all-weather roads, Ahwa–Subir–Waghai", "ROADS", "Rural Development", "PMGSY", 120, "NOT_STARTED", 2025, "", "2028-03-31"),
    ("Kutch", "Narmada canal Kutch branch extension (Phase 2)", "WATER", "Sardar Sarovar Narmada Nigam", "SSNNL", 1200, "IN_PROGRESS", 2023, "2023-10-01", "2027-06-30"),
    ("Ahmedabad", "AMC clean-air action plan (dust, industrial monitoring)", "ENVIRONMENT", "Ahmedabad Municipal Corporation", "NCAP", 90, "IN_PROGRESS", 2024, "2024-06-01", "2026-12-31"),
    ("Vadodara", "Vishwamitri flood mitigation & storm-water network", "SANITATION", "Vadodara Municipal Corporation", "State", 250, "APPROVED", 2026, "", "2028-06-30"),
    ("Gandhinagar", "Six-lane ring road & flyovers, GUDA", "ROADS", "Roads & Buildings", "State", 640, "IN_PROGRESS", 2024, "2024-01-15", "2027-03-31"),
    ("Gandhinagar", "GIFT City arterial road upgrade", "ROADS", "Roads & Buildings", "State", 210, "IN_PROGRESS", 2025, "2025-02-01", "2026-12-31"),
    ("Rajkot", "Rajkot smart parks & riverfront promenade", "PUBLIC_SPACE", "Rajkot Municipal Corporation", "Smart Cities", 180, "IN_PROGRESS", 2024, "2024-04-01", "2026-10-31"),
    ("Rajkot", "Aji-3 water supply strengthening", "WATER", "Rajkot Municipal Corporation", "AMRUT 2.0", 140, "COMPLETED", 2023, "2023-01-10", "2025-12-31"),
    ("Banaskantha", "Sujalam Sufalam canal desilting & lining", "AGRI", "Water Resources", "SSY", 95, "IN_PROGRESS", 2025, "2025-03-01", "2026-11-30"),
    ("Vav-Tharad", "Tharad regional water grid connection", "WATER", "Water Supply Dept", "JJM", 160, "PLANNED", 2027, "", "2029-12-31"),
    ("Narmada", "Rajpipla district hospital upgrade (100 beds)", "HEALTH", "Health & Family Welfare", "PM-ABHIM", 65, "NOT_STARTED", 2025, "", "2027-09-30"),
    ("Tapi", "Vyara PHC network strengthening (6 PHCs)", "HEALTH", "Health & Family Welfare", "PM-ABHIM", 28, "IN_PROGRESS", 2025, "2025-06-01", "2026-12-31"),
    ("Chhota Udaipur", "Residential schools for tribal blocks (3)", "EDUCATION", "Tribal Development", "EMRS", 54, "IN_PROGRESS", 2024, "2024-08-01", "2026-08-31"),
    ("Morbi", "Ceramic cluster common effluent treatment plant", "ENVIRONMENT", "GPCB", "State", 75, "PLANNED", 2027, "", "2029-03-31"),
    ("Surat", "Surat BRTS Phase 3 & feeder buses", "ROADS", "Surat Municipal Corporation", "Smart Cities", 320, "IN_PROGRESS", 2024, "2024-03-01", "2026-12-31"),
    ("Ahmedabad", "Pirana legacy waste bio-mining", "WASTE", "Ahmedabad Municipal Corporation", "SBM-U 2.0", 110, "IN_PROGRESS", 2023, "2023-05-01", "2026-09-30"),
    ("Bhavnagar", "Bhavnagar coastal cyclone shelters (8)", "DISASTER", "GSDMA", "NCRMP", 40, "COMPLETED", 2022, "2022-04-01", "2024-12-31"),
    ("Jamnagar", "Jamnagar cyclone shelters & early warning sirens", "DISASTER", "GSDMA", "NCRMP", 36, "IN_PROGRESS", 2025, "2025-01-01", "2026-12-31"),
    ("Junagadh", "Junagadh–Veraval road widening", "ROADS", "Roads & Buildings", "State", 190, "IN_PROGRESS", 2024, "2024-09-01", "2027-03-31"),
    ("Kheda", "Nadiad sewage treatment plant 40 MLD", "SANITATION", "Nadiad Municipality", "AMRUT 2.0", 85, "IN_PROGRESS", 2025, "2025-04-01", "2027-03-31"),
    ("Anand", "Anand–Khambhat rural roads package", "ROADS", "Rural Development", "PMGSY", 60, "COMPLETED", 2022, "2022-06-01", "2024-10-31"),
    ("Mehsana", "Mehsana 24x7 water supply pilot", "WATER", "Water Supply Dept", "AMRUT 2.0", 70, "IN_PROGRESS", 2025, "2025-05-01", "2026-12-31"),
    ("Patan", "Patan solar-powered irrigation feeders", "AGRI", "Energy", "PM-KUSUM", 45, "IN_PROGRESS", 2025, "2025-07-01", "2027-03-31"),
    ("Sabarkantha", "Himmatnagar district hospital expansion", "HEALTH", "Health & Family Welfare", "State", 55, "IN_PROGRESS", 2024, "2024-11-01", "2026-11-30"),
    ("Aravalli", "Modasa rural road connectivity", "ROADS", "Rural Development", "PMGSY", 48, "STALLED", 2023, "2023-08-01", "2025-12-31"),
    ("Mahisagar", "Lunawada water treatment plant", "WATER", "Water Supply Dept", "JJM", 38, "IN_PROGRESS", 2025, "2025-02-01", "2026-12-31"),
    ("Panchmahal", "Godhra PHC upgrades (4) & ambulance fleet", "HEALTH", "Health & Family Welfare", "PM-ABHIM", 22, "PLANNED", 2027, "", "2028-12-31"),
    ("Devbhumi Dwarka", "Okha coastal road & cyclone shelter", "DISASTER", "GSDMA", "NCRMP", 30, "PLANNED", 2027, "", "2029-03-31"),
    ("Porbandar", "Porbandar fishing harbour road", "ROADS", "Roads & Buildings", "State", 25, "IN_PROGRESS", 2025, "2025-03-01", "2026-12-31"),
    ("Gir Somnath", "Veraval sewerage network", "SANITATION", "Veraval Municipality", "AMRUT 2.0", 42, "IN_PROGRESS", 2024, "2024-10-01", "2026-12-31"),
    ("Amreli", "Amreli coastal embankment repairs", "DISASTER", "Irrigation", "State", 33, "NOT_STARTED", 2026, "", "2027-12-31"),
    ("Botad", "Botad regional water pipeline", "WATER", "Water Supply Dept", "JJM", 52, "IN_PROGRESS", 2025, "2025-01-15", "2026-12-31"),
    ("Navsari", "Navsari–Bilimora flood protection", "DISASTER", "Irrigation", "State", 48, "APPROVED", 2026, "", "2028-03-31"),
    ("Valsad", "Vapi industrial effluent monitoring", "ENVIRONMENT", "GPCB", "State", 20, "IN_PROGRESS", 2025, "2025-06-01", "2026-12-31"),
    ("Bharuch", "Ankleshwar CETP upgrade", "ENVIRONMENT", "GPCB", "State", 68, "IN_PROGRESS", 2024, "2024-04-01", "2026-12-31"),
    ("Surendranagar", "Surendranagar Narmada-based water grid", "WATER", "Water Supply Dept", "JJM", 110, "IN_PROGRESS", 2024, "2024-07-01", "2027-03-31"),
    ("Morbi", "Morbi–Rajkot highway four-laning", "ROADS", "NHAI", "Bharatmala", 410, "IN_PROGRESS", 2023, "2023-11-01", "2026-12-31"),
    ("Dahod", "Dahod smart city roads package", "ROADS", "Dahod Smart City", "Smart Cities", 95, "IN_PROGRESS", 2023, "2023-09-01", "2026-12-31"),
    ("Ahmedabad", "Sabarmati riverfront Phase 2", "PUBLIC_SPACE", "Ahmedabad Municipal Corporation", "State", 850, "IN_PROGRESS", 2023, "2023-01-01", "2027-12-31"),
]
with open(SEED_DIR / "government_projects.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["district", "state", "project_name", "category_code", "department", "scheme", "budget_inr_cr", "status", "planned_year", "start_date", "expected_completion"])
    w.writerows([(d, "Gujarat", *rest) for d, *rest in P])

# ---- Investment plans FY2026-27 (per district × category) --------------------------------------
PER_CAPITA_CR_PER_LAKH = {  # crore per 1 lakh population, rough state-budget proportions
    "ROADS": 3.2, "WATER": 2.4, "SANITATION": 1.6, "WASTE": 0.7, "ELECTRICITY": 1.8, "STREETLIGHT": 0.3,
    "HEALTH": 2.2, "EDUCATION": 2.8, "HOUSING": 1.5, "ENVIRONMENT": 0.4, "DISASTER": 0.5, "AGRI": 1.4,
    "CONNECTIVITY": 0.3, "WELFARE": 1.9, "EMPLOYMENT": 1.1, "PUBLIC_SPACE": 0.5,
}
# Deliberate storylines: (district, category) → multiplier on the per-capita norm
INVEST_OVERRIDES = {
    ("Gandhinagar", "ROADS"): 4.5,      # heavy spending, low demand → possible mismatch
    ("Rajkot", "PUBLIC_SPACE"): 3.0,    # ditto
    ("Ahmedabad", "PUBLIC_SPACE"): 2.5,
    ("Dahod", "HEALTH"): 0.35,          # high demand, low investment → underserved gap
    ("Dang", "ROADS"): 0.4,
    ("Narmada", "HEALTH"): 0.5,
    ("Kutch", "WATER"): 2.2,            # high demand, high investment → covered / monitor
    ("Surat", "WATER"): 0.7,            # high demand, planned but not funded yet
    ("Morbi", "ENVIRONMENT"): 0.3,
    ("Vav-Tharad", "WATER"): 0.45,
    ("Banaskantha", "WATER"): 0.6,
    ("Ahmedabad", "ENVIRONMENT"): 1.6,
    ("Vadodara", "SANITATION"): 1.5,
}
rows = []
for d in districts:
    pop_lakh = int(d["population"]) / 1e5
    for c in categories:
        code = c["code"]
        mult = INVEST_OVERRIDES.get((d["name"], code), rng.uniform(0.75, 1.25))
        alloc = round(PER_CAPITA_CR_PER_LAKH[code] * pop_lakh * mult, 2)
        rows.append({
            "district": d["name"], "state": "Gujarat", "category_code": code, "fiscal_year": "2026-27",
            "allocated_inr_cr": alloc, "planned_inr_cr": round(alloc * rng.uniform(1.0, 1.4), 2),
            "spent_inr_cr": round(alloc * rng.uniform(0.15, 0.45), 2),
        })
with open(SEED_DIR / "investment_plans.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
    w.writeheader(); w.writerows(rows)

print(f"wrote projects ({len(P)}), investment ({len(rows)}) for {PILOT_STATES} → {SEED_DIR}")
