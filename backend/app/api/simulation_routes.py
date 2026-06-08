"""API routes that connect the React UI to the simulation engine."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..models.car_params import CarParams
from ..models.track_params import TrackLineType, TrackParams
from ..simulation.constants import (
    AIR_DENSITY_SEA_LEVEL,
    DEFAULT_INITIAL_POSITION,
    DEFAULT_ROAD_ANGLE,
    DEFAULT_SIMULATION_DURATION,
    DEFAULT_TIME_STEP,
)
from ..simulation.physics import run_simulation
from ..simulation.track import process_track


router = APIRouter(prefix="/simulation", tags=["simulation"])
SUPPORTED_TRACK_ID = "centerline"


class SimulationRequest(BaseModel):
    """Car and track parameters received from the React UI."""

    mass: float = Field(..., gt=0)
    drive_force: float = Field(..., ge=0)
    drag_coefficient: float = Field(..., ge=0)
    frontal_area: float = Field(..., gt=0)
    rolling_resistance_coefficient: float = Field(..., ge=0)
    initial_velocity: float = Field(0.0, ge=0)
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
        result = run_simulation(
            initial_position=DEFAULT_INITIAL_POSITION,
            initial_velocity=car.initial_velocity,
            duration=DEFAULT_SIMULATION_DURATION,
            time_step=DEFAULT_TIME_STEP,
            drive_force=car.drive_force,
            air_density=AIR_DENSITY_SEA_LEVEL,
            drag_coefficient=car.drag_coefficient,
            frontal_area=car.frontal_area,
            rolling_resistance_coefficient=car.rolling_resistance_coefficient,
            mass=car.mass,
            road_angle=DEFAULT_ROAD_ANGLE,
            track_points=track_points,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    response = result.to_dict()
    response["track"] = {
        "track_id": track.track_id,
        "line_type": track.line_type,
        "points": [point.to_dict() for point in track_points],
    }

    return response
