from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Client(BaseModel):
    id: int
    name: str
    code: int
    address: str
    city: str
    province: str

    class Config:
        orm_mode = True


class Document(BaseModel):
    id: int
    creation_date: datetime
    user_id: int

    class Config:
        orm_mode = True


class TypeOfIncasso(BaseModel):
    a: Literal["assegno", "contanti"]

    class Config:
        orm_mode = True


class Incasso(BaseModel):
    id: int
    type_of_payment: TypeOfIncasso
    amount: float
    document_id: int
    client_id: int

    class Config:
        orm_mode = True
