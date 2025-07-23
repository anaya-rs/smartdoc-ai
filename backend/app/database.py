from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
import os

os.makedirs("uploads", exist_ok=True)

SQLALCHEMY_DATABASE_URL = "sqlite:///./smartdoc.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
