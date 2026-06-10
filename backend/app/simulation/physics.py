"""Movement calculations for the car simulation."""

from __future__ import annotations

from bisect import bisect_left
from collections.abc import Sequence
from math import pi

from ..models.simulation_result import (
    ForceBreakdownResult,
    SimulationHistoryPoint,
    SimulationResult,
)
from ..models.track_result import TrackPoint
from .constants import (
    DEFAULT_INITIAL_POSITION,
    KINETIC_ENERGY_FACTOR,
    MIN_DISTANCE,
    MIN_DRIVE_FORCE,
    MIN_ENERGY,
    MIN_MASS,
    MIN_TIME_STEP,
    MIN_VELOCITY,
    STANDARD_GRAVITY,
)
from .efficiency import calculate_efficiency
from .forces import calculate_forces


def calculate_acceleration(net_force: float, mass: float) -> float:
    """Calculate acceleration using Newton's second law: acceleration = force / mass."""
    if mass < MIN_MASS:
        raise ValueError("mass must be greater than 0")

    return net_force / mass


def update_velocity(current_velocity: float, acceleration: float, time_step: float) -> float:
    """Update velocity using velocity = current_velocity + acceleration * time_step."""
    if time_step < MIN_DISTANCE:
        raise ValueError("time_step must be greater than or equal to 0")

    return current_velocity + acceleration * time_step


def update_position(current_position: float, velocity: float, time_step: float) -> float:
    """Update position using position = current_position + velocity * time_step."""
    if time_step < MIN_DISTANCE:
        raise ValueError("time_step must be greater than or equal to 0")

    return current_position + velocity * time_step


def get_track_slope_angle(
    track_points: Sequence[TrackPoint] | None,
    distance: float,
    fallback_road_angle: float,
) -> float:
    """Return the track slope angle at a distance, or the fallback road angle."""
    track_point = get_track_point_at_distance(track_points, distance)

    if track_point is None:
        return fallback_road_angle

    return track_point.slope_angle


def get_track_point_at_distance(
    track_points: Sequence[TrackPoint] | None,
    distance: float,
) -> TrackPoint | None:
    """Return an interpolated track point for a distance along the track."""
    if not track_points:
        return None

    if len(track_points) == 1:
        return track_points[0]

    track_length = track_points[-1].distance
    if track_length <= MIN_DISTANCE:
        return track_points[0]

    track_distance = distance % track_length
    point_distances = [point.distance for point in track_points]
    next_index = bisect_left(point_distances, track_distance)

    if next_index == 0:
        return track_points[0]

    if next_index >= len(track_points):
        return track_points[-1]

    previous_point = track_points[next_index - 1]
    next_point = track_points[next_index]
    segment_distance = next_point.distance - previous_point.distance

    if segment_distance <= MIN_DISTANCE:
        return previous_point

    interpolation = (track_distance - previous_point.distance) / segment_distance

    return TrackPoint(
        x=_interpolate(previous_point.x, next_point.x, interpolation),
        y=_interpolate(previous_point.y, next_point.y, interpolation),
        elevation=_interpolate(
            previous_point.elevation,
            next_point.elevation,
            interpolation,
        ),
        distance=track_distance,
        heading=_interpolate_angle(
            previous_point.heading,
            next_point.heading,
            interpolation,
        ),
        slope_angle=_interpolate(
            previous_point.slope_angle,
            next_point.slope_angle,
            interpolation,
        ),
        grade_percent=_interpolate(
            previous_point.grade_percent,
            next_point.grade_percent,
            interpolation,
        ),
        curvature=_interpolate(
            previous_point.curvature,
            next_point.curvature,
            interpolation,
        ),
    )


def create_history_point(
    *,
    time: float,
    position: float,
    speed: float,
    distance: float,
    track_points: Sequence[TrackPoint] | None,
    fallback_road_angle: float,
    motor_on: bool = True,
    energy: float = 0.0,
) -> SimulationHistoryPoint:
    """Create a UI history point, mapped to the track when track data exists."""
    track_point = get_track_point_at_distance(track_points, distance)

    if track_point is None:
        return SimulationHistoryPoint(
            time=time,
            position=position,
            speed=abs(speed),
            distance=distance,
            x=position,
            y=DEFAULT_INITIAL_POSITION,
            slope_angle=fallback_road_angle,
            motor_on=motor_on,
            energy=energy,
        )

    return SimulationHistoryPoint(
        time=time,
        position=position,
        speed=abs(speed),
        distance=distance,
        x=track_point.x,
        y=track_point.y,
        elevation=track_point.elevation,
        heading=track_point.heading,
        slope_angle=track_point.slope_angle,
        grade_percent=track_point.grade_percent,
        curvature=track_point.curvature,
        motor_on=motor_on,
        energy=energy,
    )


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
    track_points: Sequence[TrackPoint] | None = None,
    gravity: float = STANDARD_GRAVITY,
    target_distance: float | None = None,
    history_interval: float | None = None,
    coast_high_speed: float | None = None,
    coast_low_speed: float | None = None,
    motor_efficiency: float = 1.0,
) -> SimulationResult:
    """Run the car simulation and return UI-ready summary and history data.

    The returned data includes final time, final speed, distance traveled,
    energy used, efficiency, and position/speed history for visualization.
    The simulation stops early once ``target_distance`` is reached, and
    ``history_interval`` controls how often a history point is recorded
    (every step by default).

    When ``coast_high_speed``/``coast_low_speed`` are given the driver uses a
    burn-and-coast strategy: the motor pushes until the car reaches the high
    speed, then turns off and lets the car glide until it slows to the low
    speed. Energy is only spent while the motor pushes, so the car's drag and
    rolling resistance determine how far each burst of energy takes it.
    ``motor_efficiency`` converts mechanical work into the electrical energy
    drawn from the battery.
    """
    if duration < MIN_DISTANCE:
        raise ValueError("duration must be greater than or equal to 0")

    if time_step < MIN_TIME_STEP:
        raise ValueError("time_step must be greater than 0")

    if drive_force < MIN_DRIVE_FORCE:
        raise ValueError("drive_force must be greater than or equal to 0")

    if target_distance is not None and target_distance < MIN_DISTANCE:
        raise ValueError("target_distance must be greater than or equal to 0")

    if history_interval is not None and history_interval < time_step:
        raise ValueError("history_interval must be greater than or equal to time_step")

    if (coast_high_speed is None) != (coast_low_speed is None):
        raise ValueError("coast_high_speed and coast_low_speed must be given together")

    if coast_high_speed is not None and not (
        MIN_VELOCITY <= coast_low_speed <= coast_high_speed
    ):
        raise ValueError("coast speeds must satisfy 0 <= low <= high")

    if not 0 < motor_efficiency <= 1:
        raise ValueError("motor_efficiency must be between 0 and 1")

    sample_interval = history_interval if history_interval is not None else time_step
    next_sample_time = sample_interval
    position = initial_position
    velocity = initial_velocity
    current_time = MIN_DISTANCE
    distance_traveled = MIN_DISTANCE
    energy_used = MIN_ENERGY
    motor_on = True
    final_force_breakdown: ForceBreakdownResult | None = None
    history: list[SimulationHistoryPoint] = [
        create_history_point(
            time=current_time,
            position=position,
            speed=velocity,
            distance=distance_traveled,
            track_points=track_points,
            fallback_road_angle=road_angle,
            motor_on=motor_on,
            energy=energy_used,
        )
    ]

    while current_time < duration and (
        target_distance is None or distance_traveled < target_distance
    ):
        current_time_step = min(time_step, duration - current_time)
        previous_position = position
        current_road_angle = get_track_slope_angle(
            track_points=track_points,
            distance=distance_traveled,
            fallback_road_angle=road_angle,
        )

        if coast_high_speed is not None:
            if motor_on and velocity >= coast_high_speed:
                motor_on = False
            elif not motor_on and velocity <= coast_low_speed:
                motor_on = True
        current_drive_force = drive_force if motor_on else MIN_DRIVE_FORCE

        forces = calculate_forces(
            drive_force=current_drive_force,
            air_density=air_density,
            drag_coefficient=drag_coefficient,
            frontal_area=frontal_area,
            velocity=velocity,
            rolling_resistance_coefficient=rolling_resistance_coefficient,
            mass=mass,
            road_angle=current_road_angle,
            gravity=gravity,
        )
        final_force_breakdown = ForceBreakdownResult(
            driving=forces.driving,
            aerodynamic_drag=forces.aerodynamic_drag,
            rolling_resistance=forces.rolling_resistance,
            slope=forces.slope,
            net=forces.net,
        )
        acceleration = calculate_acceleration(forces.net, mass)
        velocity = update_velocity(velocity, acceleration, current_time_step)
        # Resistance forces oppose motion; they can slow the car to a stop
        # but never push it backwards.
        velocity = max(velocity, MIN_VELOCITY)
        position = update_position(position, velocity, current_time_step)
        distance_traveled += abs(position - previous_position)
        energy_used += (
            current_drive_force * abs(position - previous_position) / motor_efficiency
        )
        current_time += current_time_step

        if current_time >= next_sample_time - MIN_TIME_STEP / 2:
            next_sample_time += sample_interval
            history.append(
                create_history_point(
                    time=current_time,
                    position=position,
                    speed=velocity,
                    distance=distance_traveled,
                    track_points=track_points,
                    fallback_road_angle=current_road_angle,
                    motor_on=motor_on,
                    energy=energy_used,
                )
            )

    if history[-1].time < current_time:
        history.append(
            create_history_point(
                time=current_time,
                position=position,
                speed=velocity,
                distance=distance_traveled,
                track_points=track_points,
                fallback_road_angle=road_angle,
                motor_on=motor_on,
                energy=energy_used,
            )
        )

    initial_kinetic_energy = KINETIC_ENERGY_FACTOR * mass * initial_velocity**2
    final_kinetic_energy = KINETIC_ENERGY_FACTOR * mass * velocity**2
    useful_energy = max(MIN_ENERGY, final_kinetic_energy - initial_kinetic_energy)
    efficiency = (
        calculate_efficiency(useful_energy, energy_used)
        if energy_used > MIN_ENERGY
        else MIN_ENERGY
    )

    return SimulationResult(
        final_time=current_time,
        final_speed=abs(velocity),
        distance_traveled=distance_traveled,
        energy_used=energy_used,
        efficiency=efficiency,
        history=history,
        force_breakdown=final_force_breakdown,
    )


def _interpolate(start: float, end: float, interpolation: float) -> float:
    return start + (end - start) * interpolation


def _interpolate_angle(start: float, end: float, interpolation: float) -> float:
    return start + _normalize_angle(end - start) * interpolation


def _normalize_angle(angle: float) -> float:
    return (angle + pi) % (2 * pi) - pi
