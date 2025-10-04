/**
 * React hook for consuming WebSocket batch stream
 * Provides progressive revelation of network nodes and edges in batches
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type { NetworkTrafficData, NetworkNode, NetworkEdge } from '@/services/networkDataService';

interface BatchMessage {
  type: 'connection' | 'batch' | 'complete' | 'error' | 'status';
  status?: string;
  message?: string;
  timestamp?: string;
  country?: string;
  batch_number?: number;
  total_batches?: number;
  elapsed_time?: number;
  // Batch data fields
  nodes?: NetworkNode[];
  edges?: NetworkEdge[];
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  // Status fields
  is_streaming?: boolean;
  current_batch?: number;
  progress_percentage?: number;
}

interface UseBatchStreamOptions {
  country: string;
  batchInterval?: number;  // Seconds between batches
  autoStart?: boolean;
  onBatch?: (batchData: NetworkTrafficData, batchInfo: {
    batchNumber: number;
    totalBatches: number;
    description?: string;
    priority?: string;
    elapsedTime?: number;
  }) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

interface UseBatchStreamReturn {
  isConnected: boolean;
  isStreaming: boolean;
  currentBatch: number;
  totalBatches: number;
  progressPercentage: number;
  batchData: NetworkTrafficData | null;
  allBatches: NetworkTrafficData[];
  startStream: () => void;
  pauseStream: () => void;
  resumeStream: () => void;
  stopStream: () => void;
  resetStream: () => void;
  error: Error | null;
}

export function useBatchStream(
  options: UseBatchStreamOptions
): UseBatchStreamReturn {
  const {
    country,
    batchInterval = 3.0,
    autoStart = false,
    onBatch,
    onComplete,
    onError
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [batchData, setBatchData] = useState<NetworkTrafficData | null>(null);
  const [allBatches, setAllBatches] = useState<NetworkTrafficData[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    try {
      // Don't connect if already connected or connecting
      if (isConnected || isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log('Already connected or connecting, skipping...');
        return;
      }

      isConnectingRef.current = true;

      // Close existing connection if any
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      // Normalize country name for backend compatibility
      const normalizedCountry = country.replace(/ of America$/, '').replace(/^United States$/, 'United States');
      
      // Build WebSocket URL for batch streaming
      const wsUrl = `ws://localhost:8000/ws/network/batch/${encodeURIComponent(normalizedCountry)}`;
      console.log(`Connecting to: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`Batch WebSocket connected for ${country}`);
        setIsConnected(true);
        setError(null);
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const message: BatchMessage = JSON.parse(event.data);

          switch (message.type) {
            case 'connection':
              console.log('Batch stream started:', message.message);
              setTotalBatches(message.total_batches || 0);
              setIsStreaming(true);
              break;

            case 'batch':
              // This is actual batch data
              const batchTrafficData: NetworkTrafficData = {
                country: message.country || country,
                timestamp: message.timestamp || new Date().toISOString(),
                nodes: message.nodes || [],
                edges: message.edges || [],
                total_traffic: message.nodes?.reduce((sum, node) => sum + (node.traffic_volume || 0), 0) || 0,
                attack_count: message.edges?.filter(e => e.connection_type === 'attack').length || 0,
                suspicious_count: message.edges?.filter(e => e.connection_type === 'suspicious').length || 0,
                normal_count: message.edges?.filter(e => e.connection_type === 'normal').length || 0
              };

              setBatchData(batchTrafficData);
              setAllBatches((prev) => [...prev, batchTrafficData]);
              setCurrentBatch(message.batch_number || 0);
              setProgressPercentage(
                message.total_batches ? (message.batch_number || 0) / message.total_batches * 100 : 0
              );

              if (onBatch) {
                onBatch(batchTrafficData, {
                  batchNumber: message.batch_number,
                  totalBatches: message.total_batches,
                  description: message.description,
                  priority: message.priority,
                  elapsedTime: message.elapsed_time
                });
              }
              break;

            case 'complete':
              console.log('Batch stream complete:', message.message);
              setIsStreaming(false);
              if (onComplete) {
                onComplete();
              }
              break;

            case 'error':
              const err = new Error(message.message || 'Batch stream error');
              setError(err);
              setIsStreaming(false);
              if (onError) {
                onError(err);
              }
              break;

            case 'status':
              if (message.status) {
                setIsStreaming(message.status.is_streaming || false);
                setCurrentBatch(message.status.current_batch || 0);
                setTotalBatches(message.status.total_batches || 0);
                setProgressPercentage(message.status.progress_percentage || 0);
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing batch WebSocket message:', err);
          const parseError = err instanceof Error ? err : new Error('Parse error');
          setError(parseError);
          if (onError) {
            onError(parseError);
          }
        }
      };

      ws.onerror = (event) => {
        console.error('Batch WebSocket error:', event);
        const err = new Error('WebSocket connection error');
        setError(err);
        setIsConnected(false);
        isConnectingRef.current = false;
        if (onError) {
          onError(err);
        }
      };

      ws.onclose = (event) => {
        console.log('Batch WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setIsStreaming(false);
        isConnectingRef.current = false;
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Error connecting to batch WebSocket:', err);
      const connectError = err instanceof Error ? err : new Error('Connection failed');
      setError(connectError);
      isConnectingRef.current = false;
      if (onError) {
        onError(connectError);
      }
    }
  }, [country, onBatch, onComplete, onError]);


  const startStream = useCallback(() => {
    // Check connection state safely
    const isCurrentlyConnected = wsRef.current && wsRef.current.readyState === WebSocket.OPEN;
    
    if (!isCurrentlyConnected) {
      connect();
    }
  }, [connect]);

  const pauseStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'pause_stream' }));
      setIsStreaming(false);
    }
  }, []);

  const resumeStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'resume_stream' }));
      setIsStreaming(true);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop_stream' }));
      setIsStreaming(false);
    }
  }, []);

  const resetStream = useCallback(() => {
    // Close existing connection first
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Reset state without triggering re-renders
    setAllBatches([]);
    setCurrentBatch(0);
    setProgressPercentage(0);
    setBatchData(null);
    setIsStreaming(false);
    setIsConnected(false);
    setError(null);
    isConnectingRef.current = false;
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoStart) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      const timeoutRef = reconnectTimeoutRef.current;
      if (timeoutRef) {
        clearTimeout(timeoutRef);
      }
    };
  }, [autoStart, connect]);

  return {
    isConnected,
    isStreaming,
    currentBatch,
    totalBatches,
    progressPercentage,
    batchData,
    allBatches,
    startStream,
    pauseStream,
    resumeStream,
    stopStream,
    resetStream,
    error
  };
}
