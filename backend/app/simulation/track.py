"""Track preprocessing calculations for the car simulation."""

from __future__ import annotations

import csv
from dataclasses import dataclass
from math import atan2, cos, hypot, pi, radians
from pathlib import Path

from ..models.track_result import TrackPoint


EARTH_RADIUS_METERS = 6_371_000.0
DEFAULT_CENTERLINE_PATH = (
    Path(__file__).resolve().parents[1] / "data" / "tracks" / "centerline.csv"
)

LATITUDE_COLUMN = "Latitude"
LONGITUDE_COLUMN = "Longitude"
ELEVATION_COLUMN = "Metres above sea level"


@dataclass(frozen=True)
class RawTrackPoint:
    """Raw GPS and elevation data loaded from a track CSV."""

    latitude: float
    longitude: float
    elevation: float


@dataclass(frozen=True)
class LocalTrackPoint:
    """Track point converted to local meters."""

    x: float
    y: float
    elevation: float


def load_centerline_csv(csv_path: str | Path = DEFAULT_CENTERLINE_PATH) -> list[RawTrackPoint]:
    """Load latitude, longitude, and elevation points from a centerline CSV."""
    path = Path(csv_path)

    with path.open(newline="", encoding="utf-8-sig") as file:
        reader = csv.DictReader(file)
        points = [
            RawTrackPoint(
                latitude=float(row[LATITUDE_COLUMN]),
                longitude=float(row[LONGITUDE_COLUMN]),
                elevation=float(row[ELEVATION_COLUMN]),
            )
            for row in reader
        ]

    if not points:
        raise ValueError("track CSV must contain at least one point")

    return points


def convert_lat_lon_to_local_meters(
    latitude: float,
    longitude: float,
    origin_latitude: float,
    origin_longitude: float,
) -> tuple[float, float]:
    """Convert latitude and longitude to local x/y meters from an origin point."""
    origin_latitude_radians = radians(origin_latitude)
    x = (
        EARTH_RADIUS_METERS
        * radians(longitude - origin_longitude)
        * cos(origin_latitude_radians)
    )
    y = EARTH_RADIUS_METERS * radians(latitude - origin_latitude)

    return x, y


def convert_gps_to_meters(points: list[RawTrackPoint]) -> list[LocalTrackPoint]:
    """Convert raw GPS points into local x/y meter coordinates."""
    if not points:
        return []

    origin = points[0]
    local_points = []

    for point in points:
        x, y = convert_lat_lon_to_local_meters(
            latitude=point.latitude,
            longitude=point.longitude,
            origin_latitude=origin.latitude,
            origin_longitude=origin.longitude,
        )
        local_points.append(
            LocalTrackPoint(
                x=x,
                y=y,
                elevation=point.elevation,
            )
        )

    return local_points


def calculate_segment_distance(
    start: LocalTrackPoint,
    end: LocalTrackPoint,
) -> float:
    """Calculate horizontal distance between two local track points."""
    return hypot(end.x - start.x, end.y - start.y)


def calculate_cumulative_distances(points: list[LocalTrackPoint]) -> list[float]:
    """Calculate cumulative horizontal distance along the track."""
    if not points:
        return []

    distances = [0.0]

    for index in range(1, len(points)):
        segment_distance = calculate_segment_distance(points[index - 1], points[index])
        distances.append(distances[-1] + segment_distance)

    return distances


def calculate_heading_angle(start: LocalTrackPoint, end: LocalTrackPoint) -> float:
    """Calculate heading angle in radians between two local track points."""
    return atan2(end.y - start.y, end.x - start.x)


def calculate_slope_angle(start: LocalTrackPoint, end: LocalTrackPoint) -> float:
    """Calculate slope angle in radians between two local track points."""
    horizontal_distance = calculate_segment_distance(start, end)

    if horizontal_distance == 0:
        return 0.0

    return atan2(end.elevation - start.elevation, horizontal_distance)


def calculate_grade_percent(start: LocalTrackPoint, end: LocalTrackPoint) -> float:
    """Calculate track grade percent between two local track points."""
    horizontal_distance = calculate_segment_distance(start, end)

    if horizontal_distance == 0:
        return 0.0

    return ((end.elevation - start.elevation) / horizontal_distance) * 100


def calculate_curvature(
    previous_heading: float,
    next_heading: float,
    distance: float,
) -> float:
    """Estimate curvature as change in heading divided by distance."""
    if distance == 0:
        return 0.0

    return _normalize_angle(next_heading - previous_heading) / distance


def process_track(csv_path: str | Path = DEFAULT_CENTERLINE_PATH) -> list[TrackPoint]:
    """Load a centerline CSV and return processed track points."""
    raw_points = load_centerline_csv(csv_path)
    local_points = convert_gps_to_meters(raw_points)
    distances = calculate_cumulative_distances(local_points)
    segment_headings = _calculate_segment_headings(local_points)

    processed_points: list[TrackPoint] = []

    for index, point in enumerate(local_points):
        start, end = _neighbor_points_for_index(local_points, index)
        heading = _calculate_heading_at_index(local_points, index)
        slope_angle = calculate_slope_angle(start, end)
        grade_percent = calculate_grade_percent(start, end)
        curvature = _calculate_curvature_at_index(
            segment_headings=segment_headings,
            distances=distances,
            index=index,
        )

        processed_points.append(
            TrackPoint(
                x=point.x,
                y=point.y,
                elevation=point.elevation,
                distance=distances[index],
                heading=heading,
                slope_angle=slope_angle,
                grade_percent=grade_percent,
                curvature=curvature,
            )
        )

    return processed_points


def _calculate_segment_headings(points: list[LocalTrackPoint]) -> list[float]:
    return [
        calculate_heading_angle(points[index - 1], points[index])
        for index in range(1, len(points))
    ]


def _calculate_heading_at_index(points: list[LocalTrackPoint], index: int) -> float:
    if len(points) == 1:
        return 0.0

    start, end = _neighbor_points_for_index(points, index)

    return calculate_heading_angle(start, end)


def _calculate_curvature_at_index(
    segment_headings: list[float],
    distances: list[float],
    index: int,
) -> float:
    if index == 0 or index >= len(segment_headings):
        return 0.0

    previous_segment_distance = distances[index] - distances[index - 1]
    next_segment_distance = (
        distances[index + 1] - distances[index]
        if index + 1 < len(distances)
        else previous_segment_distance
    )
    average_distance = (previous_segment_distance + next_segment_distance) / 2

    return calculate_curvature(
        previous_heading=segment_headings[index - 1],
        next_heading=segment_headings[index],
        distance=average_distance,
    )


def _neighbor_points_for_index(
    points: list[LocalTrackPoint],
    index: int,
) -> tuple[LocalTrackPoint, LocalTrackPoint]:
    if len(points) == 1:
        return points[0], points[0]

    if index == 0:
        return points[0], points[1]

    if index == len(points) - 1:
        return points[-2], points[-1]

    return points[index - 1], points[index + 1]


def _normalize_angle(angle: float) -> float:
    return (angle + pi) % (2 * pi) - pi
