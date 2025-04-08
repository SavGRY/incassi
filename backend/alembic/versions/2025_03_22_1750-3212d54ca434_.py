"""empty message

Revision ID: 3212d54ca434
Revises: e8356367513e
Create Date: 2025-03-22 17:50:48.077361

"""

from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3212d54ca434"
down_revision: Union[str, None] = "e8356367513e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("first_name", sa.String(), nullable=True),
        sa.Column("last_name", sa.String(), nullable=True),
        sa.Column("is_superuser", sa.Boolean(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("password", sa.String(), nullable=False),
        sa.Column("token", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "client",
        sa.Column("code", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("address", sa.String(), nullable=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("city", sa.String(), nullable=False),
        sa.Column("province", sa.String(length=2), nullable=False),
        sa.PrimaryKeyConstraint("code"),
    )

    op.create_table(
        "document",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("creation_date", sa.DateTime(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "incasso",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "type_of_payment",
            sa.Enum("check", "cash", name="typeofincasso"),
            nullable=False,
        ),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("client_code", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["client_code"], ["client.code"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("incasso")
    op.drop_table("document")
    op.drop_table("client")
    op.drop_table("user")
