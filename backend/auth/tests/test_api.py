from auth.tests.conftest import TEST_EMAIL, TEST_PASSWORD
from core.domain import API_PREFIX
from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

LOGOUT_URL = f"{API_PREFIX}/auth/logout"
LOGIN_URL = f"{API_PREFIX}/auth/login"
CREDENTIALS = {"email": TEST_EMAIL, "password": TEST_PASSWORD}


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


def test_login_opens_the_session_of_a_logged_out_user(active_user, db_session):
    active_user.is_active = False
    db_session.commit()

    response = client.post(LOGIN_URL, data=CREDENTIALS)

    assert response.status_code == 200
    db_session.refresh(active_user)
    assert active_user.is_active is True
    assert response.json()["token"] == active_user.token


def test_login_works_when_the_session_was_lost_on_the_client(active_user):
    """The db still says "active", but the client no longer has the token:
    refusing the login would lock the user out until someone fixes the db."""
    response = client.post(LOGIN_URL, data=CREDENTIALS)

    assert response.status_code == 200


def test_login_works_with_a_stale_authorization_header(active_user, auth_headers):
    response = client.post(LOGIN_URL, data=CREDENTIALS, headers=auth_headers)

    assert response.status_code == 200


def test_login_issues_a_fresh_token_and_revokes_the_old_one(active_user, db_session):
    old_token = active_user.token

    response = client.post(LOGIN_URL, data=CREDENTIALS)

    new_token = response.json()["token"]
    assert new_token != old_token
    db_session.refresh(active_user)
    assert active_user.token == new_token
    assert (
        client.get("/", headers={"Authorization": f"Token {old_token}"}).status_code
        == 401
    )
    assert (
        client.get("/", headers={"Authorization": f"Token {new_token}"}).status_code
        == 200
    )
