import React from 'react';
import { Badge } from 'react-bootstrap';

const DocumentSummary = ({ document }) => {
  const generateSummary = () => {
    if (!document.extracted_text) {
      return "This document could not be processed or contains no extractable text content.";
    }

    const text = document.extracted_text.toLowerCase();
    const wordCount = document.extracted_text.split(' ').length;
    const hasNumbers = /\d/.test(document.extracted_text);
    const hasAmounts = /(\$|₹|rs\.?|amount|total|cost|price)/.test(text);
    const hasDates = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|january|february|march|april|may|june|july|august|september|october|november|december)/.test(text);
    const hasNames = /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(document.extracted_text);
    
    let summary = "";
    let documentType = "document";
    let purpose = "";
    let keyInfo = [];

    if (text.includes('invoice') || text.includes('bill') || (text.includes('amount') && text.includes('due'))) {
      documentType = "invoice or billing document";
      purpose = "for payment processing and financial record-keeping";
      if (hasAmounts) keyInfo.push("payment amounts");
      if (hasDates) keyInfo.push("due dates");
    } else if (text.includes('receipt') || (text.includes('paid') && text.includes('total'))) {
      documentType = "receipt or payment confirmation";
      purpose = "as proof of purchase or payment";
      if (hasAmounts) keyInfo.push("transaction amounts");
      if (hasDates) keyInfo.push("transaction dates");
    } else if (text.includes('contract') || text.includes('agreement') || text.includes('terms')) {
      documentType = "contract or agreement";
      purpose = "outlining terms, conditions, and obligations between parties";
      if (hasNames) keyInfo.push("contracting parties");
      if (hasDates) keyInfo.push("contract duration");
    } else if (text.includes('report') || text.includes('analysis') || text.includes('findings')) {
      documentType = "report or analytical document";
      purpose = "presenting information, findings, or analysis";
      if (hasNumbers) keyInfo.push("statistical data");
    } else if (text.includes('id') || text.includes('identity') || text.includes('license') || text.includes('passport')) {
      documentType = "identification document";
      purpose = "for identity verification and official records";
      if (hasNames) keyInfo.push("personal information");
      if (hasDates) keyInfo.push("validity dates");
    } else if (text.includes('letter') || text.includes('dear') || text.includes('sincerely')) {
      documentType = "letter or correspondence";
      purpose = "for communication and information exchange";
    }

    summary = `This ${documentType} contains approximately ${wordCount} words and appears to be used ${purpose}.`;

    const insights = [];
    if (hasAmounts) insights.push("financial information");
    if (hasDates) insights.push("important dates");
    if (hasNames) insights.push("personal or company names");
    if (document.tables?.length > 0) insights.push(`${document.tables.length} structured table${document.tables.length > 1 ? 's' : ''}`);
    if (document.key_value_pairs?.extracted_pairs && Object.keys(document.key_value_pairs.extracted_pairs).length > 0) {
      insights.push(`${Object.keys(document.key_value_pairs.extracted_pairs).length} key-value pairs`);
    }

    if (insights.length > 0) {
      summary += ` The document includes ${insights.slice(0, -1).join(', ')}${insights.length > 1 ? ' and ' + insights[insights.length - 1] : insights[0]}.`;
    }

    // Add processing quality note
    if (document.confidence_score) {
      const quality = document.confidence_score > 0.8 ? 'high' : document.confidence_score > 0.6 ? 'good' : 'moderate';
      summary += ` The document was processed with ${quality} confidence (${Math.round(document.confidence_score * 100)}%).`;
    }

    return summary;
  };

  const getDocumentInsights = () => {
    const insights = [];
    
    if (document.extracted_text) {
      const wordCount = document.extracted_text.split(' ').length;
      insights.push({
        icon: 'fa-file-word',
        label: 'Word Count',
        value: wordCount.toLocaleString(),
        color: 'primary'
      });
    }

    if (document.tables?.length > 0) {
      insights.push({
        icon: 'fa-table',
        label: 'Tables',
        value: document.tables.length,
        color: 'success'
      });
    }

    if (document.key_value_pairs?.extracted_pairs) {
      const kvCount = Object.keys(document.key_value_pairs.extracted_pairs).length;
      if (kvCount > 0) {
        insights.push({
          icon: 'fa-key',
          label: 'Data Points',
          value: kvCount,
          color: 'warning'
        });
      }
    }

    if (document.confidence_score) {
      insights.push({
        icon: 'fa-chart-line',
        label: 'Confidence',
        value: `${Math.round(document.confidence_score * 100)}%`,
        color: document.confidence_score > 0.8 ? 'success' : document.confidence_score > 0.6 ? 'warning' : 'danger'
      });
    }

    return insights;
  };

  return (
    <div className="document-summary">
      {/* Main Summary */}
      <div className="summary-text mb-4 p-4 bg-light rounded border-start border-primary border-4">
        <h6 className="fw-semibold text-primary mb-3">
          <i className="fas fa-info-circle me-2"></i>
          Document Analysis
        </h6>
        <p className="mb-0" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          {generateSummary()}
        </p>
      </div>

      {/* Key Insights */}
      <div className="insights-grid">
        <h6 className="fw-semibold mb-3">
          <i className="fas fa-lightbulb me-2 text-warning"></i>
          Key Insights
        </h6>
        <div className="row g-3">
          {getDocumentInsights().map((insight, index) => (
            <div key={index} className="col-sm-6">
              <div className="insight-card p-3 bg-light rounded border h-100">
                <div className="d-flex align-items-center">
                  <div className={`rounded-circle p-2 me-3 bg-${insight.color} bg-opacity-10`}>
                    <i className={`fas ${insight.icon} text-${insight.color}`}></i>
                  </div>
                  <div>
                    <div className="fw-bold text-primary">{insight.value}</div>
                    <small className="text-muted">{insight.label}</small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Badge bg="primary" className="px-4 py-2 text-capitalize">
          <i className="fas fa-tag me-2"></i>
          {document.document_type ? document.document_type.replace('_', ' ') : 'Auto-detected Document'}
        </Badge>
      </div>
    </div>
  );
};

export default DocumentSummary;
