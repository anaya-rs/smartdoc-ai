import sys
import os
import uvicorn
import uuid
import shutil
from datetime import datetime, timedelta
from typing import List, Optional
import json
import numpy as np
from typing import Dict, List
import asyncio

class TemplateGenerator:
    def __init__(self):
        self.templates = {}
        self.load_existing_templates()
    
    def load_existing_templates(self):
        try:
            with open('templates.json', 'r') as f:
                self.templates = json.load(f)
        except FileNotFoundError:
            self.templates = {}
    
    def save_templates(self):
        with open('templates.json', 'w') as f:
            json.dump(self.templates, f, indent=2)
    
    def generate_template(self, document_type: str, extracted_data: Dict, key_value_pairs: Dict, layout: Dict):
        template_key = document_type.lower()
        
        if template_key not in self.templates:
            self.templates[template_key] = {
                'name': document_type.replace('_', ' ').title(),
                'document_type': document_type,
                'field_patterns': {},
                'layout_patterns': {
                    'headers': [],
                    'sections': []
                },
                'extraction_rules': {},
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'document_count': 0
            }
        
        template = self.templates[template_key]
        template['document_count'] += 1
        template['updated_at'] = datetime.utcnow().isoformat()
        
        if key_value_pairs and 'extracted_pairs' in key_value_pairs:
            for field_name, field_value in key_value_pairs['extracted_pairs'].items():
                if field_name not in template['field_patterns']:
                    template['field_patterns'][field_name] = {
                        'name': field_name.replace('_', ' ').title(),
                        'type': self._detect_field_type(field_value),
                        'pattern': self._generate_pattern(field_value),
                        'required': True,
                        'examples': []
                    }
                
                if str(field_value) not in template['field_patterns'][field_name]['examples']:
                    template['field_patterns'][field_name]['examples'].append(str(field_value))
                    template['field_patterns'][field_name]['examples'] = template['field_patterns'][field_name]['examples'][-5:]
        
        if layout:
            if layout.get('headers'):
                for header in layout['headers'][:3]:
                    if header not in template['layout_patterns']['headers']:
                        template['layout_patterns']['headers'].append(header)
        
        template['extraction_rules'] = self._generate_extraction_rules(document_type, template['field_patterns'])
        
        self.save_templates()
        return template
    
    def _detect_field_type(self, value):
        if isinstance(value, (int, float)):
            return 'number'
        elif isinstance(value, str):
            if '@' in value:
                return 'email'
            elif any(char.isdigit() for char in value) and len(value.replace('-', '').replace(' ', '')) >= 10:
                return 'phone'
            elif '/' in value or '-' in value:
                return 'date'
            elif value.replace('.', '').replace(',', '').isdigit():
                return 'currency'
            else:
                return 'text'
        return 'text'
    
    def _generate_pattern(self, value):
        import re
        
        if isinstance(value, str):
            if '@' in value:
                return r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            elif value.replace('-', '').replace(' ', '').replace('(', '').replace(')', '').isdigit():
                return r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b'
            elif '/' in value:
                return r'\d{1,2}/\d{1,2}/\d{2,4}'
            else:
                return rf'\b{re.escape(value)}\b'
        
        return str(value)
    
    def _generate_extraction_rules(self, document_type, field_patterns):
        rules = {
            'preprocessing': ['enhance_contrast', 'deskew'],
            'field_extraction': {},
            'validation': {}
        }
        
        for field_name, field_info in field_patterns.items():
            rules['field_extraction'][field_name] = {
                'pattern': field_info['pattern'],
                'type': field_info['type'],
                'required': field_info['required']
            }
            
            if field_info['type'] == 'email':
                rules['validation'][field_name] = 'validate_email'
            elif field_info['type'] == 'phone':
                rules['validation'][field_name] = 'validate_phone'
            elif field_info['type'] == 'date':
                rules['validation'][field_name] = 'validate_date'
        
        return rules
    
    def get_template(self, document_type: str):
        return self.templates.get(document_type.lower())
    
    def get_all_templates(self):
        return list(self.templates.values())

template_generator = TemplateGenerator()

app_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'app')
sys.path.insert(0, app_dir)

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import get_db, create_tables
from models import User, Document, ExtractionTemplate, ProcessingLog
from auth import authenticate_user, create_access_token, get_current_user, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
from ocr_processor import OCRProcessor
from qa_processor import QuestionAnsweringProcessor

def convert_numpy_types(obj):
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    elif isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    return obj

class TableExtractor:
    def __init__(self):
        print("TableExtractor initialized")

    def extract_tables(self, file_path):
        return []

class DocumentClassifier:
    def __init__(self):
        print("DocumentClassifier initialized")
        self.ai_summarizer = None
        
        try:
            from transformers import pipeline
            self.ai_summarizer = pipeline("summarization", model="facebook/bart-large-cnn", device=-1)
            print("AI summarization model loaded")
        except Exception as e:
            print(f"AI model loading failed: {e}")

    def classify_document(self, text):
        if not text or len(text.strip()) < 10:
            return {'type': 'unknown', 'confidence': 0.3}

        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ['invoice', 'bill', 'total', 'amount due', 'payment']):
            return {'type': 'invoice', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['receipt', 'purchase', 'transaction', 'paid']):
            return {'type': 'receipt', 'confidence': 0.8}
        elif any(keyword in text_lower for keyword in ['contract', 'agreement', 'terms', 'party', 'whereas']):
            return {'type': 'contract', 'confidence': 0.8}
        else:
            return {'type': 'document', 'confidence': 0.6}

    def generate_ai_overview(self, text, document_type):
        if not text or len(text.strip()) < 20:
            return "This document appears to be empty or could not be processed properly."
        
        if self.ai_summarizer and len(text.strip()) > 50:
            try:
                limited_text = text[:1000] + "..." if len(text) > 1000 else text
                summary_result = self.ai_summarizer(limited_text, max_length=100, min_length=20, do_sample=False)
                
                if summary_result and len(summary_result) > 0:
                    ai_summary = summary_result[0]['summary_text']
                    word_count = len(text.split())
                    return f"{ai_summary} The document contains approximately {word_count:,} words of content."
                    
            except Exception as e:
                print(f"AI overview generation failed: {e}")
        
        word_count = len(text.split())
        return f"This {document_type} contains approximately {word_count:,} words of content."

class DataRedactor:
    def __init__(self):
        print("DataRedactor initialized")

    def redact_sensitive_data(self, text, options=None):
        import re
        if not text:
            return {'redacted_text': '', 'original_text': '', 'redactions': [], 'redaction_count': 0}

        redacted = text
        redactions = []

        if options and options.get('emails', True):
            emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
            for email in emails:
                redacted = redacted.replace(email, '[EMAIL_REDACTED]')
                redactions.append({'type': 'email', 'original': email})

        if options and options.get('phones', True):
            phones = re.findall(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', text)
            for phone in phones:
                redacted = redacted.replace(phone, '[PHONE_REDACTED]')
                redactions.append({'type': 'phone', 'original': phone})

        return {'redacted_text': redacted, 'original_text': text, 'redactions': redactions, 'redaction_count': len(redactions)}

class KeyValueExtractor:
    def __init__(self):
        print("KeyValueExtractor initialized")

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

        return {'extracted_pairs': pairs, 'pair_count': len(pairs)}

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
            {"username": "admin", "email": "admin@smartdoc.ai", "password": "admin123"},
            {"username": "demo", "email": "demo@smartdoc.ai", "password": "demo123"}
        ]

        for user_data in users:
            user = User(
                username=user_data["username"],
                email=user_data["email"],
                hashed_password=get_password_hash(user_data["password"])
            )
            db.add(user)

        db.commit()
        print("Sample users created")

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

async def process_document_background(document_id: int, user_id: int):
    from database import SessionLocal
    db = SessionLocal()
    
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.owner_id == user_id
        ).first()

        if not document:
            print(f"Document {document_id} not found for background processing")
            return

        print(f"BACKGROUND PROCESSING DOCUMENT {document_id}")
        print(f"File path: {document.file_path}")
        print(f"File exists: {os.path.exists(document.file_path)}")
        
        if os.path.exists(document.file_path):
            file_size = os.path.getsize(document.file_path)
            print(f"File size: {file_size} bytes")
        
        document.status = "processing"
        db.commit()

        print(f"Starting OCR with: {type(ocr_processor)}")
        print(f"OCR Reader available: {hasattr(ocr_processor, 'reader') and ocr_processor.reader is not None}")
        
        ocr_result = ocr_processor.process_document(document.file_path)
        print(f"OCR Result keys: {list(ocr_result.keys())}")
        print(f"Text length: {len(ocr_result.get('text', ''))}")
        print(f"Word count: {ocr_result.get('word_count', 0)}")
        
        if ocr_result.get('text'):
            print(f"First 100 chars: {ocr_result['text'][:100]}...")
        else:
            print("NO TEXT EXTRACTED!")
        
        extracted_text = ocr_result.get('text', '') or ""
        bounding_boxes = ocr_result.get('bounding_boxes', [])

        classification = document_classifier.classify_document(extracted_text)
        print(f"Classification: {classification}")

        ai_overview = document_classifier.generate_ai_overview(extracted_text, classification['type'])
        tables = table_extractor.extract_tables(document.file_path)
        kv_pairs = kv_extractor.extract_key_value_pairs(extracted_text, bounding_boxes)

        try:
            layout = ocr_processor.extract_layout_elements(document.file_path)
        except Exception as e:
            print(f"Layout extraction failed: {e}")
            layout = {'headers': [], 'paragraphs': [], 'lists': [], 'tables': []}

        print("Generating template...")
        template = template_generator.generate_template(
            document_type=classification['type'],
            extracted_data={'classification': classification},
            key_value_pairs=kv_pairs,
            layout=layout
        )

        extracted_data = {
            'classification': convert_numpy_types(classification),
            'ai_overview': ai_overview,
            'layout': convert_numpy_types(layout),
            'template_id': template.get('name'),
            'processing_time': datetime.utcnow().isoformat(),
            'text_length': int(len(extracted_text)),
            'word_count': int(len(extracted_text.split()) if extracted_text else 0)
        }

        document.extracted_text = extracted_text
        document.document_type = str(classification['type'])
        document.confidence_score = float(classification['confidence'])
        document.bounding_boxes = convert_numpy_types(bounding_boxes)
        document.tables = convert_numpy_types(tables)
        document.key_value_pairs = convert_numpy_types(kv_pairs)
        document.extracted_data = extracted_data
        document.status = "completed"
        document.processed_at = datetime.utcnow()

        db.commit()
        print(f"BACKGROUND PROCESSING COMPLETED FOR DOCUMENT {document_id}")

    except Exception as e:
        print(f"BACKGROUND PROCESSING FAILED: {e}")
        import traceback
        traceback.print_exc()
        
        try:
            db.rollback()
            if document:
                document.status = "failed"
                db.commit()
        except Exception as rollback_error:
            print(f"Rollback failed: {rollback_error}")
    
    finally:
        db.close()

@app.get("/")
async def root():
    return {
        "message": "SmartDoc AI Processor is running!",
        "status": "ok",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "uptime": datetime.utcnow().isoformat(),
        "services": {
            "ocr": "active",
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
    background_tasks: BackgroundTasks,
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

            print(f"AUTO-TRIGGERING PROCESSING FOR DOCUMENT {document.id}")
            background_tasks.add_task(process_document_background, document.id, current_user.id)

            results.append({
                "document_id": document.id,
                "filename": file.filename,
                "status": "processing",
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
async def process_document(document_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    document = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    print(f"MANUAL PROCESSING DOCUMENT {document_id}")
    print(f"File path: {document.file_path}")
    print(f"File exists: {os.path.exists(document.file_path)}")
    
    if os.path.exists(document.file_path):
        file_size = os.path.getsize(document.file_path)
        print(f"File size: {file_size} bytes")
    
    try:
        document.status = "processing"
        db.commit()

        print(f"Starting OCR with: {type(ocr_processor)}")
        print(f"OCR Reader available: {hasattr(ocr_processor, 'reader') and ocr_processor.reader is not None}")
        
        ocr_result = ocr_processor.process_document(document.file_path)
        print(f"OCR Result keys: {list(ocr_result.keys())}")
        print(f"Text length: {len(ocr_result.get('text', ''))}")
        print(f"Word count: {ocr_result.get('word_count', 0)}")
        
        if ocr_result.get('text'):
            print(f"First 100 chars: {ocr_result['text'][:100]}...")
        else:
            print("NO TEXT EXTRACTED!")
        
        extracted_text = ocr_result.get('text', '') or ""
        bounding_boxes = ocr_result.get('bounding_boxes', [])

        classification = document_classifier.classify_document(extracted_text)
        print(f"Classification: {classification}")

        ai_overview = document_classifier.generate_ai_overview(extracted_text, classification['type'])
        tables = table_extractor.extract_tables(document.file_path)
        kv_pairs = kv_extractor.extract_key_value_pairs(extracted_text, bounding_boxes)

        try:
            layout = ocr_processor.extract_layout_elements(document.file_path)
        except Exception as e:
            print(f"Layout extraction failed: {e}")
            layout = {'headers': [], 'paragraphs': [], 'lists': [], 'tables': []}

        print("Generating template...")
        template = template_generator.generate_template(
            document_type=classification['type'],
            extracted_data={'classification': classification},
            key_value_pairs=kv_pairs,
            layout=layout
        )

        extracted_data = {
            'classification': convert_numpy_types(classification),
            'ai_overview': ai_overview,
            'layout': convert_numpy_types(layout),
            'template_id': template.get('name'),
            'processing_time': datetime.utcnow().isoformat(),
            'text_length': int(len(extracted_text)),
            'word_count': int(len(extracted_text.split()) if extracted_text else 0)
        }

        document.extracted_text = extracted_text
        document.document_type = str(classification['type'])
        document.confidence_score = float(classification['confidence'])
        document.bounding_boxes = convert_numpy_types(bounding_boxes)
        document.tables = convert_numpy_types(tables)
        document.key_value_pairs = convert_numpy_types(kv_pairs)
        document.extracted_data = extracted_data
        document.status = "completed"
        document.processed_at = datetime.utcnow()

        db.commit()
        print(f"MANUAL PROCESSING COMPLETED FOR DOCUMENT {document_id}")

        return {
            "document_id": document.id,
            "status": "completed",
            "document_type": classification['type'],
            "confidence": float(classification['confidence']),
            "extracted_text": extracted_text,
            "ai_overview": ai_overview,
            "template_generated": True,
            "template_name": template.get('name'),
            "text_length": len(extracted_text),
            "word_count": len(extracted_text.split()) if extracted_text else 0,
            "tables": convert_numpy_types(tables),
            "key_value_pairs": convert_numpy_types(kv_pairs),
            "bounding_boxes": convert_numpy_types(bounding_boxes)
        }

    except Exception as e:
        print(f"MANUAL PROCESSING FAILED: {e}")
        import traceback
        traceback.print_exc()
        
        try:
            db.rollback()
            db.refresh(document)
            document.status = "failed"
            db.commit()
        except Exception as rollback_error:
            print(f"Rollback failed: {rollback_error}")
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/templates")
async def get_templates(current_user: User = Depends(get_current_user)):
    templates = template_generator.get_all_templates()
    return {
        "templates": templates,
        "total_count": len(templates)
    }

@app.get("/templates/{document_type}")
async def get_template(
    document_type: str, 
    current_user: User = Depends(get_current_user)
):
    template = template_generator.get_template(document_type)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@app.post("/templates/custom")
async def create_custom_template(
    template_data: dict,
    current_user: User = Depends(get_current_user)
):
    try:
        template_key = template_data['document_type'].lower()
        template_generator.templates[f"custom_{template_key}_{int(datetime.utcnow().timestamp())}"] = template_data
        template_generator.save_templates()
        
        return {
            "message": "Custom template created successfully",
            "template": template_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@app.post("/process-with-template/{document_id}")
async def process_with_template(
    document_id: int,
    template_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    template = template_generator.get_template(template_type)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return await process_document(document_id, current_user, db)

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
        "extracted_data": document.extracted_data,
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
    redaction_options: dict,
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
        redaction_result = data_redactor.redact_sensitive_data(document.extracted_text, redaction_options)
        document.redacted_data = convert_numpy_types(redaction_result)
        db.commit()
        
        return {
            "document_id": document.id,
            "redacted_text": redaction_result['redacted_text'],
            "redactions": redaction_result['redactions'],
            "redaction_count": redaction_result['redaction_count']
        }
    
    except Exception as e:
        db.rollback()
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

@app.delete("/documents/{document_id}")
async def delete_document(
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
    
    try:
        if document.file_path and os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        db.delete(document)
        db.commit()
        
        return {
            "message": "Document deleted successfully",
            "document_id": document_id,
            "filename": document.filename
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

@app.post("/documents/bulk-delete")
async def bulk_delete_documents(
    document_ids: List[int],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    deleted_count = 0
    errors = []
    
    for doc_id in document_ids:
        try:
            document = db.query(Document).filter(
                Document.id == doc_id,
                Document.owner_id == current_user.id
            ).first()
            
            if document:
                if document.file_path and os.path.exists(document.file_path):
                    os.remove(document.file_path)
                
                db.delete(document)
                deleted_count += 1
            else:
                errors.append(f"Document {doc_id} not found")
                
        except Exception as e:
            errors.append(f"Failed to delete document {doc_id}: {str(e)}")
    
    try:
        db.commit()
        return {
            "deleted_count": deleted_count,
            "errors": errors,
            "message": f"Successfully deleted {deleted_count} documents"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run("run_backend:app", host="127.0.0.1", port=8000, reload=True)
