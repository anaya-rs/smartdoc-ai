# SmartDoc AI

AI-powered document processing system with OCR and natural language Q&A capabilities.

## Quick Start

### Backend Setup

1. Navigate to backend directory:
cd backend

2. Create and activate virtual environment:
python -m venv .venv
.venv\Scripts\activate

3. Install dependencies:
pip install fastapi uvicorn sqlalchemy bcrypt python-jose[cryptography] python-multipart pillow PyMuPDF easyocr

4. Run server:
python run_backend.py

Backend runs at: http://localhost:8000

### Frontend Setup

1. Navigate to frontend directory:
cd frontend

2. Install dependencies:
npm install

3. Start application:
npm start

Frontend runs at: http://localhost:3000

## Default Login

Username: admin
Password: admin123

## Features

Document upload (PDF, PNG, JPG, TIFF)
OCR text extraction  
Document classification
Natural language Q&A
Data redaction
