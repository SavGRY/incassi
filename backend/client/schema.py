from pydantic import BaseModel, ConfigDict


class Client(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # The primary key of the `Client` model is `code`: there is no `id` column.
    name: str
    code: int
    address: str | None
    city: str
    province: str


class ClientFromForm(BaseModel):
    code: int
    name: str
    address: str | None
    city: str
    province: str
