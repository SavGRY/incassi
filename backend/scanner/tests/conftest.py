import pytest

from auth.services import create_access_token, get_password_hash
from core.db.database import SessionLocal
from core.db.models import User

__all__ = ["auth_headers", "test_user"]


@pytest.fixture(autouse=True)
def test_user():
    db = SessionLocal()
    test_email = "scanner-tests@example.com"
    token_data = create_access_token(data={"email": test_email})

    user = User(
        email=test_email,
        password=get_password_hash("testpassword123"),
        token=token_data.token,
        is_active=True,
    )
    try:
        db.add(user)
        db.commit()
        db.refresh(user)

        yield user

        db.query(User).filter(User.email == test_email).delete()
        db.commit()
    finally:
        db.close()


@pytest.fixture
def auth_headers(test_user):
    return {"Authorization": f"Token {test_user.token}"}
