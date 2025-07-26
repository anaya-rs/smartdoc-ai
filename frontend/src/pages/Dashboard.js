import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Badge, Alert,
  ProgressBar, Dropdown, ButtonGroup
} from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/stats');
      setStats(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load dashboard data');
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
      console.log('Upload response:', response.data);
      fetchStats();
      navigate('/documents');
    } catch (error) {
      console.error('Upload failed:', error);
      setError('Upload failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getDocumentTypeIcon = (type) => {
    const icons = {
      'invoice': 'fa-file-invoice',
      'receipt': 'fa-receipt',
      'contract': 'fa-file-contract',
      'document': 'fa-file-alt'
    };
    return icons[type] || 'fa-file';
  };

  const getStatusColor = (status) => {
    const colors = {
      'completed': 'success',
      'processing': 'warning',
      'failed': 'danger',
      'uploaded': 'primary'
    };
    return colors[status] || 'secondary';
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Container fluid className="py-5">
          <div className="d-flex justify-content-center align-items-center" style={{minHeight: '60vh'}}>
            <div className="text-center">
              <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
              <h5 className="text-muted fw-light">Loading Dashboard...</h5>
              <p className="text-muted small">Fetching your document analytics...</p>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      <Container fluid className="py-4">
        <div className="mb-5">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="display-6 fw-bold text-dark mb-2">
                {getTimeBasedGreeting()}, {JSON.parse(localStorage.getItem('user'))?.username || 'User'}!
              </h1>
              <p className="text-muted mb-0 fs-5 fw-light">
                Welcome to your SmartDoc AI command center. Process, analyze, and extract insights from your documents.
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-primary" 
                onClick={fetchStats}
                className="rounded-pill px-4"
              >
                <i className="fas fa-sync-alt me-2"></i>
                Refresh
              </Button>
              <Button 
                variant="primary" 
                onClick={() => navigate('/templates')}
                className="rounded-pill px-4"
              >
                <i className="fas fa-layer-group me-2"></i>
                Templates
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4 border-0 shadow-sm rounded-4" dismissible onClose={() => setError('')}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        <Row className="g-4 mb-5">
          <Col lg={3} sm={6}>
            <Card className="border-0 shadow-lg h-100 hover-card stats-card" style={{ borderRadius: '20px' }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="stats-icon-wrapper mb-3" style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      width: '60px', 
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 12px 30px rgba(59, 130, 246, 0.35), 0 6px 15px rgba(59, 130, 246, 0.25)'
                    }}>
                      <i className="fas fa-file-alt fa-2x text-white"></i>
                    </div>
                    <h3 className="fw-bold mb-1 text-primary">{stats?.total_documents || 0}</h3>
                    <p className="text-muted mb-0 fw-medium">Total Documents</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={3} sm={6}>
            <Card className="border-0 shadow-lg h-100 hover-card stats-card" style={{ borderRadius: '20px' }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="stats-icon-wrapper mb-3" style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      width: '60px', 
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 12px 30px rgba(16, 185, 129, 0.35), 0 6px 15px rgba(16, 185, 129, 0.25)'
                    }}>
                      <i className="fas fa-check-circle fa-2x text-white"></i>
                    </div>
                    <h3 className="fw-bold mb-1 text-success">{stats?.processed_documents || 0}</h3>
                    <p className="text-muted mb-0 fw-medium">Processed</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={3} sm={6}>
            <Card className="border-0 shadow-lg h-100 hover-card stats-card" style={{ borderRadius: '20px' }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="stats-icon-wrapper mb-3" style={{
                      background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                      width: '60px', 
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 12px 30px rgba(6, 182, 212, 0.35), 0 6px 15px rgba(6, 182, 212, 0.25)'
                    }}>
                      <i className="fas fa-chart-line fa-2x text-white"></i>
                    </div>
                    <h3 className="fw-bold mb-1 text-info">{Math.round(stats?.processing_rate || 0)}%</h3>
                    <p className="text-muted mb-0 fw-medium">Success Rate</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col lg={3} sm={6}>
            <Card className="border-0 shadow-lg h-100 hover-card stats-card" style={{ borderRadius: '20px' }}>
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="stats-icon-wrapper mb-3" style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      width: '60px', 
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 12px 30px rgba(245, 158, 11, 0.35), 0 6px 15px rgba(245, 158, 11, 0.25)'
                    }}>
                      <i className="fas fa-layer-group fa-2x text-white"></i>
                    </div>
                    <h3 className="fw-bold mb-1 text-warning">{Object.keys(stats?.document_types || {}).length}</h3>
                    <p className="text-muted mb-0 fw-medium">Document Types</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4 mb-5">
          <Col lg={8}>
            <Card className="border-0 shadow-sm upload-section-card" style={{ borderRadius: '20px', height: '420px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-2" style={{ borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h5 className="fw-bold text-dark mb-1">
                      <i className="fas fa-cloud-upload-alt text-primary me-2"></i>
                      Quick Upload
                    </h5>
                    <p className="text-muted small mb-0">Drag & drop your documents for instant processing</p>
                  </div>
                  <Badge style={{
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    border: 'none'
                  }} className="rounded-pill px-3 py-2 text-white">
                    Auto-AI Processing
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="p-4 d-flex align-items-center justify-content-center flex-grow-1">
                <div className="w-100">
                  <div
                    className={`border-2 border-dashed rounded-4 p-4 text-center position-relative ${
                      dragActive ? 'drag-active' : ''
                    } ${uploading ? 'opacity-75' : ''}`}
                    style={{ 
                      minHeight: '240px', 
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      backgroundColor: dragActive ? 'rgba(37, 99, 235, 0.05)' : '#fafbfc',
                      borderColor: dragActive ? '#2563eb' : '#e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => !uploading && document.getElementById('file-upload').click()}
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
                        <div className="spinner-border text-primary mb-4" style={{width: '3rem', height: '3rem'}}></div>
                        <h6 className="text-primary fw-bold mb-3">Processing Upload...</h6>
                        <p className="text-muted mb-4">AI is analyzing your documents</p>
                        <ProgressBar 
                          now={uploadProgress} 
                          label={`${uploadProgress}%`}
                          className="mx-auto"
                          style={{maxWidth: '300px', height: '10px', borderRadius: '10px'}}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="mb-4">
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                            border: '2px solid rgba(37, 99, 235, 0.2)',
                            borderRadius: '20px',
                            width: '80px',
                            height: '80px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto',
                            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.15)'
                          }}>
                            <i className={`fas fa-cloud-upload-alt fa-3x text-primary ${dragActive ? 'fa-bounce' : ''}`}></i>
                          </div>
                        </div>
                        <h5 className="fw-bold text-dark mb-2">
                          {dragActive ? 'Drop files here!' : 'Drag & Drop Files'}
                        </h5>
                        <p className="text-muted mb-4">
                          Supports PDF, JPG, PNG, TIFF files • Auto-processing enabled
                        </p>
                        <Button variant="primary" size="lg" className="rounded-pill px-5">
                          <i className="fas fa-folder-open me-2"></i>
                          Browse Files
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm ai-steps-card" style={{ borderRadius: '20px', height: '420px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-2" style={{ borderRadius: '20px 20px 0 0' }}>
                <h6 className="fw-bold text-dark mb-0">
                  <i className="fas fa-robot text-primary me-2"></i>
                  AI Processing Steps
                </h6>
              </Card.Header>
              <Card.Body className="p-4 d-flex flex-column justify-content-center">
                <div className="d-flex align-items-start mb-4">
                  <div style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    width: '50px',
                    height: '50px',
                    minWidth: '50px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                  }}>
                    <span className="fw-bold text-white">1</span>
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-2">OCR Text Extraction</h6>
                    <p className="text-muted small mb-0">Advanced AI extracts text from images and PDFs with high accuracy</p>
                  </div>
                </div>

                <div className="d-flex align-items-start mb-4">
                  <div style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    width: '50px',
                    height: '50px',
                    minWidth: '50px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                  }}>
                    <span className="fw-bold text-white">2</span>
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-2">AI Classification</h6>
                    <p className="text-muted small mb-0">Automatically identify document types using machine learning</p>
                  </div>
                </div>

                <div className="d-flex align-items-start">
                  <div style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                    width: '50px',
                    height: '50px',
                    minWidth: '50px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    boxShadow: '0 8px 20px rgba(6, 182, 212, 0.3)'
                  }}>
                    <span className="fw-bold text-white">3</span>
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-2">Template Generation</h6>
                    <p className="text-muted small mb-0">Create smart templates for future similar documents</p>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-4">
          <Col lg={8}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-3" style={{ borderRadius: '20px 20px 0 0' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <h6 className="fw-bold text-dark mb-0">
                    <i className="fas fa-clock text-primary me-2"></i>
                    Recent Documents
                  </h6>
                  <Link to="/documents" className="text-decoration-none">
                    <Button variant="outline-primary" size="sm" className="rounded-pill">
                      View All
                    </Button>
                  </Link>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                {stats?.recent_documents && stats.recent_documents.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-hover mb-0">
                      <thead className="table-light">
                        <tr>
                          <th className="border-0 fw-semibold px-4 py-3">Document</th>
                          <th className="border-0 fw-semibold">Type</th>
                          <th className="border-0 fw-semibold">Status</th>
                          <th className="border-0 fw-semibold">Date</th>
                          <th className="border-0 fw-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recent_documents.map((doc) => (
                          <tr key={doc.id}>
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center">
                                <div style={{
                                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  marginRight: '12px',
                                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                                }}>
                                  <i className={`fas ${getDocumentTypeIcon(doc.document_type)} text-primary`}></i>
                                </div>
                                <div>
                                  <h6 className="fw-semibold mb-1">{doc.filename}</h6>
                                  <small className="text-muted">ID: {doc.id}</small>
                                </div>
                              </div>
                            </td>
                            <td className="py-3">
                              <Badge bg="light" text="dark" className="rounded-pill">
                                {doc.document_type?.replace('_', ' ') || 'Unknown'}
                              </Badge>
                            </td>
                            <td className="py-3">
                              <Badge bg={getStatusColor(doc.status)} className="rounded-pill">
                                {doc.status}
                              </Badge>
                            </td>
                            <td className="py-3 text-muted">
                              {new Date(doc.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3">
                              <ButtonGroup size="sm">
                                <Button 
                                  variant="outline-primary" 
                                  onClick={() => navigate(`/documents/${doc.id}`)}
                                  className="rounded-pill"
                                >
                                  <i className="fas fa-eye"></i>
                                </Button>
                              </ButtonGroup>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(203, 213, 225, 0.1) 100%)',
                      width: '80px',
                      height: '80px',
                      borderRadius: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 6px 15px rgba(148, 163, 184, 0.2)'
                    }}>
                      <i className="fas fa-file-alt fa-2x text-muted"></i>
                    </div>
                    <h6 className="text-muted mb-2">No documents yet</h6>
                    <p className="text-muted small">Upload your first document to get started with SmartDoc AI.</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col lg={4}>
            <Card className="border-0 shadow-sm" style={{ borderRadius: '20px' }}>
              <Card.Header className="bg-white border-0 pt-4 pb-3" style={{ borderRadius: '20px 20px 0 0' }}>
                <h6 className="fw-bold text-dark mb-0">
                  <i className="fas fa-chart-pie text-primary me-2"></i>
                  Document Types
                </h6>
              </Card.Header>
              <Card.Body className="p-4">
                {stats?.document_types && Object.keys(stats.document_types).length > 0 ? (
                  <div>
                    {Object.entries(stats.document_types).map(([type, count]) => (
                      <div key={type} className="d-flex align-items-center justify-content-between mb-3">
                        <div className="d-flex align-items-center">
                          <div style={{
                            background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.15)'
                          }}>
                            <i className={`fas ${getDocumentTypeIcon(type)} text-primary`}></i>
                          </div>
                          <span className="fw-medium text-capitalize">{type.replace('_', ' ')}</span>
                        </div>
                        <Badge bg="light" text="dark" className="rounded-pill">
                          {count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(148, 163, 184, 0.1) 0%, rgba(203, 213, 225, 0.1) 100%)',
                      width: '60px',
                      height: '60px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      boxShadow: '0 4px 12px rgba(148, 163, 184, 0.2)'
                    }}>
                      <i className="fas fa-chart-pie fa-2x text-muted"></i>
                    </div>
                    <p className="text-muted small mb-0">No data yet</p>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Dashboard;
