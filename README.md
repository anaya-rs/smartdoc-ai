
<body>
    <div class="container">
        <h1>🧠 SmartDoc AI</h1>
        
        <p>
            <span class="badge">React</span>
            <span class="badge">FastAPI</span>
            <span class="badge">EasyOCR</span>
            <span class="badge">SQLite</span>
        </p>
        
        <p>AI-powered document processing system with OCR capabilities and modern UI.</p>

        <h2>🚀 Quick Setup</h2>

        <h3>Backend</h3>
        <pre>cd backend
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # Mac/Linux
pip install fastapi uvicorn sqlalchemy bcrypt python-jose[cryptography] python-multipart pillow PyMuPDF easyocr
python run_backend.py</pre>

        <h3>Frontend</h3>
        <pre>cd frontend
npm install
npm start</pre>

        <h2>🌐 Access</h2>
        <ul>
            <li><strong>App:</strong> <a href="http://localhost:3000">http://localhost:3000</a></li>
            <li><strong>API Docs:</strong> <a href="http://localhost:8000/docs">http://localhost:8000/docs</a></li>
        </ul>

        <h2>🔐 Login</h2>
        <div class="highlight success">
            <ul>
                <li><strong>Username:</strong> admin</li>
                <li><strong>Password:</strong> admin123</li>
            </ul>
        </div>

        <h2>📋 Usage</h2>
        <ol>
            <li>Start both backend and frontend servers</li>
            <li>Login with credentials above</li>
            <li>Upload documents via drag & drop interface</li>
            <li>Documents are automatically processed with OCR</li>
            <li>View results in dashboard and documents page</li>
        </ol>

        <h2>✨ Features</h2>
        <ul>
            <li>PDF/Image upload with OCR text extraction</li>
            <li>Document classification and template generation</li>
            <li>Natural language Q&A about document content</li>
            <li>Professional UI with responsive design</li>
            <li>Real-time processing with progress indicators</li>
        </ul>

        <h2>🛠️ Tech Stack</h2>
        <ul>
            <li><strong>Backend:</strong> FastAPI, EasyOCR, SQLAlchemy</li>
            <li><strong>Frontend:</strong> React, Bootstrap</li>
        </ul>
    </div>
</body>
</html>
