import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Alert, Badge } from 'react-bootstrap';
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
      const response = await axios.get('/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Stats fetch error:', err);
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else {
        setError('Failed to load dashboard statistics');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStats = () => {
    fetchStats();
  };

  // Helper functions for dynamic styling
  const getTypeIcon = (type) => {
    const icons = {
      'invoice': 'fa-file-invoice',
      'receipt': 'fa-receipt',
      'contract': 'fa-file-contract',
      'id_document': 'fa-id-card',
      'document': 'fa-file-alt'
    };
    return icons[type] || 'fa-file-alt';
  };

  const getTypeIconBg = (type) => {
    const backgrounds = {
      'invoice': 'bg-primary bg-opacity-10',
      'receipt': 'bg-success bg-opacity-10',
      'contract': 'bg-warning bg-opacity-10',
      'id_document': 'bg-info bg-opacity-10',
      'document': 'bg-secondary bg-opacity-10'
    };
    return backgrounds[type] || 'bg-secondary bg-opacity-10';
  };

  const getTypeIconColor = (type) => {
    const colors = {
      'invoice': 'text-primary',
      'receipt': 'text-success',
      'contract': 'text-warning',
      'id_document': 'text-info',
      'document': 'text-secondary'
    };
    return colors[type] || 'text-secondary';
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

  const getStatusIcon = (status) => {
    const icons = {
      'completed': 'fa-check-circle',
      'processing': 'fa-spinner fa-spin',
      'failed': 'fa-exclamation-triangle',
      'uploaded': 'fa-upload'
    };
    return icons[status] || 'fa-circle';
  };

  if (loading) {
    return (
      <div className="dashboard-container py-5">
        <div className="container-fluid">
          <div className="text-center py-5">
            <div className="loading-spinner mx-auto mb-3"></div>
            <h5 className="text-muted">Loading dashboard...</h5>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <div className="container-fluid py-4">
        {/* Modern Header */}
        <div className="row mb-5">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="display-6 fw-bold mb-2 text-primary">Dashboard</h1>
                <p className="text-muted mb-0 lead">
                  Welcome back, <span className="fw-semibold">{user?.username || 'User'}</span>
                </p>
              </div>
              <Button 
                variant="outline-primary"
                onClick={handleRefreshStats}
                className="d-flex align-items-center gap-2 px-4"
              >
                <i className="fas fa-sync-alt"></i>
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-4 border-0">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {stats ? (
          <>
            {/* Modern Stats Cards - FIXED VERSION */}
            <div className="row g-4 mb-5">
              <div className="col-xl-3 col-lg-6 col-md-6">
                <Card className="stats-card stats-card-primary h-100 border-0">
                  <Card.Body className="position-relative">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h2 className="mb-1">{stats.total_documents}</h2>
                        <p className="mb-0">Total Documents</p>
                      </div>
                      <i className="fas fa-file-alt stats-icon"></i>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              
              <div className="col-xl-3 col-lg-6 col-md-6">
                <Card className="stats-card stats-card-success h-100 border-0">
                  <Card.Body className="position-relative">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h2 className="mb-1">{stats.processed_documents}</h2>
                        <p className="mb-0">Processed</p>
                      </div>
                      <i className="fas fa-check-circle stats-icon"></i>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              
              <div className="col-xl-3 col-lg-6 col-md-6">
                <Card className="stats-card stats-card-warning h-100 border-0">
                  <Card.Body className="position-relative">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h2 className="mb-1">{Math.round(stats.processing_rate)}%</h2>
                        <p className="mb-0">Success Rate</p>
                      </div>
                      <i className="fas fa-chart-line stats-icon"></i>
                    </div>
                  </Card.Body>
                </Card>
              </div>
              
              <div className="col-xl-3 col-lg-6 col-md-6">
                <Card className="stats-card stats-card-purple h-100 border-0">
                  <Card.Body className="position-relative">
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <h2 className="mb-1">{Object.keys(stats.document_types).length}</h2>
                        <p className="mb-0">Document Types</p>
                      </div>
                      <i className="fas fa-tags stats-icon"></i>
                    </div>
                  </Card.Body>
                </Card>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="row g-4">
              {/* File Upload Section */}
              <div className="col-lg-8">
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-transparent border-bottom border-light">
                    <div className="d-flex align-items-center">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                        <i className="fas fa-cloud-upload-alt text-primary"></i>
                      </div>
                      <div>
                        <h5 className="mb-0 fw-semibold">Upload Documents</h5>
                        <small className="text-muted">Drag and drop or click to upload files</small>
                      </div>
                    </div>
                  </Card.Header>
                  <Card.Body className="p-4">
                    <FileUpload onUploadSuccess={handleRefreshStats} />
                  </Card.Body>
                </Card>
              </div>

              {/* Document Types & Quick Actions */}
              <div className="col-lg-4">
                <div className="row g-4">
                  {/* Document Types Card */}
                  <div className="col-12">
                    <Card className="border-0 shadow-sm h-100">
                      <Card.Header className="bg-transparent border-bottom border-light">
                        <div className="d-flex align-items-center">
                          <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="fas fa-chart-pie text-success"></i>
                          </div>
                          <div>
                            <h5 className="mb-0 fw-semibold">Document Types</h5>
                            <small className="text-muted">Classification overview</small>
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-4">
                        {Object.keys(stats.document_types).length > 0 ? (
                          <div className="d-flex flex-column gap-3">
                            {Object.entries(stats.document_types).map(([type, count]) => (
                              <div key={type} className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center">
                                  <div className={`rounded-circle p-2 me-3 ${getTypeIconBg(type)}`}>
                                    <i className={`fas ${getTypeIcon(type)} ${getTypeIconColor(type)}`}></i>
                                  </div>
                                  <div>
                                    <span className="fw-medium text-capitalize">
                                      {type.replace('_', ' ')}
                                    </span>
                                    <div className="text-muted small">
                                      {((count / stats.total_documents) * 100).toFixed(1)}% of total
                                    </div>
                                  </div>
                                </div>
                                <Badge bg="primary" pill className="px-3">{count}</Badge>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-5">
                            <div className="bg-light rounded-circle d-inline-flex p-4 mb-3">
                              <i className="fas fa-inbox fa-2x text-muted"></i>
                            </div>
                            <h6 className="text-muted">No documents classified yet</h6>
                            <p className="text-muted small mb-0">Upload documents to see classification breakdown</p>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </div>

                  {/* Quick Actions */}
                  <div className="col-12">
                    <Card className="border-0 shadow-sm">
                      <Card.Header className="bg-transparent border-bottom border-light">
                        <div className="d-flex align-items-center">
                          <div className="bg-warning bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="fas fa-bolt text-warning"></i>
                          </div>
                          <div>
                            <h5 className="mb-0 fw-semibold">Quick Actions</h5>
                            <small className="text-muted">Common tasks</small>
                          </div>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-4">
                        <div className="d-grid gap-3">
                          <Button 
                            variant="outline-primary" 
                            className="d-flex align-items-center gap-2 justify-content-start"
                            onClick={() => navigate('/documents')}
                          >
                            <i className="fas fa-folder-open"></i>
                            View All Documents
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            className="d-flex align-items-center gap-2 justify-content-start"
                            onClick={() => navigate('/templates')}
                          >
                            <i className="fas fa-layer-group"></i>
                            Manage Templates
                          </Button>
                          <Button 
                            variant="outline-info" 
                            className="d-flex align-items-center gap-2 justify-content-start"
                            onClick={() => navigate('/settings')}
                          >
                            <i className="fas fa-cog"></i>
                            Settings
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Documents Section */}
            {stats.recent_documents && stats.recent_documents.length > 0 && (
              <div className="row mt-5">
                <div className="col-12">
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-transparent border-bottom border-light">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                            <i className="fas fa-clock text-info"></i>
                          </div>
                          <div>
                            <h5 className="mb-0 fw-semibold">Recent Documents</h5>
                            <small className="text-muted">Recently uploaded and processed files</small>
                          </div>
                        </div>
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          onClick={() => navigate('/documents')}
                        >
                          View All
                        </Button>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th className="border-0 fw-semibold">Document</th>
                              <th className="border-0 fw-semibold">Type</th>
                              <th className="border-0 fw-semibold">Status</th>
                              <th className="border-0 fw-semibold">Date</th>
                              <th className="border-0 fw-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.recent_documents.map(doc => (
                              <tr key={doc.id} className="border-bottom border-light">
                                <td className="py-3">
                                  <div className="d-flex align-items-center">
                                    <div className="bg-primary bg-opacity-10 rounded p-2 me-3">
                                      <i className="fas fa-file-alt text-primary"></i>
                                    </div>
                                    <div>
                                      <h6 className="mb-0 fw-medium">{doc.filename}</h6>
                                      <small className="text-muted">ID: {doc.id}</small>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3">
                                  <Badge 
                                    bg="light" 
                                    text="dark" 
                                    className="text-capitalize px-3 py-2"
                                  >
                                    {doc.document_type || 'Unknown'}
                                  </Badge>
                                </td>
                                <td className="py-3">
                                  <Badge 
                                    bg={getStatusColor(doc.status)}
                                    className="px-3 py-2 d-flex align-items-center gap-1 w-fit"
                                  >
                                    <i className={`fas ${getStatusIcon(doc.status)}`}></i>
                                    {doc.status}
                                  </Badge>
                                </td>
                                <td className="py-3 text-muted">
                                  {new Date(doc.created_at).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="py-3">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => navigate(`/documents/${doc.id}`)}
                                  >
                                    <i className="fas fa-eye me-1"></i>
                                    View
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-5">
            <div className="bg-light rounded-circle d-inline-flex p-4 mb-4">
              <i className="fas fa-exclamation-triangle fa-3x text-warning"></i>
            </div>
            <h4 className="fw-bold mb-2">Unable to Load Dashboard</h4>
            <p className="text-muted mb-4">There was an issue loading your dashboard data.</p>
            <Button variant="primary" onClick={handleRefreshStats}>
              <i className="fas fa-refresh me-2"></i>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
