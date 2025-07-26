import { useEffect, useState, useRef } from 'react';

export const useDocumentProcessing = (documentId) => {
  const [processingLogs, setProcessingLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [processingStatus, setProcessingStatus] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!documentId) {
      setProcessingLogs([]);
      setIsConnected(false);
      return;
    }

    const ws = new WebSocket(`ws://localhost:8000/ws/processing/${documentId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to processing updates');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Add to logs
        setProcessingLogs(prev => [...prev, {
          id: Date.now(),
          message: data.message,
          step: data.step,
          timestamp: data.timestamp
        }]);

        // Update status
        setProcessingStatus(data);
        
        // Auto-clear after completion
        if (data.step === 'completed' || data.step === 'failed') {
          setTimeout(() => {
            setProcessingLogs([]);
            setProcessingStatus(null);
          }, 10000); // Clear after 10 seconds
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from processing updates');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [documentId]);

  return { processingLogs, processingStatus, isConnected };
};
