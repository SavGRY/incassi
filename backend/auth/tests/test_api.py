from core.domain import API_PREFIX
from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

LOGOUT_URL = f"{API_PREFIX}/auth/logout"


def test_logout_requires_authentication():
    response = client.post(LOGOUT_URL)

    assert response.status_code == 401


def test_logout_rejects_a_malformed_authorization_header():
    response = client.post(LOGOUT_URL, headers={"Authorization": "Bearer whatever"})

    assert response.status_code == 401


def test_logout_rejects_an_unknown_token():
    response = client.post(LOGOUT_URL, headers={"Authorization": "Token not-a-token"})

    assert response.status_code == 401


def test_logout_deactivates_the_user(auth_headers, active_user, db_session):
    response = client.post(LOGOUT_URL, headers=auth_headers)

    assert response.status_code == 204
    assert response.content == b""

    db_session.refresh(active_user)
    assert active_user.is_active is False
