import json

from fastapi.testclient import TestClient

from core.db.models import Incasso
from core.domain import API_PREFIX
from core.main import app
from incasso.tests.conftest import TEST_CLIENT_CODE

client = TestClient(app)

CREATE_URL = f"{API_PREFIX}/incasso/create"

# The smallest valid PNG: a single transparent pixel.
PNG_BYTES = bytes.fromhex(
    "89504e470d0a1a0a0000000d4948445200000001000000010806000000"
    "1f15c4890000000d49444154789c6360000002000100e221bc330000000049454e44ae426082"
)


def payment_form(*payments: dict) -> dict:
    return {"list_of_payment": json.dumps({"payment_list": list(payments)})}


def a_payment(**overrides) -> dict:
    return {
        "client_code": TEST_CLIENT_CODE,
        "type_of_payment": "cash",
        "amount": 120.5,
    } | overrides


def test_create_incasso_requires_authentication():
    response = client.post(CREATE_URL, data=payment_form(a_payment()))

    assert response.status_code == 401


def test_create_incasso_takes_the_user_from_the_session(
    auth_headers, db_session, test_user
):
    response = client.post(
        CREATE_URL,
        data=payment_form(a_payment(), a_payment(type_of_payment="check", amount=80)),
        files=[("list_of_images", ("ricevuta.png", PNG_BYTES, "image/png"))],
        headers=auth_headers,
    )

    assert response.status_code == 201
    incasso = db_session.query(Incasso).filter(Incasso.user_id == test_user.id).one()
    assert sorted(p.amount for p in incasso.payments) == [80, 120.5]
    assert len(incasso.media) == 2


def test_create_incasso_ignores_a_token_in_the_query(auth_headers, db_session):
    """The token belongs to the header: a query token must not pick the user"""
    response = client.post(
        f"{CREATE_URL}?token=not-a-real-token",
        data=payment_form(a_payment()),
        headers=auth_headers,
    )

    assert response.status_code == 201
