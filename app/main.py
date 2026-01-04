from fastapi import FastAPI, Request, Depends
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from .api.v1.routers import users, auth, ws_main, contacts
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
def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/home", include_in_schema=False)
def home(
    request: Request,
    current_user = Depends(deps.get_current_user),
):
    return templates.TemplateResponse(
        "home.html",
        {"request": request, "user": current_user}
    )