import pytest
from core.main import app
from fastapi.testclient import TestClient
from fastapi import HTTPException

client = TestClient(app)


def test_unauthorized_user_cant_read_main():
    # need to open as pytest context in order to test the error
    with pytest.raises(HTTPException) as err:
        client.get("/")
    assert err.value.status_code == 401
    assert err.value.detail == "Unauthorized: No correct header found"


def test_user_cant_access_with_wrong_token_format():
    token = "wrong!"
    with pytest.raises(HTTPException) as err:
        client.get("/", headers={"Authorization": token})
    assert err.value.status_code == 401
    assert err.value.detail == "Invalid token format."


def test_authorized_user_can_read_main(test_user):
    token = test_user.token
    response = client.get("/", headers={"Authorization": f"Token {token}"})
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
