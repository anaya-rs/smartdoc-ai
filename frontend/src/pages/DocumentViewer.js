import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Row, Col, Card, Button, Table, Alert, Spinner, 
  Tabs, Tab, Badge, Form, Modal 
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

  // FIXED DOWNLOAD FUNCTIONS with proper DOM handling and error checking
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

  const downloadAllTables = () => {
    if (document.tables?.length > 0) {
      document.tables.forEach((table, idx) => {
        setTimeout(() => {
          downloadCSV(table, `${document.filename}_table_${table.table_id || idx + 1}`);
        }, idx * 100); // Small delay between downloads
      });
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading document...</span>
        </Spinner>
        <div className="ms-3">
          <h6>Loading document details...</h6>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <Alert variant="danger">
        <i className="fas fa-exclamation-triangle me-2"></i>
        {error || 'Document not found'}
        <div className="mt-2">
          <Button variant="outline-danger" onClick={() => navigate('/documents')}>
            <i className="fas fa-arrow-left me-2"></i>
            Back to Documents
          </Button>
          <Button variant="outline-secondary" className="ms-2" onClick={fetchDocument}>
            <i className="fas fa-sync me-2"></i>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            variant="outline-secondary" 
            className="me-3"
            onClick={() => navigate('/documents')}
          >
            <i className="fas fa-arrow-left"></i> Back
          </Button>
          <div className="d-inline-block">
            <h1 className="mb-0">{document.filename}</h1>
            <small className="text-muted">Document ID: {document.id}</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button 
            variant="outline-info"
            onClick={fetchDocument}
          >
            <i className="fas fa-sync"></i> Refresh
          </Button>
          <Button 
            variant="success"
            onClick={() => setShowExportModal(true)}
          >
            <i className="fas fa-download"></i> Export Data
          </Button>
        </div>
      </div>

      {/* Document Info Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-file-alt fa-2x text-primary mb-2"></i>
              <h4 className="text-primary">{document.document_type || 'Unknown'}</h4>
              <p className="text-muted mb-0">Document Type</p>
              {document.confidence_score && (
                <Badge bg="success" className="mt-2">
                  {(document.confidence_score * 100).toFixed(1)}% Confidence
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-table fa-2x text-info mb-2"></i>
              <h4 className="text-info">{document.tables?.length || 0}</h4>
              <p className="text-muted mb-0">Tables Found</p>
              {document.tables?.length > 0 && (
                <Badge bg="info" className="mt-2">
                  {document.tables.reduce((acc, table) => acc + (table.data?.length || 0), 0)} Total Rows
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-key fa-2x text-warning mb-2"></i>
              <h4 className="text-warning">
                {document.key_value_pairs?.pair_count || 0}
              </h4>
              <p className="text-muted mb-0">Key-Value Pairs</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm">
            <Card.Body>
              <i className="fas fa-font fa-2x text-success mb-2"></i>
              <h4 className="text-success">
                {document.bounding_boxes?.length || 0}
              </h4>
              <p className="text-muted mb-0">Text Elements</p>
              {document.extracted_text && (
                <Badge bg="success" className="mt-2">
                  {document.extracted_text.split(' ').length} Words
                </Badge>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        className="mb-3"
      >
        <Tab eventKey="overview" title={<span><i className="fas fa-info-circle me-1"></i>Overview</span>}>
          <Row>
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Header>
                  <h5><i className="fas fa-file-contract me-2"></i>Document Information</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <tbody>
                      <tr>
                        <td><strong>Filename</strong></td>
                        <td>{document.filename}</td>
                      </tr>
                      <tr>
                        <td><strong>Document Type</strong></td>
                        <td>
                          <Badge bg="info">{document.document_type || 'Unknown'}</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Confidence Score</strong></td>
                        <td>
                          {document.confidence_score ? (
                            <div>
                              <div className="progress mb-1" style={{ height: '6px' }}>
                                <div 
                                  className="progress-bar bg-success" 
                                  style={{ width: `${document.confidence_score * 100}%` }}
                                ></div>
                              </div>
                              {(document.confidence_score * 100).toFixed(1)}%
                            </div>
                          ) : 'N/A'}
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Status</strong></td>
                        <td>
                          <Badge bg={document.status === 'completed' ? 'success' : 
                                     document.status === 'failed' ? 'danger' : 'warning'}>
                            {document.status}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Created</strong></td>
                        <td>{new Date(document.created_at).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td><strong>Processed</strong></td>
                        <td>
                          {document.processed_at ? 
                            new Date(document.processed_at).toLocaleString() : 
                            <span className="text-muted">Not processed</span>
                          }
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="shadow-sm">
                <Card.Header>
                  <h5><i className="fas fa-chart-bar me-2"></i>Processing Statistics</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <tbody>
                      <tr>
                        <td><strong>Text Elements</strong></td>
                        <td>
                          <Badge bg="primary">{document.bounding_boxes?.length || 0}</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Tables Extracted</strong></td>
                        <td>
                          <Badge bg="info">{document.tables?.length || 0}</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Key-Value Pairs</strong></td>
                        <td>
                          <Badge bg="warning">{document.key_value_pairs?.pair_count || 0}</Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Word Count</strong></td>
                        <td>
                          <Badge bg="success">
                            {document.extracted_text ? 
                              document.extracted_text.split(' ').length : 0
                            }
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Character Count</strong></td>
                        <td>
                          <Badge bg="secondary">
                            {document.extracted_text?.length || 0}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Redacted</strong></td>
                        <td>
                          {document.redacted_data ? 
                            <Badge bg="warning">Yes ({document.redacted_data.redaction_count} items)</Badge> : 
                            <Badge bg="secondary">No</Badge>
                          }
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="text" title={<span><i className="fas fa-align-left me-1"></i>Extracted Text</span>}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between">
              <h5><i className="fas fa-file-text me-2"></i>Extracted Text</h5>
              <div>
                <Badge bg="info" className="me-2">
                  {document.extracted_text ? document.extracted_text.split(' ').length : 0} words
                </Badge>
                <Button variant="outline-primary" size="sm" onClick={downloadText}>
                  <i className="fas fa-download"></i> Download Text
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <div 
                style={{
                  background: '#f8f9fa',
                  padding: '1.5rem',
                  borderRadius: '0.5rem',
                  maxHeight: '600px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  border: '1px solid #e9ecef'
                }}
              >
                {document.redacted_data?.redacted_text || document.extracted_text || 'No text extracted from this document.'}
              </div>
              {!document.extracted_text && (
                <Alert variant="warning" className="mt-3">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  No text was extracted from this document. This might be because the document is image-based or the OCR processing failed.
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="keyvalue" title={<span><i className="fas fa-key me-1"></i>Key-Value Pairs</span>}>
          <Card className="shadow-sm">
            <Card.Header className="d-flex justify-content-between">
              <h5><i className="fas fa-list me-2"></i>Extracted Key-Value Pairs</h5>
              {document.key_value_pairs?.extracted_pairs && (
                <Badge bg="info">
                  {Object.keys(document.key_value_pairs.extracted_pairs).length} pairs found
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              {document.key_value_pairs?.extracted_pairs && Object.keys(document.key_value_pairs.extracted_pairs).length > 0 ? (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Key</th>
                      <th style={{ width: '60%' }}>Value</th>
                      <th style={{ width: '10%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(document.key_value_pairs.extracted_pairs).map(([key, value]) => (
                      <tr key={key}>
                        <td>
                          <strong className="text-primary">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </strong>
                        </td>
                        <td>
                          <span className="font-monospace">{value}</span>
                        </td>
                        <td>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigator.clipboard.writeText(value)}
                            title="Copy value"
                          >
                            <i className="fas fa-copy"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <div className="text-center py-5">
                  <i className="fas fa-search fa-3x text-muted mb-3"></i>
                  <h6 className="text-muted">No key-value pairs extracted</h6>
                  <p className="text-muted">
                    This might be because the document doesn't contain structured data or the extraction patterns didn't match.
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="tables" title={<span><i className="fas fa-table me-1"></i>Tables ({document.tables?.length || 0})</span>}>
          {document.tables?.length > 0 ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5><i className="fas fa-table me-2"></i>Extracted Tables</h5>
                <Button variant="outline-success" onClick={downloadAllTables}>
                  <i className="fas fa-download me-2"></i>Download All Tables
                </Button>
              </div>
              {document.tables.map((table, index) => (
                <Card key={index} className="mb-4 shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="mb-1">
                        <i className="fas fa-table me-2"></i>
                        Table {table.table_id || index + 1} 
                        {table.page && <span className="text-muted"> (Page {table.page})</span>}
                      </h6>
                      <small className="text-muted">
                        {table.rows || table.data?.length || 0} rows × {table.columns || (table.data?.[0] ? Object.keys(table.data[0]).length : 0)} columns
                        {table.extraction_method && <span> • Extracted using {table.extraction_method}</span>}
                      </small>
                    </div>
                    <div>
                      {table.accuracy && (
                        <Badge bg={table.accuracy > 80 ? 'success' : table.accuracy > 60 ? 'warning' : 'danger'} className="me-2">
                          Accuracy: {table.accuracy}%
                        </Badge>
                      )}
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => downloadCSV(table, `${document.filename}_table_${table.table_id || index + 1}`)}
                      >
                        <i className="fas fa-download"></i> CSV
                      </Button>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                      {table.data && table.data.length > 0 ? (
                        <Table striped bordered hover size="sm" responsive>
                          <thead className="table-dark">
                            <tr>
                              <th style={{ minWidth: '50px' }}>#</th>
                              {table.data[0] && Object.keys(table.data[0]).map((header, idx) => (
                                <th key={idx} style={{ minWidth: '100px' }}>
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.data.map((row, rowIdx) => (
                              <tr key={rowIdx}>
                                <td className="text-muted">{rowIdx + 1}</td>
                                {Object.values(row).map((cell, cellIdx) => (
                                  <td key={cellIdx}>{cell || <span className="text-muted">—</span>}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      ) : (
                        <Alert variant="warning">
                          <i className="fas fa-exclamation-triangle me-2"></i>
                          Table data is not available or could not be parsed correctly.
                        </Alert>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-sm">
              <Card.Body className="text-center py-5">
                <i className="fas fa-table fa-4x text-muted mb-3"></i>
                <h6 className="text-muted">No tables found in this document</h6>
                <p className="text-muted">
                  This document either doesn't contain tables or they couldn't be detected by our table extraction algorithms.
                </p>
              </Card.Body>
            </Card>
          )}
        </Tab>
        <Tab eventKey="qa" title={<span><i className="fas fa-question-circle me-1"></i>Q&A</span>}>
           <QuestionAnswer documentId={document.id} />
        </Tab>

        <Tab eventKey="redaction" title={<span><i className="fas fa-user-secret me-1"></i>Redaction</span>}>
          <Card className="shadow-sm">
            <Card.Header>
              <h5><i className="fas fa-shield-alt me-2"></i>Data Redaction Information</h5>
            </Card.Header>
            <Card.Body>
              {document.redacted_data ? (
                <div>
                  <Alert variant="warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    <strong>This document has been redacted.</strong> 
                    {document.redacted_data.redaction_count} sensitive items were found and redacted.
                  </Alert>
                  
                  {document.redacted_data.redactions && document.redacted_data.redactions.length > 0 && (
                    <>
                      <h6><i className="fas fa-list me-2"></i>Redacted Items:</h6>
                      <Table striped size="sm" responsive>
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Original Value</th>
                            <th>Replacement</th>
                          </tr>
                        </thead>
                        <tbody>
                          {document.redacted_data.redactions.map((redaction, index) => (
                            <tr key={index}>
                              <td>
                                <Badge bg="warning">{redaction.type.toUpperCase()}</Badge>
                              </td>
                              <td>
                                <code className="text-danger">{redaction.original}</code>
                              </td>
                              <td>
                                <code className="text-muted">[{redaction.type.toUpperCase()}_REDACTED]</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </div>
              ) : (
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  This document has not been redacted yet. You can redact sensitive information to protect privacy.
                  <div className="mt-2">
                    <Button variant="outline-warning" size="sm">
                      <i className="fas fa-user-secret me-2"></i>
                      Start Redaction Process
                    </Button>
                  </div>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Export Modal */}
      <Modal show={showExportModal} onHide={() => setShowExportModal(false)} size="md">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="fas fa-download me-2"></i>
            Export Document Data
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Choose the format to export your document data:</p>
          <div className="d-grid gap-2">
            <Button 
              variant="outline-primary" 
              onClick={() => {
                downloadText();
                setShowExportModal(false);
              }}
              disabled={!document.extracted_text}
            >
              <i className="fas fa-file-alt me-2"></i>
              Export Extracted Text (.txt)
              {!document.extracted_text && <Badge bg="secondary" className="ms-2">No text</Badge>}
            </Button>
            <Button 
              variant="outline-success"
              onClick={() => {
                downloadJSON(document, document.filename);
                setShowExportModal(false);
              }}
            >
              <i className="fas fa-code me-2"></i>
              Export Complete Data (.json)
              <Badge bg="info" className="ms-2">Full document</Badge>
            </Button>
            {document.tables?.length > 0 && (
              <Button
                variant="outline-info"
                onClick={() => {
                  downloadAllTables();
                  setShowExportModal(false);
                }}
              >
                <i className="fas fa-table me-2"></i>
                Export All Tables (.csv)
                <Badge bg="primary" className="ms-2">{document.tables.length} tables</Badge>
              </Button>
            )}
            {document.key_value_pairs?.extracted_pairs && (
              <Button
                variant="outline-warning"
                onClick={() => {
                  downloadJSON(document.key_value_pairs.extracted_pairs, `${document.filename}_keyvalue`);
                  setShowExportModal(false);
                }}
              >
                <i className="fas fa-key me-2"></i>
                Export Key-Value Pairs (.json)
                <Badge bg="warning" className="ms-2">{Object.keys(document.key_value_pairs.extracted_pairs).length} pairs</Badge>
              </Button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            <i className="fas fa-times me-2"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DocumentViewer;
