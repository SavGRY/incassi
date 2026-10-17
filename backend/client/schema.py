from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints


def _blank_to_none(value: object) -> object:
    """Treat a blank form field as a missing value.

    An HTML form always sends every input, so an untouched optional field
    arrives as an empty string rather than as `None`.
    """
    if isinstance(value, str) and not value.strip():
        return None
    return value


class Client(BaseModel):
    """The shape a client is read back in.

    It stays permissive on purpose: rows already stored do not have to satisfy
    the rules a *new* client must satisfy, and a legacy row must never turn a
    read into a 500. The constraints live on `ClientFromForm`.
    """

    model_config = ConfigDict(from_attributes=True)

    # The primary key of the `Client` model is `code`: there is no `id` column.
    name: str
    code: int
    address: str | None
    city: str
    province: str


class ClientFromForm(BaseModel):
    """The payload accepted when a client is created or updated."""

    code: Annotated[int, Field(gt=0)]
    name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    address: Annotated[str | None, BeforeValidator(_blank_to_none)]
    city: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]
    province: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            to_upper=True,
            min_length=2,
            max_length=2,
            pattern=r"^[A-Za-z]{2}$",
        ),
    ]


class ClientCreated(BaseModel):
    message: str
    data: Client
