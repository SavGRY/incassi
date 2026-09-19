from typing import Annotated
from fastapi import APIRouter, Depends, Form
from sqlalchemy.orm import Session
from core.db.database import get_db
from core.db.models import Client
from client.schema import (
    Client as ClientSchema,
    ClientCreated,
    ClientFromForm,
)
from fastapi import status, HTTPException

router = APIRouter(prefix="/client", tags=["client"])


@router.post(
    path="/create",
    status_code=status.HTTP_201_CREATED,
    response_model=ClientCreated,
)
async def create_client(
    client_payload: Annotated[ClientFromForm, Form()], db: Session = Depends(get_db)
):
    """
    Api function to create a Client

    The payload is validated by `ClientFromForm`, so a malformed `province` or
    an empty `name` never reaches this function: FastAPI answers 422 first.

    :param client_payload: The payload sent from the FrontEnd via Form
    :param db: The db session, defaults to Depends(get_db)
    """
    # `code` is the primary key, so a duplicate is a conflict the user can fix
    # by picking another code, not an internal error.
    already_exists = db.query(Client).filter(Client.code == client_payload.code).first()
    if already_exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Client with code {client_payload.code} already exists",
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
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A critical error occurred",
        )
    return {"message": "Client successfully created", "data": new_client}


@router.get("/list", response_model=list[ClientSchema])
async def get_client_list(
    db: Session = Depends(get_db),
):
    """
    API that gets all the clients in the db

    An empty catalogue is a legitimate state and not an error: the frontend
    autocomplete loads this endpoint before any client has been created.

    :param db: The db session, defaults to Depends(get_db)
    :return: The list of clients, empty when there is none
    """
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
    client.code = client_payload.code
    client.name = client_payload.name
    client.address = client_payload.address
    client.province = client_payload.province
    client.city = client_payload.city
    try:
        db.commit()
        db.refresh(client)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="A critical error occurred",
        )
    return {
        "message": f"Client {client_code} has been successfully updated!",
        "client": client,
    }
