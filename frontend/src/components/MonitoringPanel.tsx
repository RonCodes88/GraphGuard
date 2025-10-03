"use client";

import { useState, useEffect } from "react";

type SeverityLevel = "OK" | "WARN" | "ALERT";
type IncidentStatus = "monitoring" | "mitigating";

interface LogEntry {
  id: string;
  timestamp: string;
  severity: SeverityLevel;
  country: string;
  issue: string;
  details: string;
  affectedIPs?: number;
  attackType?: string;
}

interface Incident {
  id: string;
  status: IncidentStatus;
  topSignal: string;
  firstSeen: string;
  eventCount: number;
  affectedNodes: string[];
}

interface KPIData {
  latencyP95: number[];
  errorRate: number[];
  suspiciousEdges: number[];
  authFailures: number[];
  threshold: number;
}

export default function MonitoringPanel() {
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [timeWindow, setTimeWindow] = useState<string>("15m"); // time window
  const [searchQuery, setSearchQuery] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration errors by only rendering time-dependent content on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Dummy KPI data with sparklines that update continuously
  const [kpiData, setKpiData] = useState<KPIData>({
    latencyP95: [120, 135, 142, 158, 165, 172, 180, 195, 210, 225, 240, 255, 270, 285, 298],
    errorRate: [0.5, 0.6, 0.8, 1.2, 1.5, 2.1, 2.8, 3.5, 4.2, 4.8, 5.5, 6.2, 7.1, 8.5, 9.2],
    suspiciousEdges: [2, 3, 4, 3, 5, 7, 9, 12, 15, 18, 22, 25, 28, 32, 35],
    authFailures: [0, 0, 1, 1, 2, 3, 5, 8, 12, 15, 18, 22, 25, 28, 30],
    threshold: 20,
  });

  // Dummy active incidents
  const [incidents] = useState<Incident[]>([
    {
      id: "INC-001",
      status: "mitigating",
      topSignal: "DDoS attack - volumetric flood",
      firstSeen: "14 min ago",
      eventCount: 127,
      affectedNodes: ["server1", "server2", "loadbalancer-1"],
    },
    {
      id: "INC-002",
      status: "monitoring",
      topSignal: "Port scan detected from 203.0.113.45",
      firstSeen: "8 min ago",
      eventCount: 43,
      affectedNodes: ["server3"],
    },
  ]);

  // Global statistics that update continuously
  const [globalStats, setGlobalStats] = useState({
    totalCountries: 195,
    countriesMonitored: 142,
    activeThreats: 23,
    criticalAlerts: 8,
    blocked: 1240,
    avgResponseTime: 1.2,
  });

  // Dummy log stream - worldwide events
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 15000).toISOString(),
      severity: "ALERT",
      country: "United States",
      issue: "DDoS Attack",
      details: "Massive volumetric flood targeting financial sector",
      affectedIPs: 1250,
      attackType: "DDoS Volumetric",
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 30000).toISOString(),
      severity: "ALERT",
      country: "China",
      issue: "APT Campaign",
      details: "Advanced persistent threat targeting government networks",
      affectedIPs: 450,
      attackType: "APT",
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 45000).toISOString(),
      severity: "WARN",
      country: "Germany",
      issue: "Port Scan",
      details: "Coordinated port scanning across infrastructure",
      affectedIPs: 230,
      attackType: "Reconnaissance",
    },
    {
      id: "log-4",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      severity: "ALERT",
      country: "Russia",
      issue: "Ransomware",
      details: "Ransomware campaign spreading through enterprise networks",
      affectedIPs: 890,
      attackType: "Ransomware",
    },
    {
      id: "log-5",
      timestamp: new Date(Date.now() - 75000).toISOString(),
      severity: "WARN",
      country: "United Kingdom",
      issue: "Credential Stuffing",
      details: "Large-scale credential stuffing attempt detected",
      affectedIPs: 340,
      attackType: "Credential Attack",
    },
    {
      id: "log-6",
      timestamp: new Date(Date.now() - 90000).toISOString(),
      severity: "OK",
      country: "Japan",
      issue: "Normal Traffic",
      details: "All systems operating normally",
      affectedIPs: 0,
    },
  ]);

  // Continuously update global statistics
  useEffect(() => {
    const interval = setInterval(() => {
      setGlobalStats(prev => ({
        totalCountries: 195,
        countriesMonitored: 142 + Math.floor(Math.random() * 5) - 2,
        activeThreats: Math.max(15, prev.activeThreats + Math.floor(Math.random() * 7) - 3),
        criticalAlerts: Math.max(0, prev.criticalAlerts + Math.floor(Math.random() * 5) - 2),
        blocked: prev.blocked + Math.floor(Math.random() * 50),
        avgResponseTime: Math.max(0.5, prev.avgResponseTime + (Math.random() * 0.4 - 0.2)),
      }));
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Continuously update KPI data and sparklines
  useEffect(() => {
    const interval = setInterval(() => {
      setKpiData(prev => {
        // Calculate new values based on recent activity
        const recentAlerts = logs.filter(log => log.severity === "ALERT").length;
        const recentWarnings = logs.filter(log => log.severity === "WARN").length;
        
        // Generate new data points with some volatility
        const newLatency = Math.max(100, Math.min(400, 
          prev.latencyP95[prev.latencyP95.length - 1] + (Math.random() * 30 - 15) + (recentAlerts * 10)
        ));
        
        const newErrorRate = Math.max(0, Math.min(15, 
          prev.errorRate[prev.errorRate.length - 1] + (Math.random() * 2 - 1) + (recentAlerts * 0.5)
        ));
        
        const newSuspiciousEdges = Math.max(0, Math.min(50, 
          prev.suspiciousEdges[prev.suspiciousEdges.length - 1] + Math.floor(Math.random() * 8 - 4) + recentWarnings
        ));
        
        const newAuthFailures = Math.max(0, Math.min(50, 
          prev.authFailures[prev.authFailures.length - 1] + Math.floor(Math.random() * 6 - 3) + Math.floor(recentAlerts * 1.5)
        ));

        return {
          latencyP95: [...prev.latencyP95.slice(1), Math.round(newLatency)],
          errorRate: [...prev.errorRate.slice(1), Number(newErrorRate.toFixed(1))],
          suspiciousEdges: [...prev.suspiciousEdges.slice(1), newSuspiciousEdges],
          authFailures: [...prev.authFailures.slice(1), newAuthFailures],
          threshold: 20,
        };
      });
    }, 4000); // Update every 4 seconds

    return () => clearInterval(interval);
  }, [logs]); // Depend on logs to react to alert changes

  // Simulate real-time worldwide log updates
  useEffect(() => {
    const interval = setInterval(() => {
      const severities: SeverityLevel[] = ["OK", "WARN", "ALERT"];
      const countries = [
        "United States", "China", "Russia", "Germany", "United Kingdom", 
        "France", "Japan", "South Korea", "India", "Brazil", "Canada",
        "Australia", "Netherlands", "Singapore", "Israel", "Ukraine"
      ];
      const issues = {
        ALERT: ["DDoS Attack", "Ransomware", "APT Campaign", "Zero-Day Exploit", "Data Breach"],
        WARN: ["Port Scan", "Credential Stuffing", "Malware Detection", "Phishing Campaign", "Brute Force"],
        OK: ["Normal Traffic", "System Healthy", "Routine Monitoring"]
      };
      const attackTypes = {
        ALERT: ["DDoS Volumetric", "Ransomware", "APT", "Zero-Day", "Data Exfiltration"],
        WARN: ["Reconnaissance", "Credential Attack", "Malware", "Phishing", "Brute Force"],
        OK: ["Normal"]
      };
      
      const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
      const randomCountry = countries[Math.floor(Math.random() * countries.length)];
      const issueList = issues[randomSeverity];
      const attackList = attackTypes[randomSeverity];
      
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: randomSeverity,
        country: randomCountry,
        issue: issueList[Math.floor(Math.random() * issueList.length)],
        details: randomSeverity === "ALERT" ? "Critical security threat detected and being mitigated" :
                 randomSeverity === "WARN" ? "Suspicious activity under investigation" :
                 "All systems operating within normal parameters",
        affectedIPs: randomSeverity === "OK" ? 0 : Math.floor(Math.random() * 2000) + 100,
        attackType: attackList[Math.floor(Math.random() * attackList.length)],
      };
      
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
    }, 6000); // New event every 6 seconds

    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity: SeverityLevel) => {
    switch (severity) {
      case "ALERT":
        return "border-red-500 bg-red-500/10";
      case "WARN":
        return "border-yellow-500 bg-yellow-500/10";
      case "OK":
        return "border-gray-700 bg-transparent";
    }
  };

  const getSeverityBadgeColor = (severity: SeverityLevel) => {
    switch (severity) {
      case "ALERT":
        return "bg-red-500 text-white";
      case "WARN":
        return "bg-yellow-500 text-black";
      case "OK":
        return "bg-gray-600 text-white";
    }
  };

  // Parse time window to milliseconds
  const getTimeWindowMs = (window: string): number => {
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

  const filteredLogs = logs.filter(log => {
    // Filter by severity
    if (selectedSeverity !== "all" && log.severity !== selectedSeverity) return false;
    
    // Filter by search query
    if (searchQuery && !log.country.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !log.issue.toLowerCase().includes(searchQuery)) return false;
    
    // Filter by time window
    const logTime = new Date(log.timestamp).getTime();
    const now = Date.now();
    const timeWindowMs = getTimeWindowMs(timeWindow);
    if (now - logTime > timeWindowMs) return false;
    
    return true;
  });

  // Calculate overall threat level based on recent logs and incidents
  const getOverallThreatLevel = (): "critical" | "medium" | "safe" => {
    const recentLogs = logs.slice(0, 10); // Last 10 logs
    const alertCount = recentLogs.filter(log => log.severity === "ALERT").length;
    const warnCount = recentLogs.filter(log => log.severity === "WARN").length;
    const activeCriticalIncidents = incidents.filter(i => i.status === "mitigating").length;

    if (alertCount >= 3 || activeCriticalIncidents > 0 || kpiData.errorRate[14] > 7) {
      return "critical";
    } else if (alertCount > 0 || warnCount >= 3 || kpiData.errorRate[14] > 3) {
      return "medium";
    }
    return "safe";
  };

  const threatLevel = getOverallThreatLevel();
  
  const getThreatLevelDotColor = () => {
    switch (threatLevel) {
      case "critical":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "safe":
        return "bg-green-500";
    }
  };

  return (
    <div className="fixed right-0 top-0 h-screen w-[480px] bg-black/95 backdrop-blur-md border-l border-gray-800 text-white overflow-hidden flex flex-col font-mono">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-gradient-to-b from-gray-950/50 to-transparent">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-widest">GRAPHGUARD</h1>
        </div>
        <p className="text-xs text-gray-600 mt-1 tracking-wide">Network Security Monitor</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-gray-900 scrollbar-thumb-gray-700 hover:scrollbar-thumb-gray-600">
        
        {/* Filters & Time Window */}
        <div className="p-3 border-b border-gray-800 bg-gray-950/30">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">FILTERS & TIME WINDOW</h2>
          <div className="space-y-2">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedSeverity("all")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSeverity === "all" ? "bg-white text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ALL
              </button>
              <button
                onClick={() => setSelectedSeverity("OK")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSeverity === "OK" ? "bg-gray-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                OK
              </button>
              <button
                onClick={() => setSelectedSeverity("WARN")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSeverity === "WARN" ? "bg-yellow-500 text-black" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                WARN
              </button>
              <button
                onClick={() => setSelectedSeverity("ALERT")}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  selectedSeverity === "ALERT" ? "bg-red-500 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                ALERT
              </button>
            </div>
            <input
              type="text"
              placeholder="Search country/issue..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <div className="space-y-1">
              <div className="flex gap-1 text-xs flex-wrap">
                <span className="text-gray-500 w-full mb-0.5">Minutes:</span>
                {['5m', '15m', '30m', '60m'].map(window => (
                  <button
                    key={window}
                    onClick={() => setTimeWindow(window)}
                    className={`px-2 py-0.5 rounded ${
                      timeWindow === window ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {window}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 text-xs flex-wrap">
                <span className="text-gray-500 w-full mb-0.5">Extended:</span>
                {['6h', '12h', '1d', '7d', '30d', '1y'].map(window => (
                  <button
                    key={window}
                    onClick={() => setTimeWindow(window)}
                    className={`px-2 py-0.5 rounded ${
                      timeWindow === window ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {window}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Incidents */}
        <div className="p-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">ACTIVE INCIDENTS ({incidents.length})</h2>
          <div className="space-y-2">
            {incidents.map((incident) => (
              <div key={incident.id} className="bg-black/50 border border-gray-800 rounded p-2">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{incident.id}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      incident.status === "mitigating" ? "bg-red-500 text-white" : "bg-yellow-500 text-black"
                    }`}>
                      {incident.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">{incident.firstSeen}</span>
                </div>
                <div className="text-xs text-gray-300 mb-1">{incident.topSignal}</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">{incident.eventCount} events</span>
                  <span className="text-gray-500">{incident.affectedNodes.length} nodes</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key KPIs */}
        <div className="p-3 border-b border-gray-800">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">
            KEY KPIS <span className="text-gray-600">({timeWindow})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-black/50 border border-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">p95 Latency</div>
              <div className="flex items-end justify-between">
                <span className={`text-sm font-bold ${kpiData.latencyP95[14] > 250 ? "text-red-500" : "text-white"}`}>
                  {kpiData.latencyP95[14]}ms
                </span>
                <div className="flex items-end gap-px h-6">
                  {kpiData.latencyP95.map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500/50"
                      style={{ height: `${(val / 300) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-black/50 border border-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Error Rate</div>
              <div className="flex items-end justify-between">
                <span className={`text-sm font-bold ${kpiData.errorRate[14] > 5 ? "text-red-500" : "text-white"}`}>
                  {kpiData.errorRate[14].toFixed(1)}%
                </span>
                <div className="flex items-end gap-px h-6">
                  {kpiData.errorRate.map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-yellow-500/50"
                      style={{ height: `${(val / 10) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-black/50 border border-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Suspicious Edges</div>
              <div className="flex items-end justify-between">
                <span className={`text-sm font-bold ${kpiData.suspiciousEdges[14] > 20 ? "text-yellow-500" : "text-white"}`}>
                  {kpiData.suspiciousEdges[14]}
                </span>
                <div className="flex items-end gap-px h-6">
                  {kpiData.suspiciousEdges.map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-yellow-500/50"
                      style={{ height: `${(val / 40) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-black/50 border border-gray-800 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Auth Failures</div>
              <div className="flex items-end justify-between">
                <span className={`text-sm font-bold ${kpiData.authFailures[14] > 15 ? "text-red-500" : "text-white"}`}>
                  {kpiData.authFailures[14]}
                </span>
                <div className="flex items-end gap-px h-6">
                  {kpiData.authFailures.map((val, i) => (
                    <div
                      key={i}
                      className="w-1 bg-red-500/50"
                      style={{ height: `${(val / 35) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-gray-600 mt-2">
            Threshold: {kpiData.threshold} — showing last {timeWindow} • {filteredLogs.length} events in window
          </div>
        </div>

        {/* Global Statistics */}
        <div className="p-3 border-b border-gray-800 bg-gray-950/30">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">
            GLOBAL STATISTICS <span className="text-gray-600">(Real-time)</span>
          </h2>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Monitored</div>
              <div className="text-white font-bold">{globalStats.countriesMonitored}/{globalStats.totalCountries}</div>
            </div>
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Active Threats</div>
              <div className="text-red-500 font-bold">{globalStats.activeThreats}</div>
            </div>
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Critical</div>
              <div className="text-red-500 font-bold">{globalStats.criticalAlerts}</div>
            </div>
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Blocked</div>
              <div className="text-yellow-500 font-bold">{globalStats.blocked.toLocaleString()}</div>
            </div>
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Response</div>
              <div className="text-white font-bold">{globalStats.avgResponseTime.toFixed(1)}s</div>
            </div>
            <div className="bg-black/50 p-2 rounded border border-gray-800">
              <div className="text-gray-600">Status</div>
              <div className="text-green-500 font-bold">ACTIVE</div>
            </div>
          </div>
        </div>

        {/* Live Log Stream */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold text-white tracking-wider">
              WORLDWIDE EVENTS
            </h2>
            <div className="text-xs text-gray-500">
              {filteredLogs.length} in last {timeWindow}
            </div>
          </div>
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div key={log.id}>
                <div
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                  className={`border-l-2 ${getSeverityColor(log.severity)} p-2 cursor-pointer hover:bg-white/5 transition-colors rounded-r`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${getSeverityBadgeColor(log.severity)}`}>
                        {log.severity}
                      </span>
                      <span className="text-xs text-white font-medium">🌍 {log.country}</span>
                    </div>
                    <span className="text-xs text-gray-600 font-mono" suppressHydrationWarning>
                      {isMounted ? new Date(log.timestamp).toLocaleTimeString() : "00:00:00"}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-200 mb-1">{log.issue}</div>
                  <div className="text-xs text-gray-400 mb-1">{log.details}</div>
                  <div className="flex gap-3 text-xs">
                    {log.affectedIPs && log.affectedIPs > 0 && (
                      <span className="text-gray-500">
                        📊 <span className={log.affectedIPs > 500 ? "text-red-500" : "text-gray-400"}>{log.affectedIPs} IPs</span>
                      </span>
                    )}
                    {log.attackType && log.attackType !== "Normal" && (
                      <span className="text-gray-500">
                        🎯 <span className="text-yellow-500">{log.attackType}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === log.id && (
                  <div className="ml-4 mt-1 bg-black/70 border border-gray-800 rounded p-2 text-xs space-y-2">
                    <div>
                      <div className="text-gray-500 mb-1">Event Details:</div>
                      <div className="bg-gray-900/50 p-2 rounded space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Country:</span>
                          <span className="text-white">{log.country}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Issue Type:</span>
                          <span className="text-white">{log.issue}</span>
                        </div>
                        {log.attackType && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Attack Type:</span>
                            <span className="text-yellow-500">{log.attackType}</span>
                          </div>
                        )}
                        {log.affectedIPs && log.affectedIPs > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Affected IPs:</span>
                            <span className="text-red-500">{log.affectedIPs.toLocaleString()}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-gray-600">Timestamp:</span>
                          <span className="text-white" suppressHydrationWarning>
                            {isMounted ? new Date(log.timestamp).toLocaleString() : "Loading..."}
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
          </div>
        </div>
      </div>
    </div>
  );
}
