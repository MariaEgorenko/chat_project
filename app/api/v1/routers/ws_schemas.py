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


class ChatOpenData(BaseModel):
    chat_id: str
    companion_id: str


class ChatMessageIn(BaseModel):
    chat_id: str
    content: str


class ChatMessageOut(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    created_at: str


class ChatHistoryItem(BaseModel):
    id: str
    sender_id: str
    content: str
    created_at: str


class ChatHistoryData(BaseModel):
    chat_id: str
    messages: list[ChatHistoryItem]


class ChatRead(BaseModel):
    id: str
    user1_id: str
    user2_id: str

class ChatItem(BaseModel):
    id: str
    companion_id: str
    companion_name: str | None = None
    last_message: str | None = None
    last_message_at: str | None = None


class ChatsListData(BaseModel):
    items: list[ChatItem]


MessageData = Union[
    ContactRequestDataIn,
    ContactRequestDataOut,
    ContactRequestListDataIn,
    ContactRequestListDataOut,
    ErrorData,
    ChatOpenData,
    ChatMessageIn,
    ChatMessageOut,
    ChatHistoryData,
    ChatRead,
    ChatsListData,
    ChatItem,
    
]


class WSMessage(BaseModel):
    type: str
    data: MessageData