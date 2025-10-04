/**
 * Data client for CIC-DDoS2019 Event Replayer
 * Handles API calls and Server-Sent Events streaming
 */

import {
  CICEvent,
  CICStats,
  EventsResponse,
  ScenarioRequest,
  ScenarioResponse,
  ScenarioInfo,
  ScenarioType,
  SeverityLevel,
  TimeWindow
} from '@/types/cic';

const API_BASE_URL = 'http://localhost:8000/cic';

class CICDataClient {
  private eventSource: EventSource | null = null;
  private onEventCallback: ((event: CICEvent) => void) | null = null;
  private onErrorCallback: ((error: Event) => void) | null = null;

  /**
   * Fetch recent events within time window
   */
  async getEvents(
    window: TimeWindow = '15m',
    severity?: SeverityLevel
  ): Promise<EventsResponse> {
    const params = new URLSearchParams({ window });
    if (severity) {
      params.append('severity', severity);
    }

    const response = await fetch(`${API_BASE_URL}/events?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Fetch statistics for time window
   */
  async getStats(window: TimeWindow = '15m'): Promise<CICStats> {
    const params = new URLSearchParams({ window });
    
    const response = await fetch(`${API_BASE_URL}/stats?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch stats: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Switch to different scenario
   */
  async setScenario(scenario: ScenarioType): Promise<ScenarioResponse> {
    const response = await fetch(`${API_BASE_URL}/scenario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: scenario } as ScenarioRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to set scenario: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get current scenario information
   */
  async getScenarioInfo(): Promise<ScenarioInfo> {
    const response = await fetch(`${API_BASE_URL}/scenario`);
    if (!response.ok) {
      throw new Error(`Failed to fetch scenario info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Start streaming events via Server-Sent Events
   */
  startStreaming(
    onEvent: (event: CICEvent) => void,
    onError?: (error: Event) => void
  ): void {
    this.stopStreaming(); // Stop any existing stream

    this.onEventCallback = onEvent;
    this.onErrorCallback = onError;

    this.eventSource = new EventSource(`${API_BASE_URL}/stream`);

    this.eventSource.onmessage = (event) => {
      try {
        const data: CICEvent = JSON.parse(event.data);
        this.onEventCallback?.(data);
      } catch (error) {
        console.error('Failed to parse SSE event:', error);
        this.onErrorCallback?.(new ErrorEvent('parse_error', { error }));
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.onErrorCallback?.(error);
    };

    this.eventSource.onopen = () => {
      console.log('SSE connection opened');
    };
  }

  /**
   * Stop streaming events
   */
  stopStreaming(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.onEventCallback = null;
    this.onErrorCallback = null;
  }

  /**
   * Stop streaming on server side
   */
  async stopStreamingServer(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/stop`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to stop streaming on server:', error);
    }
  }

  /**
   * Check if currently streaming
   */
  isStreaming(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED;
  }
}

// Singleton instance
export const cicDataClient = new CICDataClient();

// Utility functions
export const formatTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const formatDateTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const getTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d ago`;
  } else if (diffHours > 0) {
    return `${diffHours}h ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  } else {
    return `${diffSeconds}s ago`;
  }
};

export const parseTimeWindow = (window: string): number => {
  const value = parseInt(window);
  const unit = window.slice(-1);
  
  switch (unit) {
    case 'm': return value * 60 * 1000; // minutes
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    case 'y': return value * 365 * 24 * 60 * 60 * 1000; // years
    default: return 15 * 60 * 1000; // default 15 minutes
  }
};

export const isEventInWindow = (event: CICEvent, window: TimeWindow): boolean => {
  const now = new Date();
  const eventTime = new Date(event.ts);
  const windowMs = parseTimeWindow(window);
  
  return (now.getTime() - eventTime.getTime()) <= windowMs;
};

export const filterEventsBySeverity = (
  events: CICEvent[],
  severity?: SeverityLevel
): CICEvent[] => {
  if (!severity) return events;
  return events.filter(event => event.severity === severity);
};

export const filterEventsByCountry = (
  events: CICEvent[],
  country?: string
): CICEvent[] => {
  if (!country) return events;
  return events.filter(event => 
    event.country.toLowerCase().includes(country.toLowerCase()) ||
    event.countryCode.toLowerCase().includes(country.toLowerCase())
  );
};

export const groupEventsByIncident = (events: CICEvent[]): Map<string, CICEvent[]> => {
  const grouped = new Map<string, CICEvent[]>();
  
  events.forEach(event => {
    if (!grouped.has(event.incident_id)) {
      grouped.set(event.incident_id, []);
    }
    grouped.get(event.incident_id)!.push(event);
  });
  
  return grouped;
};

export const groupEventsByCountry = (events: CICEvent[]): Map<string, CICEvent[]> => {
  const grouped = new Map<string, CICEvent[]>();
  
  events.forEach(event => {
    if (!grouped.has(event.countryCode)) {
      grouped.set(event.countryCode, []);
    }
    grouped.get(event.countryCode)!.push(event);
  });
  
  return grouped;
};

export default cicDataClient;
