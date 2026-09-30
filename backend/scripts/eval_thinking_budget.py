"""Measure extraction accuracy against a labelled multilingual set, and write the result to
data/eval/extraction_report.json so the dashboard can show it.

Also compares Gemini thinking budgets, since that is a real cost decision.
Run: python -m scripts.eval_thinking_budget [--budgets 0,-1]
"""
from __future__ import annotations

import argparse
import json
import statistics
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from google.genai import types

from app.core.config import settings
from app.db.session import SessionLocal
from app.schemas.ai import ExtractionResult
from app.services.ai import gemini_client
from app.services.extraction_service import SYSTEM, _category_block

PRICE_IN, PRICE_OUT = 0.30, 2.50  # USD per 1M tokens, Gemini Flash
CASES = json.loads((Path(__file__).resolve().parents[1] / "tests" / "eval" / "extraction_cases.json").read_text())

ap = argparse.ArgumentParser()
ap.add_argument("--budgets", default="0,-1", help="-1 = model decides (dynamic), 0 = off")
budgets = [int(b) for b in ap.parse_args().budgets.split(",")]

with SessionLocal() as db:
    base = SYSTEM.format(categories=_category_block(db))
client = gemini_client.client()

REPORT = Path(__file__).resolve().parents[1] / "data" / "eval" / "extraction_report.json"
report = {"model": settings.gemini_model, "cases": len(CASES),
          "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"), "runs": []}

print(f"{len(CASES)} labelled cases · {settings.gemini_model}\n")
print(f"{'budget':>8} {'category':>10} {'district':>10} {'urgency MAE':>12} {'lang':>6} {'$/request':>11} {'tokens out':>11}")
for b in budgets:
    cat_ok = dist_ok = lang_ok = 0
    urg_err, cost, out_tokens = [], 0.0, 0
    per_lang = defaultdict(lambda: {"n": 0, "cat": 0, "urg": []})
    missed = set()
    for c in CASES:
        r = client.models.generate_content(
            model=settings.gemini_model,
            contents=base + f'\n\nCitizen message:\n"""\n{c["text"]}\n"""',
            config=types.GenerateContentConfig(
                temperature=0.1, response_mime_type="application/json", response_schema=ExtractionResult,
                thinking_config=types.ThinkingConfig(thinking_budget=b)),
        )
        res = ExtractionResult.model_validate_json(r.text)
        u = r.usage_metadata
        out = (u.candidates_token_count or 0) + (getattr(u, "thoughts_token_count", 0) or 0)
        out_tokens += out
        cost += u.prompt_token_count / 1e6 * PRICE_IN + out / 1e6 * PRICE_OUT

        hit = res.category_code == c["category"]
        cat_ok += hit
        if not hit:
            missed.add(f'{c["category"]}→{res.category_code}')
        err = abs(res.urgency_score - c["urgency"])
        urg_err.append(err)
        pl = per_lang[c["lang"]]
        pl["n"] += 1; pl["cat"] += hit; pl["urg"].append(err)
        lang_ok += res.detected_language.split("-")[0] == c["lang"].split("-")[0]
        got = (res.location.district or "").lower()
        want = (c["district"] or "").lower()
        dist_ok += (want in got or got in want) if want else (got == "")

    n = len(CASES)
    label = "off" if b == 0 else ("dynamic" if b == -1 else str(b))
    print(f"{label:>8} {cat_ok}/{n:<8} {dist_ok}/{n:<8} {statistics.mean(urg_err):>12.2f} {lang_ok}/{n:<4} "
          f"{cost/n:>11.6f} {out_tokens//n:>11}")
    report["runs"].append({
        "thinking_budget": label,
        "category_accuracy": round(cat_ok / n, 4),
        "district_accuracy": round(dist_ok / n, 4),
        "language_accuracy": round(lang_ok / n, 4),
        "urgency_mae": round(statistics.mean(urg_err), 3),
        "usd_per_request": round(cost / n, 6),
        "output_tokens_per_request": out_tokens // n,
        "per_language": {k: {"n": v["n"], "category_accuracy": round(v["cat"] / v["n"], 4),
                             "urgency_mae": round(statistics.mean(v["urg"]), 3)}
                         for k, v in per_lang.items()},
        "per_category": sorted(missed) or [],
    })

REPORT.parent.mkdir(parents=True, exist_ok=True)
REPORT.write_text(json.dumps(report, indent=1) + "\n")
print(f"\nwrote {REPORT.relative_to(REPORT.parents[2])}")
