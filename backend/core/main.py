from auth.schema import (
    TokenData,
    UserFromForm,
)
from auth.services import (
    authenticate_user,
    check_user_already_registered,
    get_password_hash,
    validate_email,
    create_access_token,
)
from core.domain import API_PREFIX
from core.db.database import engine, get_db
from core.db.models import Base, User, Client
from core.schema import Client as ClientSchema
from fastapi import Depends, FastAPI, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi.responses import JSONResponse
from fastapi import status
from core.middleware import (
    ORIGINS,
    create_already_authenticated_middleware,
    create_login_middleware,
)
from typing import Annotated

from core.schema import ClientFromForm

Base.metadata.create_all(bind=engine)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add middleware using the factory function
app.middleware("http")(create_login_middleware())
app.middleware("http")(create_already_authenticated_middleware())


@app.get("/")
def read_root():
    return {"msg": "Hello World"}


@app.post(f"{API_PREFIX}/register")
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


@app.get("/protected")
async def protected_route():
    return {"message": "Congrats! You can see this route!"}


@app.post(f"{API_PREFIX}/login")
async def login(
    email: Annotated[str, Form()],
    password: Annotated[str, Form()],
    db: Session = Depends(get_db),
):
    user = authenticate_user(email=email, password=password, db=db)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user.is_active = True
    db.commit()
    return {"message": "Login successful", "token": user.token}


@app.post(f"{API_PREFIX}/client/create")
async def create_client(
    client_payload: Annotated[ClientFromForm, Form()], db: Session = Depends(get_db)
):
    if len(client_payload.province) > 2:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=f"Province {client_payload.province} has more than 2 letters: {len(client_payload.province)}",
        )

    new_client: Client = Client(
        code=client_payload.code,
        name=client_payload.name,
        address=client_payload.address,
        province=client_payload.province,
        city=client_payload.city,
    )
    try:
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
    except Exception:
        if not client_payload:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST, content="No client found"
            )

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content="A critical error occurred",
        )


@app.get(f"{API_PREFIX}/client/list")
# Be careful to return the SCHEMA and not the model instance
async def get_client_list(
    db: Session = Depends(get_db),
) -> list[ClientSchema]:
    client_list = db.query(Client).all()
    if not client_list:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content="No clients found",
        )
    return list(db.query(Client).all())


@app.get(API_PREFIX + "/client/{client_code}")
# Be careful to return the SCHEMA and not the model instance
async def get_client_detail(
    client_code: int, db: Session = Depends(get_db)
) -> ClientSchema:
    client_detail = db.query(Client).filter(Client.code == client_code).first()
    if not client_detail:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"No detail found for {client_code}",
        )
    return db.query(Client).filter(Client.code == client_code).first()


@app.delete(API_PREFIX + "/client/{client_code}")
async def delete_client(client_code: int, db: Session = Depends(get_db)):
    if not client_code:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content="client_id not found, Please provide a client_id",
        )
    client = db.query(Client).filter(Client.code == client_code).first()
    if not client:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Client with code {client_code} not found",
        )
    db.delete(client)
    db.commit()
    return {"message": f"Client {client_code} deleted successfully"}


@app.put(API_PREFIX + "/client/{client_code}")
async def update_client(
    client_payload: Annotated[ClientFromForm, Form()],
    client_code: int,
    db: Session = Depends(get_db),
):
    client = db.query(Client).filter(Client.code == client_code).first()
    if not client:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content=f"Client with code {client_code} not found",
        )
    client = Client(
        code=client_payload.code,
        name=client_payload.name,
        address=client_payload.address,
        province=client_payload.province,
        city=client_payload.city,
    )
    return {
        "message": f"Client {client_code} has been successfully updated!",
        "client": client,
    }
