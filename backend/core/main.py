from core.db.database import engine, get_db
from core.db.models import Base
from fastapi import FastAPI

Base.metadata.create_all(bind=engine)

app = FastAPI()

db = get_db()


@app.get("/")
def read_root():
    return {"msg": "Hello World"}
