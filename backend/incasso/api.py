from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from auth.services import get_user_by_token
from core.db.database import get_db
from core.db.models import Incasso, Client, Payment
from incasso.schema import PaymentFromForm

router = APIRouter(prefix="/incasso", tags=["incasso"])


@router.post(path="/create", status_code=status.HTTP_201_CREATED)
async def create_incasso(
    token: str,
    list_of_payment: list[PaymentFromForm],
    db: Session = Depends(get_db),
):
    user = await get_user_by_token(token)

    last_payment = db.query(Payment).order_by(Payment.id.desc()).first()
    id_payment = 0
    if last_payment is not None:
        id_payment = last_payment.id_payment

    payment_to_add = []
    # mapping of client code and related client in db
    clients_from_db = (client.code for client in db.query(Client).all())

    for payment in list_of_payment:
        if payment.client_code not in clients_from_db:
            raise HTTPException(
                status_code=404,
                detail=f"Client with code {payment.client_code} not found",
            )
        new_payment = Payment(
            id_payment=id_payment + 1,
            type_of_payment=payment.type_of_payment,
            amount=payment.amount,
            client_code=payment.client_code,
        )
        payment_to_add.append(new_payment)
    db.add_all(payment_to_add)
    incasso = Incasso(
        creation_date=datetime.now(),
        user_id=user.id,
        payments=payment_to_add,
    )
    db.add(incasso)
    db.commit()
    db.refresh(incasso)
    return {
        "message": f"Incasso successfully created with {len(payment_to_add)} payments"
    }
