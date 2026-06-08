import pytest

from app.simulation.efficiency import calculate_efficiency, calculate_energy_used


def test_energy_used_is_force_times_distance():
    assert calculate_energy_used(4000.0, 100.0) == pytest.approx(400000.0)


def test_efficiency_is_useful_energy_divided_by_energy_used():
    assert calculate_efficiency(250.0, 1000.0) == pytest.approx(0.25)


def test_efficiency_rejects_zero_energy_used():
    with pytest.raises(ValueError):
        calculate_efficiency(100.0, 0.0)