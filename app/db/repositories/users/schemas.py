from pydantic import BaseModel
from typing import List


class UserCreate(BaseModel):
    login: str
    name: str
    password: str


class User(BaseModel):
    id: str
    login: str
    name: str

    class Config:
        from_attributes = True


class UsersList(BaseModel):
    users: List[User]
    total: int 