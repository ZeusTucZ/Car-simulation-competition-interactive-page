"""Data returned to the UI after running a simulation."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class SimulationHistoryPoint:
    """Car state at one point in the simulation."""

    time: float
    position: float
    speed: float
    distance: float = 0.0
    x: float = 0.0
    y: float = 0.0
    elevation: float = 0.0
    heading: float = 0.0
    slope_angle: float = 0.0
    grade_percent: float = 0.0
    curvature: float = 0.0
    motor_on: bool = True
    energy: float = 0.0


@dataclass(frozen=True)
class ForceBreakdownResult:
    """Force values returned to explain the final simulation state."""

    driving: float
    aerodynamic_drag: float
    rolling_resistance: float
    slope: float
    net: float


@dataclass(frozen=True)
class SimulationResult:
    """Summary and visualization data returned to the React UI."""

    final_time: float
    final_speed: float
    distance_traveled: float
    energy_used: float
    efficiency: float
    history: list[SimulationHistoryPoint]
    force_breakdown: ForceBreakdownResult | None = None

    def to_dict(self) -> dict[str, Any]:
        """Return a JSON-ready dictionary for API responses."""
        return asdict(self)
