"""Processed track data returned by track preprocessing."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class TrackPoint:
    """One processed point on a track line."""

    x: float
    y: float
    elevation: float
    distance: float
    heading: float
    slope_angle: float
    grade_percent: float
    curvature: float

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-ready dictionary for API responses."""
        return asdict(self)
