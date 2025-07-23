import React, { useState, useCallback } from 'react';
import { Card, Button, ProgressBar, Alert, ListGroup, Badge } from 'react-bootstrap';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const FileUpload = ({ onUploadSuccess }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState({}); // Track processing status per file
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-process function
  const autoProcessDocuments = async (uploadedDocuments) => {
    console.log('🔄 Starting auto-processing for uploaded documents...');
    
    for (const doc of uploadedDocuments) {
      if (doc.status === 'uploaded') {
        console.log(`🔄 Auto-processing document ${doc.document_id} (${doc.filename})`);
        
        // Set processing status
        setProcessing(prev => ({ ...prev, [doc.document_id]: true }));
        
        try {
          const response = await axios.post(`/process/${doc.document_id}`);
          
          console.log(`✅ Document ${doc.document_id} processed successfully:`, response.data);
          
          // Update file status in the list
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
          console.error(`❌ Error processing document ${doc.document_id}:`, error);
          
          // Update file status to show processing failed
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
          // Remove processing status
          setProcessing(prev => {
            const newState = { ...prev };
            delete newState[doc.document_id];
            return newState;
          });
        }
      }
    }
    
    console.log('✅ Auto-processing completed');
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
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      const uploadedDocuments = response.data.uploaded_documents;
      setUploadedFiles(uploadedDocuments);
      setSuccess(`Successfully uploaded ${acceptedFiles.length} file(s)`);
      
      // AUTO-PROCESS: Automatically process uploaded documents
      setTimeout(() => {
        autoProcessDocuments(uploadedDocuments);
      }, 500); // Small delay to ensure UI updates
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
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
    maxSize: 16 * 1024 * 1024 // 16MB
  });

  // Manual process function (for the Process button)
  const processDocument = async (documentId, filename) => {
    try {
      setError('');
      setProcessing(prev => ({ ...prev, [documentId]: true }));
      
      const response = await axios.post(`/process/${documentId}`);
      
      // Update the file status in the list
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
      
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('Processing failed: ' + (err.response?.data?.detail || err.message));
      
      // Update status to failed
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
    if (isProcessing) return <Badge bg="warning">Processing...</Badge>;
    if (processed && status === 'completed') return <Badge bg="success">Processed</Badge>;
    
    const variants = {
      'uploaded': 'primary',
      'processing': 'warning',
      'completed': 'success',
      'failed': 'danger'
    };
    
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div>
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      {/* Drop Zone */}
      <Card className="mb-3">
        <Card.Body>
          <div
            {...getRootProps()}
            className={`text-center p-4 border-2 border-dashed rounded ${
              isDragActive ? 'border-success bg-light' : 'border-secondary'
            }`}
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minHeight: '150px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <input {...getInputProps()} />
            <div>
              <i className={`fas fa-cloud-upload-alt fa-3x mb-3 ${
                isDragActive ? 'text-success' : 'text-muted'
              }`}></i>
              <h5 className={isDragActive ? 'text-success' : 'text-muted'}>
                {isDragActive
                  ? 'Drop the files here...'
                  : 'Drag & drop files here, or click to select files'
                }
              </h5>
              <p className="text-muted mb-0">
                Supports PDF, JPEG, PNG, TIFF files (Max 16MB each)
              </p>
              <small className="text-info">
                <i className="fas fa-magic me-1"></i>
                Files will be automatically processed after upload
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Upload Progress */}
      {uploading && (
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex align-items-center">
              <div className="flex-grow-1">
                <h6 className="mb-1">Uploading files...</h6>
                <ProgressBar animated now={100} />
              </div>
              <i className="fas fa-spinner fa-spin fa-lg ms-3"></i>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">
              <i className="fas fa-file-check me-2"></i>
              Uploaded Files ({uploadedFiles.length})
            </h6>
            <small className="text-muted">
              Auto-processing enabled
            </small>
          </Card.Header>
          <Card.Body className="p-0">
            <ListGroup variant="flush">
              {uploadedFiles.map((file, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center">
                      <i className={`fas ${
                        processing[file.document_id] ? 'fa-spinner fa-spin' : 'fa-file'
                      } me-2 text-primary`}></i>
                      <div>
                        <h6 className="mb-1">{file.filename}</h6>
                        <small className="text-muted">
                          ID: {file.document_id} • 
                          {file.document_type && ` Type: ${file.document_type} •`}
                          {file.word_count !== undefined && ` Words: ${file.word_count} •`}
                          Status: {file.status}
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    {getStatusBadge(file.status, file.processed, processing[file.document_id])}
                    {file.status === 'uploaded' && !file.processed && !processing[file.document_id] && (
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => processDocument(file.document_id, file.filename)}
                      >
                        <i className="fas fa-cog me-1"></i>
                        Process
                      </Button>
                    )}
                    {file.status === 'failed' && (
                      <Button
                        variant="warning"
                        size="sm"
                        onClick={() => processDocument(file.document_id, file.filename)}
                        disabled={processing[file.document_id]}
                      >
                        <i className="fas fa-redo me-1"></i>
                        Retry
                      </Button>
                    )}
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
