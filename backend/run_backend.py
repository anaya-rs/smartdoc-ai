import sys
import os
import uvicorn
import uuid
import shutil
from datetime import datetime, timedelta
from typing import List, Optional

app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')
sys.path.insert(0, app_dir)

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import get_db, create_tables
from models import User, Document, ExtractionTemplate, ProcessingLog
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from ocr_processor import OCRProcessor
from qa_processor import QuestionAnsweringProcessor

class TableExtractor:
    def __init__(self):
        print("TableExtractor initialized (basic mode)")
    
    def extract_tables(self, file_path):
        return []

class DocumentClassifier:
    def __init__(self):
        print("DocumentClassifier initialized (basic mode)")
    
    def classify_document(self, text):
        if not text or len(text.strip()) < 10:
            return {'type': 'unknown', 'confidence': 0.3}
            
        text_lower = text.lower()
        if any(keyword in text_lower for keyword in ['invoice', 'bill', 'total', 'amount due']):
            return {'type': 'invoice', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['receipt', 'purchase', 'transaction']):
            return {'type': 'receipt', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['contract', 'agreement', 'terms']):
            return {'type': 'contract', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['id', 'license', 'passport', 'card']):
            return {'type': 'id_document', 'confidence': 0.7}
        else:
            return {'type': 'document', 'confidence': 0.6}

class DataRedactor:
    def __init__(self):
        print("DataRedactor initialized (basic mode)")
    
    def redact_sensitive_data(self, text, options=None):
        import re
        if not text:
            return {
                'redacted_text': '',
                'original_text': '',
                'redactions': [],
                'redaction_count': 0
            }
            
        redacted = text
        redactions = []
        
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            redacted = redacted.replace(email, '[EMAIL_REDACTED]')
            redactions.append({'type': 'email', 'original': email})
        
        phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
        for phone in phones:
            redacted = redacted.replace(phone, '[PHONE_REDACTED]')
            redactions.append({'type': 'phone', 'original': phone})
        
        return {
            'redacted_text': redacted,
            'original_text': text,
            'redactions': redactions,
            'redaction_count': len(redactions)
        }

class KeyValueExtractor:
    def __init__(self):
        print("KeyValueExtractor initialized (basic mode)")
    
    def extract_key_value_pairs(self, text, bounding_boxes=None):
        import re
        if not text:
            return {'extracted_pairs': {}, 'pair_count': 0}
            
        pairs = {}
        
        patterns = {
            'invoice_number': r'invoice\s*(?:number|#|no\.?)\s*:?\s*([A-Z0-9\-]+)',
            'total_amount': r'(?:total|amount|sum)\s*:?\s*₹?\$?([0-9,]+\.?\d*)',
            'date': r'(?:date|on)\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'reference': r'(?:ref|reference|ref\.?)\s*:?\s*([A-Z0-9]+)',
            'name': r'(?:name|to)\s*:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)',
        }
        
        for key, pattern in patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                pairs[key] = matches[0] if len(matches) == 1 else matches
        
        return {
            'extracted_pairs': pairs,
            'pair_count': len(pairs)
        }

def create_sample_users():
    from database import SessionLocal
    from models import User
    from auth import get_password_hash
    
    db = SessionLocal()
    
    try:
        existing_user = db.query(User).filter(User.username == "admin").first()
        if existing_user:
            return
        
        users = [
            {
                "username": "admin",
                "email": "admin@smartdoc.ai",
                "password": "admin123"
            },
            {
                "username": "demo",
                "email": "demo@smartdoc.ai", 
                "password": "demo123"
            }
        ]
        
        for user_data in users:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"])
            )
            db.add(user)
        
        db.commit()
        print("Sample users created successfully!")
        
    except Exception as e:
        print(f"Error creating sample users: {e}")
        db.rollback()
    finally:
        db.close()

create_tables()
create_sample_users()

app = FastAPI(title="SmartDoc AI Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

ocr_processor = OCRProcessor()
table_extractor = TableExtractor()
document_classifier = DocumentClassifier()
data_redactor = DataRedactor()
kv_extractor = KeyValueExtractor()
qa_processor = QuestionAnsweringProcessor()

@app.get("/")
async def root():
    return {
        "message": "SmartDoc AI Processor is running!", 
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "ocr_status": "enhanced" if ocr_processor.tesseract_available else "basic"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "uptime": datetime.utcnow().isoformat(),
        "services": {
            "ocr": "enhanced" if ocr_processor.tesseract_available else "basic",
            "table_extraction": "active", 
            "classification": "active",
            "redaction": "active",
            "key_value_extraction": "active",
            "question_answering": "active"
        }
    }

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "user_id": user.id}

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = []
    
    for file in files:
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff', 'image/jpg']
        if file.content_type not in allowed_types:
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": f"Unsupported file type: {file.content_type}"
            })
            continue
        
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            document = Document(
                filename=file.filename,
                file_path=file_path,
                file_type=file.content_type,
                file_size=os.path.getsize(file_path),
                owner_id=current_user.id,
                status="uploaded"
            )
            
            db.add(document)
            db.commit()
            db.refresh(document)
            
            results.append({
                "document_id": document.id,
                "filename": file.filename,
                "status": "uploaded",
                "file_size": document.file_size
            })
            
        except Exception as e:
            print(f"Upload error for {file.filename}: {e}")
            results.append({
                "filename": file.filename,
                "status": "error",
                "error": str(e)
            })
    
    return {"uploaded_documents": results}

@app.post("/process/{document_id}")
async def process_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    print(f"Starting processing for document ID: {document_id}")
    
    try:
        document.status = "processing"
        db.commit()
        
        print("Starting OCR processing...")
        ocr_result = ocr_processor.process_document(document.file_path)
        extracted_text = ocr_result['text'] or ""
        bounding_boxes = ocr_result.get('bounding_boxes', [])
        
        print(f"OCR completed. Text length: {len(extracted_text)}")
        
        print("Starting classification...")
        classification = document_classifier.classify_document(extracted_text)
        print(f"Classified as: {classification['type']} (confidence: {classification['confidence']})")
        
        print("Starting table extraction...")
        tables = table_extractor.extract_tables(document.file_path)
        
        print("Starting key-value extraction...")
        kv_pairs = kv_extractor.extract_key_value_pairs(extracted_text, bounding_boxes)
        
        layout = ocr_processor.extract_layout_elements(document.file_path)
        
        document.extracted_text = extracted_text
        document.document_type = classification['type']
        document.confidence_score = classification['confidence']
        document.bounding_boxes = bounding_boxes
        document.tables = tables
        document.key_value_pairs = kv_pairs
        document.extracted_data = {
            'classification': classification,
            'layout': layout,
            'processing_time': datetime.utcnow().isoformat(),
            'text_length': len(extracted_text),
            'word_count': len(extracted_text.split()) if extracted_text else 0
        }
        document.status = "completed"
        document.processed_at = datetime.utcnow()
        
        db.commit()
        
        print(f"Document {document_id} processing completed successfully!")
        
        return {
            "document_id": document.id,
            "status": "completed",
            "document_type": classification['type'],
            "confidence": classification['confidence'],
            "extracted_text": extracted_text,
            "text_length": len(extracted_text),
            "word_count": len(extracted_text.split()) if extracted_text else 0,
            "tables": tables,
            "key_value_pairs": kv_pairs,
            "bounding_boxes": bounding_boxes
        }
        
    except Exception as e:
        print(f"Processing failed for document {document_id}: {e}")
        document.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/documents")
async def get_documents(
    skip: int = 0,
    limit: int = 100,
    document_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Document).filter(Document.owner_id == current_user.id)
    
    if document_type:
        query = query.filter(Document.document_type == document_type)
    
    documents = query.order_by(Document.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "document_type": doc.document_type,
            "confidence_score": doc.confidence_score,
            "status": doc.status,
            "file_size": doc.file_size,
            "created_at": doc.created_at,
            "processed_at": doc.processed_at
        }
        for doc in documents
    ]

@app.get("/documents/{document_id}")
async def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "id": document.id,
        "filename": document.filename,
        "document_type": document.document_type,
        "confidence_score": document.confidence_score,
        "status": document.status,
        "extracted_text": document.extracted_text,
        "tables": document.tables,
        "key_value_pairs": document.key_value_pairs,
        "bounding_boxes": document.bounding_boxes,
        "redacted_data": document.redacted_data,
        "created_at": document.created_at,
        "processed_at": document.processed_at
    }

@app.post("/redact/{document_id}")
async def redact_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.extracted_text:
        raise HTTPException(status_code=400, detail="Document has not been processed yet")
    
    try:
        redaction_result = data_redactor.redact_sensitive_data(document.extracted_text)
        
        document.redacted_data = redaction_result
        db.commit()
        
        return {
            "document_id": document.id,
            "redacted_text": redaction_result['redacted_text'],
            "redactions": redaction_result['redactions'],
            "redaction_count": redaction_result['redaction_count']
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Redaction failed: {str(e)}")

@app.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_docs = db.query(Document).filter(Document.owner_id == current_user.id).count()
    processed_docs = db.query(Document).filter(
        Document.owner_id == current_user.id,
        Document.status == "completed"
    ).count()
    
    type_counts = {}
    docs_with_types = db.query(Document.document_type).filter(
        Document.owner_id == current_user.id,
        Document.document_type.isnot(None)
    ).all()
    
    for (doc_type,) in docs_with_types:
        type_counts[doc_type] = type_counts.get(doc_type, 0) + 1
    
    recent_docs = db.query(Document).filter(
        Document.owner_id == current_user.id
    ).order_by(Document.created_at.desc()).limit(5).all()
    
    return {
        "total_documents": total_docs,
        "processed_documents": processed_docs,
        "processing_rate": (processed_docs / total_docs * 100) if total_docs > 0 else 0,
        "document_types": type_counts,
        "recent_documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "status": doc.status,
                "document_type": doc.document_type,
                "created_at": doc.created_at
            }
            for doc in recent_docs
        ]
    }

@app.get("/test")
async def test_endpoint():
    return {
        "message": "Server is working correctly!",
        "timestamp": datetime.utcnow().isoformat(),
        "test": "success",
        "ocr_available": ocr_processor.tesseract_available
    }

@app.post("/ask/{document_id}")
async def ask_question(
    document_id: int,
    question_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = question_data.get('question', '').strip()
    
    if not question:
        raise HTTPException(status_code=400, detail="Question is required")
    
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not document.extracted_text:
        raise HTTPException(status_code=400, detail="Document has not been processed yet")
    
    try:
        print(f"Processing question: '{question}' for document {document_id}")
        
        answer_result = qa_processor.answer_question(
            question=question,
            document_text=document.extracted_text,
            key_value_pairs=document.key_value_pairs
        )
        
        print(f"Answer: {answer_result['answer']} (confidence: {answer_result['confidence']})")
        
        return {
            "document_id": document_id,
            "question": question,
            "answer": answer_result['answer'],
            "confidence": answer_result['confidence'],
            "question_type": answer_result['question_type'],
            "sources": answer_result['sources']
        }
        
    except Exception as e:
        print(f"Q&A error: {e}")
        raise HTTPException(status_code=500, detail=f"Question processing failed: {str(e)}")

@app.get("/suggestions/{document_id}")
async def get_question_suggestions(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    suggestions = qa_processor.get_suggested_questions(
        document_type=document.document_type or 'document',
        kv_pairs=document.key_value_pairs
    )
    
    return {
        "document_id": document_id,
        "suggestions": suggestions
    }

if __name__ == "__main__":
    print("Starting SmartDoc AI Backend...")
    print("Server will be available at: http://127.0.0.1:8000")
    print("API documentation: http://127.0.0.1:8000/docs")
    print("Interactive API: http://127.0.0.1:8000/redoc")
    print("Test endpoint: http://127.0.0.1:8000/test")
    
    uvicorn.run("run_backend:app", host="127.0.0.1", port=8000, reload=True)