import secrets
from typing import Annotated

from fastapi import APIRouter, Form, Request
from fastapi import Depends, HTTPException
from fastapi import status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.db.database import get_db
from core.db.models import User
from .schema import TokenData, UserFromForm
from .services import (
    authenticate_user,
    check_user_already_registered,
    create_access_token,
    get_password_hash,
    validate_email,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(path="/register", status_code=status.HTTP_201_CREATED)
async def register_user(payload: UserFromForm, db: Session = Depends(get_db)):
    validate_email(payload.email)
    check_user_already_registered(payload.email)

    # Never put the password in the token payload: a JWT is signed, not encrypted,
    # so anyone able to read it could base64-decode the credentials.
    access_token_obj: TokenData = create_access_token(data={"sub": payload.email})
    password = payload.password.strip()
    hashed_password: str = get_password_hash(password=password)
    try:
        new_user: User = User(
            email=payload.email,
            password=hashed_password,
            token=access_token_obj.token,
            is_active=False,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": f"User with email {new_user.email} has been successfully created",
            "token_info": access_token_obj,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post(path="/login")
async def login(
    email: Annotated[str, Form()],
    password: Annotated[str, Form()],
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """Open a session, even if the db says one is already open.

    `is_active` stays `True` whenever the client loses its token without a
    logout (cleared storage, another device, a logout that never reached us):
    refusing the login there would lock the user out. A fresh token is issued
    instead, so any token handed out before stops working.
    """
    user = authenticate_user(email=email, password=password, db=db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    # The payload has no time-based claim, so without `jti` the same email
    # would always encode to the same token and nothing would be revoked.
    user.token = create_access_token(
        data={"sub": user.email, "jti": secrets.token_urlsafe(16)}
    ).token
    user.is_active = True
    db.commit()
    return {"message": "Login successful", "token": user.token}


@router.post(path="/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(request: Request, db: Session = Depends(get_db)) -> None:
    """Close the session of the user owning the `Authorization` token.

    The token travels in the header, never in the query string: a URL ends up
    in access logs, proxies and browser history, so a token put there leaks.
    `create_login_middleware` already rejected a missing, malformed or unknown
    token, but it loaded the user through its own session: we read the row
    again here so the update belongs to this request's transaction.
    """
    token = request.headers["Authorization"].removeprefix("Token ")
    user = db.scalar(select(User).where(User.token == token))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Please login again.",
        )

    user.is_active = False
    db.commit()
