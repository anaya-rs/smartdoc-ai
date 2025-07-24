<h1>🧠 SmartDoc AI</h1>

<p><span class="badge">React</span> <span class="badge">FastAPI</span> <span class="badge">EasyOCR</span> <span class="badge">SQLite</span></p>

<p>AI-powered document processing system with OCR capabilities and natural language Q&A features.</p>

<h2>✨ Features</h2>
<ul>
    <li>Document upload (PDF, PNG, JPG, TIFF)</li>
    <li>OCR text extraction using EasyOCR</li>
    <li>Document classification</li>
    <li>Natural language Q&A</li>
    <li>Data redaction</li>
    <li>Key-value extraction</li>
</ul>

<h2>🚀 Quick Start</h2>

<h3>Backend Setup</h3>

<p><strong>1. Navigate to backend directory:</strong></p>
<pre>cd backend</pre>

<p><strong>2. Create and activate virtual environment:</strong></p>
<pre>python -m venv .venv
.venv\Scripts\activate</pre>

<p><strong>3. Install dependencies:</strong></p>
<pre>pip install fastapi uvicorn sqlalchemy bcrypt python-jose[cryptography] python-multipart pillow PyMuPDF easyocr</pre>

<p><strong>4. Run server:</strong></p>
<pre>python run_backend.py</pre>

<div class="success">
<strong>✅ Backend running at:</strong> <code>http://localhost:8000</code>
</div>

<h3>Frontend Setup</h3>

<p><strong>1. Navigate to frontend directory:</strong></p>
<pre>cd frontend</pre>

<p><strong>2. Install dependencies:</strong></p>
<pre>npm install</pre>

<p><strong>3. Start application:</strong></p>
<pre>npm start</pre>

<div class="success">
<strong>✅ Frontend running at:</strong> <code>http://localhost:3000</code>
</div>

<h2>🔐 Default Login</h2>
<ul>
    <li><strong>Username:</strong> admin</li>
    <li><strong>Password:</strong> admin123</li>
</ul>

<p><em>Alternative account:</em></p>
<ul>
    <li><strong>Username:</strong> demo</li>
    <li><strong>Password:</strong> demo123</li>
</ul>

<h2>📚 API Documentation</h2>
<p>Once backend is running, visit:</p>
<ul>
    <li><strong>Swagger UI:</strong> <a href="http://localhost:8000/docs">http://localhost:8000/docs</a></li>
    <li><strong>ReDoc:</strong> <a href="http://localhost:8000/redoc">http://localhost:8000/redoc</a></li>
</ul>

<h2>🛠️ Tech Stack</h2>

<h3>Backend</h3>
<ul>
    <li>FastAPI (Python web framework)</li>
    <li>SQLAlchemy (Database ORM)</li>
    <li>EasyOCR (Text extraction)</li>
    <li>JWT Authentication</li>
    <li>PyMuPDF (PDF processing)</li>
</ul>

<h3>Frontend</h3>
<ul>
    <li>React.js</li>
    <li>Bootstrap</li>
    <li>Axios (HTTP client)</li>
    <li>React Router</li>
</ul>

<h2>📋 Usage</h2>
<ol>
    <li>Start backend server</li>
    <li>Start frontend application</li>
    <li>Login with default credentials</li>
    <li>Upload documents via dashboard</li>
    <li>Documents are automatically processed</li>
    <li>Ask questions about document content</li>
</ol>

<h2>⚠️ Troubleshooting</h2>

<div class="warning">
<strong>Common Issues:</strong>
<ul>
    <li><strong>Port conflicts:</strong> Change ports in run_backend.py or package.json</li>
    <li><strong>EasyOCR installation:</strong> Make sure you have sufficient disk space</li>
    <li><strong>Virtual environment:</strong> Always activate before installing packages</li>
</ul>
</div>

<h2>🔧 Development</h2>
<p>The application supports hot reloading in development mode. Changes to frontend files will automatically refresh, and backend changes will restart the server.</p>


<hr>

<p><em>For issues or questions, check the GitHub repository or create an issue.</em></p>

</body>
</html>
