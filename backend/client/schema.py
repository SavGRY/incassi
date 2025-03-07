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


class ClientFromForm(BaseModel):
    code: int
    name: str
    address: str | None
    city: str
    province: str
