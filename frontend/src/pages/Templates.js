import React, { useState, useEffect } from 'react';
import { 
  Row, Col, Card, Button, Form, Table, Alert, 
  Modal, Badge, ListGroup 
} from 'react-bootstrap';
import axios from 'axios';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
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
    x: 0,
    y: 0,
    width: 100,
    height: 20
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/templates');
      setTemplates(response.data);
    } catch (err) {
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', newTemplate.name);
      formData.append('document_type', newTemplate.document_type);
      formData.append('description', newTemplate.description);
      formData.append('fields', JSON.stringify(newTemplate.fields));

      await axios.post('/templates', formData);
      
      setSuccess('Template created successfully!');
      setShowCreateModal(false);
      setNewTemplate({
        name: '',
        document_type: '',
        description: '',
        fields: []
      });
      fetchTemplates();
    } catch (err) {
      setError('Failed to create template');
    }
  };

  const addField = () => {
    if (!currentField.name) return;
    
    setNewTemplate({
      ...newTemplate,
      fields: [...newTemplate.fields, { ...currentField, id: Date.now() }]
    });
    
    setCurrentField({
      name: '',
      type: 'text',
      required: true,
      x: 0,
      y: 0,
      width: 100,
      height: 20
    });
  };

  const removeField = (fieldId) => {
    setNewTemplate({
      ...newTemplate,
      fields: newTemplate.fields.filter(field => field.id !== fieldId)
    });
  };

  const documentTypes = ['invoice', 'receipt', 'contract', 'id_document', 'other'];
  const fieldTypes = ['text', 'number', 'date', 'email', 'phone', 'currency'];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Extraction Templates</h1>
        <Button variant="success" onClick={() => setShowCreateModal(true)}>
          <i className="fas fa-plus"></i> Create Template
        </Button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {/* Templates Grid */}
      <Row>
        {templates.length === 0 ? (
          <Col md={12}>
            <Card>
              <Card.Body className="text-center py-5">
                <i className="fas fa-file-contract fa-3x text-muted mb-3"></i>
                <h5 className="text-muted">No templates created yet</h5>
                <p className="text-muted">Create custom extraction templates for your document types</p>
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  Create Your First Template
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ) : (
          templates.map((template) => (
            <Col md={6} lg={4} key={template.id} className="mb-4">
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{template.name}</h6>
                    <Badge bg="info">{template.document_type}</Badge>
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted">{template.description || 'No description'}</p>
                  <small className="text-muted">
                    {template.fields?.length || 0} fields configured
                  </small>
                  <div className="mt-3">
                    <small className="text-muted">
                      Created: {new Date(template.created_at).toLocaleDateString()}
                    </small>
                  </div>
                </Card.Body>
                <Card.Footer>
                  <Button variant="outline-primary" size="sm" className="me-2">
                    Edit
                  </Button>
                  <Button variant="outline-danger" size="sm">
                    Delete
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Create Template Modal */}
      <Modal 
        show={showCreateModal} 
        onHide={() => setShowCreateModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Create Extraction Template</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateTemplate}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Template Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    required
                    placeholder="e.g., Vendor ABC Invoice Template"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Document Type</Form.Label>
                  <Form.Select
                    value={newTemplate.document_type}
                    onChange={(e) => setNewTemplate({...newTemplate, document_type: e.target.value})}
                    required
                  >
                    <option value="">Select document type</option>
                    {documentTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Describe what this template is for..."
              />
            </Form.Group>

            <hr />

            <h6>Field Configuration</h6>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Field Name</Form.Label>
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
                  <Form.Label>Field Type</Form.Label>
                  <Form.Select
                    value={currentField.type}
                    onChange={(e) => setCurrentField({...currentField, type: e.target.value})}
                  >
                    {fieldTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Required</Form.Label>
                  <Form.Check
                    type="checkbox"
                    checked={currentField.required}
                    onChange={(e) => setCurrentField({...currentField, required: e.target.checked})}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>&nbsp;</Form.Label>
                  <Button variant="outline-primary" className="w-100" onClick={addField}>
                    Add Field
                  </Button>
                </Form.Group>
              </Col>
            </Row>

            {/* Position Configuration */}
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>X Position</Form.Label>
                  <Form.Control
                    type="number"
                    value={currentField.x}
                    onChange={(e) => setCurrentField({...currentField, x: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Y Position</Form.Label>
                  <Form.Control
                    type="number"
                    value={currentField.y}
                    onChange={(e) => setCurrentField({...currentField, y: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Width</Form.Label>
                  <Form.Control
                    type="number"
                    value={currentField.width}
                    onChange={(e) => setCurrentField({...currentField, width: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Height</Form.Label>
                  <Form.Control
                    type="number"
                    value={currentField.height}
                    onChange={(e) => setCurrentField({...currentField, height: parseInt(e.target.value)})}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Fields List */}
            {newTemplate.fields.length > 0 && (
              <div>
                <h6>Configured Fields ({newTemplate.fields.length})</h6>
                <ListGroup>
                  {newTemplate.fields.map((field) => (
                    <ListGroup.Item key={field.id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{field.name}</strong>
                        <Badge bg="secondary" className="ms-2">{field.type}</Badge>
                        {field.required && <Badge bg="warning" className="ms-1">Required</Badge>}
                        <br />
                        <small className="text-muted">
                          Position: ({field.x}, {field.y}) Size: {field.width}x{field.height}
                        </small>
                      </div>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeField(field.id)}
                      >
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="success" type="submit" disabled={!newTemplate.name || !newTemplate.document_type}>
              Create Template
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default Templates;
