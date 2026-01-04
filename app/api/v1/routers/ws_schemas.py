from typing import Literal, Union
from pydantic import BaseModel


class ContactRequestDataIn(BaseModel):
    id: str
    from_user: str


class ContactRequestDataOut(BaseModel):
    id: str
    to_user: str


class ContactRequestListItemIn(BaseModel):
    id: str
    from_user: str


class ContactRequestListDataIn(BaseModel):
    items: list[ContactRequestListItemIn]


class ContactRequestListItemOut(BaseModel):
    id: str
    to_user: str


class ContactRequestListDataOut(BaseModel):
    items: list[ContactRequestListItemOut]


class ErrorData(BaseModel):
    detail: str



MessageData = Union[
    ContactRequestDataIn,
    ContactRequestDataOut,
    ContactRequestListDataIn,
    ContactRequestListDataOut,
    ErrorData,

]


class WSMessage(BaseModel):
    type: str
    data: MessageData