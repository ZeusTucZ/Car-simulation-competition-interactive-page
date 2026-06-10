"""API routes that connect the React UI to the simulation engine."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..models.car_params import CarParams
from ..models.track_params import TrackLineType, TrackParams
from ..simulation.constants import (
    AIR_DENSITY_SEA_LEVEL,
    COAST_HYSTERESIS,
    DEFAULT_INITIAL_VELOCITY,
    DEFAULT_INITIAL_POSITION,
    DEFAULT_ROAD_ANGLE,
    DEFAULT_TIME_STEP,
    HISTORY_SAMPLE_INTERVAL,
    MAX_RACE_DURATION,
    MIN_DRIVE_FORCE,
    MIN_MASS,
    MIN_VELOCITY,
    MOTOR_EFFICIENCY,
    TARGET_LAP_COUNT,
)
from ..simulation.physics import run_simulation
from ..simulation.track import process_track


router = APIRouter(prefix="/simulation", tags=["simulation"])
SUPPORTED_TRACK_ID = "centerline"


class SimulationRequest(BaseModel):
    """Car and track parameters received from the React UI."""

    mass: float = Field(..., ge=MIN_MASS)
    drive_force: float = Field(..., ge=MIN_DRIVE_FORCE)
    drag_coefficient: float = Field(..., ge=0)
    frontal_area: float = Field(..., gt=0)
    rolling_resistance_coefficient: float = Field(..., ge=0)
    initial_velocity: float = Field(DEFAULT_INITIAL_VELOCITY, ge=MIN_VELOCITY)
    cruise_speed: float | None = Field(
        None,
        gt=0,
        description=(
            "Target speed in m/s for the burn-and-coast strategy. The motor "
            "pushes until slightly above this speed, then coasts until "
            "slightly below it. Omit to keep the motor on the whole race."
        ),
    )
    track_id: str = Field(SUPPORTED_TRACK_ID, min_length=1)
    line_type: TrackLineType = "centerline"


@router.post("/run")
def run_car_simulation(request: SimulationRequest) -> dict[str, object]:
    """Validate car parameters, run the simulation, and return JSON-ready data."""
    try:
        car = CarParams(
            mass=request.mass,
            drive_force=request.drive_force,
            drag_coefficient=request.drag_coefficient,
            frontal_area=request.frontal_area,
            rolling_resistance_coefficient=request.rolling_resistance_coefficient,
            initial_velocity=request.initial_velocity,
        )
        track = TrackParams(
            track_id=request.track_id,
            line_type=request.line_type,
        )

        if track.track_id != SUPPORTED_TRACK_ID:
            raise ValueError(f"track_id must be {SUPPORTED_TRACK_ID}")

        track_points = process_track()
        lap_length = track_points[-1].distance
        target_distance = TARGET_LAP_COUNT * lap_length
        coast_high_speed = (
            request.cruise_speed * (1 + COAST_HYSTERESIS)
            if request.cruise_speed is not None
            else None
        )
        coast_low_speed = (
            request.cruise_speed * (1 - COAST_HYSTERESIS)
            if request.cruise_speed is not None
            else None
        )
        result = run_simulation(
            initial_position=DEFAULT_INITIAL_POSITION,
            initial_velocity=car.initial_velocity,
            duration=MAX_RACE_DURATION,
            time_step=DEFAULT_TIME_STEP,
            drive_force=car.drive_force,
            air_density=AIR_DENSITY_SEA_LEVEL,
            drag_coefficient=car.drag_coefficient,
            frontal_area=car.frontal_area,
            rolling_resistance_coefficient=car.rolling_resistance_coefficient,
            mass=car.mass,
            road_angle=DEFAULT_ROAD_ANGLE,
            track_points=track_points,
            target_distance=target_distance,
            history_interval=HISTORY_SAMPLE_INTERVAL,
            coast_high_speed=coast_high_speed,
            coast_low_speed=coast_low_speed,
            motor_efficiency=MOTOR_EFFICIENCY,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    response = result.to_dict()
    response["race"] = {
        "target_laps": TARGET_LAP_COUNT,
        "max_time": MAX_RACE_DURATION,
        "lap_length": lap_length,
        "target_distance": target_distance,
        "laps_completed": min(
            result.distance_traveled / lap_length, float(TARGET_LAP_COUNT)
        ),
        "finished": result.distance_traveled >= target_distance,
    }
    response["track"] = {
        "track_id": track.track_id,
        "line_type": track.line_type,
        "points": [point.to_dict() for point in track_points],
    }

    return response
