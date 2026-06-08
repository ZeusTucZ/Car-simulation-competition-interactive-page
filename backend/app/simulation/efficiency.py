"""Energy and efficiency calculations for the car simulation."""

from __future__ import annotations

from .constants import MIN_DISTANCE, MIN_DRIVE_FORCE, MIN_ENERGY


def calculate_energy_used(driving_force: float, distance_traveled: float) -> float:
    """Calculate energy used in joules using energy = force * distance."""
    if driving_force < MIN_DRIVE_FORCE:
        raise ValueError("driving_force must be greater than or equal to 0")

    if distance_traveled < MIN_DISTANCE:
        raise ValueError("distance_traveled must be greater than or equal to 0")

    return driving_force * distance_traveled


def calculate_efficiency(useful_energy: float, energy_used: float) -> float:
    """Calculate efficiency as useful_energy / energy_used.

    The returned value is a ratio. For example, 0.85 means 85% efficiency.
    """
    if useful_energy < MIN_ENERGY:
        raise ValueError("useful_energy must be greater than or equal to 0")

    if energy_used <= MIN_ENERGY:
        raise ValueError("energy_used must be greater than 0")

    return useful_energy / energy_used
