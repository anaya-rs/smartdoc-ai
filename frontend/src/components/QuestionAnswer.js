import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Badge, ListGroup, Spinner } from 'react-bootstrap';
import axios from 'axios';

const QuestionAnswer = ({ documentId }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetchSuggestions();
  }, [documentId]);

  const fetchSuggestions = async () => {
    try {
      const response = await axios.get(`/suggestions/${documentId}`);
      setSuggestions(response.data.suggestions);
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
  };

  const askQuestion = async (questionText = question) => {
    if (!questionText.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`/ask/${documentId}`, {
        question: questionText
      });

      const newQA = {
        id: Date.now(),
        question: questionText,
        answer: response.data.answer,
        confidence: response.data.confidence,
        questionType: response.data.question_type,
        sources: response.data.sources,
        timestamp: new Date()
      };

      setChatHistory(prev => [...prev, newQA]);
      setAnswer(newQA);
      setQuestion('');
    } catch (err) {
      setError('Failed to process question: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    askQuestion();
  };

  const handleSuggestionClick = (suggestionText) => {
    setQuestion(suggestionText);
    askQuestion(suggestionText);
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 0.8) return <Badge bg="success">High Confidence</Badge>;
    if (confidence >= 0.6) return <Badge bg="warning">Medium Confidence</Badge>;
    return <Badge bg="secondary">Low Confidence</Badge>;
  };

  return (
    <div>
      {/* Question Input */}
      <Card className="mb-3">
        <Card.Header>
          <h6>
            <i className="fas fa-question-circle me-2"></i>
            Ask Questions About This Document
          </h6>
        </Card.Header>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <div className="d-flex gap-2">
              <Form.Control
                type="text"
                placeholder="Ask a question about this document..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                disabled={loading}
              />
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading || !question.trim()}
              >
                {loading ? (
                  <Spinner size="sm" />
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
            </div>
          </Form>

          {error && (
            <Alert variant="danger" className="mt-2">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {/* Suggested Questions */}
      {suggestions.length > 0 && (
        <Card className="mb-3">
          <Card.Header>
            <small className="text-muted">
              <i className="fas fa-lightbulb me-2"></i>
              Suggested Questions
            </small>
          </Card.Header>
          <Card.Body>
            <div className="d-flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleSuggestionClick(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Chat History */}
      {chatHistory.length > 0 && (
        <Card>
          <Card.Header>
            <h6>
              <i className="fas fa-comments me-2"></i>
              Q&A History
            </h6>
          </Card.Header>
          <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <ListGroup variant="flush">
              {chatHistory.map((qa) => (
                <ListGroup.Item key={qa.id} className="border-0 px-0">
                  {/* Question */}
                  <div className="mb-2">
                    <strong className="text-primary">
                      <i className="fas fa-user me-2"></i>
                      Q: {qa.question}
                    </strong>
                  </div>
                  
                  {/* Answer */}
                  <div className="mb-2">
                    <i className="fas fa-robot me-2 text-success"></i>
                    <strong>A:</strong> {qa.answer}
                  </div>
                  
                  {/* Metadata */}
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      {getConfidenceBadge(qa.confidence)}
                      <Badge bg="info" className="ms-2">{qa.questionType}</Badge>
                      {qa.sources.map((source, idx) => (
                        <Badge key={idx} bg="secondary" className="ms-1">
                          {source}
                        </Badge>
                      ))}
                    </div>
                    <small className="text-muted">
                      {qa.timestamp.toLocaleTimeString()}
                    </small>
                  </div>
                  
                  {qa !== chatHistory[chatHistory.length - 1] && (
                    <hr className="mt-2" />
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default QuestionAnswer;
