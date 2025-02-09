import pytest

from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_unauthorized_user_cant_read_main():
    response = client.get("/")
    assert response.status_code == 401
    assert response.json() == {"detail": "Unauthorized: No correct header found"}


@pytest.mark.usefixtures("test_user")
def test_authorized_user_can_read_main(test_user):
    token = test_user.token
    response = client.get("/", headers={"Authorization": "Token {}".format(token)})
    assert response.status_code == 200
    assert response.json() == {"msg": "Hello World"}
