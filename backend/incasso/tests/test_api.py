import json
from datetime import datetime

from fastapi.testclient import TestClient

from core.db.models import Incasso, Media, Payment, TypeOfMedia, User
from core.domain import API_PREFIX
from core.main import app
from incasso.images import MAX_IMAGE_BYTES, MAX_IMAGES
from incasso.pdf import _get_html_for_riepologo
from incasso.tests.conftest import TEST_CLIENT_CODE

client = TestClient(app)

CREATE_URL = f"{API_PREFIX}/incasso/create"
LIST_URL = f"{API_PREFIX}/incasso/list"

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


def test_list_documents_requires_authentication():
    response = client.get(LIST_URL)

    assert response.status_code == 401


def test_list_documents_returns_the_newest_first_with_a_recap(auth_headers):
    client.post(CREATE_URL, data=payment_form(a_payment()), headers=auth_headers)
    client.post(
        CREATE_URL,
        data=payment_form(a_payment(), a_payment(type_of_payment="check", amount=80)),
        files=[a_png()],
        headers=auth_headers,
    )

    response = client.get(LIST_URL, headers=auth_headers)

    assert response.status_code == 200
    documents = response.json()
    assert [d["type_of_media"] for d in documents] == ["scan", "busta", "busta"]
    assert documents[0]["incasso_id"] == documents[1]["incasso_id"]
    assert documents[0]["payments_count"] == 2
    assert documents[0]["total"] == 200.5
    assert documents[2]["total"] == 120.5


def test_list_documents_honours_the_limit(auth_headers):
    client.post(
        CREATE_URL,
        data=payment_form(a_payment()),
        files=[a_png()],
        headers=auth_headers,
    )

    response = client.get(f"{LIST_URL}?limit=1", headers=auth_headers)

    assert len(response.json()) == 1


def test_list_documents_hides_the_other_users_documents(auth_headers, db_session):
    other = User(email="incasso-other@example.com", password="x", is_active=True)
    incasso = Incasso(user=other, creation_date=datetime.now())
    incasso.media = [Media(user=other, pdf_path="", type_of_media=TypeOfMedia.envelope)]
    db_session.add(incasso)
    db_session.commit()

    try:
        response = client.get(LIST_URL, headers=auth_headers)
        assert response.json() == []
    finally:
        db_session.delete(incasso)
        db_session.delete(other)
        db_session.commit()


def preview_url(media_id: int) -> str:
    return f"{API_PREFIX}/incasso/preview/{media_id}"


def test_preview_renders_the_first_page_as_png(auth_headers):
    client.post(CREATE_URL, data=payment_form(a_payment()), headers=auth_headers)
    document = client.get(LIST_URL, headers=auth_headers).json()[0]

    response = client.get(preview_url(document["id"]), headers=auth_headers)

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content.startswith(b"\x89PNG")


def test_preview_requires_authentication():
    response = client.get(preview_url(1))

    assert response.status_code == 401


def test_preview_hides_the_other_users_documents(auth_headers, db_session):
    client.post(CREATE_URL, data=payment_form(a_payment()), headers=auth_headers)
    own_id = client.get(LIST_URL, headers=auth_headers).json()[0]["id"]
    other = User(email="preview-other@example.com", password="x", is_active=True)
    incasso = Incasso(user=other, creation_date=datetime.now())
    media = Media(user=other, pdf_path="", type_of_media=TypeOfMedia.envelope)
    incasso.media = [media]
    db_session.add(incasso)
    db_session.commit()
    # A real file, so only the ownership check can refuse it.
    media.pdf_path = db_session.get(Media, own_id).pdf_path
    db_session.commit()

    try:
        response = client.get(preview_url(media.id), headers=auth_headers)
        assert response.status_code == 404
    finally:
        db_session.delete(incasso)
        db_session.delete(other)
        db_session.commit()
