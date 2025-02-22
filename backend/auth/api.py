from typing import Annotated
from fastapi import APIRouter, Form
from fastapi.params import Depends
from pytest import Session

from .schema import TokenData, UserFromForm
from .services import (
    authenticate_user,
    check_user_already_registered,
    create_access_token,
    get_password_hash,
    validate_email,
)
from core.db.database import get_db
from core.db.database import get_db
from core.db.models import User
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi import status


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(path="/register")
async def register_user(payload: UserFromForm, db: Session = Depends(get_db)):
    validate_email(payload.email)
    check_user_already_registered(payload.email)

    access_token_obj: TokenData = create_access_token(data=dict(payload))
    hashed_password: str = get_password_hash(password=payload.password)

    try:
        new_user: User = User(
            email=payload.email,
            password=hashed_password,
            token=access_token_obj.token,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content="User with email {} has been successfully created".format(
                new_user.email
            ),
        )

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
    user = authenticate_user(email=email, password=password, db=db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.is_active = True
    db.commit()
    return {"message": "Login successful", "token": user.token}
