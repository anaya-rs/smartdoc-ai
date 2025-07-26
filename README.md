<!DOCTYPE html>
<html>
<head>
    <title>SmartDoc AI - README</title>
</head>
<body>
    <h1> SmartDoc AI</h1>
    
    <p>AI-powered document processing system with OCR capabilities and modern UI.</p>

    <h2> Quick Setup</h2>

    <h3>Backend</h3>
    <pre>
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy bcrypt python-jose[cryptography] python-multipart pillow PyMuPDF easyocr
python run_backend.py
    </pre>

    <h3>Frontend</h3>
    <pre>
cd frontend
npm install
npm start
    </pre>

    <h2> Access</h2>
    <ul>
        <li><strong>App:</strong> http://localhost:3000</li>
        <li><strong>API:</strong> http://localhost:8000/docs</li>
    </ul>

    <h2> Login</h2>
    <ul>
        <li><strong>Username:</strong> admin</li>
        <li><strong>Password:</strong> admin123</li>
    </ul>

    <h2> Usage</h2>
    <ol>
        <li>Start both servers</li>
        <li>Login with credentials</li>
        <li>Upload documents via drag & drop</li>
        <li>Documents auto-processed with OCR</li>
        <li>View results in dashboard</li>
    </ol>

    <h2> Features</h2>
    <ul>
        <li>PDF/Image upload with OCR</li>
        <li>Document classification</li>
        <li>Natural language Q&A</li>
        <li>Professional responsive UI</li>
    </ul>

    <h2>🛠 Tech Stack</h2>
    <ul>
        <li><strong>Backend:</strong> FastAPI, EasyOCR, SQLAlchemy</li>
        <li><strong>Frontend:</strong> React, Bootstrap</li>
    </ul>
</body>
</html>
