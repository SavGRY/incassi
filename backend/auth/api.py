from typing import Annotated

from fastapi import APIRouter, Form
from fastapi import Depends, HTTPException
from fastapi import status
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
    get_user_by_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(path="/register", status_code=status.HTTP_201_CREATED)
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
            is_active=False,
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return {
            "message": f"User with email {new_user.email} has been successfully created"
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
    user = authenticate_user(email=email, password=password, db=db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if user.is_active:
        raise HTTPException(
            status_code=403,
            detail="You are already authenticated. Please logout first.",
        )

    user.is_active = True
    db.commit()
    return {"message": "Login successful", "token": user.token}


@router.post(path="/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(token: str, db: Session = Depends(get_db)):
    if not token:
        raise HTTPException(status_code=401, detail="No token found")

    user = await get_user_by_token(token)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    db.commit()
    db.refresh(user)
    return {"message": "Logout successful"}
