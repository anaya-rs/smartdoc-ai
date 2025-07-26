import React from 'react';
import { Card, Badge, Alert } from 'react-bootstrap';

const ProcessingStatus = ({ logs, status, className = "" }) => {
  if (!logs || logs.length === 0) return null;

  const getStatusColor = (step) => {
    switch (step) {
      case 'processing': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      default: return 'info';
    }
  };

  const getStatusIcon = (step) => {
    switch (step) {
      case 'processing': return 'fa-cog fa-spin';
      case 'completed': return 'fa-check-circle';
      case 'failed': return 'fa-exclamation-triangle';
      default: return 'fa-info-circle';
    }
  };

  return (
    <Card className={`border-0 shadow-sm ${className}`}>
      <Card.Header className="bg-dark text-white">
        <div className="d-flex align-items-center justify-content-between">
          <h6 className="mb-0 fw-semibold">
            <i className="fas fa-terminal me-2"></i>
            Live Processing Status
          </h6>
          {status && (
            <Badge bg={getStatusColor(status.step)}>
              <i className={`fas ${getStatusIcon(status.step)} me-1`}></i>
              {status.step}
            </Badge>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <div 
          className="processing-console bg-dark text-light p-3"
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: 'Monaco, Consolas, monospace',
            fontSize: '13px',
            lineHeight: '1.4'
          }}
        >
          {logs.map((log, index) => (
            <div key={log.id} className="console-line mb-1">
              <span className="text-success me-2">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <span className={`text-${getStatusColor(log.step) === 'primary' ? 'info' : getStatusColor(log.step)}`}>
                <i className={`fas ${getStatusIcon(log.step)} me-1`}></i>
                {log.message}
              </span>
            </div>
          ))}
          
          {status?.step === 'processing' && (
            <div className="console-line">
              <span className="text-primary">
                <i className="fas fa-spinner fa-spin me-2"></i>
                Processing...
              </span>
            </div>
          )}
        </div>
        
        {status?.step === 'completed' && (
          <Alert variant="success" className="mb-0 rounded-0">
            <i className="fas fa-check-circle me-2"></i>
            <strong>Processing Complete!</strong> Document ready for viewing.
          </Alert>
        )}
        
        {status?.step === 'failed' && (
          <Alert variant="danger" className="mb-0 rounded-0">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <strong>Processing Failed!</strong> Please try again.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default ProcessingStatus;
