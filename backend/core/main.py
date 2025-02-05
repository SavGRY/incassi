from auth.schema import User as UserSchema
from auth.schema import UserFromForm
from auth.services import (
    check_user_already_registered,
    get_password_hash,
    validate_email,
)
from core.db.database import engine, get_db
from core.db.models import Base, User
from fastapi import Depends, FastAPI
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"msg": "Hello World"}


@app.post("/register", response_model=UserSchema)
async def register_user(payload: UserFromForm, db: Session = Depends(get_db)):
    validate_email(payload.email)
    check_user_already_registered(payload.email)

    hashed_password = get_password_hash(password=payload.password)
    new_user = User(
        email=payload.email,
        password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
