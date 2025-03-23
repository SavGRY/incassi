from datetime import datetime

from pydantic import BaseModel


class Document(BaseModel):
    id: int
    creation_date: datetime
    user_id: int

    class Config:
        orm_mode = True
