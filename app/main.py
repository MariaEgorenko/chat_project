from fastapi import FastAPI, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from .api.v1.routers import users, auth, ws_main, contacts, chat_service
from .db.base import engine, Base
from .api.v1 import deps

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
    chat_dto = chat_service.get_chat_for_user(db, chat_id, current_user)

    return templates.TemplateResponse(
        "chat.html",
        {
            "request": request,
            "user": current_user,
            "chat_id": chat_dto.chat_id,
            "companion_id": chat_dto.companion_id,
            "companion_name": chat_dto.companion_name,
        },
    )