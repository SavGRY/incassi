from core.domain import API_PREFIX
from core.db.database import engine
from core.db.models import Base
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from core.middleware import (
    ORIGINS,
    create_already_authenticated_middleware,
    create_login_middleware,
)

from client.api import router as client_router
from auth.api import router as auth_router

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
# Including all routes
app.include_router(router=auth_router, prefix=API_PREFIX)
app.include_router(router=client_router, prefix=API_PREFIX)


@app.get("/")
def read_root():
    return {"msg": "Hello World"}


@app.get("/protected")
async def protected_route():
    return {"message": "Congrats! You can see this route!"}
