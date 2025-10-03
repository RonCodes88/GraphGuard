/**
 * React hook for consuming WebSocket network traffic stream
 * Provides real-time network data updates for visualization
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NetworkTrafficData } from '@/services/networkDataService';

interface StreamMessage {
  type: 'connection' | 'traffic' | 'complete' | 'error';
  status?: string;
  message?: string;
  timestamp?: string;
  batch_number?: number;
  elapsed_time?: number;
  remaining_time?: number;
  // Include all NetworkTrafficData fields when type is 'traffic'
  country?: string;
  nodes?: any[];
  edges?: any[];
  total_traffic?: number;
  attack_count?: number;
  suspicious_count?: number;
  normal_count?: number;
  batch_id?: number;
}

interface UseNetworkStreamOptions {
  url?: string;
  interval?: number;  // Seconds between batches
  duration?: number;  // Total duration in seconds
  autoConnect?: boolean;
  onTraffic?: (data: NetworkTrafficData) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseNetworkStreamReturn {
  isConnected: boolean;
  isStreaming: boolean;
  currentData: NetworkTrafficData | null;
  allData: NetworkTrafficData[];
  batchNumber: number;
  elapsedTime: number;
  remainingTime: number;
  connect: () => void;
  disconnect: () => void;
  clearHistory: () => void;
  error: Error | null;
}

export function useNetworkStream(
  options: UseNetworkStreamOptions = {}
): UseNetworkStreamReturn {
  const {
    url = 'ws://localhost:8000/ws/network/stream',
    interval = 2.0,
    duration = 300,
    autoConnect = false,
    onTraffic,
    onComplete,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentData, setCurrentData] = useState<NetworkTrafficData | null>(null);
  const [allData, setAllData] = useState<NetworkTrafficData[]>([]);
  const [batchNumber, setBatchNumber] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remainingTime, setRemainingTime] = useState(duration);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    try {
      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
      }

      // Build WebSocket URL with query parameters
      const wsUrl = `${url}?interval=${interval}&duration=${duration}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setIsStreaming(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message: StreamMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connection':
              console.log('Stream started:', message.message);
              break;

            case 'traffic':
              // This is actual traffic data
              const trafficData: NetworkTrafficData = {
                country: message.country || '',
                timestamp: message.timestamp || new Date().toISOString(),
                nodes: message.nodes || [],
                edges: message.edges || [],
                total_traffic: message.total_traffic || 0,
                attack_count: message.attack_count || 0,
                suspicious_count: message.suspicious_count || 0,
                normal_count: message.normal_count || 0
              };

              setCurrentData(trafficData);
              setAllData((prev) => [...prev, trafficData]);
              setBatchNumber(message.batch_number || 0);
              setElapsedTime(message.elapsed_time || 0);
              setRemainingTime(message.remaining_time || 0);

              if (onTraffic) {
                onTraffic(trafficData);
              }
              break;

            case 'complete':
              console.log('Stream complete:', message.message);
              setIsStreaming(false);
              if (onComplete) {
                onComplete();
              }
              break;

            case 'error':
              const err = new Error(message.message || 'Stream error');
              setError(err);
              if (onError) {
                onError(err);
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
          const parseError = err instanceof Error ? err : new Error('Parse error');
          setError(parseError);
          if (onError) {
            onError(parseError);
          }
        }
      };

      ws.onerror = (event) => {
        console.error('WebSocket error:', event);
        const err = new Error('WebSocket connection error');
        setError(err);
        if (onError) {
          onError(err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setIsStreaming(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to WebSocket:', err);
      const connectError = err instanceof Error ? err : new Error('Connection failed');
      setError(connectError);
      if (onError) {
        onError(connectError);
      }
    }
  }, [url, interval, duration, onTraffic, onComplete, onError]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsStreaming(false);
  }, []);

  const clearHistory = useCallback(() => {
    setAllData([]);
    setBatchNumber(0);
    setElapsedTime(0);
    setRemainingTime(duration);
  }, [duration]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    isStreaming,
    currentData,
    allData,
    batchNumber,
    elapsedTime,
    remainingTime,
    connect,
    disconnect,
    clearHistory,
    error
  };
}

