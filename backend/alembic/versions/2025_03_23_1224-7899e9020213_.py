"""empty message

Revision ID: 7899e9020213
Revises: 137192676c1a
Create Date: 2025-03-23 12:24:12.370832

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7899e9020213"
down_revision: Union[str, None] = "7a326e0dfc03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("incasso", sa.Column("creation_date", sa.DateTime(), nullable=False))
    op.add_column("incasso", sa.Column("user_id", sa.Integer(), nullable=False))
    op.drop_constraint("incasso_client_code_fkey", "incasso", type_="foreignkey")
    op.drop_constraint("incasso_document_id_fkey", "incasso", type_="foreignkey")
    op.create_foreign_key(None, "incasso", "user", ["user_id"], ["id"])
    op.drop_column("incasso", "document_id")
    op.drop_column("incasso", "amount")
    op.drop_column("incasso", "client_code")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "incasso",
        sa.Column("client_code", sa.INTEGER(), autoincrement=False, nullable=False),
    )
    op.add_column(
        "incasso",
        sa.Column(
            "amount",
            sa.DOUBLE_PRECISION(precision=53),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.add_column(
        "incasso",
        sa.Column("document_id", sa.INTEGER(), autoincrement=False, nullable=False),
    )
    op.drop_constraint(None, "incasso", type_="foreignkey")
    op.create_foreign_key(
        "incasso_document_id_fkey",
        "incasso",
        "document",
        ["document_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "incasso_client_code_fkey",
        "incasso",
        "client",
        ["client_code"],
        ["code"],
        ondelete="CASCADE",
    )
    op.drop_column("incasso", "user_id")
    op.drop_column("incasso", "creation_date")
    # ### end Alembic commands ###
