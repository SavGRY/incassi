from typing import List

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    password: Mapped[str] = mapped_column(String)
    document: Mapped[List["Document"]] = relationship("Document", back_populates="user")


class Client(Base):
    __tablename__ = "client"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    document: Mapped[List["Document"]] = relationship(
        "Document", back_populates="client"
    )


class Document(Base):
    __tablename__ = "document"
    id: Mapped[int] = mapped_column(primary_key=True)
    type_of_payment: Mapped[str] = mapped_column(String, nullable=False)
    amount: Mapped[float] = (mapped_column(Float, nullable=False),)
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("client.id"))
    client: Mapped[Client] = relationship("Client", back_populates="document")
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))
    user: Mapped[User] = relationship("User", back_populates="document")
