import re
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from auth.domain import ALGORITHM, SECRET_KEY
from auth.schema import TokenData
from core.db.database import get_db
from core.db.models import User
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

__all__ = [
    "verify_password",
    "get_password_hash",
    "get_user",
    "get_user_by_token",
    "is_token_linked_to_correct_user",
]


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Password is required"
        )
    return pwd_context.hash(password)


def get_user(email: str):
    db = next(get_db())

    if user := db.query(User).filter_by(email=email).first():
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with this email '{email}' not found".format(email),
        )


def authenticate_user(email: str, password: str, db: Session):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )
    # `user.password` is the hashed password stored in the db
    # `hashed_password_from_form` is the hashed password from the form
    # if they are not equal, the password is wrong
    if not verify_password(plain_password=password, hashed_password=user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Wrong password, try again"
        )
    return user


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> TokenData:
    to_encode: dict = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    encoded_jwt = jwt.encode(payload=to_encode, key=SECRET_KEY, algorithm=ALGORITHM)
    return TokenData(token=encoded_jwt, expire_at=expire)


async def get_user_by_token(token: str):
    db = next(get_db())
    user = db.query(User).filter_by(token=token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Please login again.",
        )
    return user


def is_token_linked_to_correct_user(token: str, email: str) -> bool:
    user = get_user_by_token(token=token)
    if user.email != email:
        return False
    return True


# reminder: is this function used? Could it be simplified
# I think it could be simplified by using the `get_user_by_token` function
# because it's doing the same thing
async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        if not len(ALGORITHM):
            raise ValueError("ALGORITHM is not set")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")

        # printa il payload...
        if not email:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except InvalidTokenError:
        raise credentials_exception

    user = get_user(email=email)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    return user


def check_user_already_registered(email: str):
    db = next(get_db())
    user_in_db = db.query(User).filter_by(email=email).first()

    if user_in_db:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User {} already exists, please login".format(email),
        )


def validate_email(email: str):
    if not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email"
        )
