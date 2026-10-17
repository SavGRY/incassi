from core.domain import API_PREFIX
from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

FRONTEND_ORIGIN = "http://localhost:4200"
LOGOUT_URL = f"{API_PREFIX}/auth/logout"


def test_preflight_is_answered_before_authentication():
    """A preflight never carries `Authorization`: it must not reach the login check."""
    response = client.options(
        LOGOUT_URL,
        headers={
            "Origin": FRONTEND_ORIGIN,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "authorization",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN


def test_auth_errors_carry_cors_headers():
    """Without them the browser hides the 401 behind a CORS error (status 0)."""
    response = client.post(LOGOUT_URL, headers={"Origin": FRONTEND_ORIGIN})

    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == FRONTEND_ORIGIN
