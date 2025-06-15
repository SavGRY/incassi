from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from auth.services import get_user_by_token
from core.db.database import get_db
from core.db.models import Incasso, Client, Payment, Media
from incasso.pdf import generate_incasso_pdf
from incasso.schema import PaymentFromForm

router = APIRouter(prefix="/incasso", tags=["incasso"])


class TypeOfMedia(str, Enum):
    SCAN = "scan"
    ENVELOPE = "envelope"


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
            type_of_payment=payment.type_of_payment.value,
            amount=payment.amount,
            client_code=payment.client_code,
        )
        payment_to_add.append(new_payment)
    db.add_all(payment_to_add)
    incasso = Incasso(
        user_id=user.id,
        payments=payment_to_add,
    )
    # creates the media object and assign it the correct path/filename
    media = create_media(incasso=incasso, type_of_media=TypeOfMedia.ENVELOPE, db=db)

    # generate its pdf
    incasso_pdf = generate_incasso_pdf(incasso=incasso)
    incasso_pdf.write_pdf(target=media.pdf_path)

    # db operations
    db.add(media)
    db.add(incasso)
    db.commit()
    db.refresh(media)
    db.refresh(incasso)

    return {
        "message": f"Incasso successfully created with {len(payment_to_add)} payments"
    }


def create_media(
    incasso: Incasso, type_of_media: TypeOfMedia, db: Session = Depends(get_db)
):
    # create the media
    media = Media(
        pdf_path=f"./generated/incasso_{incasso.id}_{incasso.creation_date}.pdf",
        type_of_media=type_of_media,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@router.get(path="/download-incasso/{incasso_id}", status_code=status.HTTP_200_OK)
async def download_incasso(incasso_id: int, db: Session = Depends(get_db)):
    incasso = db.query(Incasso).get(incasso_id)
    media = db.query(Media).get(incasso.media_id)
    file_name = media.pdf_path.split("/")[-1]
    return FileResponse(
        path=media.pdf_path, filename=file_name, media_type="application/pdf"
    )
