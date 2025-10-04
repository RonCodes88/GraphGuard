"use client";

import { useState, useEffect } from "react";
import { networkDataService } from "@/services/networkDataService";
import { 
  useRecentEvents, 
  useActiveIncidents, 
  useCICStats, 
  useCICFilters, 
  useCICLoading, 
  useCICStreaming, 
  useCICError,
  useCurrentScenario,
  useSetFilters,
  useSetScenario,
  useStartStreaming,
  useStopStreaming,
  useClearError
} from "@/store/cicStore";
import { formatTime, getTimeAgo } from "@/services/cicDataClient";
import { SeverityLevel, TimeWindow } from "@/types/cic";

type IncidentStatus = "monitoring" | "mitigating";

export default function MonitoringPanel() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isMonitoringAgentActive, setIsMonitoringAgentActive] = useState(false);
  const [monitoringAgentSummary, setMonitoringAgentSummary] = useState<any>(null);

  // CIC Store data
  const recentEvents = useRecentEvents();
  const activeIncidents = useActiveIncidents();
  const stats = useCICStats();
  const filters = useCICFilters();
  const isLoading = useCICLoading();
  const isStreaming = useCICStreaming();
  const error = useCICError();
  const currentScenario = useCurrentScenario();
  
  // Individual action hooks (prevents getServerSnapshot infinite loop)
  const setFilters = useSetFilters();
  const setScenario = useSetScenario();
  const startStreaming = useStartStreaming();
  const stopStreaming = useStopStreaming();
  const clearError = useClearError();

  // Prevent hydration errors by only rendering time-dependent content on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simulate monitoring agent activity
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMonitoringAgentActive(prev => !prev);
    }, 3000); // Toggle every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Handle search query changes
  useEffect(() => {
    setFilters({ country: searchQuery || undefined });
  }, [searchQuery, setFilters]);

  // Simulate monitoring agent analysis
  const analyzeWithMonitoringAgent = async () => {
    try {
      // Use real stats from CIC store
      const healthScore = stats ? Math.max(60, 100 - (stats.alerts * 10 + stats.warns * 5)) : 85;
      const threatLevel = stats ? (stats.alerts > 5 ? "HIGH" : stats.alerts > 2 ? "MEDIUM" : "LOW") : "LOW";
      const networkStatus = stats ? (stats.alerts > 5 ? "critical" : stats.alerts > 2 ? "at_risk" : "healthy") : "healthy";
      
      const mockSummary = {
        network_status: networkStatus,
        health_score: healthScore,
        summary: `Monitoring ${currentScenario} scenario with ${stats?.totalCountries || 0} countries. ${stats?.alerts || 0} alerts, ${stats?.warns || 0} warnings detected.`,
        dashboard: {
          threat_level: threatLevel
        }
      };
      
      setMonitoringAgentSummary(mockSummary);
    } catch (error) {
      console.error("Monitoring agent analysis failed:", error);
    }
  };

  // Trigger monitoring agent analysis when stats change
  useEffect(() => {
    if (stats) {
      analyzeWithMonitoringAgent();
    }
  }, [stats]);

  const getSeverityColor = (severity: SeverityLevel) => {
    switch (severity) {
      case "ALERT":
        return "border-red-500 bg-red-500/10";
      case "WARN":
        return "border-amber-500 bg-amber-500/10";
      case "OK":
        return "border-emerald-500 bg-emerald-500/10";
    }
  };

  const getSeverityBadgeColor = (severity: SeverityLevel) => {
    switch (severity) {
      case "ALERT":
        return "bg-red-500 text-white";
      case "WARN":
        return "bg-amber-500 text-black";
      case "OK":
        return "bg-emerald-500 text-white";
    }
  };

  // Handle severity filter changes
  const handleSeverityChange = (severity: string) => {
    if (severity === "all") {
      setFilters({ severity: undefined });
    } else {
      setFilters({ severity: severity as SeverityLevel });
    }
  };

  // Handle time window changes
  const handleTimeWindowChange = (window: string) => {
    setFilters({ window: window as TimeWindow });
  };

  // Handle scenario changes
  const handleScenarioChange = async (scenario: string) => {
    await setScenario(scenario as any);
  };


  return (
    <div className="fixed right-0 top-0 h-screen w-[480px] bg-black/95 backdrop-blur-md border-l border-gray-800 text-white overflow-hidden flex flex-col font-mono z-30">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-b from-gray-950/50 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full animate-pulse ${
            isStreaming ? "bg-blue-400" : isMonitoringAgentActive ? "bg-green-400" : "bg-white"
          }`}></div>
          <h1 className="text-xl font-bold tracking-widest">GRAPHGUARD</h1>
          {isStreaming && (
            <div className="flex items-center text-blue-400 text-xs">
              <div className="animate-spin w-3 h-3 border border-blue-400 border-t-transparent rounded-full mr-1"></div>
              Live Stream
            </div>
          )}
          {isMonitoringAgentActive && !isStreaming && (
            <div className="flex items-center text-green-400 text-xs">
              <div className="animate-pulse w-3 h-3 bg-green-400 rounded-full mr-1"></div>
              AI Monitoring
            </div>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-gray-600 tracking-wide">CIC-DDoS2019 Monitor</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Scenario:</span>
            <select 
              value={currentScenario}
              onChange={(e) => handleScenarioChange(e.target.value)}
              className="text-xs bg-black/50 border border-gray-700 rounded px-2 py-1 text-white"
            >
              <option value="benign">Benign</option>
              <option value="mixed">Mixed</option>
              <option value="ddos">DDoS</option>
            </select>
          </div>
        </div>
        
        {/* Monitoring Agent Summary */}
        {monitoringAgentSummary && (
          <div className="mt-3 p-3 bg-gray-900/50 rounded border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-blue-400">Monitor Agent</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  monitoringAgentSummary.network_status === "healthy" ? "bg-green-600 text-white" :
                  monitoringAgentSummary.network_status === "degraded" ? "bg-yellow-600 text-black" :
                  monitoringAgentSummary.network_status === "at_risk" ? "bg-orange-600 text-white" :
                  monitoringAgentSummary.network_status === "critical" ? "bg-red-600 text-white" :
                  "bg-gray-600 text-white"
                }`}>
                  {monitoringAgentSummary.network_status.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Health: {monitoringAgentSummary.health_score}/100
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              {monitoringAgentSummary.summary}
            </p>
            {monitoringAgentSummary.dashboard.threat_level && (
              <div className="mt-2 text-xs text-gray-400">
                Threat Level: <span className="text-red-400 font-medium">
                  {monitoringAgentSummary.dashboard.threat_level}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
        
        {/* Country Search Bar */}
        <div className="p-3 border-b border-gray-800 bg-gray-950/30">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">SEARCH COUNTRY</h2>
          <input
            type="text"
            placeholder="Type country name to view history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/50 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white focus:bg-black/70 transition-all"
          />
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-500">
              Showing history for: <span className="text-white font-semibold">{searchQuery}</span>
              <button 
                onClick={() => setSearchQuery("")}
                className="ml-2 text-gray-400 hover:text-white"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>


        {/* Active Incidents */}
        <div className="p-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">ACTIVE INCIDENTS ({activeIncidents.length})</h2>
          <div className="space-y-2">
            {activeIncidents.map((incident) => (
              <div key={incident.incident_id} className="bg-black/50 border border-gray-800 rounded p-2.5 hover:bg-black/70 transition-colors">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{incident.incident_id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                      incident.latest_event.severity === "ALERT" ? "bg-red-500 text-white" : "bg-amber-500 text-black"
                    }`}>
                      {incident.latest_event.severity}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600">{getTimeAgo(incident.first_seen)}</span>
                </div>
                <div className="text-xs text-gray-300 mb-1.5">{incident.latest_event.reason}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{incident.event_count} events</span>
                  <span className="text-gray-500">{incident.latest_event.country}</span>
                </div>
              </div>
            ))}
            {activeIncidents.length === 0 && (
              <div className="text-xs text-gray-500 text-center py-4">
                No active incidents
              </div>
            )}
          </div>
        </div>

        {/* Worldwide Events */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-white tracking-wider">
              WORLDWIDE EVENTS {searchQuery && `— ${recentEvents.length} in ${searchQuery}`}
            </h2>
            {!searchQuery && (
              <div className="text-xs text-gray-600">
                {recentEvents.length} in last {filters.window}
              </div>
            )}
          </div>
          
          {/* Severity Filter Chips */}
          <div className="flex gap-1 mb-2">
            {['all', 'OK', 'WARN', 'ALERT'].map(severity => (
              <button
                key={severity}
                onClick={() => handleSeverityChange(severity)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  (severity === 'all' && !filters.severity) || filters.severity === severity
                    ? severity === 'all' ? 'bg-white text-black' :
                      severity === 'OK' ? 'bg-emerald-500 text-white' :
                      severity === 'WARN' ? 'bg-amber-500 text-black' :
                      'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {severity}
              </button>
            ))}
          </div>
          
          {/* Time Window Chips */}
          <div className="flex gap-1 mb-3 flex-wrap">
            {['5m', '15m', '30m', '1h', '6h', '12h', '1d', '7d', '30d', '1y'].map(window => (
              <button
                key={window}
                onClick={() => handleTimeWindowChange(window)}
                className={`px-2 py-0.5 text-xs rounded transition-colors ${
                  filters.window === window 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                {window}
              </button>
            ))}
          </div>
          
          {isLoading && (
            <div className="text-xs text-gray-500 text-center py-4">
              Loading events...
            </div>
          )}
          
          <div className="space-y-1">
            {recentEvents.map((event) => (
              <div key={`${event.incident_id}-${event.ts}`}>
                <div
                  onClick={() => setExpandedLog(expandedLog === `${event.incident_id}-${event.ts}` ? null : `${event.incident_id}-${event.ts}`)}
                  className={`border-l-2 ${getSeverityColor(event.severity)} p-2 cursor-pointer hover:bg-white/5 transition-colors rounded-r`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${getSeverityBadgeColor(event.severity)}`}>
                        {event.severity}
                      </span>
                      <span className="text-xs text-white font-medium">🌍 {event.country}</span>
                    </div>
                    <span className="text-xs text-gray-600 font-mono" suppressHydrationWarning>
                      {isMounted ? formatTime(event.ts) : "00:00:00"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-200 mb-1">{event.reason}</div>
                  <div className="text-xs text-gray-400 mb-1">{event.change}</div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-500">
                      🎯 <span className="text-yellow-500">{event.ip}</span>
                    </span>
                    <span className="text-gray-500">
                      📋 <span className="text-gray-400">{event.status}</span>
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === `${event.incident_id}-${event.ts}` && (
                  <div className="ml-4 mt-1 bg-black/70 border border-gray-800 rounded p-2 text-xs space-y-2">
                    <div>
                      <div className="text-gray-500 mb-1">Event Details:</div>
                      <div className="bg-gray-900/50 p-2 rounded space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="text-white">{event.country} ({event.countryCode})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Incident ID:</span>
                          <span className="text-white">{event.incident_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">IP Address:</span>
                          <span className="text-yellow-500">{event.ip}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reason:</span>
                          <span className="text-white">{event.reason}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Change:</span>
                          <span className="text-gray-300">{event.change}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <span className="text-gray-300">{event.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Next Step:</span>
                          <span className="text-blue-300">{event.next_step}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Timestamp:</span>
                          <span className="text-white" suppressHydrationWarning>
                            {isMounted ? new Date(event.ts).toLocaleString() : "Loading..."}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded text-xs transition-colors">
                      View on Globe
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {recentEvents.length === 0 && !isLoading && (
              <div className="text-xs text-gray-500 text-center py-4">
                No events found
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
