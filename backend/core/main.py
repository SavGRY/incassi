from auth.schema import User, UserFromForm
from auth.services import get_password_hash
from core.db.database import engine, get_db
from core.db.models import Base
from core.db.models import User as UserModel
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"msg": "Hello World"}


@app.post("/register", response_model=User)
async def register_user(payload: UserFromForm, db: Session = Depends(get_db)):
    user_in_db = db.query(UserModel).filter(UserModel.email == payload.email).first()

    if user_in_db:
        raise HTTPException(status_code=400, detail="User already exists, please login")

    hashed_password = get_password_hash(password=payload.password)
    new_user = UserModel(
        email=payload.email,
        password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
