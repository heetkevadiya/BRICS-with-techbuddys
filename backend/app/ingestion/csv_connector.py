"""CSV connector: read → validate row-by-row → return clean rows and rejected rows.

Raw files are never modified. Validation failures are reported, not silently dropped.
"""
from __future__ import annotations

import csv
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

Row = dict[str, Any]
Validator = Callable[[Row], Row]  # returns normalised row or raises ValueError


@dataclass
class IngestResult:
    rows: list[Row] = field(default_factory=list)
    rejected: list[tuple[int, str]] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.rejected


def read_csv(path: str | Path, validator: Validator) -> IngestResult:
    result = IngestResult()
    with open(path, newline="", encoding="utf-8") as f:
        for i, raw in enumerate(csv.DictReader(f), start=2):  # header is line 1
            try:
                result.rows.append(validator({k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in raw.items()}))
            except (ValueError, KeyError) as e:
                result.rejected.append((i, str(e)))
    return result


def num(v: Any, *, lo: float | None = None, hi: float | None = None, allow_blank: bool = False) -> float | None:
    if v in ("", None):
        if allow_blank:
            return None
        raise ValueError("missing numeric value")
    x = float(v)
    if lo is not None and x < lo:
        raise ValueError(f"{x} < {lo}")
    if hi is not None and x > hi:
        raise ValueError(f"{x} > {hi}")
    return x
