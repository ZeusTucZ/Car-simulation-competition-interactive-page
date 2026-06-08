"""User-editable track parameters for the simulation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


TrackLineType = Literal["centerline"]


@dataclass(frozen=True)
class TrackParams:
    """Describes the track selected by the user."""

    track_id: str
    line_type: TrackLineType = "centerline"

    def __post_init__(self) -> None:
        if not self.track_id.strip():
            raise ValueError("track_id must not be empty")

        if self.line_type != "centerline":
            raise ValueError("line_type must be centerline")
