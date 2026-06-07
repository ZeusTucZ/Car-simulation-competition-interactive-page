"""Movement calculations for the car simulation."""

from __future__ import annotations

from typing import TypedDict

from .efficiency import calculate_efficiency, calculate_energy_used
from .forces import STANDARD_GRAVITY, calculate_forces


class SimulationHistoryPoint(TypedDict):
    """Position and speed data for UI visualization."""

    time: float
    position: float
    speed: float


class SimulationResult(TypedDict):
    """Summary and history data returned to the UI."""

    final_time: float
    final_speed: float
    total_distance: float
    energy_used: float
    efficiency: float
    history: list[SimulationHistoryPoint]


def calculate_acceleration(net_force: float, mass: float) -> float:
    """Calculate acceleration using Newton's second law: acceleration = force / mass."""
    if mass <= 0:
        raise ValueError("mass must be greater than 0")

    return net_force / mass


def update_velocity(current_velocity: float, acceleration: float, time_step: float) -> float:
    """Update velocity using velocity = current_velocity + acceleration * time_step."""
    if time_step < 0:
        raise ValueError("time_step must be greater than or equal to 0")

    return current_velocity + acceleration * time_step


def update_position(current_position: float, velocity: float, time_step: float) -> float:
    """Update position using position = current_position + velocity * time_step."""
    if time_step < 0:
        raise ValueError("time_step must be greater than or equal to 0")

    return current_position + velocity * time_step


def run_simulation(
    *,
    initial_position: float,
    initial_velocity: float,
    duration: float,
    time_step: float,
    drive_force: float,
    air_density: float,
    drag_coefficient: float,
    frontal_area: float,
    rolling_resistance_coefficient: float,
    mass: float,
    road_angle: float,
    gravity: float = STANDARD_GRAVITY,
) -> SimulationResult:
    """Run the car simulation and return UI-ready summary and history data.

    The returned data includes final time, final speed, total distance, energy
    used, efficiency, and position/speed history for visualization.
    """
    if duration < 0:
        raise ValueError("duration must be greater than or equal to 0")

    if time_step <= 0:
        raise ValueError("time_step must be greater than 0")

    if drive_force < 0:
        raise ValueError("drive_force must be greater than or equal to 0")

    position = initial_position
    velocity = initial_velocity
    current_time = 0.0
    total_distance = 0.0
    history: list[SimulationHistoryPoint] = [
        {
            "time": current_time,
            "position": position,
            "speed": abs(velocity),
        }
    ]

    while current_time < duration:
        current_time_step = min(time_step, duration - current_time)
        previous_position = position

        forces = calculate_forces(
            drive_force=drive_force,
            air_density=air_density,
            drag_coefficient=drag_coefficient,
            frontal_area=frontal_area,
            velocity=velocity,
            rolling_resistance_coefficient=rolling_resistance_coefficient,
            mass=mass,
            road_angle=road_angle,
            gravity=gravity,
        )
        acceleration = calculate_acceleration(forces.net, mass)
        velocity = update_velocity(velocity, acceleration, current_time_step)
        position = update_position(position, velocity, current_time_step)
        total_distance += abs(position - previous_position)
        current_time += current_time_step

        history.append(
            {
                "time": current_time,
                "position": position,
                "speed": abs(velocity),
            }
        )

    energy_used = calculate_energy_used(
        driving_force=drive_force,
        distance_traveled=total_distance,
    )
    initial_kinetic_energy = 0.5 * mass * initial_velocity**2
    final_kinetic_energy = 0.5 * mass * velocity**2
    useful_energy = max(0.0, final_kinetic_energy - initial_kinetic_energy)
    efficiency = (
        calculate_efficiency(useful_energy, energy_used)
        if energy_used > 0
        else 0.0
    )

    return {
        "final_time": current_time,
        "final_speed": abs(velocity),
        "total_distance": total_distance,
        "energy_used": energy_used,
        "efficiency": efficiency,
        "history": history,
    }
