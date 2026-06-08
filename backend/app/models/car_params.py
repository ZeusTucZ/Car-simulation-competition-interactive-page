"""User-editable car parameters for the simulation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CarParams:
    """Describes the car created by the user."""

    mass: float
    drive_force: float
    drag_coefficient: float
    frontal_area: float
    rolling_resistance_coefficient: float
    initial_velocity: float = 0.0

    def __post_init__(self) -> None:
        if self.mass <= 0:
            raise ValueError("mass must be greater than 0")

        if self.drive_force < 0:
            raise ValueError("drive_force must be greater than or equal to 0")

        if self.drag_coefficient < 0:
            raise ValueError("drag_coefficient must be greater than or equal to 0")

        if self.frontal_area <= 0:
            raise ValueError("frontal_area must be greater than 0")

        if self.rolling_resistance_coefficient < 0:
            raise ValueError(
                "rolling_resistance_coefficient must be greater than or equal to 0"
            )

        if self.initial_velocity < 0:
            raise ValueError("initial_velocity must be greater than or equal to 0")
