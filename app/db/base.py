from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from ..core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
)

Base = declarative_base()