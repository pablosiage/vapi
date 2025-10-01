import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketMessage, WebSocketSubscription } from '@vapi/shared';
import { apiService } from '../services/api';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscriptionRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    try {
      const ws = apiService.createWebSocketConnection();
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setConnected(true);
        
        // Resubscribe if we had a previous subscription
        if (subscriptionRef.current) {
          subscribe(subscriptionRef.current);
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'report_update') {
            setMessages(prev => [message, ...prev.slice(0, 99)]); // Keep last 100 messages
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setConnected(false);
        wsRef.current = null;
        
        // Auto-reconnect after a delay
        if (!event.wasClean) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnected(false);
    subscriptionRef.current = null;
  }, []);

  const subscribe = useCallback((area: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const subscription: WebSocketSubscription = {
        action: 'subscribe',
        area,
      };
      
      wsRef.current.send(JSON.stringify(subscription));
      subscriptionRef.current = area;
      console.log('Subscribed to area:', area);
    }
  }, []);

  const unsubscribe = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const subscription: WebSocketSubscription = {
        action: 'unsubscribe',
        area: '',
      };
      
      wsRef.current.send(JSON.stringify(subscription));
      subscriptionRef.current = null;
      console.log('Unsubscribed from WebSocket');
    }
  }, []);

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connected,
    messages,
    subscribe,
    unsubscribe,
    reconnect: connect,
  };
}