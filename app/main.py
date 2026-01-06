from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .api.v1.routers import users, auth, ws_main, contacts
from .db.base import engine, Base
from .api.v1 import deps
from .services import chat_utils

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

app.include_router(users.router, prefix="/api/v1", tags=["users"])
app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
app.include_router(contacts.router, prefix="/api/v1", tags=["contacts"])
app.include_router(ws_main.router)

@app.get("/", include_in_schema=False)
def index(
    request: Request,
    current_user = Depends(deps.get_current_user_optional)
):
    if current_user:
        return RedirectResponse(url="/chats", status_code=302)
    return templates.TemplateResponse("auth.html", {"request": request})

@app.get("/register", include_in_schema=False)
def register_page(request: Request):
    return templates.TemplateResponse("register.html", {"request": request})

@app.get("/chats", include_in_schema=False)
def chats_page(
    request: Request,
    current_user = Depends(deps.require_authenticated_user),
):
    return templates.TemplateResponse(
        "chats.html",
        {"request": request, "user": current_user}, 
    )

@app.get("/chats/{chat_id}", include_in_schema=False)
def chat_page(
    chat_id: str,
    request: Request,
    db: Session = Depends(deps.get_db),
    current_user = Depends(deps.require_authenticated_user),
):
    chat = chat_utils._get_chat_for_user(db, chat_id, current_user.id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    companion_data = chat_utils.build_companion_data(db, chat, current_user.id)

    return templates.TemplateResponse(
        "chat.html",
        {
            "request": request,
            "user": current_user,
            "chat_id": str(chat.id),
            "companion_id": companion_data["companion_id"],
            "companion_name": companion_data["companion_name"],
            "current_user_id": str(current_user.id)
        },
    )

@app.get("/contacts", include_in_schema=False)
def contacts_page(
    request: Request,
    current_user = Depends(deps.require_authenticated_user),
):
    return templates.TemplateResponse(
        "contacts.html",
        {
            "request": request, 
            "user": current_user
        }, 
    )