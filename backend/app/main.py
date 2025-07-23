from ..database import get_db, create_tables
from .models import User, Document, ExtractionTemplate, ProcessingLog
from .auth import (
    authenticate_user, create_access_token, get_current_user, 
    get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES
)
from .ocr_processor import OCRProcessor
from .table_extractor import TableExtractor
from .classifier import DocumentClassifier
from .redactor import DataRedactor
from .utils import KeyValueExtractor, create_sample_users

create_tables()
create_sample_users()

app = FastAPI(title="SmartDoc AI Processor", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

ocr_processor = OCRProcessor()
table_extractor = TableExtractor()
document_classifier = DocumentClassifier()
data_redactor = DataRedactor()
kv_extractor = KeyValueExtractor()

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

@app.post("/register")
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        (User.username == username) | (User.email == email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Username or email already registered"
        )
    
    hashed_password = get_password_hash(password)
    user = User(
        username=username,
        email=email,
        hashed_password=hashed_password
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    return {"message": "User created successfully", "user_id": user.id}

@app.post("/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    results = []
    
    for file in files:
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff']
        if file.content_type not in allowed_types:
            continue
        
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{file_id}{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
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
            "status": "uploaded"
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
    
    try:
        document.status = "processing"
        db.commit()
        
        ocr_result = ocr_processor.process_document(document.file_path)
        extracted_text = ocr_result['text']
        bounding_boxes = ocr_result['bounding_boxes']
        
        classification = document_classifier.classify_document(extracted_text)
        
        tables = table_extractor.extract_tables(document.file_path)
        
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
            'processing_time': datetime.utcnow().isoformat()
        }
        document.status = "completed"
        document.processed_at = datetime.utcnow()
        
        db.commit()
        
        log = ProcessingLog(
            document_id=document.id,
            action="document_processed",
            details=f"Document processed successfully. Type: {classification['type']}",
            user_id=current_user.id
        )
        db.add(log)
        db.commit()
        
        return {
            "document_id": document.id,
            "status": "completed",
            "document_type": classification['type'],
            "confidence": classification['confidence'],
            "extracted_text": extracted_text,
            "tables": tables,
            "key_value_pairs": kv_pairs,
            "bounding_boxes": bounding_boxes
        }
        
    except Exception as e:
        document.status = "failed"
        db.commit()
        
        log = ProcessingLog(
            document_id=document.id,
            action="processing_failed",
            details=str(e),
            user_id=current_user.id
        )
        db.add(log)
        db.commit()
        
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.post("/redact/{document_id}")
async def redact_document(
    document_id: int,
    redaction_options: dict = None,
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
        raise HTTPException(status_code=400, detail="Document not processed yet")
    
    # Redact sensitive data
    redaction_result = data_redactor.redact_sensitive_data(
        document.extracted_text, 
        redaction_options
    )
    
    # save redacted data
    document.redacted_data = redaction_result
    db.commit()
    
    log = ProcessingLog(
        document_id=document.id,
        action="data_redacted",
        details=f"Redacted {redaction_result['redaction_count']} sensitive items",
        user_id=current_user.id
    )
    db.add(log)
    db.commit()
    
    return redaction_result

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
    
    documents = query.offset(skip).limit(limit).all()
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "document_type": doc.document_type,
            "confidence_score": doc.confidence_score,
            "status": doc.status,
            "created_at": doc.created_at,
            "processed_at": doc.processed_at
        }
        for doc in documents
    ]

@app.get("/documents/{document_id}")
async def get_document(
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

@app.post("/templates")
async def create_template(
    name: str = Form(...),
    document_type: str = Form(...),
    fields: str = Form(...),  # JSON string
    description: str = Form(""),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    import json
    
    try:
        fields_data = json.loads(fields)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid fields JSON")
    
    template = ExtractionTemplate(
        name=name,
        document_type=document_type,
        fields=fields_data,
        description=description,
        creator_id=current_user.id
    )
    
    db.add(template)
    db.commit()
    db.refresh(template)
    
    return {
        "template_id": template.id,
        "message": "Template created successfully"
    }

@app.get("/templates")
async def get_templates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    templates = db.query(ExtractionTemplate).filter(
        ExtractionTemplate.creator_id == current_user.id,
        ExtractionTemplate.is_active == True
    ).all()
    
    return [
        {
            "id": template.id,
            "name": template.name,
            "document_type": template.document_type,
            "fields": template.fields,
            "description": template.description,
            "created_at": template.created_at
        }
        for template in templates
    ]

@app.get("/search")
async def search_documents(
    query: str,
    document_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_query = db.query(Document).filter(Document.owner_id == current_user.id)
    
    if document_type:
        db_query = db_query.filter(Document.document_type == document_type)
    
    if query:
        db_query = db_query.filter(Document.extracted_text.contains(query))
    
    documents = db_query.all()
    
    return [
        {
            "id": doc.id,
            "filename": doc.filename,
            "document_type": doc.document_type,
            "relevance_snippet": doc.extracted_text[:200] if doc.extracted_text else "",
            "created_at": doc.created_at
        }
        for doc in documents
    ]

@app.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_docs = db.query(Document).filter(Document.owner_id == current_user.id).count()
    
    type_counts = {}
    types = db.query(Document.document_type).filter(Document.owner_id == current_user.id).all()
    for doc_type in types:
        if doc_type[0]:
            type_counts[doc_type[0]] = type_counts.get(doc_type[0], 0) + 1
    
    recent_docs = db.query(Document).filter(
        Document.owner_id == current_user.id
    ).order_by(Document.created_at.desc()).limit(5).all()
    
    return {
        "total_documents": total_docs,
        "document_types": type_counts,
        "recent_documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "document_type": doc.document_type,
                "created_at": doc.created_at
            }
            for doc in recent_docs
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
