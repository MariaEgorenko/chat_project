from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ...db.session import get_db
from ...core.session import get_user_from_session, user_sessions
from ...db.repositories.users.crud import get_user_by_login

async def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Не авторизован (нет сессии)",
        )
    session_data = user_sessions.get(session_id)
    login = session_data["login"]
    if not login:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Сессия истекла или недействительна",
        )

    user = get_user_by_login(db, login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден",
        )

    return user