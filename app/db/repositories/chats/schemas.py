from datetime import datetime
from typing import List
from pydantic import BaseModel


class ChatCreate(BaseModel):
    companion_id: str


class ChatRead(BaseModel):
    id: str
    user1_id: str
    user2_id: str

    class Config:
        from_attributes = True


class MessageBase(BaseModel):
    content: str


class MessageCreate(MessageBase):
    chat_id: str


class MessageRead(BaseModel):
    id: str
    chat_id: str
    sender_id: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True