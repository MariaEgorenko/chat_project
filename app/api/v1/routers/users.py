from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.repositories.users import schemas, crud
from ....db.session import get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/register", response_model=schemas.User)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_login(db, login=user_in.login)
    if db_user:
        raise HTTPException(status_code=400,
                            detail="Login already registered")
    return crud.create_user(db, user_in.dict())

@router.get("/", response_model=List[schemas.User])
def get_users(skip: int = 0, limit: int = 100,
              db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users 