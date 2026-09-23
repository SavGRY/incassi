import pytest

from auth.services import create_access_token, get_password_hash
from core.db.database import SessionLocal
from core.db.models import User

__all__ = ["active_user", "auth_headers", "db_session", "TEST_EMAIL", "TEST_PASSWORD"]

TEST_EMAIL = "auth-tests@example.com"
TEST_PASSWORD = "testpassword123"


@pytest.fixture
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _wipe(db_session):
    db_session.query(User).filter(User.email == TEST_EMAIL).delete()
    db_session.commit()


@pytest.fixture
def active_user(db_session):
    """A user already logged in: `logout` is the only thing it can do."""
    _wipe(db_session)
    token_data = create_access_token(data={"sub": TEST_EMAIL})

    user = User(
        email=TEST_EMAIL,
        password=get_password_hash(TEST_PASSWORD),
        token=token_data.token,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    yield user

    _wipe(db_session)


@pytest.fixture
def auth_headers(active_user):
    return {"Authorization": f"Token {active_user.token}"}
