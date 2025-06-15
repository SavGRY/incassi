from datetime import datetime
from enum import Enum

from sqlalchemy import Boolean, func
from sqlalchemy import Enum as SqlAlchemyEnum
from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.db.database import Base


class TypeOfPayment(str, Enum):
    check = "assegno"
    cash = "contanti"


class TypeOfMedia(str, Enum):
    envelope = "busta"
    scan = "scan"


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

    media: Mapped[list["Media"]] = relationship(
        "Media",
        back_populates="user",
    )
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


class Media(Base):
    def __repr__(self):
        return f"{self.__class__.__name__} - id: ({self.id})"

    def __str__(self):
        return (
            f"Media(id={self.id}, "
            f"creation_date={self.creation_date}, "
            f"pdf_path={self.pdf_path}, "
            f"type_of_media={self.type_of_media}), "
            f"user_id={self.user_id})"
        )

    __tablename__ = "media"

    id: Mapped[int] = mapped_column(
        primary_key=True, nullable=False, autoincrement=True
    )
    creation_date: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    pdf_path: Mapped[str] = mapped_column(String, default=None)
    type_of_media: Mapped["TypeOfMedia"] = mapped_column(
        SqlAlchemyEnum(TypeOfMedia),
        default=TypeOfMedia.envelope,
        server_default=TypeOfMedia.envelope,
        nullable=False,
    )
    incasso_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("incasso.id", ondelete="CASCADE"),
        nullable=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("user.id", ondelete="CASCADE")
    )

    user: Mapped["User"] = relationship("User", back_populates="media")
    incasso: Mapped["Incasso"] = relationship("Incasso", back_populates="media")


class Incasso(Base):
    """
    Per incasso s'intende il la busta che aggrega + pagamenti
    """

    __tablename__ = "incasso"

    def __repr__(self):
        return f"{self.__class__.__name__} - id: ({self.id})"

    def __str__(self):
        return (
            f"Incasso(id={self.id}, "
            f"creation_date={self.creation_date}, "
            f"user_id={self.user_id}"
        )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    creation_date: Mapped[datetime] = mapped_column(
        nullable=False, server_default=func.now()
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("user.id"))

    media: Mapped[list["Media"]] = relationship(
        "Media",
        back_populates="incasso",
        cascade="all, delete-orphan",
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="incassos",
    )
    payments: Mapped[list["Payment"]] = relationship(
        "Payment",
        back_populates="incasso",
        cascade="all, delete-orphan",
    )


class Payment(Base):
    __tablename__ = "payment"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_payment: Mapped[int] = mapped_column()
    type_of_payment: Mapped["TypeOfPayment"] = mapped_column(
        SqlAlchemyEnum(TypeOfPayment),
        default=TypeOfPayment.cash,
        server_default=TypeOfPayment.cash,
        nullable=False,
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)

    # FK
    client_code: Mapped[int] = mapped_column(Integer, ForeignKey("client.code"))
    incasso_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("incasso.id", ondelete="CASCADE"),
        nullable=True,
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
#     Per documento s'intende il documento riepilogativo comprendente le immagini dell'incasso
#     """
#
#     __tablename__ = "document"
#
#     id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
#     creation_date: Mapped[datetime] = mapped_column(DateTime)
#     image_path_list: Mapped[str] = mapped_column(String)
#
#     # FK
#     user_id: Mapped[int] = mapped_column(
#         Integer, ForeignKey("user.id", ondelete="CASCADE")
#     )
#     incasso_id: Mapped[int] = mapped_column(
#         Integer, ForeignKey("incasso.id", ondelete="CASCADE")
#     )
#
#     # Relationships
#     user: Mapped["User"] = relationship("User", back_populates="documents")
#     incasso: Mapped["Incasso"] = relationship("Incasso", back_populates="documents")
