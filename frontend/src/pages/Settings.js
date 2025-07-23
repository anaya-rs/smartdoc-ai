import React, { useState } from 'react';
import { Row, Col, Card, Form, Button, Alert, Table } from 'react-bootstrap';
import { useAuth } from '../services/auth';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    autoProcess: true,
    autoRedact: false,
    defaultRedactionOptions: {
      names: true,
      emails: true,
      phones: true,
      ssn: true,
      addresses: false,
      dates_of_birth: true,
      credit_cards: true
    },
    ocrLanguage: 'eng',
    processingQuality: 'standard'
  });
  const [success, setSuccess] = useState('');

  const handleSaveSettings = (e) => {
    e.preventDefault();
    // Save settings to localStorage for demo
    localStorage.setItem('smartdoc_settings', JSON.stringify(settings));
    setSuccess('Settings saved successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleRedactionOptionChange = (option, value) => {
    setSettings({
      ...settings,
      defaultRedactionOptions: {
        ...settings.defaultRedactionOptions,
        [option]: value
      }
    });
  };

  return (
    <div>
      <h1 className="mb-4">Settings</h1>

      {success && <Alert variant="success">{success}</Alert>}

      <Row>
        {/* User Profile */}
        <Col md={4} className="mb-4">
          <Card>
            <Card.Header>
              <h5>User Profile</h5>
            </Card.Header>
            <Card.Body>
              <Table borderless>
                <tbody>
                  <tr>
                    <td><strong>Username:</strong></td>
                    <td>{user?.username || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>User ID:</strong></td>
                    <td>{user?.id || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Account Type:</strong></td>
                    <td>Demo User</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Processing Settings */}
        <Col md={8} className="mb-4">
          <Card>
            <Card.Header>
              <h5>Processing Settings</h5>
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleSaveSettings}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="autoProcess"
                        label="Auto-process uploaded documents"
                        checked={settings.autoProcess}
                        onChange={(e) => setSettings({...settings, autoProcess: e.target.checked})}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Check
                        type="checkbox"
                        id="autoRedact"
                        label="Auto-redact sensitive information"
                        checked={settings.autoRedact}
                        onChange={(e) => setSettings({...settings, autoRedact: e.target.checked})}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>OCR Language</Form.Label>
                      <Form.Select
                        value={settings.ocrLanguage}
                        onChange={(e) => setSettings({...settings, ocrLanguage: e.target.value})}
                      >
                        <option value="eng">English</option>
                        <option value="spa">Spanish</option>
                        <option value="fra">French</option>
                        <option value="deu">German</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Processing Quality</Form.Label>
                      <Form.Select
                        value={settings.processingQuality}
                        onChange={(e) => setSettings({...settings, processingQuality: e.target.value})}
                      >
                        <option value="fast">Fast</option>
                        <option value="standard">Standard</option>
                        <option value="high">High Quality</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Button variant="primary" type="submit">
                  Save Settings
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Default Redaction Options */}
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>Default Redaction Options</h5>
            </Card.Header>
            <Card.Body>
              <p className="text-muted">
                Configure which types of sensitive information to redact by default
              </p>
              <Row>
                {Object.entries(settings.defaultRedactionOptions).map(([option, value]) => (
                  <Col md={4} key={option} className="mb-3">
                    <Form.Check
                      type="checkbox"
                      id={option}
                      label={option.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      checked={value}
                      onChange={(e) => handleRedactionOptionChange(option, e.target.checked)}
                    />
                  </Col>
                ))}
              </Row>
              <Button 
                variant="outline-primary" 
                onClick={handleSaveSettings}
              >
                Update Redaction Defaults
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* System Information */}
      <Row>
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>System Information</h5>
            </Card.Header>
            <Card.Body>
              <Table striped>
                <tbody>
                  <tr>
                    <td><strong>Application Version:</strong></td>
                    <td>1.0.0</td>
                  </tr>
                  <tr>
                    <td><strong>Backend Status:</strong></td>
                    <td><span className="badge bg-success">Connected</span></td>
                  </tr>
                  <tr>
                    <td><strong>OCR Engine:</strong></td>
                    <td>Tesseract 5.0+</td>
                  </tr>
                  <tr>
                    <td><strong>Supported Formats:</strong></td>
                    <td>PDF, JPEG, PNG, TIFF, BMP</td>
                  </tr>
                  <tr>
                    <td><strong>Max File Size:</strong></td>
                    <td>16 MB</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Settings;
