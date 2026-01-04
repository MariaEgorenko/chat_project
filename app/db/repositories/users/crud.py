from sqlalchemy.orm import Session
from .models import User
from ....core.security import get_password_hash, verify_password

def get_user_by_login(db: Session, login: str):
    return db.query(User).filter(User.login == login).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: dict):
    hashed_password = get_password_hash(user["password"])
    db_user = User(login=user["login"], name=user["name"],
                   hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, login: str, password: str):
    user = get_user_by_login(db, login)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_user_by_id(db: Session, user_id: str):
    return db.query(User).filter(User.id == user_id).first()