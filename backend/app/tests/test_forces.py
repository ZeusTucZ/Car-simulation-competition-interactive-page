import pytest

from app.simulation.forces import (
    ForceBreakdown,
    calculate_aerodynamic_drag,
    calculate_rolling_resistance,
    calculate_slope_force,
)


def test_aerodynamic_drag():
    result = calculate_aerodynamic_drag(
        air_density=1.225,
        drag_coefficient=0.30,
        frontal_area=2.2,
        velocity=10.0,
    )

    assert result == pytest.approx(40.425)


def test_rolling_resistance():
    result = calculate_rolling_resistance(
        rolling_resistance_coefficient=0.015,
        mass=1200.0,
        gravity=9.81,
    )

    assert result == pytest.approx(176.58)


def test_flat_slope_force_is_zero():
    result = calculate_slope_force(
        mass=1200.0,
        road_angle=0.0,
        gravity=9.81,
    )

    assert result == pytest.approx(0.0)


def test_force_breakdown_net_force():
    forces = ForceBreakdown(
        driving=4000.0,
        aerodynamic_drag=100.0,
        rolling_resistance=200.0,
        slope=300.0,
    )

    assert forces.net == pytest.approx(3400.0)