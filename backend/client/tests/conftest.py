import pytest

from auth.services import create_access_token, get_password_hash
from core.db.database import SessionLocal
from core.db.models import Client, User

__all__ = ["auth_headers", "db_session", "test_user"]

# Codes reserved for the tests: every client in this range is wiped after each
# test, so a leftover row can never make the next run fail.
TEST_CODE_RANGE = range(990_000, 991_000)


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def clean_test_clients(db_session):
    def wipe():
        db_session.query(Client).filter(
            Client.code >= TEST_CODE_RANGE.start,
            Client.code < TEST_CODE_RANGE.stop,
        ).delete()
        db_session.commit()

    wipe()
    yield
    wipe()


@pytest.fixture(autouse=True)
def test_user(db_session):
    test_email = "client-tests@example.com"
    token_data = create_access_token(data={"email": test_email})

    user = User(
        email=test_email,
        password=get_password_hash("testpassword123"),
        token=token_data.token,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    yield user

    db_session.query(User).filter(User.email == test_email).delete()
    db_session.commit()


@pytest.fixture
def auth_headers(test_user):
    return {"Authorization": f"Token {test_user.token}"}
