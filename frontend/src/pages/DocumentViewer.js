import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, Row, Col, Card, Button, Tabs, Tab, Badge, Alert, 
  Spinner, Modal, Dropdown, ButtonGroup 
} from 'react-bootstrap';
import axios from 'axios';
import QuestionAnswer from '../components/QuestionAnswer';
import ProcessingStatus from '../components/ProcessingStatus';
import { useDocumentProcessing } from '../hooks/useWebSocket';

const DocumentViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showRedactModal, setShowRedactModal] = useState(false);
  const [redactionOptions, setRedactionOptions] = useState({
    names: true,
    emails: true,
    phones: true,
    ssn: true,
    addresses: true,
    dates_of_birth: true,
    credit_cards: true
  });

  const { processingStatus, isConnected } = useDocumentProcessing(id);

  const fetchDocument = useCallback(async () => {
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
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleRedact = async () => {
    try {
      await axios.post(`/redact/${id}`, redactionOptions);
      setShowRedactModal(false);
      fetchDocument();
    } catch (err) {
      setError('Redaction failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const downloadFile = (type) => {
    try {
      let content, filename, mimeType;
      
      switch(type) {
        case 'text':
          content = document.extracted_text || 'No text available';
          filename = `${document.filename}_extracted_text.txt`;
          mimeType = 'text/plain';
          break;
        case 'json':
          content = JSON.stringify(document, null, 2);
          filename = `${document.filename}_data.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          if (document.tables && document.tables.length > 0) {
            content = document.tables[0].csv || 'No table data available';
            filename = `${document.filename}_table.csv`;
            mimeType = 'text/csv';
          } else {
            content = 'No table data available';
            filename = `${document.filename}_table.csv`;
            mimeType = 'text/csv';
          }
          break;
        default:
          return;
      }
      
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
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

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'success';
    if (confidence >= 0.7) return 'warning';
    return 'danger';
  };

  const getRedactionIcon = (type) => {
    const icons = {
      'names': 'user',
      'emails': 'envelope',
      'phones': 'phone',
      'ssn': 'id-card',
      'addresses': 'map-marker-alt',
      'dates_of_birth': 'birthday-cake',
      'credit_cards': 'credit-card'
    };
    return icons[type] || 'shield-alt';
  };

  if (loading) {
    return (
      <Container fluid className="py-5">
        <div className="d-flex flex-column align-items-center justify-content-center" style={{minHeight: '60vh'}}>
          <Spinner animation="border" variant="primary" style={{width: '3rem', height: '3rem'}} />
          <h5 className="text-muted mt-3">Loading document...</h5>
          <p className="text-muted">Please wait while we fetch your document</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container fluid className="py-4">
        <Alert variant="danger" className="text-center py-5">
          <i className="fas fa-exclamation-triangle fa-3x mb-3 text-danger"></i>
          <h4>Unable to Load Document</h4>
          <p className="mb-4">{error}</p>
          <ButtonGroup>
            <Button variant="outline-primary" onClick={fetchDocument}>
              <i className="fas fa-redo me-2"></i>
              Try Again
            </Button>
            <Button variant="primary" onClick={() => navigate('/documents')}>
              <i className="fas fa-arrow-left me-2"></i>
              Back to Documents
            </Button>
          </ButtonGroup>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <div className="document-header mb-4">
        <Row className="align-items-center">
          <Col md={8}>
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate('/documents')}
                className="me-4 d-flex align-items-center"
              >
                <i className="fas fa-arrow-left me-2"></i>
                Back
              </Button>
              
              <div className="document-info flex-grow-1">
                <h1 className="h3 fw-bold mb-2 text-primary">{document.filename}</h1>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <Badge 
                    bg={getStatusColor(document.status)} 
                    className="px-3 py-2 d-flex align-items-center gap-2"
                  >
                    <i className={`fas fa-${document.status === 'completed' ? 'check-circle' : 
                                              document.status === 'processing' ? 'spinner fa-spin' : 
                                              document.status === 'failed' ? 'exclamation-triangle' : 'upload'}`}></i>
                    {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                  </Badge>
                  
                  {isConnected && (
                    <Badge bg="success" className="px-2 py-1">
                      <i className="fas fa-wifi me-1"></i>
                      Live Updates
                    </Badge>
                  )}
                  
                  {document.document_type && (
                    <Badge bg="primary" className="px-3 py-2 text-capitalize">
                      <i className="fas fa-tag me-2"></i>
                      {document.document_type.replace('_', ' ')}
                    </Badge>
                  )}
                  
                  {document.confidence_score && (
                    <Badge bg={getConfidenceColor(document.confidence_score)} className="px-3 py-2">
                      <i className="fas fa-chart-line me-2"></i>
                      {Math.round(document.confidence_score * 100)}% Confidence
                    </Badge>
                  )}
                  
                  <Badge bg="light" text="dark" className="px-3 py-2">
                    <i className="fas fa-calendar me-2"></i>
                    {new Date(document.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              </div>
            </div>
          </Col>
          
          <Col md={4} className="text-end">
            <ButtonGroup>
              <Dropdown>
                <Dropdown.Toggle variant="outline-primary" id="export-dropdown">
                  <i className="fas fa-download me-2"></i>
                  Export
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => downloadFile('text')}>
                    <i className="fas fa-file-alt me-2"></i>
                    Text File (.txt)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => downloadFile('json')}>
                    <i className="fas fa-code me-2"></i>
                    JSON Data (.json)
                  </Dropdown.Item>
                  {document.tables?.length > 0 && (
                    <Dropdown.Item onClick={() => downloadFile('csv')}>
                      <i className="fas fa-table me-2"></i>
                      Table Data (.csv)
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
              
              {document.status === 'completed' && (
                <Button 
                  variant="outline-warning"
                  onClick={() => setShowRedactModal(true)}
                >
                  <i className="fas fa-user-secret me-2"></i>
                  Redact
                </Button>
              )}
              
              <Button variant="outline-success" onClick={fetchDocument}>
                <i className="fas fa-sync-alt me-2"></i>
                Refresh
              </Button>
            </ButtonGroup>
          </Col>
        </Row>
      </div>

      {/* Processing Status */}
      {processingStatus && document.status === 'processing' && (
        <ProcessingStatus 
          status={processingStatus} 
          className="mb-4"
        />
      )}

      {/* Statistics */}
      {document.extracted_text && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body className="py-3">
            <Row className="text-center">
              <Col md={3}>
                <div className="stat-item">
                  <h4 className="fw-bold text-primary mb-1">
                    {document.extracted_text.split(' ').length.toLocaleString()}
                  </h4>
                  <small className="text-muted">Total Words</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-item">
                  <h4 className="fw-bold text-success mb-1">
                    {document.tables?.length || 0}
                  </h4>
                  <small className="text-muted">Tables Found</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-item">
                  <h4 className="fw-bold text-warning mb-1">
                    {document.key_value_pairs?.extracted_pairs ? 
                      Object.keys(document.key_value_pairs.extracted_pairs).length : 0}
                  </h4>
                  <small className="text-muted">Key-Value Pairs</small>
                </div>
              </Col>
              <Col md={3}>
                <div className="stat-item">
                  <h4 className="fw-bold text-info mb-1">
                    {document.extracted_text.length.toLocaleString()}
                  </h4>
                  <small className="text-muted">Characters</small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs 
          activeKey={activeTab} 
          onSelect={setActiveTab}
          className="nav-tabs-custom border-bottom"
          fill
        >
          {/* Overview Tab with AI Overview */}
          <Tab 
            eventKey="overview" 
            title={
              <span className="tab-title">
                <i className="fas fa-chart-line me-2"></i>
                Overview
              </span>
            }
          >
            <div className="p-4">
              <Row className="g-4">
                <Col lg={8}>
                  <Card className="h-100 border-light">
                    <Card.Header className="bg-light border-bottom">
                      <h6 className="mb-0 fw-semibold">
                        <i className="fas fa-robot me-2 text-primary"></i>
                        AI-Generated Document Summary
                      </h6>
                    </Card.Header>
                    <Card.Body>
                      <div className="summary-text mb-4 p-4 bg-light rounded border-start border-primary border-4">
                        <h6 className="fw-semibold text-primary mb-3">
                          <i className="fas fa-brain me-2"></i>
                          AI Analysis
                        </h6>
                        <p className="mb-0" style={{ fontSize: '15px', lineHeight: '1.6' }}>
                          {document.extracted_data?.ai_overview || 
                           document.extracted_data?.overview || 
                           `This document appears to be a ${document.document_type || 'general document'} 
                            containing approximately ${document.extracted_text ? document.extracted_text.split(' ').length : 0} words. 
                            ${document.tables?.length > 0 ? ` It includes ${document.tables.length} structured table${document.tables.length > 1 ? 's' : ''}.` : ''}
                            ${document.key_value_pairs?.extracted_pairs && Object.keys(document.key_value_pairs.extracted_pairs).length > 0 ? 
                              ` ${Object.keys(document.key_value_pairs.extracted_pairs).length} key-value pairs were extracted.` : ''}
                            ${document.confidence_score ? ` The document was processed with ${Math.round(document.confidence_score * 100)}% confidence.` : ''}`}
                        </p>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col lg={4}>
                  <div className="d-flex flex-column gap-3">
                    {/* Processing Quality */}
                    <Card className="border-light">
                      <Card.Header className="bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold">
                          <i className="fas fa-tachometer-alt me-2 text-success"></i>
                          Processing Quality
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="text-center">
                          <div className="mb-3">
                            <div 
                              className="progress-circle mx-auto mb-2" 
                              style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: `conic-gradient(#10b981 ${(document.confidence_score || 0) * 360}deg, #e5e7eb 0deg)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <div className="bg-white rounded-circle d-flex align-items-center justify-content-center" style={{width: '60px', height: '60px'}}>
                                <span className="fw-bold text-success">
                                  {Math.round((document.confidence_score || 0) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge bg="success" className="px-3 py-2">
                            {(document.confidence_score || 0) > 0.8 ? 'Excellent' : 
                            (document.confidence_score || 0) > 0.6 ? 'Good' : 'Fair'} Quality
                          </Badge>
                        </div>
                      </Card.Body>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="border-light">
                      <Card.Header className="bg-light border-bottom">
                        <h6 className="mb-0 fw-semibold">
                          <i className="fas fa-bolt me-2 text-warning"></i>
                          Quick Actions
                        </h6>
                      </Card.Header>
                      <Card.Body>
                        <div className="d-grid gap-2">
                          <Button variant="outline-primary" onClick={() => setActiveTab('qa')}>
                            <i className="fas fa-question-circle me-2"></i>
                            Ask Questions
                          </Button>
                          <Button variant="outline-success" onClick={() => downloadFile('text')}>
                            <i className="fas fa-download me-2"></i>
                            Download Text
                          </Button>
                          {document.status === 'completed' && (
                            <Button variant="outline-warning" onClick={() => setShowRedactModal(true)}>
                              <i className="fas fa-user-secret me-2"></i>
                              Redact Data
                            </Button>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                </Col>
              </Row>
            </div>
          </Tab>

          {/* Full Content Tab */}
          <Tab 
            eventKey="content" 
            title={
              <span className="tab-title">
                <i className="fas fa-file-text me-2"></i>
                Full Content
              </span>
            }
          >
            <div className="p-4">
              {document.extracted_text ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 fw-semibold">Complete Document Text</h5>
                    <div className="d-flex gap-2">
                      <Button variant="outline-primary" size="sm" onClick={() => downloadFile('text')}>
                        <i className="fas fa-download me-1"></i>
                        Download
                      </Button>
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(document.extracted_text)}
                      >
                        <i className="fas fa-copy me-1"></i>
                        Copy
                      </Button>
                    </div>
                  </div>
                  
                  <Card className="border-light">
                    <Card.Body>
                      <div 
                        className="content-display p-4 bg-light rounded"
                        style={{
                          maxHeight: '70vh',
                          overflowY: 'auto',
                          fontFamily: 'Georgia, serif',
                          fontSize: '14px',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {document.extracted_text}
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-file-alt fa-4x text-muted mb-4"></i>
                  <h5 className="text-muted">No Content Available</h5>
                  <p className="text-muted">This document may not have been processed yet or contains no extractable text.</p>
                </div>
              )}
            </div>
          </Tab>

          {/* Q&A Tab */}
          <Tab 
            eventKey="qa" 
            title={
              <span className="tab-title">
                <i className="fas fa-question-circle me-2"></i>
                Ask Questions
              </span>
            }
          >
            <div className="p-4">
              <QuestionAnswer documentId={id} />
            </div>
          </Tab>

          {/* Key-Value Tab */}
          <Tab 
            eventKey="keyvalue" 
            title={
              <span className="tab-title">
                <i className="fas fa-key me-2"></i>
                Key Data
                {document.key_value_pairs?.extracted_pairs && 
                 Object.keys(document.key_value_pairs.extracted_pairs).length > 0 && (
                  <Badge bg="primary" className="ms-2">
                    {Object.keys(document.key_value_pairs.extracted_pairs).length}
                  </Badge>
                )}
              </span>
            }
          >
            <div className="p-4">
              {document.key_value_pairs?.extracted_pairs && 
               Object.keys(document.key_value_pairs.extracted_pairs).length > 0 ? (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0 fw-semibold">Extracted Key-Value Pairs</h5>
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => downloadFile('json')}
                    >
                      <i className="fas fa-download me-1"></i>
                      Export Data
                    </Button>
                  </div>
                  
                  <Card className="border-light">
                    <Card.Body className="p-0">
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="fw-semibold">Key</th>
                              <th className="fw-semibold">Value</th>
                              <th className="fw-semibold text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(document.key_value_pairs.extracted_pairs).map(([key, value]) => (
                              <tr key={key}>
                                <td>
                                  <span className="fw-medium text-capitalize text-primary">
                                    {key.replace(/_/g, ' ')}
                                  </span>
                                </td>
                                <td>
                                  <code className="bg-light px-3 py-2 rounded border">
                                    {Array.isArray(value) ? value.join(', ') : value}
                                  </code>
                                </td>
                                <td className="text-center">
                                  <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={() => navigator.clipboard.writeText(value)}
                                    title="Copy to clipboard"
                                  >
                                    <i className="fas fa-copy"></i>
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
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-key fa-4x text-muted mb-4"></i>
                  <h5 className="text-muted">No Key-Value Pairs Found</h5>
                  <p className="text-muted">This document doesn't contain recognizable structured data patterns.</p>
                </div>
              )}
            </div>
          </Tab>

          {/* Tables Tab */}
          <Tab 
            eventKey="tables" 
            title={
              <span className="tab-title">
                <i className="fas fa-table me-2"></i>
                Tables
                {document.tables?.length > 0 && (
                  <Badge bg="success" className="ms-2">
                    {document.tables.length}
                  </Badge>
                )}
              </span>
            }
          >
            <div className="p-4">
              {document.tables?.length > 0 ? (
                <div className="d-flex flex-column gap-4">
                  {document.tables.map((table, index) => (
                    <Card key={index} className="border-light">
                      <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-semibold">
                          <i className="fas fa-table me-2 text-success"></i>
                          Table {table.table_id || index + 1}
                          {table.page && <span className="text-muted ms-2">(Page {table.page})</span>}
                        </h6>
                        <div className="d-flex gap-2 align-items-center">
                          {table.accuracy && (
                            <Badge bg="info">
                              <i className="fas fa-chart-line me-1"></i>
                              {table.accuracy}% Accuracy
                            </Badge>
                          )}
                          <Button 
                            variant="outline-success" 
                            size="sm"
                            onClick={() => downloadFile('csv')}
                          >
                            <i className="fas fa-download me-1"></i>
                            CSV
                          </Button>
                        </div>
                      </Card.Header>
                      <Card.Body className="p-0">
                        <div className="table-responsive">
                          <table className="table table-striped mb-0">
                            <thead className="table-dark">
                              <tr>
                                <th className="text-center">#</th>
                                {table.data[0] && Object.keys(table.data[0]).map((header, idx) => (
                                  <th key={idx} className="fw-semibold">{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.data.slice(0, 10).map((row, rowIdx) => (
                                <tr key={rowIdx}>
                                  <td className="text-center text-muted fw-medium">{rowIdx + 1}</td>
                                  {Object.values(row).map((cell, cellIdx) => (
                                    <td key={cellIdx}>{cell || '—'}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {table.data.length > 10 && (
                            <div className="text-center p-3 bg-light">
                              <small className="text-muted">
                                Showing 10 of {table.data.length} rows. 
                                <Button variant="link" size="sm" onClick={() => downloadFile('csv')}>
                                  Download full table
                                </Button>
                              </small>
                            </div>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-table fa-4x text-muted mb-4"></i>
                  <h5 className="text-muted">No Tables Found</h5>
                  <p className="text-muted">This document doesn't contain detectable table structures.</p>
                </div>
              )}
            </div>
          </Tab>
        </Tabs>
      </Card>

      {/* Redaction Modal */}
      <Modal show={showRedactModal} onHide={() => setShowRedactModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-secret me-2"></i>
            Data Redaction
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-4">
            <i className="fas fa-info-circle me-2"></i>
            <strong>Document:</strong> {document.filename}
          </Alert>
          
          <p className="mb-4">Select the types of sensitive information to redact:</p>
          
          <Row>
            {Object.entries(redactionOptions).map(([key, value]) => (
              <Col md={6} key={key} className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id={`redact-${key}`}
                    checked={value}
                    onChange={(e) => setRedactionOptions({
                      ...redactionOptions,
                      [key]: e.target.checked
                    })}
                  />
                  <label className="form-check-label fw-medium" htmlFor={`redact-${key}`}>
                    <i className={`fas fa-${getRedactionIcon(key)} me-2 text-primary`}></i>
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                </div>
              </Col>
            ))}
          </Row>
          
          <Alert variant="warning" className="mt-4">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Warning:</strong> Redaction cannot be undone. Consider downloading the original first.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRedactModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleRedact}
            disabled={!Object.values(redactionOptions).some(v => v)}
          >
            <i className="fas fa-user-secret me-2"></i>
            Apply Redaction
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default DocumentViewer;
