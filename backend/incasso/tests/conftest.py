import pytest

from auth.services import create_access_token, get_password_hash
from core.db.database import SessionLocal
from core.db.models import Client, Incasso, Payment, User

__all__ = ["auth_headers", "db_session", "test_client", "test_user"]

TEST_CLIENT_CODE = 991_001
TEST_EMAIL = "incasso-tests@example.com"


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def generated_dir(tmp_path, monkeypatch):
    """The PDFs of the tests go to a temporary folder, never to `generated`"""
    monkeypatch.setattr("incasso.api.PDF_BASE_PATH", str(tmp_path))
    return tmp_path


def _wipe(db_session) -> None:
    """Remove what a test may leave behind, even one that crashed midway"""
    user = db_session.query(User).filter(User.email == TEST_EMAIL).first()
    if user:
        # The ORM cascade removes the payments and the media of each incasso.
        for incasso in db_session.query(Incasso).filter(Incasso.user_id == user.id):
            db_session.delete(incasso)
        db_session.delete(user)
    db_session.query(Payment).filter(Payment.client_code == TEST_CLIENT_CODE).delete()
    db_session.query(Client).filter(Client.code == TEST_CLIENT_CODE).delete()
    db_session.commit()


@pytest.fixture(autouse=True)
def test_user(db_session):
    _wipe(db_session)
    token_data = create_access_token(data={"email": TEST_EMAIL})

    user = User(
        email=TEST_EMAIL,
        password=get_password_hash("testpassword123"),
        token=token_data.token,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    yield user

    db_session.rollback()
    _wipe(db_session)


@pytest.fixture(autouse=True)
def test_client(db_session, test_user):
    client = Client(
        code=TEST_CLIENT_CODE, name="Rossi S.r.l.", city="Milano", province="MI"
    )
    db_session.add(client)
    db_session.commit()
    return client


@pytest.fixture
def auth_headers(test_user):
    return {"Authorization": f"Token {test_user.token}"}
