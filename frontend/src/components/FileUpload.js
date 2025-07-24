import React, { useState, useCallback } from 'react';
import { Card, Button, Alert, ListGroup, Badge } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const autoProcessDocuments = async (uploadedDocuments) => {
    for (const doc of uploadedDocuments) {
      if (doc.status === 'uploaded') {
        setProcessing(prev => ({ ...prev, [doc.document_id]: true }));
        
        try {
          const response = await axios.post(`/process/${doc.document_id}`);
          
          setUploadedFiles(prev => 
            prev.map(file => 
              file.document_id === doc.document_id 
                ? { 
                    ...file, 
                    status: 'completed', 
                    processed: true,
                    word_count: response.data.word_count || 0,
                    document_type: response.data.document_type || 'document'
                  }
                : file
            )
          );
          
          setSuccess(prev => 
            prev ? `${prev} • ${doc.filename} processed!` : `${doc.filename} processed successfully!`
          );
          
        } catch (error) {
          setUploadedFiles(prev => 
            prev.map(file => 
              file.document_id === doc.document_id 
                ? { ...file, status: 'failed', processed: false }
                : file
            )
          );
          
          setError(prev => 
            prev ? `${prev} • Failed to process ${doc.filename}` : `Failed to process ${doc.filename}`
          );
        } finally {
          setProcessing(prev => {
            const newState = { ...prev };
            delete newState[doc.document_id];
            return newState;
          });
        }
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    setError('');
    setSuccess('');
    setUploading(true);

    try {
      const formData = new FormData();
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadedDocuments = response.data.uploaded_documents;
      setUploadedFiles(uploadedDocuments);
      setSuccess(`Successfully uploaded ${acceptedFiles.length} file(s)`);
      
      setTimeout(() => {
        autoProcessDocuments(uploadedDocuments);
      }, 500);
      
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.jpeg', '.jpg', '.png', '.tiff', '.bmp']
    },
    multiple: true,
    maxFiles: 10,
    maxSize: 16 * 1024 * 1024
  });

  const processDocument = async (documentId, filename) => {
    try {
      setError('');
      setProcessing(prev => ({ ...prev, [documentId]: true }));
      
      const response = await axios.post(`/process/${documentId}`);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.document_id === documentId 
            ? { 
                ...file, 
                status: 'completed', 
                processed: true,
                word_count: response.data.word_count || 0,
                document_type: response.data.document_type || 'document'
              }
            : file
        )
      );
      
      setSuccess(`${filename} processed successfully!`);
      if (onUploadSuccess) onUploadSuccess();
      
    } catch (err) {
      console.error('Processing error:', err);
      setError('Processing failed: ' + (err.response?.data?.detail || err.message));
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.document_id === documentId 
            ? { ...file, status: 'failed', processed: false }
            : file
        )
      );
    } finally {
      setProcessing(prev => {
        const newState = { ...prev };
        delete newState[documentId];
        return newState;
      });
    }
  };

  const getStatusBadge = (status, processed, isProcessing = false) => {
    if (isProcessing) return <Badge bg="warning" className="d-flex align-items-center gap-1">
      <i className="fas fa-spinner fa-spin"></i> Processing
    </Badge>;
    
    const statusConfig = {
      'uploaded': { bg: 'secondary', icon: 'fa-upload', text: 'Uploaded' },
      'completed': { bg: 'success', icon: 'fa-check-circle', text: 'Completed' },
      'failed': { bg: 'danger', icon: 'fa-exclamation-triangle', text: 'Failed' }
    };
    
    const config = statusConfig[status] || statusConfig['uploaded'];
    
    return <Badge bg={config.bg} className="d-flex align-items-center gap-1">
      <i className={`fas ${config.icon}`}></i> {config.text}
    </Badge>;
  };

  return (
    <div className="upload-section">
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      {/* Modern Drop Zone */}
      <Card className="mb-4 border-0">
        <Card.Body className="p-0">
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''}`}
          >
            <input {...getInputProps()} />
            <div className="text-center">
              <i className={`fas fa-cloud-upload-alt fa-3x mb-3 ${
                isDragActive ? 'text-primary' : ''
              }`}></i>
              <h5 className="mb-2 fw-semibold">
                {isDragActive
                  ? 'Drop files here...'
                  : 'Drag & drop your documents'
                }
              </h5>
              <p className="text-muted mb-3">
                Or click to browse files
              </p>
              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <Badge bg="light" text="dark" className="px-3 py-2">PDF</Badge>
                <Badge bg="light" text="dark" className="px-3 py-2">JPG</Badge>
                <Badge bg="light" text="dark" className="px-3 py-2">PNG</Badge>
                <Badge bg="light" text="dark" className="px-3 py-2">TIFF</Badge>
              </div>
              <small className="text-muted d-block mt-2">
                Maximum file size: 16MB
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="mb-2 fw-semibold">Processing upload...</h6>
                <div className="progress">
                  <div className="progress-bar progress-bar-animated" style={{width: '100%'}}></div>
                </div>
              </div>
              <i className="fas fa-spinner fa-spin fa-lg ms-3 text-primary"></i>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Files List */}
      {uploadedFiles.length > 0 && (
        <Card className="border-0">
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-semibold">
              <i className="fas fa-file-check me-2 text-primary"></i>
              Uploaded Files ({uploadedFiles.length})
            </h6>
            <Badge bg="primary" pill>{uploadedFiles.length}</Badge>
          </Card.Header>
          <Card.Body className="p-0">
            <ListGroup variant="flush">
              {uploadedFiles.map((file, index) => (
                <ListGroup.Item key={index} className="border-0 py-3 px-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center flex-grow-1">
                      <div className="me-3">
                        <i className={`fas ${
                          processing[file.document_id] ? 'fa-spinner fa-spin' : 'fa-file-alt'
                        } fa-lg text-primary`}></i>
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-semibold">{file.filename}</h6>
                        <div className="small text-muted">
                          <span>ID: {file.document_id}</span>
                          {file.document_type && <span> • Type: {file.document_type}</span>}
                          {file.word_count !== undefined && <span> • Words: {file.word_count}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {getStatusBadge(file.status, file.processed, processing[file.document_id])}
                      {file.status === 'uploaded' && !processing[file.document_id] && (
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => processDocument(file.document_id, file.filename)}
                        >
                          <i className="fas fa-play me-1"></i>
                          Process
                        </Button>
                      )}
                      {file.status === 'failed' && (
                        <Button
                          variant="outline-warning"
                          size="sm"
                          onClick={() => processDocument(file.document_id, file.filename)}
                          disabled={processing[file.document_id]}
                        >
                          <i className="fas fa-redo me-1"></i>
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default FileUpload;
