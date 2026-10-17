import io
import os
import zipfile
from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
import pypdfium2
from sqlalchemy.orm import Session, selectinload
from starlette.responses import FileResponse, Response

from core.db.database import get_db
from core.db.models import Incasso, Client, Payment, Media, User, TypeOfMedia
from incasso.images import read_images
from incasso.pdf import generate_incasso_pdf, generate_riepilogo_pdf
from incasso.schema import IncassoDocument, PaymentListModel

PDF_BASE_PATH = "./generated"
# 72 dpi times this: an A4 page becomes about 300x420 px, sharp on a card.
PREVIEW_SCALE = 0.5
router = APIRouter(
    prefix="/incasso",
    tags=["incasso"],
)


@router.post(path="/create", status_code=status.HTTP_201_CREATED)
async def create_incasso(
    request: Request,
    list_of_payment: PaymentListModel = Form(...),
    list_of_images: list[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    user = db.get(User, request.state.user.id)

    # Every check runs before the first row is written.
    images = await read_images(list_of_images or [])

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

    if images:
        media_riepilogo = create_media(
            user=user, incasso=incasso, type_of_media=TypeOfMedia.scan, db=db
        )
        media_riepilogo.type_of_media = TypeOfMedia.scan
        pdf_path = f"{PDF_BASE_PATH}/riepilogo/incasso_{incasso.id}_{incasso_creation_date}.pdf"
        media_riepilogo.pdf_path = pdf_path

        try:
            riepilogo_pdf = generate_riepilogo_pdf(images)
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


@router.get(path="/list", response_model=list[IncassoDocument])
async def list_incasso_documents(
    request: Request,
    limit: int | None = Query(default=None, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """
    API that lists the documents generated for the caller's incassi, newest first

    :param limit: How many documents to return, all of them when omitted
    :param db: The db session, defaults to Depends(get_db)
    :return: The documents, empty when there is none
    """
    user: User = request.state.user
    media_list = (
        db.query(Media)
        .options(selectinload(Media.incasso).selectinload(Incasso.payments))
        .filter(Media.user_id == user.id, Media.incasso_id.is_not(None))
        .order_by(Media.creation_date.desc(), Media.id.desc())
        .limit(limit)
        .all()
    )
    return [
        IncassoDocument(
            id=m.id,
            incasso_id=m.incasso_id,
            type_of_media=m.type_of_media,
            creation_date=m.creation_date,
            payments_count=len(m.incasso.payments),
            total=sum(p.amount for p in m.incasso.payments),
        )
        for m in media_list
    ]


@router.get(
    path="/preview/{media_id}",
    response_class=Response,
    responses={200: {"content": {"image/png": {}}}},
)
async def preview_media(
    request: Request,
    media_id: int,
    db: Session = Depends(get_db),
):
    """
    API that renders the first page of one of the caller's documents as a PNG

    :param media_id: The document to preview
    :param db: The db session, defaults to Depends(get_db)
    :return: The PNG, 404 when the document is not the caller's or its file is gone
    """
    user: User = request.state.user
    media = (
        db.query(Media).filter(Media.id == media_id, Media.user_id == user.id).first()
    )
    if not media or not os.path.isfile(media.pdf_path):
        raise HTTPException(status_code=404, detail="Document not found")

    pdf = pypdfium2.PdfDocument(media.pdf_path)
    try:
        image = pdf[0].render(scale=PREVIEW_SCALE).to_pil()
    finally:
        pdf.close()
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return Response(
        content=buffer.getvalue(),
        media_type="image/png",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get(
    path="/download-incasso/{incasso_id}",
    status_code=status.HTTP_200_OK,
    response_class=FileResponse,
    response_description="The generated incasso pdf",
)
async def download_incasso(
    request: Request,
    incasso_id: int,
    db: Session = Depends(get_db),
    type_of_download: str = "",
):
    # The column stores the enum *member*, so the raw string has to be resolved
    # first: comparing the column against a bare value raises a LookupError.
    try:
        media_type = TypeOfMedia(type_of_download)
    except ValueError:
        raise HTTPException(
            status_code=404,
            detail=f"Type of download {type_of_download} not found",
        )

    # The incasso must belong to the caller, otherwise anyone authenticated
    # could download everybody else's documents by guessing an id.
    user: User = request.state.user
    incasso = (
        db.query(Incasso)
        .filter(Incasso.id == incasso_id, Incasso.user_id == user.id)
        .first()
    )
    if not incasso:
        raise HTTPException(status_code=404, detail="Incasso not found")

    media_list = (
        db.query(Media)
        .where(Media.type_of_media == media_type, Media.incasso_id == incasso_id)
        .all()
    )

    if not media_list:
        raise HTTPException(status_code=404, detail="No file found for this incasso")

    if len(media_list) > 1:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for m in media_list:
                name = os.path.basename(m.pdf_path)
                with open(m.pdf_path, "rb") as f:
                    zip_file.writestr(name, f.read())

        return Response(
            content=buffer.getvalue(),
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="incasso_{incasso_id}.zip"'
            },
        )

    media = media_list[0]
    return FileResponse(
        path=media.pdf_path,
        filename=os.path.basename(media.pdf_path),
        media_type="application/pdf",
    )
