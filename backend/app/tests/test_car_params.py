import pytest

from app.models.car_params import CarParams


def test_car_params_accepts_valid_values():
    car = CarParams(
        mass=1200.0,
        drive_force=4000.0,
        drag_coefficient=0.30,
        frontal_area=2.2,
        rolling_resistance_coefficient=0.015,
    )

    assert car.mass == 1200.0


def test_car_params_rejects_negative_mass():
    with pytest.raises(ValueError):
        CarParams(
            mass=-1.0,
            drive_force=4000.0,
            drag_coefficient=0.30,
            frontal_area=2.2,
            rolling_resistance_coefficient=0.015,
        )