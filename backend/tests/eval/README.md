# AI evaluation

`extraction_cases.json` — 22 labelled citizen messages covering 4 languages (Gujarati, Hindi,
Hinglish, English) and all 17 categories, including two deliberately hard ones: a message that
mixes two categories, and an off-topic message that should land in OTHER.

Each case carries the expected category, urgency (±2 is treated as agreement between human raters),
and district (null where the message names no location — the model must not invent one).

## Thinking budget

```
python -m scripts.eval_thinking_budget --budgets 0,-1
```

Result on 2026-09-25 with gemini-2.5-flash:

| budget | category | district | urgency MAE | language | $/request | output tokens |
|---|---|---|---|---|---|---|
| off (0) | 22/22 | 22/22 | **1.14** | 22/22 | **$0.000750** | 232 |
| dynamic (-1) | 22/22 | 22/22 | 1.23 | 22/22 | $0.002119 | 779 |

Thinking changed no categorical outcome, was slightly worse on urgency, and cost 2.8x more.
Hence `GEMINI_THINKING_BUDGET=0`. Re-run this before changing the default or the model.
