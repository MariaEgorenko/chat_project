from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ....db.repositories.chats import crud as chats_crud
from ....db.repositories.users import crud as users_crud
from ....db.repositories.users.models import User

class ChatDTO:
    def __init__(self, chat_id: str, companion_id: str, companion_name: str):
        self.chat_id = chat_id
        self.companion_id = companion_id
        self.companion_name = companion_name


def get_chat_for_user(db: Session, chat_id: str, current_user: User) -> ChatDTO:
    chat = chats_crud.get_chat(db, chat_id)
    if not chat or current_user.id not in (chat.user1_id, chat.user2_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    companion_id = chat.user1_id if chat.user2_id == current_user.id else chat.user2_id
    companion = users_crud.get_user_by_id(db, companion_id)

    companion_name = getattr(companion, "name", None) or getattr(companion, "login", None) or str(companion_id)

    return ChatDTO(
        chat_id=str(chat.id),
        companion_id=str(companion_id),
        companion_name=companion_name,
    )
