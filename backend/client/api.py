from typing import Annotated
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from core.db.database import get_db
from core.db.models import Client
from core.schema import Client as ClientSchema, ClientFromForm
from fastapi import status, HTTPException


router = APIRouter(prefix="/client", tags=["client"])


@router.post(path="/create", response_model=ClientSchema)
async def create_client(
    client_payload: Annotated[ClientFromForm, Form()], db: Session = Depends(get_db)
):
    """
    Api function to create a Client

    :param client_payload: The payload sent from the FrontEnd via Form
    :param db: The db session, defaults to Depends(get_db)
    """
    if len(client_payload.province) > 2:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Province {client_payload.province} has more than 2 letters: {len(client_payload.province)}",
        )

    new_client: Client = Client(
        code=client_payload.code,
        name=client_payload.name,
        address=client_payload.address,
        province=client_payload.province,
        city=client_payload.city,
    )
    try:
        db.add(new_client)
        db.commit()
        db.refresh(new_client)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A critical error occurred",
        )


@router.get("/list")
async def get_client_list(
    db: Session = Depends(get_db),
):
    """
    API that gets all the clients in the db

    :param db: The db session, defaults to Depends(get_db)
    :return: List of clients or a JSONResponse if there's none
    """
    client_list = db.query(Client).all()
    if not client_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No clients found",
        )
    return list(db.query(Client).all())


@router.get("/{client_code}", response_model=ClientSchema)
async def get_client_detail(client_code: int, db: Session = Depends(get_db)):
    """
    API That retrieve the client matching the given `client_code`

    :param client_code: The PK for the Client
    :type client_code: int
    :param db: The db session, defaults to Depends(get_db)
    :type db: Session, optional
    :return: The given Client or JSONResponse if ther's none
    :rtype: ClientSchema | JSONResponse
    """
    client_detail = db.query(Client).filter(Client.code == client_code).first()
    if not client_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No detail found for {client_code}",
        )
    return client_detail


@router.delete("/{client_code}")
async def delete_client(client_code: int, db: Session = Depends(get_db)):
    """
    API Delete a given client with the given `client_code`

    :param client_code: The PK for the Client
    :type client_code: int
    :param db: The db session, defaults to Depends(get_db)
    :type db: Session, optional
    :return: A JSONResponse
    :rtype:  JSONResponse
    """
    if not client_code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="client_id not found, Please provide a client_id",
        )
    client = db.query(Client).filter(Client.code == client_code).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with code {client_code} not found",
        )
    db.delete(client)
    db.commit()
    return {"message": f"Client {client_code} deleted successfully"}


@router.put(path="/{client_code}")
async def update_client(
    client_payload: Annotated[ClientFromForm, Form()],
    client_code: int,
    db: Session = Depends(get_db),
):
    """
    API That perform a `PUT` request to update the given client with
    the given `client_code`

    :param client_payload: The payload sent from the FrontEnd via Form
    :type client_payload: Annotated[ClientFromForm, Form]
    :param client_code: The PK for the Client
    :type client_code: int
    :param db: The db session, defaults to Depends(get_db)
    :type db: Session, optional
    :return: _description_
    :rtype: _type_
    """
    client = db.query(Client).filter(Client.code == client_code).first()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Client with code {client_code} not found",
        )
    client = Client(
        code=client_payload.code,
        name=client_payload.name,
        address=client_payload.address,
        province=client_payload.province,
        city=client_payload.city,
    )
    return {
        "message": f"Client {client_code} has been successfully updated!",
        "client": client,
    }
