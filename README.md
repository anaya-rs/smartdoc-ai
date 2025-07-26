
```markdown
# SmartDoc AI

AI-powered document processing system with OCR capabilities and modern UI.

## Quick Setup

### Backend
```
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy bcrypt python-jose[cryptography] python-multipart pillow PyMuPDF easyocr
python run_backend.py
```

### Frontend
```
cd frontend
npm install
npm start
```

## Access
- App: http://localhost:3000
- API: http://localhost:8000/docs

## Login
- Username: admin
- Password: admin123

## Usage
1. Start both backend and frontend
2. Login with credentials above
3. Upload documents via drag & drop
4. Documents are auto-processed with OCR
5. View results in dashboard

## Features
- PDF/Image upload with OCR text extraction
- Document classification and template generation
- Natural language Q&A about document content
- Professional UI with responsive design

## Tech Stack
- Backend: FastAPI, EasyOCR, SQLAlchemy
- Frontend: React, Bootstrap
