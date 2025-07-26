import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Alert, 
  Modal, Badge, ListGroup, Table, Spinner, Dropdown,
  ProgressBar
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const navigate = useNavigate();
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    document_type: '',
    description: '',
    fields: []
  });
  
  const [currentField, setCurrentField] = useState({
    name: '',
    type: 'text',
    required: true,
    pattern: '',
    description: ''
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/templates');
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

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
    e.target.value = '';
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setError('');
    setUploadProgress(0);

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
          setUploadProgress(percentCompleted);
        }
      });

      const results = response.data.uploaded_documents || [];
      setUploadedFiles(results);
      
      const successCount = results.filter(doc => doc.status === 'uploaded' || doc.status === 'processing').length;
      
      if (successCount > 0) {
        setSuccess(`Successfully uploaded ${successCount} document${successCount > 1 ? 's' : ''}! Processing started automatically...`);
        
        setTimeout(() => {
          fetchTemplates();
        }, 3000);
      } else {
        setError('Upload failed. Please check file formats and try again.');
      }

    } catch (err) {
      console.error('Upload failed:', err);
      setError('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const processDocument = async (documentId) => {
    try {
      console.log(`Manually processing document ${documentId}`);
      const response = await axios.post(`/process/${documentId}`);
      console.log('Process response:', response.data);
      
      setUploadedFiles(prev => 
        prev.map(file => 
          file.document_id === documentId 
            ? { ...file, status: 'processing' }
            : file
        )
      );
      
      setSuccess('Document processing started! Templates will be generated shortly.');
      
      setTimeout(() => {
        fetchTemplates();
      }, 3000);
      
    } catch (error) {
      console.error('Processing failed:', error);
      setError('Failed to process document: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    
    if (!newTemplate.name || !newTemplate.document_type || newTemplate.fields.length === 0) {
      setError('Please fill in all required fields and add at least one field');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const templateData = {
        name: newTemplate.name,
        document_type: newTemplate.document_type,
        description: newTemplate.description,
        field_patterns: {},
        layout_patterns: { headers: [], sections: [] },
        extraction_rules: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        document_count: 0,
        custom_template: true
      };

      newTemplate.fields.forEach(field => {
        templateData.field_patterns[field.name.toLowerCase().replace(/\s+/g, '_')] = {
          name: field.name,
          type: field.type,
          required: field.required,
          pattern: field.pattern || generateDefaultPattern(field.type),
          description: field.description,
          examples: []
        };
      });

      templateData.extraction_rules = {
        preprocessing: ['enhance_contrast', 'deskew'],
        field_extraction: {},
        validation: {}
      };

      Object.entries(templateData.field_patterns).forEach(([fieldKey, fieldInfo]) => {
        templateData.extraction_rules.field_extraction[fieldKey] = {
          pattern: fieldInfo.pattern,
          type: fieldInfo.type,
          required: fieldInfo.required
        };

        if (fieldInfo.type === 'email') {
          templateData.extraction_rules.validation[fieldKey] = 'validate_email';
        } else if (fieldInfo.type === 'phone') {
          templateData.extraction_rules.validation[fieldKey] = 'validate_phone';
        } else if (fieldInfo.type === 'date') {
          templateData.extraction_rules.validation[fieldKey] = 'validate_date';
        }
      });

      await axios.post('/templates/custom', templateData);
      
      setSuccess('Custom template created successfully!');
      setShowCreateModal(false);
      resetTemplateForm();
      fetchTemplates();
      
    } catch (err) {
      console.error('Template creation failed:', err);
      setError('Failed to create template: ' + (err.response?.data?.detail || err.message));
    } finally {
      setCreating(false);
    }
  };

  const addField = () => {
    if (!currentField.name.trim()) {
      setError('Field name is required');
      return;
    }

    if (newTemplate.fields.some(field => field.name.toLowerCase() === currentField.name.toLowerCase())) {
      setError('Field name already exists');
      return;
    }
    
    setNewTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, { ...currentField, id: Date.now() }]
    }));
    
    setCurrentField({
      name: '',
      type: 'text',
      required: true,
      pattern: '',
      description: ''
    });
    
    setError('');
  };

  const removeField = (fieldId) => {
    setNewTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }));
  };

  const resetTemplateForm = () => {
    setNewTemplate({
      name: '',
      document_type: '',
      description: '',
      fields: []
    });
    setCurrentField({
      name: '',
      type: 'text',
      required: true,
      pattern: '',
      description: ''
    });
  };

  const generateDefaultPattern = (fieldType) => {
    const patterns = {
      text: '[A-Za-z0-9\\s]+',
      number: '\\d+(\\.\\d+)?',
      email: '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}',
      phone: '\\d{3}[-.]?\\d{3}[-.]?\\d{4}',
      date: '\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}',
      currency: '\\$?\\d{1,3}(,\\d{3})*(\\.\\d{2})?'
    };
    return patterns[fieldType] || '[A-Za-z0-9\\s]+';
  };

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const getTemplateIcon = (documentType) => {
    const icons = {
      'invoice': 'fa-file-invoice',
      'receipt': 'fa-receipt',
      'contract': 'fa-file-contract',
      'document': 'fa-file-alt'
    };
    return icons[documentType] || 'fa-file';
  };

  const getTemplateIconColor = (documentType) => {
    const colors = {
      'invoice': 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      'receipt': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      'contract': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'document': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    };
    return colors[documentType] || 'linear-gradient(135deg, #64748b 0%, #475569 100%)';
  };

  const getFieldTypeColor = (type) => {
    const colors = {
      'text': 'primary',
      'number': 'success',
      'email': 'info',
      'phone': 'warning',
      'date': 'secondary',
      'currency': 'success'
    };
    return colors[type] || 'secondary';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const documentTypes = ['invoice', 'receipt', 'contract', 'document', 'other'];
  const fieldTypes = ['text', 'number', 'date', 'email', 'phone', 'currency'];

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Container fluid className="py-5">
          <div className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
            <div className="text-center">
              <Spinner animation="border" variant="primary" style={{width: '3rem', height: '3rem'}} className="mb-3" />
              <h5 className="text-muted fw-light">Loading Templates...</h5>
              <p className="text-muted small">Fetching your document templates...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Container fluid className="py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h2 fw-bold text-dark mb-2">
              <i className="fas fa-layer-group text-primary me-3"></i>
              Document Templates
            </h1>
            <p className="text-muted mb-0 fw-light">
              Auto-generated templates from your processed documents. Upload documents to create new templates automatically.
            </p>
          </div>
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={fetchTemplates} className="rounded-pill px-3">
              <i className="fas fa-sync-alt me-2"></i>
              Refresh
            </Button>
            <Button variant="primary" onClick={() => setShowCreateModal(true)} className="rounded-pill px-3">
              <i className="fas fa-plus me-2"></i>
              Create Custom Template
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert variant="danger" className="mb-4 border-0 shadow-sm" dismissible onClose={() => setError('')}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" className="mb-4 border-0 shadow-sm" dismissible onClose={() => setSuccess('')}>
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}

        {/* Upload Section */}
        <Row className="g-4 mb-4">
          <Col>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-2" style={{ borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">
                      <i className="fas fa-cloud-upload-alt text-primary me-2"></i>
                      Upload Documents
                    </h5>
                    <p className="text-muted small mb-0">Drop your files to automatically generate templates</p>
                  </div>
                  <Badge style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none'
                  }} className="rounded-pill px-3 py-2 text-white">
                    Auto-Process
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <div
                  className={`border-2 border-dashed rounded-4 p-4 text-center position-relative ${
                    dragActive ? 'drag-active' : ''
                  } ${uploading ? 'opacity-50' : ''}`}
                  style={{ 
                    minHeight: '160px', 
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.05)' : '#fafbfc',
                    borderColor: dragActive ? '#2563eb' : '#e2e8f0'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.tiff"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                  
                  {uploading ? (
                    <div>
                      <div className="spinner-border text-primary mb-3" style={{width: '2.5rem', height: '2.5rem'}}></div>
                      <h6 className="text-primary fw-bold mb-2">Processing Upload...</h6>
                      <p className="text-muted small mb-3">Templates will be generated automatically</p>
                      <ProgressBar 
                        now={uploadProgress} 
                        label={`${uploadProgress}%`}
                        className="mx-auto"
                        style={{maxWidth: '280px', height: '8px', borderRadius: '10px'}}
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="mb-3">
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                          border: '2px solid rgba(37, 99, 235, 0.2)',
                          borderRadius: '16px',
                          width: '60px',
                          height: '60px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto'
                        }}>
                          <i className={`fas fa-cloud-upload-alt fa-2x text-primary ${dragActive ? 'fa-bounce' : ''}`}></i>
                        </div>
                      </div>
                      <h6 className="fw-bold text-dark mb-2">
                        {dragActive ? 'Drop files here!' : 'Drag & Drop or Click to Upload'}
                      </h6>
                      <p className="text-muted mb-0 small">
                        Supports PDF, JPG, PNG, TIFF files • Auto-processing enabled
                      </p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recently Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Header className="bg-white border-0 pt-3 pb-2" style={{ borderRadius: '20px 20px 0 0' }}>
                  <h6 className="fw-bold text-dark mb-0">
                    <i className="fas fa-clock text-primary me-2"></i>
                    Recently Uploaded ({uploadedFiles.length})
                  </h6>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <tbody>
                        {uploadedFiles.slice(0, 5).map((file, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3" style={{width: '50px'}}>
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                width: '40px',
                                height: '40px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <i className={`fas ${getFileIcon(file.filename).split(' ')[0]} text-primary`}></i>
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <div>
                                <h6 className="mb-1 fw-semibold small">{file.filename}</h6>
                                <small className="text-muted">
                                  {file.file_size && formatFileSize(file.file_size)}
                                  {file.document_id && ` • ID: ${file.document_id}`}
                                </small>
                              </div>
                            </td>
                            <td className="px-2 py-3" style={{width: '100px'}}>
                              <Badge bg={file.status === 'uploaded' || file.status === 'processing' ? 'success' : 'danger'} className="small rounded-pill">
                                {file.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-3" style={{width: '150px'}}>
                              <div className="d-flex gap-1">
                                {file.status === 'uploaded' && file.document_id && (
                                  <Button 
                                    variant="primary" 
                                    size="sm"
                                    onClick={() => processDocument(file.document_id)}
                                    className="rounded-pill"
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
                                    className="rounded-pill"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Templates Grid */}
        {templates.length === 0 ? (
          <Row>
            <Col>
              <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
                <Card.Body className="text-center py-5">
                  <div className="mb-4">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(203, 213, 225, 0.1) 100%)',
                      width: '80px',
                      height: '80px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
                    }}>
                      <i className="fas fa-layer-group fa-3x text-muted"></i>
                    </div>
                  </div>
                  <h4 className="text-muted mb-3">No Templates Available</h4>
                  <p className="text-muted mb-4">
                    Upload documents above to automatically generate templates, or create custom templates manually.
                  </p>
                  <div className="d-flex gap-3 justify-content-center">
                    <Button variant="primary" onClick={() => document.getElementById('file-upload').click()}>
                      <i className="fas fa-upload me-2"></i>
                      Upload Documents
                    </Button>
                    <Button variant="outline-primary" onClick={() => setShowCreateModal(true)}>
                      <i className="fas fa-plus me-2"></i>
                      Create Manual Template
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        ) : (
          <Row className="g-4">
            {templates.map((template, index) => (
              <Col xl={4} lg={6} key={index}>
                <Card className="border-0 shadow-sm h-100 template-card hover-card" style={{ borderRadius: '20px', minHeight: '320px' }}>
                  <Card.Header className="bg-white border-0 pt-4 pb-2" style={{ borderRadius: '20px 20px 0 0' }}>
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center flex-fill">
                        <div style={{
                          background: getTemplateIconColor(template.document_type),
                          width: '50px',
                          height: '50px',
                          minWidth: '50px',
                          borderRadius: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: '16px'
                        }}>
                          <i className={`fas ${getTemplateIcon(template.document_type)} text-white fa-lg`}></i>
                        </div>
                        <div className="flex-fill" style={{minWidth: 0}}>
                          <h6 className="fw-bold mb-1 text-truncate">{template.name}</h6>
                          <div className="d-flex gap-1 flex-wrap">
                            <Badge bg="light" text="dark" className="text-capitalize small rounded-pill">
                              {template.document_type.replace('_', ' ')}
                            </Badge>
                            {template.custom_template && (
                              <Badge bg="success" className="small rounded-pill">Custom</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" size="sm" className="border-0">
                          <i className="fas fa-ellipsis-v"></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => handleViewTemplate(template)}>
                            <i className="fas fa-eye me-2"></i>View Details
                          </Dropdown.Item>
                          <Dropdown.Item>
                            <i className="fas fa-download me-2"></i>Export Template
                          </Dropdown.Item>
                          <Dropdown.Divider />
                          <Dropdown.Item className="text-danger">
                            <i className="fas fa-trash me-2"></i>Delete
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </Card.Header>
                  
                  <Card.Body className="pt-2 pb-3 flex-grow-1">
                    <Row className="g-2 mb-3">
                      <Col xs={6}>
                        <div className="text-center p-3 bg-light rounded-3">
                          <div className="fw-bold text-primary mb-0 h5">{Object.keys(template.field_patterns || {}).length}</div>
                          <small className="text-muted fw-medium">Fields</small>
                        </div>
                      </Col>
                      <Col xs={6}>
                        <div className="text-center p-3 bg-light rounded-3">
                          <div className="fw-bold text-success mb-0 h5">{template.document_count || 0}</div>
                          <small className="text-muted fw-medium">Documents</small>
                        </div>
                      </Col>
                    </Row>

                    {template.field_patterns && Object.keys(template.field_patterns).length > 0 && (
                      <div className="mb-3">
                        <div style={{height: '70px', overflow: 'hidden'}}>
                          <div className="d-flex flex-wrap gap-1">
                            {Object.entries(template.field_patterns).slice(0, 6).map(([fieldName, fieldInfo]) => (
                              <Badge 
                                key={fieldName} 
                                bg={getFieldTypeColor(fieldInfo.type)} 
                                className="px-2 py-1 small rounded-pill"
                              >
                                {fieldInfo.name}
                              </Badge>
                            ))}
                            {Object.keys(template.field_patterns).length > 6 && (
                              <Badge bg="secondary" className="px-2 py-1 small rounded-pill">
                                +{Object.keys(template.field_patterns).length - 6}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-muted small">
                      <div className="d-flex justify-content-between">
                        <span>Updated:</span>
                        <span>{formatDate(template.updated_at)}</span>
                      </div>
                    </div>
                  </Card.Body>

                  <Card.Footer className="bg-white border-0 pt-0 pb-4" style={{ borderRadius: '0 0 20px 20px' }}>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="primary" 
                        size="sm" 
                        className="flex-fill rounded-pill"
                        onClick={() => handleViewTemplate(template)}
                      >
                        <i className="fas fa-eye me-1"></i>
                        View Details
                      </Button>
                      <Button variant="outline-primary" size="sm" className="rounded-pill">
                        <i className="fas fa-cog"></i>
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Template Detail Modal */}
        <Modal 
          show={showDetailModal} 
          onHide={() => setShowDetailModal(false)}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <div className="d-flex align-items-center">
                <div style={{
                  background: getTemplateIconColor(selectedTemplate?.document_type),
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px'
                }}>
                  <i className={`fas ${getTemplateIcon(selectedTemplate?.document_type)} text-white`}></i>
                </div>
                {selectedTemplate?.name}
              </div>
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {selectedTemplate && (
              <div>
                <Row className="mb-4">
                  <Col md={6}>
                    <div className="p-3 bg-light rounded">
                      <h6 className="fw-semibold mb-2">Template Information</h6>
                      <div className="small">
                        <div className="d-flex justify-content-between mb-1">
                          <span>Document Type:</span>
                          <Badge bg="primary" className="text-capitalize">
                            {selectedTemplate.document_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>Documents Processed:</span>
                          <span className="fw-medium">{selectedTemplate.document_count}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-1">
                          <span>Fields Detected:</span>
                          <span className="fw-medium">{Object.keys(selectedTemplate.field_patterns || {}).length}</span>
                        </div>
                        <div className="d-flex justify-content-between">
                          <span>Last Updated:</span>
                          <span className="fw-medium">{formatDate(selectedTemplate.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md={6}>
                    <div className="p-3 bg-light rounded">
                      <h6 className="fw-semibold mb-2">Template Usage</h6>
                      <p className="small text-muted mb-0">
                        This template is automatically applied to new {selectedTemplate.document_type.replace('_', ' ')} 
                        documents to improve extraction accuracy. The template learns from each processed document 
                        and continuously improves.
                      </p>
                    </div>
                  </Col>
                </Row>

                {selectedTemplate.field_patterns && Object.keys(selectedTemplate.field_patterns).length > 0 && (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">
                      <i className="fas fa-list-ul text-primary me-2"></i>
                      Detected Field Patterns
                    </h6>
                    <div className="table-responsive">
                      <Table hover className="mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Field Name</th>
                            <th>Type</th>
                            <th>Required</th>
                            <th>Examples</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedTemplate.field_patterns).map(([fieldName, fieldInfo]) => (
                            <tr key={fieldName}>
                              <td className="fw-medium">{fieldInfo.name}</td>
                              <td>
                                <Badge bg={getFieldTypeColor(fieldInfo.type)}>
                                  {fieldInfo.type}
                                </Badge>
                              </td>
                              <td>
                                {fieldInfo.required ? (
                                  <Badge bg="warning">Required</Badge>
                                ) : (
                                  <Badge bg="secondary">Optional</Badge>
                                )}
                              </td>
                              <td>
                                {fieldInfo.examples && fieldInfo.examples.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1">
                                    {fieldInfo.examples.slice(0, 2).map((example, idx) => (
                                      <code key={idx} className="small bg-light px-2 py-1 rounded">
                                        {example}
                                      </code>
                                    ))}
                                    {fieldInfo.examples.length > 2 && (
                                      <small className="text-muted">+{fieldInfo.examples.length - 2} more</small>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted small">No examples</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </Button>
            <Button variant="primary">
              <i className="fas fa-download me-2"></i>
              Export Template
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Create Custom Template Modal */}
        <Modal 
          show={showCreateModal} 
          onHide={() => {
            setShowCreateModal(false);
            resetTemplateForm();
            setError('');
          }}
          size="lg"
        >
          <Modal.Header closeButton>
            <Modal.Title>
              <div className="d-flex align-items-center">
                <div style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '12px'
                }}>
                  <i className="fas fa-plus-circle text-white"></i>
                </div>
                Create Custom Template
              </div>
            </Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleCreateTemplate}>
            <Modal.Body>
              {error && (
                <Alert variant="danger" className="mb-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </Alert>
              )}

              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Template Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                      placeholder="e.g., Company ABC Invoice Template"
                      required
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">
                      Document Type <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Select
                      value={newTemplate.document_type}
                      onChange={(e) => setNewTemplate({...newTemplate, document_type: e.target.value})}
                      required
                    >
                      <option value="">Select document type</option>
                      {documentTypes.map(type => (
                        <option key={type} value={type} className="text-capitalize">
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-4">
                <Form.Label className="fw-semibold">Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                  placeholder="Describe what this template is for and when to use it..."
                />
              </Form.Group>

              <hr />

              <h6 className="fw-bold mb-3">
                <i className="fas fa-cog text-primary me-2"></i>
                Field Configuration
              </h6>
              
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Field Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentField.name}
                      onChange={(e) => setCurrentField({...currentField, name: e.target.value})}
                      placeholder="e.g., Invoice Number"
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Field Type</Form.Label>
                    <Form.Select
                      value={currentField.type}
                      onChange={(e) => setCurrentField({...currentField, type: e.target.value})}
                    >
                      {fieldTypes.map(type => (
                        <option key={type} value={type} className="text-capitalize">
                          {type}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Required</Form.Label>
                    <Form.Check
                      type="switch"
                      checked={currentField.required}
                      onChange={(e) => setCurrentField({...currentField, required: e.target.checked})}
                      className="mt-2"
                    />
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">&nbsp;</Form.Label>
                    <Button 
                      variant="primary" 
                      className="w-100 rounded-pill" 
                      onClick={addField}
                      disabled={!currentField.name.trim()}
                    >
                      <i className="fas fa-plus me-1"></i>
                      Add
                    </Button>
                  </Form.Group>
                </Col>
              </Row>

              <Row className="mb-4">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Regex Pattern (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentField.pattern}
                      onChange={(e) => setCurrentField({...currentField, pattern: e.target.value})}
                      placeholder="Auto-generated based on field type"
                    />
                    <Form.Text className="text-muted">
                      Leave empty for auto-generated pattern
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Field Description</Form.Label>
                    <Form.Control
                      type="text"
                      value={currentField.description}
                      onChange={(e) => setCurrentField({...currentField, description: e.target.value})}
                      placeholder="Optional description for this field"
                    />
                  </Form.Group>
                </Col>
              </Row>

              {newTemplate.fields.length > 0 && (
                <div className="mb-4">
                  <h6 className="fw-semibold mb-3">
                    <i className="fas fa-list text-primary me-2"></i>
                    Configured Fields ({newTemplate.fields.length})
                  </h6>
                  <ListGroup>
                    {newTemplate.fields.map((field) => (
                      <ListGroup.Item key={field.id} className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="d-flex align-items-center mb-1">
                            <strong className="me-2">{field.name}</strong>
                            <Badge bg={getFieldTypeColor(field.type)} className="me-1">
                              {field.type}
                            </Badge>
                            {field.required && <Badge bg="warning">Required</Badge>}
                          </div>
                          {field.description && (
                            <small className="text-muted d-block">{field.description}</small>
                          )}
                          {field.pattern && (
                            <small className="text-muted d-block">
                              <code>{field.pattern}</code>
                            </small>
                          )}
                        </div>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => removeField(field.id)}
                          className="rounded-pill"
                        >
                          <i className="fas fa-trash"></i>
                        </Button>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setShowCreateModal(false);
                  resetTemplateForm();
                  setError('');
                }}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={!newTemplate.name || !newTemplate.document_type || newTemplate.fields.length === 0 || creating}
                className="rounded-pill"
              >
                {creating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    Create Template
                  </>
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <style jsx>{`
          .template-card {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .template-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
          }
          .drag-active {
            border-color: #2563eb !important;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%) !important;
            transform: scale(1.02);
          }
        `}</style>
      </Container>
    </div>
  );
};

export default Templates;
