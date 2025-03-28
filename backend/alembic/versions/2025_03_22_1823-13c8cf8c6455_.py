"""empty message

Revision ID: 13c8cf8c6455
Revises: 3212d54ca434
Create Date: 2025-03-22 18:23:25.407604

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "13c8cf8c6455"
down_revision: Union[str, None] = "3212d54ca434"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("document", sa.Column("document_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        None, "document", "document", ["document_id"], ["id"], ondelete="CASCADE"
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_constraint(None, "document", type_="foreignkey")
    op.drop_column("document", "document_id")
    # ### end Alembic commands ###
