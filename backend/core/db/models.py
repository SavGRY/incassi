from datetime import datetime
from enum import Enum

from core.db.database import Base
from sqlalchemy import Enum as SqlAlchemyEnum
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    first_name: Mapped[str] = mapped_column(String, nullable=False)
    last_name: Mapped[str] = mapped_column(String, nullable=False)
    password: Mapped[str] = mapped_column(String)
    document: Mapped[list["Document"]] = relationship("Document", back_populates="user")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"{self.__class__.__name__} - id: ({self.id})"


class Client(Base):
    __tablename__ = "client"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    code: Mapped[int] = mapped_column(Integer, nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    province: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
    )


class Document(Base):
    """
    Per documento s'intende l'oggetto in PDF che verrà generato
    """

    __tablename__ = "document"

    id: Mapped[int] = mapped_column(primary_key=True)
    creation_date: Mapped[datetime] = mapped_column(DateTime)
    # FK
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("user.id"))

    # Relationship
    user: Mapped[User] = relationship("User", back_populates="document")


class TypeOfIncasso(str, Enum):
    check: str = "assegno"
    cash: str = "contanti"


class Incasso(Base):
    """
    Per incasso s'intende il singolo pagamento del cliente da apporre sulla busta
    """

    __tablename__ = "incasso"

    id: Mapped[int] = mapped_column(primary_key=True)
    type_of_payment: Mapped[TypeOfIncasso] = mapped_column(
        SqlAlchemyEnum(TypeOfIncasso)
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # FK
    document_id: Mapped[int] = mapped_column(Integer, ForeignKey("document.id"))
    client_id: Mapped[int] = mapped_column(Integer, ForeignKey("client.id"))

    # Relationships
    document: Mapped[Document] = relationship("Document", back_populates="incasso")
    client: Mapped[Client] = relationship("Client", back_populates="client")
