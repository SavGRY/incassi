from pydantic import BaseModel
from datetime import datetime


class User(BaseModel):
    first_name: str | None
    last_name: str | None
    email: str
    is_superuser: bool
    is_active: bool
    full_name: str | None

    class Config:
        orm_mode = True


class UserFromForm(BaseModel):
    email: str
    password: str


class UserInDB(BaseModel):
    first_name: str
    last_name: str
    email: str
    hashed_password: str
    is_superuser: bool
    is_active: bool
    full_name: str

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    token: str
    expire_at: datetime
