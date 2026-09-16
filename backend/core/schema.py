from datetime import datetime

from pydantic import ConfigDict, BaseModel


class Document(BaseModel):
    id: int
    creation_date: datetime
    user_id: int

    model_config = ConfigDict(from_attributes=True)
