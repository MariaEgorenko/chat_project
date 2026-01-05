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

async def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        return None

    session_data = user_sessions.get(session_id)
    if not session_data:
        return None

    login = session_data.get("login")
    if not login:
        return None

    user = get_user_by_login(db, login)
    return user

async def require_authenticated_user(
    request: Request,
    db: Session = Depends(get_db),
):
    session_id = request.cookies.get("session_id")
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": "/"},
        )

    session_data = user_sessions.get(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": "/"},
        )

    login = session_data.get("login")
    if not login:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": "/"},
        )

    user = get_user_by_login(db, login)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
            headers={"Location": "/"},
        )

    return user