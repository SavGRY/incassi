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

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


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


def authenticate_user(email: str, password: str):
    user = get_user(email=email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
        )

    if not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot verify password"
        )

    return user


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> dict[str, str | datetime]:
    to_encode: dict = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    encoded_jwt = jwt.encode(payload=to_encode, key=SECRET_KEY, algorithm=ALGORITHM)
    return TokenData(token=encoded_jwt, expire_at=expire)


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
