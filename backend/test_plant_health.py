import pytest
from main import app
from fastapi.testclient import TestClient
from agent import calculate_plant_health_score

client = TestClient(app)

def test_calculate_health_score():
    """Test the health score calculation function."""
    plant_data = {
        'ideal_moisture_min': 40,
        'ideal_moisture_max': 60
    }
    telemetry_data = {
        'soil_moisture': 50,
        'temperature': 22,
        'humidity': 55
    }
    history_data = [
        {'decision': 'WATER'},
        {'decision': 'WAIT'}
    ]
    result = calculate_plant_health_score(plant_data, telemetry_data, history_data)
    assert 'health_score' in result
    assert 'trend' in result
    assert 'components' in result
    assert 0 <= result['health_score'] <= 100
    assert result['trend'] in ['new', 'improving', 'declining', 'stable']

def test_health_endpoint_unauthorized():
    """Test endpoint returns 401 without token."""
    response = client.get("/plant-health/1")
    assert response.status_code == 401

def test_health_endpoint_with_token():
    """Test endpoint returns valid response with token."""
    # Assumes demo account exists with demo/demo123
    login_response = client.post(
        "/auth/login",
        json={"username": "demo", "password": "demo123"}
    )
    token = login_response.json()['access_token']
    plants_response = client.get(
        "/user-plants",
        headers={"Authorization": f"Bearer {token}"}
    )
    plants_data = plants_response.json()
    plants_list = plants_data.get('plants', []) if isinstance(plants_data, dict) else plants_data
    plant_id = plants_list[0]['id'] if (plants_list and len(plants_list) > 0) else 1
    health_response = client.get(
        f"/plant-health/{plant_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert health_response.status_code == 200
    data = health_response.json()
    assert 'health_score' in data
    assert 'trend' in data
    assert 'components' in data
