"""Investment alignment: is money going where demand and gaps are? (blueprint 'misaligned public spending')."""
from __future__ import annotations

import pandas as pd

# Thresholds are deliberately asymmetric: a "possible mismatch" is a serious claim, so it needs clearly low demand
# AND clearly high spending. Everything in between is BALANCED.
HIGH_DEMAND, LOW_INVEST, LOW_DEMAND, HIGH_INVEST = 0.60, 0.40, 0.35, 0.75


def quadrant(demand_rank: float, invest_rank: float, unique_citizens: int) -> str:
    if unique_citizens > 0 and demand_rank >= HIGH_DEMAND:
        return "UNDERSERVED_GAP" if invest_rank <= LOW_INVEST else "COVERED_MONITOR"   # high demand: is money there?
    if demand_rank <= LOW_DEMAND and invest_rank >= HIGH_INVEST and invest_rank - demand_rank >= 0.6:
        return "POSSIBLE_MISMATCH"                                                      # low demand, heavy spending → review
    return "BALANCED"


def add_alignment(df: pd.DataFrame) -> pd.DataFrame:
    """Percentile-rank demand pressure (adjusted per-capita demand + infra gap) against per-capita investment,
    within the state, and label the quadrant. Ranks are computed within each category so sectors with naturally
    bigger budgets (roads) are not compared with small ones (street lighting)."""
    df = df.copy()
    df["demand_pressure"] = df["adjusted_per_1000"].rank(pct=True) * 0.6 + (df["infra_gap"] / 100) * 0.4
    df["demand_rank"] = df.groupby("category_code")["demand_pressure"].rank(pct=True)
    df["invest_rank"] = df.groupby("category_code")["invest_per_capita_inr"].rank(pct=True)
    df["misalignment_index"] = ((df["demand_rank"] - df["invest_rank"]) * 100).round(1)
    df["alignment_quadrant"] = [quadrant(dr, ir, uc) for dr, ir, uc in zip(df["demand_rank"], df["invest_rank"], df["unique_citizens"])]
    return df
