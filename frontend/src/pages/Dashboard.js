import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../services/auth';
import FileUpload from '../components/FileUpload';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token, user } = useAuth();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setError('');
      setLoading(true);
      
      // Debug: Log authentication status
      console.log('Fetching stats with token:', token ? 'Present' : 'Missing');
      console.log('Auth header:', axios.defaults.headers.common['Authorization']);
      
      const response = await axios.get('/stats');
      setStats(response.data);
      console.log('Stats loaded successfully:', response.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load dashboard statistics: ' + (err.response?.data?.detail || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = () => {
    fetchStats();
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <div className="ms-3">
          <h6>Loading dashboard...</h6>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1>
            <i className="fas fa-tachometer-alt me-2"></i>
            SmartDoc AI Dashboard
          </h1>
          <small className="text-muted">Welcome back, {user?.username}!</small>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-secondary" 
            onClick={handleRefreshStats}
            disabled={loading}
          >
            <i className="fas fa-sync-alt me-2"></i>
            Refresh
          </Button>
          <Button variant="primary" onClick={() => navigate('/documents')}>
            <i className="fas fa-eye me-2"></i>
            View All Documents
          </Button>
        </div>
      </div>

      {/* Authentication Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Alert variant="info" className="mb-3">
          <small>
            <strong>Debug Info:</strong><br/>
            Token: {token ? '✅ Present' : '❌ Missing'}<br/>
            User: {user?.username || '❌ Not logged in'}<br/>
            Auth Header: {axios.defaults.headers.common['Authorization'] ? '✅ Set' : '❌ Missing'}
          </small>
        </Alert>
      )}

      {error && (
        <Alert variant="danger" className="mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
            <Button 
              variant="outline-danger" 
              size="sm"
              onClick={handleRefreshStats}
            >
              Try Again
            </Button>
          </div>
        </Alert>
      )}

      {/* Statistics Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-file-alt fa-2x text-primary mb-2"></i>
              <h3 className="text-primary">{stats?.total_documents || 0}</h3>
              <p className="text-muted mb-0">Total Documents</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-tags fa-2x text-success mb-2"></i>
              <h3 className="text-success">{Object.keys(stats?.document_types || {}).length}</h3>
              <p className="text-muted mb-0">Document Types</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-clock fa-2x text-warning mb-2"></i>
              <h3 className="text-warning">{stats?.recent_documents?.length || 0}</h3>
              <p className="text-muted mb-0">Recent Uploads</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-robot fa-2x text-info mb-2"></i>
              <h3 className="text-info">AI</h3>
              <p className="text-muted mb-0">Processing Ready</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Document Types Breakdown */}
      {stats?.document_types && Object.keys(stats.document_types).length > 0 && (
        <Row className="mb-4">
          <Col md={12}>
            <Card className="shadow-sm">
              <Card.Header>
                <h6 className="mb-0">
                  <i className="fas fa-chart-pie me-2"></i>
                  Document Types Distribution
                </h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  {Object.entries(stats.document_types).map(([type, count]) => (
                    <Col md={3} key={type} className="mb-2">
                      <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                        <span className="text-capitalize">{type}</span>
                        <span className="badge bg-primary">{count}</span>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* File Upload Section */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-cloud-upload-alt me-2"></i>
                Upload New Documents
              </h5>
            </Card.Header>
            <Card.Body>
              <FileUpload onUploadSuccess={handleRefreshStats} />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Recent Documents */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="fas fa-history me-2"></i>
                Recent Documents
              </h5>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => navigate('/documents')}
              >
                <i className="fas fa-list me-1"></i>
                View All
              </Button>
            </Card.Header>
            <Card.Body>
              {stats?.recent_documents?.length > 0 ? (
                <div className="list-group list-group-flush">
                  {stats.recent_documents.map((doc) => (
                    <div key={doc.id} className="list-group-item d-flex justify-content-between align-items-center border-0">
                      <div className="flex-grow-1">
                        <div className="d-flex align-items-center">
                          <i className="fas fa-file me-3 text-primary"></i>
                          <div>
                            <h6 className="mb-1">{doc.filename}</h6>
                            <small className="text-muted">
                              {doc.document_type && (
                                <span className="badge bg-info me-2">{doc.document_type}</span>
                              )}
                              <i className="fas fa-calendar me-1"></i>
                              {new Date(doc.created_at).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      </div>
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => navigate(`/documents/${doc.id}`)}
                      >
                        <i className="fas fa-eye me-1"></i>
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-4x text-muted mb-3"></i>
                  <h6 className="text-muted">No documents uploaded yet</h6>
                  <p className="text-muted">Upload your first document using the upload area above!</p>
                  <Button 
                    variant="primary"
                    onClick={() => document.querySelector('.file-upload-area')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <i className="fas fa-arrow-up me-2"></i>
                    Go to Upload
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5 className="mb-0">
                <i className="fas fa-bolt me-2"></i>
                Quick Actions
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3} className="mb-2">
                  <Button 
                    variant="outline-primary" 
                    className="w-100"
                    onClick={() => navigate('/documents')}
                  >
                    <i className="fas fa-file-alt me-2"></i>
                    Manage Documents
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button 
                    variant="outline-success" 
                    className="w-100"
                    onClick={() => navigate('/templates')}
                  >
                    <i className="fas fa-template me-2"></i>
                    Create Template
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button 
                    variant="outline-warning" 
                    className="w-100"
                    onClick={handleRefreshStats}
                    disabled={loading}
                  >
                    <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync'} me-2`}></i>
                    Refresh Data
                  </Button>
                </Col>
                <Col md={3} className="mb-2">
                  <Button 
                    variant="outline-info" 
                    className="w-100"
                    onClick={() => navigate('/settings')}
                  >
                    <i className="fas fa-cog me-2"></i>
                    Settings
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Footer Info */}
      <Row>
        <Col md={12}>
          <div className="text-center text-muted">
            <small>
              <i className="fas fa-info-circle me-1"></i>
              SmartDoc AI processes documents with OCR, classification, and data extraction
            </small>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
