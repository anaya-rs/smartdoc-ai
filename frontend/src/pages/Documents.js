import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Table, Button, Form, InputGroup, 
  Badge, Alert, Spinner, Modal 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ProcessingStatus from '../components/ProcessingStatus';
import { useDocumentProcessing } from '../hooks/useWebSocket';

const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showRedactModal, setShowRedactModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [processingDocId, setProcessingDocId] = useState(null);
  const [redactionOptions, setRedactionOptions] = useState({
    names: true,
    emails: true,
    phones: true,
    ssn: true,
    addresses: true,
    dates_of_birth: true,
    credit_cards: true
  });

  const { processingStatus } = useDocumentProcessing(processingDocId);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/documents');
      setDocuments(response.data);
    } catch (err) {
      setError('Failed to load documents');
      console.error('Error fetching documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() && !filterType) {
      fetchDocuments();
      return;
    }

    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('query', searchTerm);
      if (filterType) params.append('document_type', filterType);
      
      const response = await axios.get(`/search?${params.toString()}`);
      setDocuments(response.data);
    } catch (err) {
      setError('Search failed');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRedact = async () => {
    if (!selectedDoc) return;

    try {
      await axios.post(`/redact/${selectedDoc.id}`, redactionOptions);
      setShowRedactModal(false);
      setSelectedDoc(null);
      setSuccess(`Document "${selectedDoc.filename}" redacted successfully`);
      fetchDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Redaction failed');
      console.error('Redaction error:', err);
    }
  };

  const handleProcessDocument = async (documentId, filename) => {
    try {
      setError('');
      setProcessingDocId(documentId);
      
      await axios.post(`/process/${documentId}`);
      setSuccess(`Processing started for "${filename}"`);
      fetchDocuments();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Processing failed');
      console.error('Processing error:', err);
      setProcessingDocId(null);
    }
  };

  const handleDeleteDocument = async (documentId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      await axios.delete(`/documents/${documentId}`);
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setSuccess(`Document "${filename}" deleted successfully`);
      
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete document: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      'uploaded': 'secondary',
      'processing': 'warning',
      'completed': 'success',
      'failed': 'danger'
    };
    
    const icons = {
      'uploaded': 'fas fa-upload',
      'processing': 'fas fa-spinner fa-spin',
      'completed': 'fas fa-check-circle',
      'failed': 'fas fa-exclamation-triangle'
    };

    return (
      <Badge bg={variants[status] || 'secondary'}>
        <i className={icons[status] || 'fas fa-question'}></i>
        {' ' + (status || 'unknown').toUpperCase()}
      </Badge>
    );
  };

  const getDocumentTypeBadge = (type) => {
    const colors = {
      'invoice': 'primary',
      'receipt': 'success',
      'contract': 'warning',
      'id_document': 'info',
      'other': 'secondary'
    };

    return (
      <Badge bg={colors[type] || 'secondary'}>
        {type || 'Unknown'}
      </Badge>
    );
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

  const clearFilters = () => {
    setSearchTerm('');
    setFilterType('');
    fetchDocuments();
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchTerm || 
      doc.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.document_type && doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = !filterType || doc.document_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const documentTypes = [...new Set(documents.map(doc => doc.document_type).filter(Boolean))];

  if (loading && documents.length === 0) {
    return (
      <Container fluid className="py-4">
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="fw-bold">
          <i className="fas fa-file-invoice me-2 text-primary"></i>
          Documents
        </h1>
        <Button variant="primary" onClick={() => navigate('/')}>
          <i className="fas fa-plus me-2"></i>
          Upload New Documents
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          <i className="fas fa-check-circle me-2"></i>
          {success}
        </Alert>
      )}

      {processingStatus && (
        <ProcessingStatus 
          status={processingStatus} 
          className="mb-4"
        />
      )}

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header className="bg-transparent border-bottom border-light">
          <h5 className="mb-0">
            <i className="fas fa-search me-2 text-primary"></i>
            Search & Filter
          </h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={5}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="fas fa-search"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search by filename or document type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="">All Document Types</option>
                {documentTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-primary" 
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? (
                    <Spinner as="span" animation="border" size="sm" />
                  ) : (
                    <i className="fas fa-search"></i>
                  )}
                  {' '}Search
                </Button>
                <Button 
                  variant="outline-secondary"
                  onClick={clearFilters}
                >
                  <i className="fas fa-times"></i> Clear
                </Button>
                <Button 
                  variant="outline-info"
                  onClick={fetchDocuments}
                >
                  <i className="fas fa-sync-alt"></i> Refresh
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="d-flex justify-content-between align-items-center bg-transparent border-bottom border-light">
          <h5 className="mb-0">
            Documents ({filteredDocuments.length})
          </h5>
          {filteredDocuments.length > 0 && (
            <small className="text-muted">
              Total: {documents.length} documents
            </small>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-file-alt fa-4x text-muted mb-3"></i>
              <h5 className="text-muted">No documents found</h5>
              <p className="text-muted">
                {documents.length === 0 
                  ? "Upload some documents to get started" 
                  : "Try adjusting your search criteria"
                }
              </p>
              <Button variant="primary" onClick={() => navigate('/')}>
                <i className="fas fa-upload me-2"></i>
                Upload Documents
              </Button>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>
                      <i className="fas fa-file me-2"></i>
                      Filename
                    </th>
                    <th>
                      <i className="fas fa-tag me-2"></i>
                      Type
                    </th>
                    <th>
                      <i className="fas fa-info-circle me-2"></i>
                      Status
                    </th>
                    <th>
                      <i className="fas fa-percentage me-2"></i>
                      Confidence
                    </th>
                    <th>
                      <i className="fas fa-calendar me-2"></i>
                      Created
                    </th>
                    <th>
                      <i className="fas fa-cogs me-2"></i>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div>
                          <strong>{doc.filename}</strong>
                          {doc.processed_at && (
                            <div>
                              <small className="text-muted">
                                Processed: {new Date(doc.processed_at).toLocaleString()}
                              </small>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {doc.document_type ? 
                          getDocumentTypeBadge(doc.document_type) : 
                          <span className="text-muted">Not classified</span>
                        }
                      </td>
                      <td>{getStatusBadge(doc.status)}</td>
                      <td>
                        {doc.confidence_score ? (
                          <div>
                            <div className="progress" style={{ height: '6px' }}>
                              <div 
                                className="progress-bar" 
                                style={{ width: `${doc.confidence_score * 100}%` }}
                              ></div>
                            </div>
                            <small>{(doc.confidence_score * 100).toFixed(1)}%</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <small>{new Date(doc.created_at).toLocaleDateString()}</small>
                        <div>
                          <small className="text-muted">
                            {new Date(doc.created_at).toLocaleTimeString()}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => navigate(`/documents/${doc.id}`)}
                            title="View Document"
                          >
                            <i className="fas fa-eye"></i>
                          </Button>
                          
                          {doc.status === 'uploaded' && (
                            <Button
                              variant="outline-success"
                              size="sm"
                              onClick={() => handleProcessDocument(doc.id, doc.filename)}
                              title="Process Document"
                            >
                              <i className="fas fa-cog"></i>
                            </Button>
                          )}
                          
                          {doc.status === 'completed' && (
                            <Button
                              variant="outline-warning"
                              size="sm"
                              onClick={() => {
                                setSelectedDoc(doc);
                                setShowRedactModal(true);
                              }}
                              title="Redact Sensitive Information"
                            >
                              <i className="fas fa-user-secret"></i>
                            </Button>
                          )}
                          
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                            title="Delete Document"
                          >
                            <i className="fas fa-trash"></i>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Modal 
        show={showRedactModal} 
        onHide={() => setShowRedactModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-user-secret me-2"></i>
            Redact Sensitive Information
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDoc && (
            <div className="mb-3">
              <Alert variant="info">
                <strong>Document:</strong> {selectedDoc.filename}
              </Alert>
            </div>
          )}
          
          <p className="mb-3">
            Select the types of sensitive information you want to redact from this document:
          </p>
          
          <Row>
            {Object.entries(redactionOptions).map(([key, value]) => (
              <Col md={6} key={key} className="mb-3">
                <Form.Check
                  type="checkbox"
                  id={`redact-${key}`}
                  label={
                    <span>
                      <i className={`fas fa-${getRedactionIcon(key)} me-2`}></i>
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  }
                  checked={value}
                  onChange={(e) => setRedactionOptions({
                    ...redactionOptions,
                    [key]: e.target.checked
                  })}
                />
              </Col>
            ))}
          </Row>
          
          <Alert variant="warning" className="mt-3">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Warning:</strong> Redaction cannot be undone. Make sure to download the original document first if needed.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRedactModal(false)}>
            <i className="fas fa-times me-2"></i>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleRedact}
            disabled={!Object.values(redactionOptions).some(v => v)}
          >
            <i className="fas fa-user-secret me-2"></i>
            Redact Document
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Documents;
