import os
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from auth.services import get_user_by_token
from core.db.database import get_db
from core.db.models import Incasso, Client, Payment, Media, User, TypeOfMedia
from incasso.pdf import generate_incasso_pdf
from incasso.schema import PaymentFromForm

PDF_BASE_PATH = "./generated"
router = APIRouter(
    prefix="/incasso",
    tags=["incasso"],
)


@router.post(path="/create", status_code=status.HTTP_201_CREATED)
async def create_incasso(
    token: str,
    list_of_payment: list[PaymentFromForm],
    db: Session = Depends(get_db),
):
    user = await get_user_by_token(token)

    last_payment = db.query(Payment).order_by(Payment.id.desc()).first()
    base_id_payment = last_payment.id_payment if last_payment else 0

    payment_to_add = []
    # mapping of client code and related client in db
    clients_from_db = {client.code for client in db.query(Client).all()}

    for i, payment in enumerate(list_of_payment, 1):
        if payment.client_code not in clients_from_db:
            raise HTTPException(
                status_code=404,
                detail=f"Client with code {payment.client_code} not found",
            )
        new_payment = Payment(
            id_payment=base_id_payment + i,
            type_of_payment=payment.type_of_payment.value,
            amount=payment.amount,
            client_code=payment.client_code,
        )
        payment_to_add.append(new_payment)

    incasso = Incasso(
        user_id=user.id,
        creation_date=datetime.now(),
        payments=payment_to_add,
    )
    db.add(incasso)
    db.commit()
    db.refresh(incasso)

    # creates the media object and assign it the correct path/filename
    # this is only the "busta" with the recap
    # later it should also have the payments paper copies
    media = create_media(
        user=user, incasso=incasso, type_of_media=TypeOfMedia.envelope, db=db
    )
    db.add_all(payment_to_add)
    db.commit()

    for p in payment_to_add:
        p.incasso_id = incasso.id
        db.commit()
        db.refresh(p)

    incasso_creation_date = incasso.creation_date.strftime("%Y-%m-%d")
    media.pdf_path = f"./generated/incasso_{incasso.id}_{incasso_creation_date}.pdf"
    incasso.media = [media]

    db.add(media)
    db.add(incasso)
    db.commit()

    incasso_pdf = generate_incasso_pdf(incasso=incasso)
    if not os.path.exists(PDF_BASE_PATH):
        os.mkdir(PDF_BASE_PATH)

    incasso_pdf.write_pdf(target=media.pdf_path)

    return {
        "message": f"Incasso successfully created with {len(payment_to_add)} payments"
    }


def create_media(
    user: User,
    incasso: Incasso,
    type_of_media: TypeOfMedia,
    db: Session = Depends(get_db),
):
    today = datetime.today()
    # create the media
    media = Media(
        creation_date=today,
        pdf_path="",
        type_of_media=type_of_media,
        user=user,
        incasso=incasso,
    )
    db.add(media)
    db.commit()
    db.refresh(media)
    return media


@router.get(
    path="/download-incasso/{incasso_id}",
    status_code=status.HTTP_200_OK,
    response_class=FileResponse,
    response_description="The generated incasso pdf",
)
async def download_incasso(incasso_id: int, db: Session = Depends(get_db)):
    media = db.query(Media).filter(Media.incasso_id == incasso_id).first()

    if not media:
        raise HTTPException(status_code=404, detail="No file fonud for this incasso")

    file_name = media.pdf_path.split("/")[-1]
    return FileResponse(
        path=media.pdf_path, filename=file_name, media_type="application/pdf"
    )
