import React, { useState, useCallback } from 'react';
import { 
  Container, Row, Col, Card, Button, Alert, 
  ProgressBar, Badge, ListGroup 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Upload = () => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files) => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(prev => ({ ...prev, overall: percentCompleted }));
        }
      });

      const results = response.data.uploaded_documents || [];
      setUploadedFiles(results);
      
      const successCount = results.filter(doc => doc.status === 'uploaded').length;
      const errorCount = results.filter(doc => doc.status === 'error').length;

      if (successCount > 0) {
        setSuccess(`✅ Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}! ${errorCount > 0 ? `${errorCount} failed.` : 'Templates will be auto-generated after processing.'}`);
      }

      if (errorCount === results.length) {
        setError('All uploads failed. Please check file formats and try again.');
      }

    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  const processDocument = async (documentId) => {
    try {
      setError('');
      await axios.post(`/process/${documentId}`);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.document_id === documentId 
            ? { ...file, status: 'processing' }
            : file
        )
      );
      
      setSuccess('Document processing started! Check the documents page for results.');
    } catch (err) {
      setError('Failed to process document: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getFileIcon = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf': return 'fa-file-pdf text-danger';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'tiff': return 'fa-file-image text-primary';
      default: return 'fa-file text-muted';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Container fluid className="py-4">
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h1 className="h2 fw-bold text-dark mb-2">
              <i className="fas fa-cloud-upload-alt text-primary me-3"></i>
              Upload Documents
            </h1>
            <p className="text-muted mb-0">
              Upload your documents for AI-powered processing and template generation.
            </p>
          </div>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/documents')}
          >
            <i className="fas fa-folder-open me-2"></i>
            View Documents
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      <Row className="g-4">
        <Col lg={8}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4 pb-3">
              <h5 className="fw-bold text-dark mb-0">
                <i className="fas fa-upload text-primary me-2"></i>
                Drag & Drop Upload
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div
                className={`border-2 border-dashed rounded-3 p-5 text-center ${
                  dragActive ? 'border-primary bg-primary bg-opacity-10' : 'border-muted'
                } ${uploading ? 'opacity-50' : ''}`}
                style={{ 
                  minHeight: '300px', 
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.tiff"
                  onChange={handleFileSelect}
                  className="position-absolute w-100 h-100 opacity-0"
                  style={{ cursor: 'pointer' }}
                  disabled={uploading}
                />
                
                {uploading ? (
                  <div>
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
                    <h5 className="text-primary fw-bold mb-2">Uploading Documents...</h5>
                    <p className="text-muted mb-3">Please wait while we process your files</p>
                    {uploadProgress.overall && (
                      <div className="mx-auto" style={{maxWidth: '300px'}}>
                        <ProgressBar 
                          now={uploadProgress.overall} 
                          label={`${uploadProgress.overall}%`}
                          className="mb-2"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="mb-4">
                      <div className="bg-primary bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center" style={{width: '100px', height: '100px'}}>
                        <i className={`fas fa-cloud-upload-alt fa-4x text-primary ${dragActive ? 'fa-bounce' : ''}`}></i>
                      </div>
                    </div>
                    <h4 className="fw-bold text-dark mb-3">
                      {dragActive ? 'Drop files here!' : 'Drop files here or click to browse'}
                    </h4>
                    <p className="text-muted mb-4">
                      Supports PDF, JPG, PNG, and TIFF files up to 10MB each
                    </p>
                    <Button variant="primary" size="lg" className="px-5">
                      <i className="fas fa-folder-open me-2"></i>
                      Browse Files
                    </Button>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 pt-4 pb-3">
              <h5 className="fw-bold text-dark mb-0">
                <i className="fas fa-info-circle text-primary me-2"></i>
                How It Works
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <div className="d-flex align-items-start mb-3">
                <div className="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                  <i className="fas fa-upload text-primary"></i>
                </div>
                <div>
                  <h6 className="fw-semibold mb-1">1. Upload Documents</h6>
                  <p className="text-muted small mb-0">Drag & drop or browse to select your files</p>
                </div>
              </div>

              <div className="d-flex align-items-start mb-3">
                <div className="bg-success bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                  <i className="fas fa-cog text-success"></i>
                </div>
                <div>
                  <h6 className="fw-semibold mb-1">2. AI Processing</h6>
                  <p className="text-muted small mb-0">OCR extracts text, AI classifies document types</p>
                </div>
              </div>

              <div className="d-flex align-items-start mb-3">
                <div className="bg-info bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                  <i className="fas fa-layer-group text-info"></i>
                </div>
                <div>
                  <h6 className="fw-semibold mb-1">3. Template Generation</h6>
                  <p className="text-muted small mb-0">Auto-create templates for future similar documents</p>
                </div>
              </div>

              <div className="d-flex align-items-start">
                <div className="bg-warning bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: '40px', height: '40px', minWidth: '40px'}}>
                  <i className="fas fa-search text-warning"></i>
                </div>
                <div>
                  <h6 className="fw-semibold mb-1">4. Ready to Query</h6>
                  <p className="text-muted small mb-0">Ask questions and extract insights from your documents</p>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {uploadedFiles.length > 0 && (
        <Row className="mt-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-white border-0 pt-4 pb-3">
                <h5 className="fw-bold text-dark mb-0">
                  <i className="fas fa-list text-primary me-2"></i>
                  Uploaded Files ({uploadedFiles.length})
                </h5>
              </Card.Header>
              <Card.Body className="p-0">
                <ListGroup variant="flush">
                  {uploadedFiles.map((file, index) => (
                    <ListGroup.Item key={index} className="d-flex align-items-center justify-content-between p-4">
                      <div className="d-flex align-items-center">
                        <i className={`fas ${getFileIcon(file.filename)} fa-2x me-3`}></i>
                        <div>
                          <h6 className="mb-1 fw-semibold">{file.filename}</h6>
                          <div className="d-flex align-items-center gap-2">
                            <Badge bg={file.status === 'uploaded' ? 'success' : 'danger'}>
                              {file.status}
                            </Badge>
                            {file.file_size && (
                              <small className="text-muted">
                                {formatFileSize(file.file_size)}
                              </small>
                            )}
                            {file.document_id && (
                              <small className="text-muted">
                                ID: {file.document_id}
                              </small>
                            )}
                          </div>
                          {file.error && (
                            <small className="text-danger">
                              <i className="fas fa-exclamation-triangle me-1"></i>
                              {file.error}
                            </small>
                          )}
                        </div>
                      </div>
                      <div className="d-flex gap-2">
                        {file.status === 'uploaded' && file.document_id && (
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={() => processDocument(file.document_id)}
                          >
                            <i className="fas fa-play me-1"></i>
                            Process
                          </Button>
                        )}
                        {file.document_id && (
                          <Button 
                            variant="outline-primary" 
                            size="sm"
                            onClick={() => navigate(`/documents/${file.document_id}`)}
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </Button>
                        )}
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default Upload;
