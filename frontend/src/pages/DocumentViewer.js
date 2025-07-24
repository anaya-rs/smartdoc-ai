import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Table, Alert, Spinner, Tabs, Tab, 
  Badge, Form, Modal, ProgressBar 
} from 'react-bootstrap';
import axios from 'axios';
import QuestionAnswer from '../components/QuestionAnswer';

const DocumentViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`/documents/${id}`);
      setDocument(response.data);
    } catch (err) {
      console.error('Error fetching document:', err);
      setError('Failed to load document: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Download functions
  const downloadText = () => {
    try {
      const text = document.redacted_data?.redacted_text || document.extracted_text || 'No text available';
      const blob = new Blob([text], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${document.filename}_extracted_text.txt`;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Text download failed:', error);
      alert('Text download failed. Please try again.');
    }
  };

  const downloadJSON = (data, filename) => {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${filename}_data.json`;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('JSON download failed:', error);
      alert('JSON download failed. Please try again.');
    }
  };

  const downloadCSV = (tableData, filename) => {
    try {
      const csv = tableData.csv || 'No CSV data available';
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = `${filename}_table.csv`;
      link.style.display = 'none';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('CSV download failed:', error);
      alert('CSV download failed. Please try again.');
    }
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
      <div className="document-viewer-container py-5">
        <div className="container-fluid">
          <div className="text-center py-5">
            <div className="loading-spinner mx-auto mb-3"></div>
            <h5 className="text-muted">Loading document...</h5>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-viewer-container py-5">
        <div className="container-fluid">
          <Alert variant="danger" className="text-center">
            <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
            <h5>Error Loading Document</h5>
            <p>{error}</p>
            <Button variant="primary" onClick={() => navigate('/documents')}>
              <i className="fas fa-arrow-left me-2"></i>
              Back to Documents
            </Button>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer-container fade-in">
      <div className="container-fluid py-4">
        {/* Modern Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-2">
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => navigate('/documents')}
                    className="me-3"
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Back
                  </Button>
                  <div>
                    <h1 className="h3 fw-bold mb-1">{document.filename}</h1>
                    <div className="d-flex align-items-center gap-3">
                      <Badge 
                        bg={getStatusColor(document.status)}
                        className="d-flex align-items-center gap-1 px-3 py-2"
                      >
                        <i className={`fas ${getStatusIcon(document.status)}`}></i>
                        {document.status}
                      </Badge>
                      {document.document_type && (
                        <Badge bg="primary" className="px-3 py-2 text-capitalize">
                          {document.document_type.replace('_', ' ')}
                        </Badge>
                      )}
                      {document.confidence_score && (
                        <Badge bg="info" className="px-3 py-2">
                          {Math.round(document.confidence_score * 100)}% Confidence
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary"
                  onClick={() => setShowExportModal(true)}
                  className="d-flex align-items-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Export
                </Button>
                <Button 
                  variant="outline-success"
                  onClick={fetchDocument}
                  className="d-flex align-items-center gap-2"
                >
                  <i className="fas fa-sync-alt"></i>
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row g-4">
          {/* Left Column - Document Info */}
          <div className="col-lg-4">
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-transparent border-bottom border-light">
                <div className="d-flex align-items-center">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                    <i className="fas fa-info-circle text-primary"></i>
                  </div>
                  <h5 className="mb-0 fw-semibold">Document Information</h5>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">File Name:</span>
                    <span className="fw-medium text-end">{document.filename}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Document Type:</span>
                    <Badge bg="light" text="dark" className="text-capitalize">
                      {document.document_type || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Status:</span>
                    <Badge bg={getStatusColor(document.status)}>
                      {document.status}
                    </Badge>
                  </div>
                  {document.confidence_score && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Confidence:</span>
                      <div className="text-end">
                        <div className="small fw-medium">{Math.round(document.confidence_score * 100)}%</div>
                        <ProgressBar 
                          now={document.confidence_score * 100} 
                          style={{height: '4px', width: '60px'}}
                          variant={document.confidence_score > 0.8 ? 'success' : document.confidence_score > 0.6 ? 'warning' : 'danger'}
                        />
                      </div>
                    </div>
                  )}
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">Created:</span>
                    <span className="small text-end">
                      {new Date(document.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-muted">
                        {new Date(document.created_at).toLocaleTimeString()}
                      </span>
                    </span>
                  </div>
                  {document.processed_at && (
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Processed:</span>
                      <span className="small text-end">
                        {new Date(document.processed_at).toLocaleDateString()}
                        <br />
                        <span className="text-muted">
                          {new Date(document.processed_at).toLocaleTimeString()}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent border-bottom border-light">
                <div className="d-flex align-items-center">
                  <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                    <i className="fas fa-chart-bar text-success"></i>
                  </div>
                  <h5 className="mb-0 fw-semibold">Extraction Stats</h5>
                </div>
              </Card.Header>
              <Card.Body className="p-4">
                <div className="row g-3">
                  <div className="col-6">
                    <div className="text-center">
                      <div className="h4 fw-bold text-primary mb-1">
                        {document.extracted_text ? document.extracted_text.split(' ').length : 0}
                      </div>
                      <div className="small text-muted">Words</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center">
                      <div className="h4 fw-bold text-success mb-1">
                        {document.tables?.length || 0}
                      </div>
                      <div className="small text-muted">Tables</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center">
                      <div className="h4 fw-bold text-warning mb-1">
                        {document.key_value_pairs?.extracted_pairs ? 
                          Object.keys(document.key_value_pairs.extracted_pairs).length : 0}
                      </div>
                      <div className="small text-muted">Key-Values</div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="text-center">
                      <div className="h4 fw-bold text-info mb-1">
                        {document.extracted_text ? document.extracted_text.length : 0}
                      </div>
                      <div className="small text-muted">Characters</div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Right Column - Document Content */}
          <div className="col-lg-8">
            <Card className="border-0 shadow-sm">
              <Card.Header className="bg-transparent border-bottom border-light">
                <div className="d-flex align-items-center">
                  <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                    <i className="fas fa-file-alt text-info"></i>
                  </div>
                  <h5 className="mb-0 fw-semibold">Document Content</h5>
                </div>
              </Card.Header>
              <Card.Body className="p-0">
                <Tabs 
                  activeKey={activeTab} 
                  onSelect={setActiveTab} 
                  className="px-4 pt-3"
                  variant="pills"
                >
                  {/* Overview Tab */}
                  <Tab eventKey="overview" title={
                    <span><i className="fas fa-eye me-2"></i>Overview</span>
                  }>
                    <div className="p-4">
                      {document.extracted_text ? (
                        <div className="bg-light rounded p-4" style={{maxHeight: '500px', overflowY: 'auto'}}>
                          <h6 className="mb-3 fw-semibold">Extracted Text</h6>
                          <pre className="mb-0" style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6'}}>
                            {document.extracted_text}
                          </pre>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="fas fa-file-alt fa-3x text-muted mb-3"></i>
                          <h6 className="text-muted">No text extracted</h6>
                          <p className="text-muted">This document may be image-based or processing failed.</p>
                        </div>
                      )}
                    </div>
                  </Tab>

                  {/* Key-Value Pairs Tab */}
                  <Tab eventKey="keyvalue" title={
                    <span><i className="fas fa-key me-2"></i>Key-Value Pairs</span>
                  }>
                    <div className="p-4">
                      {document.key_value_pairs?.extracted_pairs && 
                       Object.keys(document.key_value_pairs.extracted_pairs).length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-hover">
                            <thead className="table-light">
                              <tr>
                                <th style={{width: '30%'}}>Key</th>
                                <th style={{width: '60%'}}>Value</th>
                                <th style={{width: '10%'}}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(document.key_value_pairs.extracted_pairs).map(([key, value]) => (
                                <tr key={key}>
                                  <td>
                                    <span className="fw-medium text-capitalize">
                                      {key.replace(/_/g, ' ')}
                                    </span>
                                  </td>
                                  <td>
                                    <code className="bg-light px-2 py-1 rounded">
                                      {Array.isArray(value) ? value.join(', ') : value}
                                    </code>
                                  </td>
                                  <td>
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm"
                                      onClick={() => navigator.clipboard.writeText(value)}
                                    >
                                      <i className="fas fa-copy"></i>
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="fas fa-key fa-3x text-muted mb-3"></i>
                          <h6 className="text-muted">No key-value pairs found</h6>
                          <p className="text-muted">This document doesn't contain structured data patterns.</p>
                        </div>
                      )}
                    </div>
                  </Tab>

                  {/* Tables Tab */}
                  <Tab eventKey="tables" title={
                    <span><i className="fas fa-table me-2"></i>Tables ({document.tables?.length || 0})</span>
                  }>
                    <div className="p-4">
                      {document.tables?.length > 0 ? (
                        <div className="d-flex flex-column gap-4">
                          {document.tables.map((table, index) => (
                            <Card key={index} className="border">
                              <Card.Header className="bg-light">
                                <div className="d-flex justify-content-between align-items-center">
                                  <h6 className="mb-0">
                                    Table {table.table_id || index + 1}
                                    {table.page && <span className="text-muted"> (Page {table.page})</span>}
                                  </h6>
                                  <div className="d-flex gap-2">
                                    {table.accuracy && (
                                      <Badge bg="info">Accuracy: {table.accuracy}%</Badge>
                                    )}
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm"
                                      onClick={() => downloadCSV(table, `${document.filename}_table_${table.table_id || index + 1}`)}
                                    >
                                      <i className="fas fa-download me-1"></i>CSV
                                    </Button>
                                  </div>
                                </div>
                              </Card.Header>
                              <Card.Body className="p-0">
                                <div style={{overflowX: 'auto'}}>
                                  <table className="table table-striped mb-0">
                                    <thead className="table-dark">
                                      <tr>
                                        <th>#</th>
                                        {table.data[0] && Object.keys(table.data[0]).map((header, idx) => (
                                          <th key={idx}>{header}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {table.data.map((row, rowIdx) => (
                                        <tr key={rowIdx}>
                                          <td className="text-muted">{rowIdx + 1}</td>
                                          {Object.values(row).map((cell, cellIdx) => (
                                            <td key={cellIdx}>{cell || '—'}</td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="fas fa-table fa-3x text-muted mb-3"></i>
                          <h6 className="text-muted">No tables found</h6>
                          <p className="text-muted">This document doesn't contain detectable table structures.</p>
                        </div>
                      )}
                    </div>
                  </Tab>

                  {/* Q&A Tab */}
                  <Tab eventKey="qa" title={
                    <span><i className="fas fa-question-circle me-2"></i>Q&A</span>
                  }>
                    <div className="p-4">
                      <QuestionAnswer documentId={id} />
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </div>
        </div>

        {/* Export Modal */}
        <Modal show={showExportModal} onHide={() => setShowExportModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>
              <i className="fas fa-download me-2"></i>
              Export Document Data
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="text-muted mb-4">Choose the format to export your document data:</p>
            <div className="row g-3">
              <div className="col-md-6">
                <Card className="h-100 border-2" style={{cursor: 'pointer'}} onClick={downloadText}>
                  <Card.Body className="text-center p-4">
                    <i className="fas fa-file-alt fa-3x text-primary mb-3"></i>
                    <h6 className="fw-semibold">Text File</h6>
                    <p className="text-muted small mb-0">Export extracted text as .txt file</p>
                  </Card.Body>
                </Card>
              </div>
              <div className="col-md-6">
                <Card className="h-100 border-2" style={{cursor: 'pointer'}} onClick={() => downloadJSON(document, document.filename)}>
                  <Card.Body className="text-center p-4">
                    <i className="fas fa-code fa-3x text-success mb-3"></i>
                    <h6 className="fw-semibold">JSON Data</h6>
                    <p className="text-muted small mb-0">Export all data as .json file</p>
                  </Card.Body>
                </Card>
              </div>
              {document.tables?.length > 0 && (
                <div className="col-12">
                  <Card className="border-2" style={{cursor: 'pointer'}} onClick={() => {
                    document.tables.forEach((table, idx) => {
                      setTimeout(() => {
                        downloadCSV(table, `${document.filename}_table_${table.table_id || idx + 1}`);
                      }, idx * 100);
                    });
                  }}>
                    <Card.Body className="text-center p-4">
                      <i className="fas fa-table fa-3x text-info mb-3"></i>
                      <h6 className="fw-semibold">All Tables (CSV)</h6>
                      <p className="text-muted small mb-0">Export all {document.tables.length} tables as CSV files</p>
                    </Card.Body>
                  </Card>
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowExportModal(false)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
};

export default DocumentViewer;
