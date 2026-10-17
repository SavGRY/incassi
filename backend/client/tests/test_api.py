from core.db.database import get_db
from core.db.models import Client
from core.domain import API_PREFIX
from core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)

CREATE_URL = f"{API_PREFIX}/client/create"
LIST_URL = f"{API_PREFIX}/client/list"

VALID_PAYLOAD = {
    "code": 990_001,
    "name": "Bianchi S.p.A.",
    "address": "Via Roma 1",
    "city": "Milano",
    "province": "MI",
}


def test_create_client_requires_authentication():
    response = client.post(CREATE_URL, data=VALID_PAYLOAD)

    assert response.status_code == 401


def test_create_client_persists_the_client(auth_headers, db_session):
    response = client.post(CREATE_URL, data=VALID_PAYLOAD, headers=auth_headers)

    assert response.status_code == 201
    assert response.json()["data"] == VALID_PAYLOAD

    saved = db_session.query(Client).filter(Client.code == VALID_PAYLOAD["code"]).one()
    assert saved.name == "Bianchi S.p.A."
    assert saved.city == "Milano"
    assert saved.province == "MI"


def test_create_client_accepts_an_empty_address(auth_headers, db_session):
    payload = VALID_PAYLOAD | {"address": ""}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 201
    saved = db_session.query(Client).filter(Client.code == payload["code"]).one()
    assert saved.address is None


def test_create_client_uppercases_the_province(auth_headers, db_session):
    payload = VALID_PAYLOAD | {"province": "mi"}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 201
    saved = db_session.query(Client).filter(Client.code == payload["code"]).one()
    assert saved.province == "MI"


def test_create_client_rejects_a_province_longer_than_two_letters(auth_headers):
    payload = VALID_PAYLOAD | {"province": "MIL"}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_client_rejects_a_province_shorter_than_two_letters(auth_headers):
    payload = VALID_PAYLOAD | {"province": "M"}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_client_rejects_a_blank_name(auth_headers):
    payload = VALID_PAYLOAD | {"name": "   "}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_client_rejects_a_missing_city(auth_headers):
    payload = {key: value for key, value in VALID_PAYLOAD.items() if key != "city"}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_client_rejects_a_non_positive_code(auth_headers):
    payload = VALID_PAYLOAD | {"code": 0}

    response = client.post(CREATE_URL, data=payload, headers=auth_headers)

    assert response.status_code == 422


def test_create_client_rejects_a_duplicated_code(auth_headers):
    client.post(CREATE_URL, data=VALID_PAYLOAD, headers=auth_headers)

    response = client.post(
        CREATE_URL, data=VALID_PAYLOAD | {"name": "Altro nome"}, headers=auth_headers
    )

    assert response.status_code == 409
    assert str(VALID_PAYLOAD["code"]) in response.json()["detail"]


def test_create_client_keeps_the_session_usable_after_a_conflict(auth_headers):
    client.post(CREATE_URL, data=VALID_PAYLOAD, headers=auth_headers)
    client.post(CREATE_URL, data=VALID_PAYLOAD, headers=auth_headers)

    response = client.post(
        CREATE_URL, data=VALID_PAYLOAD | {"code": 990_002}, headers=auth_headers
    )

    assert response.status_code == 201


def test_list_returns_the_created_clients(auth_headers):
    client.post(CREATE_URL, data=VALID_PAYLOAD, headers=auth_headers)

    response = client.get(LIST_URL, headers=auth_headers)

    assert response.status_code == 200
    codes = [item["code"] for item in response.json()]
    assert VALID_PAYLOAD["code"] in codes


def test_list_returns_an_empty_list_when_there_is_no_client(auth_headers):
    # An empty catalogue is a legitimate state, not a 404: the frontend loads
    # this endpoint to fill the autocomplete before any client exists. The db
    # dependency is faked rather than emptied: the dev database is shared and
    # `client.code` is referenced by `payment.client_code`.
    class EmptyQuery:
        def all(self):
            return []

    class EmptySession:
        def query(self, _model):
            return EmptyQuery()

    app.dependency_overrides[get_db] = lambda: EmptySession()
    try:
        response = client.get(LIST_URL, headers=auth_headers)
    finally:
        app.dependency_overrides.pop(get_db)

    assert response.status_code == 200
    assert response.json() == []
