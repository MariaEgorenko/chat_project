from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.security import HTTPBasic
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.websockets import WebSocketState

from ....db.session import get_db
from ....db.repositories.users.crud import authenticate_user
from ....core.session import create_session, user_sessions, delete_session
from ....core.security import create_access_token
from .ws_main import active_ws

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBasic()


class LoginRequest(BaseModel):
    login: str
    password: str


class TokenResponce(BaseModel):
    access_token: str
    token_type: str = "bearer"

@router.post("/login")
def login(response: Response, user_in: LoginRequest,
          db: Session = Depends(get_db)):
    user = authenticate_user(db, user_in.login, user_in.password)

    if not user:
        raise HTTPException(status_code=400, detail="Invalid username/password")
    
    session_id = create_session(user_in.login, user.id)
    response.set_cookie(key="session_id", value=session_id, httponly=True)
    token = create_access_token({"sub": user.id})
    return TokenResponce(access_token=token)

@router.get("/sessions")
def list_sessions():
    return user_sessions

@router.post("/logout")
async def logout(response: Response, request: Request):
    session_id = request.cookies.get("session_id")
    if session_id:
        session_data = user_sessions.get(session_id)
        if session_data:
            user_id = session_data.get("user_id")
            ws = active_ws.get(user_id)
            if ws and ws.client_state == WebSocketState.CONNECTED:
                await ws.close(code=1000)
                active_ws.pop(user_id, None)
        delete_session(session_id)
    response.delete_cookie("session_id")
    return {"message": "Logout completed"}