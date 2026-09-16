from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_unauthorized_user_cant_read_main():
    response = client.get("/")
    assert response.status_code == 401
    assert response.json()["detail"] == "Unauthorized: No correct header found"


def test_user_cant_access_with_wrong_token_format():
    response = client.get("/", headers={"Authorization": "wrong!"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token format."


def test_user_cant_access_with_unknown_token():
    response = client.get("/", headers={"Authorization": "Token nope"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token. Please login again."


def test_authorized_user_can_read_main(test_user):
    token = test_user.token
    response = client.get("/", headers={"Authorization": f"Token {token}"})
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
