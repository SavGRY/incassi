import io
import os
import zipfile
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from starlette.responses import FileResponse, Response

from auth.services import get_user_by_token
from core.db.database import get_db
from core.db.models import Incasso, Client, Payment, Media, User, TypeOfMedia
from incasso.pdf import generate_incasso_pdf, generate_riepilogo_pdf
from incasso.schema import PaymentListModel

PDF_BASE_PATH = "./generated"
router = APIRouter(
    prefix="/incasso",
    tags=["incasso"],
)


@router.post(path="/create", status_code=status.HTTP_201_CREATED)
async def create_incasso(
    token: str,
    list_of_payment: PaymentListModel = Form(...),
    list_of_images: list[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    user = await get_user_by_token(token)

    payment_to_add = []
    # mapping of client code and related client in db
    clients_from_db = {client.code for client in db.query(Client).all()}

    for payment in list_of_payment.payment_list:
        if payment.client_code not in clients_from_db:
            raise HTTPException(
                status_code=404,
                detail=f"Client with code {payment.client_code} not found",
            )
        new_payment = Payment(
            type_of_payment=payment.type_of_payment.value,
            amount=payment.amount,
            client_code=payment.client_code,
        )
        payment_to_add.append(new_payment)

    db.add_all(payment_to_add)
    db.commit()

    incasso = Incasso(
        user_id=user.id,
        creation_date=datetime.now(),
        payments=payment_to_add,
    )
    db.add(incasso)
    db.commit()
    db.refresh(incasso)

    for p in payment_to_add:
        p.incasso_id = incasso.id
        db.commit()
        db.refresh(p)

    # creates the media object and assign it the correct path/filename
    # this is only the "busta" with the recap
    # later it should also have the payments paper copies
    media_busta = create_media(
        user=user, incasso=incasso, type_of_media=TypeOfMedia.envelope, db=db
    )

    incasso_creation_date = incasso.creation_date.strftime("%Y-%m-%d")

    if not os.path.exists(PDF_BASE_PATH):
        os.mkdir(PDF_BASE_PATH)
    if not os.path.exists(f"{PDF_BASE_PATH}/busta"):
        os.mkdir(f"{PDF_BASE_PATH}/busta")
    if not os.path.exists(f"{PDF_BASE_PATH}/riepilogo"):
        os.mkdir(f"{PDF_BASE_PATH}/riepilogo")

    media_busta.pdf_path = (
        f"{PDF_BASE_PATH}/busta/incasso_{incasso.id}_{incasso_creation_date}.pdf"
    )

    incasso_pdf = generate_incasso_pdf(incasso=incasso)
    generated_media: list[Media] = [media_busta]

    if list_of_images:
        media_riepilogo = create_media(
            user=user, incasso=incasso, type_of_media=TypeOfMedia.scan, db=db
        )
        media_riepilogo.type_of_media = TypeOfMedia.scan
        pdf_path = f"{PDF_BASE_PATH}/riepilogo/incasso_{incasso.id}_{incasso_creation_date}.pdf"
        media_riepilogo.pdf_path = pdf_path

        try:
            riepilogo_pdf = generate_riepilogo_pdf(list_of_images)
        except Exception as e:
            raise HTTPException(500, e)
        else:
            riepilogo_pdf.write_pdf(target=media_riepilogo.pdf_path)
            generated_media.append(media_riepilogo)

    incasso_pdf.write_pdf(target=media_busta.pdf_path)

    incasso.media = generated_media
    db.add_all(generated_media)
    db.commit()

    return {
        "message": f"Incasso successfully created with {len(payment_to_add)} payments"
    }


def create_media(
    user: User,
    incasso: Incasso,
    type_of_media: TypeOfMedia,
    db: Session = Depends(get_db),
) -> Media:
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
async def download_incasso(
    incasso_id: int, db: Session = Depends(get_db), type_of_download: str = ""
):
    possible_values = (v.value for v in TypeOfMedia)
    if type_of_download not in possible_values:
        raise HTTPException(
            status_code=404,
            detail=f"Type of download {type_of_download} not found",
        )

    media = db.query(Media).where(
        Media.type_of_media == type_of_download, Media.incasso_id == incasso_id
    )

    if not media:
        raise HTTPException(status_code=404, detail="No file fonud for this incasso")

    if media.count() > 1:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for m in media.all():
                f = open(m.pdf_path)
                name = m.pdf_path.split("/")[-1]
                zip_file.writestr(name, f.read())

        return Response(
            content=buffer.getvalue(),
            media_type="application/zip",
        )

    file_name = media.pdf_path.split("/")[-1]
    return FileResponse(
        path=media.pdf_path, filename=file_name, media_type="application/pdf"
    )
