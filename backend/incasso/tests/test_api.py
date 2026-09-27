import json

from fastapi.testclient import TestClient

from core.db.models import Incasso, Payment
from core.domain import API_PREFIX
from core.main import app
from incasso.images import MAX_IMAGE_BYTES, MAX_IMAGES
from incasso.pdf import _get_html_for_riepologo
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


def a_png(name: str = "ricevuta.png") -> tuple:
    return ("list_of_images", (name, PNG_BYTES, "image/png"))


def test_create_incasso_accepts_a_jpeg(auth_headers):
    jpeg = b"\xff\xd8\xff\xe0" + b"\x00" * 64

    response = client.post(
        CREATE_URL,
        data=payment_form(a_payment()),
        files=[("list_of_images", ("assegno.jpg", jpeg, "image/jpeg"))],
        headers=auth_headers,
    )

    assert response.status_code == 201


def test_create_incasso_refuses_an_empty_payment_list(
    auth_headers, db_session, test_user
):
    response = client.post(CREATE_URL, data=payment_form(), headers=auth_headers)

    assert response.status_code == 422
    assert_nothing_saved(db_session, test_user)


def test_create_incasso_refuses_a_file_that_is_not_an_image(
    auth_headers, db_session, test_user
):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"><image href="http://x/"/></svg>'

    response = client.post(
        CREATE_URL,
        data=payment_form(a_payment()),
        # The declared type lies: only the bytes count.
        files=[("list_of_images", ("ricevuta.png", svg, "image/png"))],
        headers=auth_headers,
    )

    assert response.status_code == 422
    assert_nothing_saved(db_session, test_user)


def test_create_incasso_refuses_an_image_too_large(auth_headers, db_session, test_user):
    too_large = PNG_BYTES + b"\x00" * MAX_IMAGE_BYTES

    response = client.post(
        CREATE_URL,
        data=payment_form(a_payment()),
        files=[("list_of_images", ("grande.png", too_large, "image/png"))],
        headers=auth_headers,
    )

    assert response.status_code == 413
    assert_nothing_saved(db_session, test_user)


def test_create_incasso_refuses_too_many_images(auth_headers, db_session, test_user):
    response = client.post(
        CREATE_URL,
        data=payment_form(a_payment()),
        files=[a_png(f"{i}.png") for i in range(MAX_IMAGES + 1)],
        headers=auth_headers,
    )

    assert response.status_code == 422
    assert_nothing_saved(db_session, test_user)


def test_summary_uses_the_detected_image_type():
    html = _get_html_for_riepologo([("image/png", PNG_BYTES)])

    assert "data:image/png;base64," in html


def assert_nothing_saved(db_session, test_user) -> None:
    assert not db_session.query(Incasso).filter(Incasso.user_id == test_user.id).all()
    assert not (
        db_session.query(Payment).filter(Payment.client_code == TEST_CLIENT_CODE).all()
    )
