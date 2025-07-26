import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, ListGroup, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';

const QuestionAnswer = ({ documentId }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, [documentId]);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`/suggestions/${documentId}`);
      setSuggestions(response.data.suggestions || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`/ask/${documentId}`, {
        question: question.trim()
      });
      
      const newQA = {
        question: question.trim(),
        ...response.data,
        timestamp: new Date().toLocaleTimeString()
      };
      
      setAnswer(newQA);
      setConversationHistory(prev => [newQA, ...prev]);
      setQuestion('');
      
    } catch (err) {
      console.error('Q&A error:', err);
      setError('Failed to get answer: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setQuestion(suggestion);
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    if (confidence >= 0.4) return 'info';
    return 'secondary';
  };

  const getConfidenceText = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  return (
    <div className="question-answer-container">
      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Question Input */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body className="p-4">
          <Form onSubmit={handleSubmit}>
            <div className="d-flex align-items-center mb-3">
              <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3">
                <i className="fas fa-question-circle text-primary"></i>
              </div>
              <h6 className="mb-0 fw-semibold">Ask a Question</h6>
            </div>
            
            <div className="d-flex gap-3 align-items-end">
              <div className="flex-grow-1">
                <Form.Control
                  type="text"
                  placeholder="Ask anything about this document..."
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  disabled={loading}
                  className="border-0 bg-light"
                  style={{
                    fontSize: '14px',
                    padding: '12px 16px',
                    borderRadius: '8px'
                  }}
                />
              </div>
              <Button 
                type="submit" 
                disabled={!question.trim() || loading}
                className="d-flex align-items-center gap-2 px-4"
                style={{ borderRadius: '8px', minWidth: '100px' }}
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Asking...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane"></i>
                    Ask
                  </>
                )}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Suggested Questions */}
      {suggestions.length > 0 && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-transparent border-bottom border-light">
            <div className="d-flex align-items-center">
              <div className="bg-info bg-opacity-10 rounded-circle p-2 me-3">
                <i className="fas fa-lightbulb text-info"></i>
              </div>
              <h6 className="mb-0 fw-semibold">Suggested Questions</h6>
            </div>
          </Card.Header>
          <Card.Body className="p-3">
            <div className="d-flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={loading}
                  className="rounded-pill"
                  style={{ 
                    fontSize: '13px',
                    padding: '6px 16px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Current Answer */}
      {answer && (
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-transparent border-bottom border-light">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3">
                  <i className="fas fa-robot text-success"></i>
                </div>
                <h6 className="mb-0 fw-semibold">Answer</h6>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Badge bg={getConfidenceColor(answer.confidence)} className="px-3 py-2">
                  {getConfidenceText(answer.confidence)} ({Math.round(answer.confidence * 100)}%)
                </Badge>
                <small className="text-muted">{answer.timestamp}</small>
              </div>
            </div>
          </Card.Header>
          <Card.Body className="p-4">
            <div className="mb-3">
              <div className="bg-light rounded p-3 mb-3">
                <div className="d-flex align-items-start">
                  <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-3 mt-1" style={{minWidth: '36px'}}>
                    <i className="fas fa-user text-primary" style={{fontSize: '14px'}}></i>
                  </div>
                  <div className="flex-grow-1">
                    <strong className="text-primary">You asked:</strong>
                    <p className="mb-0 mt-1" style={{fontSize: '14px'}}>{answer.question}</p>
                  </div>
                </div>
              </div>
              
              <div className="d-flex align-items-start">
                <div className="bg-success bg-opacity-10 rounded-circle p-2 me-3 mt-1" style={{minWidth: '36px'}}>
                  <i className="fas fa-robot text-success" style={{fontSize: '14px'}}></i>
                </div>
                <div className="flex-grow-1">
                  <strong className="text-success">SmartDoc AI:</strong>
                  <div className="mt-2" style={{fontSize: '14px', lineHeight: '1.6'}}>
                    {answer.answer}
                  </div>
                </div>
              </div>
            </div>
            
            {answer.sources && answer.sources.length > 0 && (
              <div className="border-top pt-3">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Sources: {answer.sources.join(', ')}
                </small>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 1 && (
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent border-bottom border-light">
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <div className="bg-secondary bg-opacity-10 rounded-circle p-2 me-3">
                  <i className="fas fa-history text-secondary"></i>
                </div>
                <h6 className="mb-0 fw-semibold">Previous Questions</h6>
              </div>
              <Badge bg="secondary" pill>{conversationHistory.length - 1}</Badge>
            </div>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
              {conversationHistory.slice(1).map((qa, index) => (
                <div key={index} className="border-bottom border-light p-4">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <strong className="text-primary" style={{fontSize: '14px'}}>
                      Q: {qa.question}
                    </strong>
                    <div className="d-flex align-items-center gap-2">
                      <Badge bg={getConfidenceColor(qa.confidence)} size="sm">
                        {Math.round(qa.confidence * 100)}%
                      </Badge>
                      <small className="text-muted">{qa.timestamp}</small>
                    </div>
                  </div>
                  <div className="text-muted" style={{fontSize: '13px', lineHeight: '1.5'}}>
                    <strong>A:</strong> {qa.answer}
                  </div>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default QuestionAnswer;
