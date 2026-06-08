"""Force calculations for the car simulation."""

from __future__ import annotations

from dataclasses import dataclass
from math import sin

from .constants import STANDARD_GRAVITY

@dataclass(frozen=True)
class ForceBreakdown:
    """Forces acting on the car, measured in newtons."""

    driving: float
    aerodynamic_drag: float
    rolling_resistance: float
    slope: float

    @property
    def net(self) -> float:
        """Forward force after subtracting resistance forces."""
        return (
            self.driving
            - self.aerodynamic_drag
            - self.rolling_resistance
            - self.slope
        )


def calculate_driving_force(drive_force: float) -> float:
    """Return the forward driving force from the engine or motor."""
    return drive_force


def calculate_aerodynamic_drag(
    air_density: float,
    drag_coefficient: float,
    frontal_area: float,
    velocity: float,
) -> float:
    """Calculate aerodynamic drag using 0.5 * airDensity * Cd * frontalArea * velocity^2."""
    return 0.5 * air_density * drag_coefficient * frontal_area * velocity**2


def calculate_rolling_resistance(
    rolling_resistance_coefficient: float,
    mass: float,
    gravity: float = STANDARD_GRAVITY,
) -> float:
    """Calculate rolling resistance using Crr * mass * gravity."""
    return rolling_resistance_coefficient * mass * gravity


def calculate_slope_force(
    mass: float,
    road_angle: float,
    gravity: float = STANDARD_GRAVITY,
) -> float:
    """Calculate gravity force from road slope using mass * gravity * sin(roadAngle).

    road_angle is measured in radians. Positive values represent uphill slopes,
    and negative values represent downhill slopes.
    """
    return mass * gravity * sin(road_angle)


def calculate_forces(
    drive_force: float,
    air_density: float,
    drag_coefficient: float,
    frontal_area: float,
    velocity: float,
    rolling_resistance_coefficient: float,
    mass: float,
    road_angle: float,
    gravity: float = STANDARD_GRAVITY,
) -> ForceBreakdown:
    """Calculate all documented forces for the current simulation step."""
    return ForceBreakdown(
        driving=calculate_driving_force(drive_force),
        aerodynamic_drag=calculate_aerodynamic_drag(
            air_density=air_density,
            drag_coefficient=drag_coefficient,
            frontal_area=frontal_area,
            velocity=velocity,
        ),
        rolling_resistance=calculate_rolling_resistance(
            rolling_resistance_coefficient=rolling_resistance_coefficient,
            mass=mass,
            gravity=gravity,
        ),
        slope=calculate_slope_force(
            mass=mass,
            road_angle=road_angle,
            gravity=gravity,
        ),
    )
