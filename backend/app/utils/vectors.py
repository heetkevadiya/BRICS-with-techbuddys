from __future__ import annotations

import numpy as np


def cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.asarray(a, dtype=np.float64), np.asarray(b, dtype=np.float64)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    return float(np.dot(va, vb)) / denom if denom else 0.0


def mean_vector(vectors: list[list[float]]) -> list[float]:
    return np.mean(np.asarray(vectors, dtype=np.float64), axis=0).tolist()
