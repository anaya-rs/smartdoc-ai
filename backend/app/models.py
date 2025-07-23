from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Float, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    documents = relationship("Document", back_populates="owner")
    templates = relationship("ExtractionTemplate", back_populates="creator")

class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String)
    file_path = Column(String)
    file_type = Column(String)
    file_size = Column(Integer)
    document_type = Column(String)
    confidence_score = Column(Float)
    status = Column(String, default="processing")
    extracted_text = Column(Text)
    extracted_data = Column(JSON)
    tables = Column(JSON)
    key_value_pairs = Column(JSON)
    bounding_boxes = Column(JSON)
    redacted_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="documents")

class ExtractionTemplate(Base):
    __tablename__ = "extraction_templates"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    document_type = Column(String)
    fields = Column(JSON)  # Field definitions with coordinates
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    creator_id = Column(Integer, ForeignKey("users.id"))
    creator = relationship("User", back_populates="templates")

class ProcessingLog(Base):
    __tablename__ = "processing_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    action = Column(String)
    details = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
