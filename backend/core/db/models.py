from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean
from sqlalchemy import Enum as SqlAlchemyEnum
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import DateTime

from core.db.database import Base


class User(Base):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    first_name: Mapped[str] = mapped_column(String, nullable=True)
    last_name: Mapped[str] = mapped_column(String, nullable=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    password: Mapped[str] = mapped_column(String)
    token: Mapped[str] = mapped_column(String, nullable=True)
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="user",
    )

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    def __repr__(self):
        return f"{self.__class__.__name__} - id: ({self.id})"


class Client(Base):
    __tablename__ = "client"

    code: Mapped[int] = mapped_column(primary_key=True, nullable=False)
    address: Mapped[str] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    city: Mapped[str] = mapped_column(String, nullable=False)
    province: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
    )
    incassos: Mapped[list["Incasso"]] = relationship(
        "Incasso",
        back_populates="client",
    )

    def __str__(self):
        return f"Client {self.code}"

    def __repr__(self):
        return f"{self.__class__.__name__} - Code: ({self.code})"


class TypeOfIncasso(str, Enum):
    check = "assegno"
    cash = "contanti"


class Incasso(Base):
    """
    Per incasso s'intende il singolo pagamento del cliente da apporre sulla busta
    """

    __tablename__ = "incasso"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    type_of_payment: Mapped[TypeOfIncasso] = mapped_column(
        SqlAlchemyEnum(TypeOfIncasso)
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # FK
    client_code: Mapped[int] = mapped_column(
        Integer, ForeignKey("client.code", ondelete="CASCADE")
    )
    document_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("document.id", ondelete="CASCADE")
    )
    # Fixed relationships
    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="incassos",
    )
    document: Mapped["Document"] = relationship("Document", back_populates="incassos")


class Document(Base):
    """
    Per documento s'intende l'oggetto in PDF che verrà generato
    """

    __tablename__ = "document"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    creation_date: Mapped[datetime] = mapped_column(DateTime)
    # FK
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE")
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="documents")
    incassos: Mapped[list["Incasso"]] = relationship(
        "Incasso", back_populates="document"
    )
