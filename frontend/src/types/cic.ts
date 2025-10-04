/**
 * TypeScript types for CIC-DDoS2019 Event Replayer
 */

export type SeverityLevel = "OK" | "WARN" | "ALERT";

export type ScenarioType = "benign" | "mixed" | "ddos";

export interface CICEvent {
  ts: string;
  incident_id: string;
  severity: SeverityLevel;
  country: string;
  countryCode: string;
  ip: string;
  reason: string;
  change: string;
  status: string;
  next_step: string;
  postedAt?: string; // Timestamp when event was posted to monitor (client-side)
}

export interface CICStats {
  alerts: number;
  warns: number;
  oks: number;
  activeIncidents: number;
  online: number;
  totalCountries: number;
}

export interface ScenarioRequest {
  name: ScenarioType;
}

export interface ScenarioResponse {
  message: string;
  scenario: ScenarioType;
  event_count: number;
}

export interface EventsResponse {
  events: CICEvent[];
  count: number;
  window: string;
  total_count?: number;
  has_more?: boolean;
}

export interface ScenarioInfo {
  scenario: ScenarioType;
  event_count: number;
  active_incidents: number;
  countries: number;
}

// Store types
export interface EventFilters {
  severity?: SeverityLevel;
  window: string;
  country?: string;
}

export interface ActiveIncident {
  incident_id: string;
  latest_event: CICEvent;
  event_count: number;
  first_seen: string;
  last_seen: string;
}

export interface CountryHistory {
  countryCode: string;
  country: string;
  events: CICEvent[];
  total_events: number;
  alerts: number;
  warns: number;
  oks: number;
}

export interface CICStore {
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
  
  // Actions
  setFilters: (filters: Partial<EventFilters>) => void;
  setScenario: (scenario: ScenarioType) => Promise<void>;
  fetchEvents: () => Promise<void>;
  fetchStats: () => Promise<void>;
  startStreaming: () => void;
  stopStreaming: () => void;
  refreshData: () => Promise<void>;
}

// UI Component Props
export interface EventRowProps {
  event: CICEvent;
  onClick?: (event: CICEvent) => void;
}

export interface StatsCardProps {
  stats: CICStats;
  loading?: boolean;
}

export interface IncidentCardProps {
  incident: ActiveIncident;
  onClick?: (incident: ActiveIncident) => void;
}

export interface CountryHistoryProps {
  countryCode: string;
  country: string;
  history: CountryHistory;
}

// Utility types
export type TimeWindow = "5m" | "15m" | "30m" | "1h" | "6h" | "12h" | "1d" | "7d" | "30d" | "1y";

export interface SeverityColors {
  OK: string;
  WARN: string;
  ALERT: string;
}

export const SEVERITY_COLORS: SeverityColors = {
  OK: "emerald",
  WARN: "amber", 
  ALERT: "red"
};

export const SEVERITY_BADGE_COLORS: SeverityColors = {
  OK: "bg-emerald-500 text-white",
  WARN: "bg-amber-500 text-black",
  ALERT: "bg-red-500 text-white"
};

export const SEVERITY_BORDER_COLORS: SeverityColors = {
  OK: "border-emerald-500 bg-emerald-500/10",
  WARN: "border-amber-500 bg-amber-500/10", 
  ALERT: "border-red-500 bg-red-500/10"
};
