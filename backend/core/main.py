from auth.schema import (
    TokenData,
    UserFromForm,
)
from auth.services import (
    check_user_already_registered,
    get_password_hash,
    validate_email,
    create_access_token,
)
from core.db.database import engine, get_db
from core.db.models import Base, User
from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi import status

Base.metadata.create_all(bind=engine)

app = FastAPI()


@app.get("/")
def read_root():
    return {"msg": "Hello World"}


@app.post("/register")
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
