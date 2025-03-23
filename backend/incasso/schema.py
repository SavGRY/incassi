from enum import Enum

from pydantic import BaseModel


class TypeOfPaymentEnum(str, Enum):
    check: str = "check"
    cash: str = "cash"


class PaymentFromForm(BaseModel):
    client_code: int
    type_of_payment: TypeOfPaymentEnum
    amount: float

    class Config:
        orm_mode = True


class Payment(BaseModel):
    id: int
    type_of_payment: TypeOfPaymentEnum
    amount: float
    document_id: int
    client_id: int

    class Config:
        orm_mode = True
