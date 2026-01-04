from pydantic import BaseModel
from typing import Literal


class ContactBase(BaseModel):
    contact_id: str


class ContactCreate(ContactBase):
    pass


class ContactOut(BaseModel):
    id: str
    user_id: str
    contact_id: str

    class Config:
        from_attributes = True


class ContactRequestCreate(BaseModel):
    to_user_id: str


class ContactRequestOut(BaseModel):
    id: str
    from_user_id: str
    to_user_id: str

    class Config:
        from_attributes = True


class UserSearchResult(BaseModel):
    id: str
    login: str
    name: str

    class Config:
        from_attributs = True