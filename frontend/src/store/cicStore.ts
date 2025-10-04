/**
 * CIC Event Store using Zustand
 * Manages events, incidents, country history, and filters
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  CICEvent,
  CICStats,
  EventFilters,
  ActiveIncident,
  CountryHistory,
  ScenarioType,
  SeverityLevel,
  TimeWindow,
  CICStore
} from '@/types/cic';
import cicDataClient, {
  formatTime,
  groupEventsByIncident,
  groupEventsByCountry,
  filterEventsBySeverity,
  filterEventsByCountry,
  isEventInWindow
} from '@/services/cicDataClient';

interface CICStoreState {
  // Data
  events: CICEvent[];
  stats: CICStats | null;
  activeIncidents: ActiveIncident[];
  countryHistory: CountryHistory[];
  
  // Filters
  filters: EventFilters;
  
  // State
  isLoading: boolean;
  isStreaming: boolean;
  currentScenario: ScenarioType;
  lastUpdate: string | null;
  error: string | null;
  
  // Computed values
  filteredEvents: CICEvent[];
  recentEvents: CICEvent[];
  
  // Actions
  setFilters: (filters: Partial<EventFilters>) => void;
  setScenario: (scenario: ScenarioType) => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchStats: () => Promise<void>;
  startStreaming: () => void;
  stopStreaming: () => void;
  refreshData: () => Promise<void>;
  addEvent: (event: CICEvent) => void;
  clearError: () => void;
  
  // Internal actions
  _updateComputedValues: () => void;
  _updateActiveIncidents: () => void;
  _updateCountryHistory: () => void;
}

const MAX_EVENTS = 1000; // Cap events to prevent memory issues

export const useCICStore = create<CICStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    events: [],
    stats: null,
    activeIncidents: [],
    countryHistory: [],
    filters: {
      window: '15m'
    },
    isLoading: false,
    isStreaming: false,
    currentScenario: 'mixed',
    lastUpdate: null,
    error: null,
    filteredEvents: [],
    recentEvents: [],

    // Actions
    setFilters: (newFilters) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters }
      }));
      get()._updateComputedValues();
    },

    setScenario: async (scenario) => {
      try {
        set({ isLoading: true, error: null });
        await cicDataClient.setScenario(scenario);
        set({ currentScenario: scenario });
        await get().refreshData();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to set scenario' });
      } finally {
        set({ isLoading: false });
      }
    },

    fetchEvents: async () => {
      try {
        console.log('CIC Store: Fetching events...');
        set({ isLoading: true, error: null });
        const { filters } = get();
        const response = await cicDataClient.getEvents(filters.window as TimeWindow, filters.severity);
        
        console.log('CIC Store: Events fetched successfully:', response.events.length, 'events');
        
        set({
          events: response.events.slice(0, MAX_EVENTS), // Cap events
          lastUpdate: new Date().toISOString()
        });
        
        get()._updateComputedValues();
        get()._updateActiveIncidents();
        get()._updateCountryHistory();
      } catch (error) {
        console.error('CIC Store: Failed to fetch events:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to fetch events' });
      } finally {
        set({ isLoading: false });
      }
    },

    fetchStats: async () => {
      try {
        console.log('CIC Store: Fetching stats...');
        const { filters } = get();
        const stats = await cicDataClient.getStats(filters.window as TimeWindow);
        console.log('CIC Store: Stats fetched successfully:', stats);
        set({ stats });
      } catch (error) {
        console.error('CIC Store: Failed to fetch stats:', error);
        set({ error: error instanceof Error ? error.message : 'Failed to fetch stats' });
      }
    },

    startStreaming: () => {
      const state = get();
      if (state.isStreaming) return;

      set({ isStreaming: true });

      cicDataClient.startStreaming(
        (event: CICEvent) => {
          get().addEvent(event);
        },
        (error) => {
          console.error('Streaming error:', error);
          set({ 
            isStreaming: false,
            error: 'Streaming connection lost'
          });
        }
      );
    },

    stopStreaming: () => {
      cicDataClient.stopStreaming();
      set({ isStreaming: false });
    },

    refreshData: async () => {
      await Promise.all([
        get().fetchEvents(),
        get().fetchStats()
      ]);
    },

    addEvent: (event: CICEvent) => {
      set((state) => {
        const newEvents = [event, ...state.events].slice(0, MAX_EVENTS);
        return { events: newEvents };
      });
      
      get()._updateComputedValues();
      get()._updateActiveIncidents();
      get()._updateCountryHistory();
    },

    clearError: () => {
      set({ error: null });
    },

    // Internal actions
    _updateComputedValues: () => {
      const { events, filters } = get();
      
      // Filter events by severity
      let filtered = filterEventsBySeverity(events, filters.severity);
      
      // Filter events by country
      filtered = filterEventsByCountry(filtered, filters.country);
      
      // Filter events by time window
      filtered = filtered.filter(event => isEventInWindow(event, filters.window as TimeWindow));
      
      // Sort by timestamp (newest first)
      filtered.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
      
      // Get recent events (last 50)
      const recent = filtered.slice(0, 50);
      
      set({
        filteredEvents: filtered,
        recentEvents: recent
      });
    },

    _updateActiveIncidents: () => {
      const { events } = get();
      
      // Group events by incident ID
      const incidentGroups = groupEventsByIncident(events);
      
      // Create active incidents (only WARN and ALERT severity)
      const activeIncidents: ActiveIncident[] = [];
      
      incidentGroups.forEach((incidentEvents, incidentId) => {
        const alertWarnEvents = incidentEvents.filter(e => e.severity === 'WARN' || e.severity === 'ALERT');
        
        if (alertWarnEvents.length > 0) {
          // Sort by timestamp to get latest event
          alertWarnEvents.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
          const latestEvent = alertWarnEvents[0];
          const firstEvent = alertWarnEvents[alertWarnEvents.length - 1];
          
          activeIncidents.push({
            incident_id: incidentId,
            latest_event: latestEvent,
            event_count: alertWarnEvents.length,
            first_seen: firstEvent.ts,
            last_seen: latestEvent.ts
          });
        }
      });
      
      // Sort by last seen (most recent first)
      activeIncidents.sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime());
      
      set({ activeIncidents });
    },

    _updateCountryHistory: () => {
      const { events } = get();
      
      // Group events by country
      const countryGroups = groupEventsByCountry(events);
      
      const countryHistory: CountryHistory[] = [];
      
      countryGroups.forEach((countryEvents, countryCode) => {
        const firstEvent = countryEvents[0];
        const alerts = countryEvents.filter(e => e.severity === 'ALERT').length;
        const warns = countryEvents.filter(e => e.severity === 'WARN').length;
        const oks = countryEvents.filter(e => e.severity === 'OK').length;
        
        countryHistory.push({
          countryCode,
          country: firstEvent.country,
          events: countryEvents,
          total_events: countryEvents.length,
          alerts,
          warns,
          oks
        });
      });
      
      // Sort by total events (most active first)
      countryHistory.sort((a, b) => b.total_events - a.total_events);
      
      set({ countryHistory });
    }
  }))
);

// Selectors for common use cases
export const useFilteredEvents = () => useCICStore(state => state.filteredEvents);
export const useRecentEvents = () => useCICStore(state => state.recentEvents);
export const useActiveIncidents = () => useCICStore(state => state.activeIncidents);
export const useCountryHistory = () => useCICStore(state => state.countryHistory);
export const useCICStats = () => useCICStore(state => state.stats);
export const useCICFilters = () => useCICStore(state => state.filters);
export const useCICLoading = () => useCICStore(state => state.isLoading);
export const useCICStreaming = () => useCICStore(state => state.isStreaming);
export const useCICError = () => useCICStore(state => state.error);
export const useCurrentScenario = () => useCICStore(state => state.currentScenario);

// Individual action selectors (safer approach)
export const useSetFilters = () => useCICStore(state => state.setFilters);
export const useSetScenario = () => useCICStore(state => state.setScenario);
export const useFetchEvents = () => useCICStore(state => state.fetchEvents);
export const useFetchStats = () => useCICStore(state => state.fetchStats);
export const useStartStreaming = () => useCICStore(state => state.startStreaming);
export const useStopStreaming = () => useCICStore(state => state.stopStreaming);
export const useRefreshData = () => useCICStore(state => state.refreshData);
export const useClearError = () => useCICStore(state => state.clearError);

// Action selectors - use individual hooks instead of combined object
// This prevents the getServerSnapshot infinite loop issue
export const useCICActions = () => {
  const setFilters = useSetFilters();
  const setScenario = useSetScenario();
  const fetchEvents = useFetchEvents();
  const fetchStats = useFetchStats();
  const startStreaming = useStartStreaming();
  const stopStreaming = useStopStreaming();
  const refreshData = useRefreshData();
  const clearError = useClearError();
  
  return {
    setFilters,
    setScenario,
    fetchEvents,
    fetchStats,
    startStreaming,
    stopStreaming,
    refreshData,
    clearError
  };
};

// Auto-refresh every 30 seconds when not streaming
let refreshInterval: NodeJS.Timeout | null = null;

useCICStore.subscribe(
  (state) => state.isStreaming,
  (isStreaming) => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    
    if (!isStreaming) {
      refreshInterval = setInterval(() => {
        const { fetchEvents, fetchStats } = useCICStore.getState();
        fetchEvents();
        fetchStats();
      }, 30000); // 30 seconds
    }
  }
);

// Initialize data on first load (only in browser environment)
if (typeof window !== 'undefined') {
  // Delay initialization to ensure the store is ready
  setTimeout(() => {
    useCICStore.getState().refreshData();
  }, 100);
}
