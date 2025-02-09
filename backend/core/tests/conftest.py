import pytest
from core.db.models import User
from core.db.database import SessionLocal
from auth.services import get_password_hash, create_access_token

__all__ = ["test_user"]


@pytest.fixture
def test_user():
    # Create a database session
    db = SessionLocal()

    try:
        test_email = "test@example.com"
        test_password = "testpassword123"
        hashed_password = get_password_hash(test_password)

        # Generate token
        token_data = create_access_token(data={"email": test_email})

        test_user = User(
            email=test_email, password=hashed_password, token=token_data.token
        )

        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        yield test_user

        # Cleanup: delete test user
        db.query(User).filter(User.email == test_email).delete()
        db.commit()

    finally:
        db.close()
