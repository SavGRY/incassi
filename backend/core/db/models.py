from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean
from sqlalchemy import Enum as SqlAlchemyEnum
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

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
    # documents: Mapped[list["Document"]] = relationship(
    #     "Document",
    #     back_populates="user",
    # )
    incassos: Mapped[list["Incasso"]] = relationship(
        "Incasso",
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
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="client",
    )

    def __str__(self):
        return f"Client {self.code}"

    def __repr__(self):
        return f"{self.__class__.__name__} - Code: ({self.code})"


class Incasso(Base):
    """
    Per incasso s'intende il documento globale che è composto dalla lista di pagamenti
    e dalla busta + dal pdf con l'immagine delle scansioni
    """

    __tablename__ = "incasso"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    creation_date: Mapped[datetime] = mapped_column(nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))

    user: Mapped["User"] = relationship(
        "User",
        back_populates="incassos",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="incasso",
        cascade="all, delete-orphan",
    )


class TypeOfPayment(str, Enum):
    check = "assegno"
    cash = "contanti"


class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_payment: Mapped[int] = mapped_column()
    type_of_payment: Mapped["TypeOfPayment"] = mapped_column(
        SqlAlchemyEnum(TypeOfPayment),
        default=TypeOfPayment.cash
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # FK
    client_code: Mapped[int] = mapped_column(Integer, ForeignKey("client.code"))
    incasso_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("incasso.id", ondelete="CASCADE")
    )

    # New relationship with Incasso and Client
    client: Mapped["Client"] = relationship(
        "Client",
        back_populates="payments",
    )
    incasso: Mapped["Incasso"] = relationship("Incasso", back_populates="payments")


# TODO: Reimplement documents when needed, also in `env.py` in alembic
# class Document(Base):
#     """
#     Per documento s'intende l'oggetto in PDF che verrà generato
#     """
#
#     __tablename__ = "document"
#
#     id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
#     creation_date: Mapped[datetime] = mapped_column(DateTime)
#     # FK
#     user_id: Mapped[int] = mapped_column(
#         Integer, ForeignKey("user.id", ondelete="CASCADE")
#     )
#
#     # Relationships
#     user: Mapped["User"] = relationship("User", back_populates="documents")
#     incassos: Mapped[list["Incasso"]] = relationship(
#         "Incasso", back_populates="document"
#     )
