import pytest

from app.simulation.physics import (
    calculate_acceleration,
    run_simulation,
    update_position,
    update_velocity,
)


def test_calculate_acceleration():
    assert calculate_acceleration(net_force=1000.0, mass=500.0) == pytest.approx(2.0)


def test_update_velocity():
    assert update_velocity(10.0, 2.0, 3.0) == pytest.approx(16.0)


def test_update_position():
    assert update_position(5.0, 10.0, 2.0) == pytest.approx(25.0)


def test_run_simulation_simple_case():
    result = run_simulation(
        initial_position=0.0,
        initial_velocity=0.0,
        duration=1.0,
        time_step=1.0,
        drive_force=1000.0,
        air_density=1.225,
        drag_coefficient=0.0,
        frontal_area=2.0,
        rolling_resistance_coefficient=0.0,
        mass=1000.0,
        road_angle=0.0,
        gravity=9.81,
    )

    assert result.final_time == pytest.approx(1.0)
    assert result.final_speed == pytest.approx(1.0)
    assert result.distance_traveled == pytest.approx(1.0)
    assert result.energy_used == pytest.approx(1000.0)
    assert len(result.history) == 2