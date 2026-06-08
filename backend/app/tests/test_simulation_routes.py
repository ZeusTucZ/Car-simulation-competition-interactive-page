from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_simulation_endpoint_returns_result():
    response = client.post(
        "/simulation/run",
        json={
            "mass": 1200.0,
            "drive_force": 4000.0,
            "drag_coefficient": 0.30,
            "frontal_area": 2.2,
            "rolling_resistance_coefficient": 0.015,
            "initial_velocity": 0.0,
        },
    )

    assert response.status_code == 200

    data = response.json()
    assert "final_time" in data
    assert "final_speed" in data
    assert "distance_traveled" in data
    assert "energy_used" in data
    assert "efficiency" in data
    assert "history" in data