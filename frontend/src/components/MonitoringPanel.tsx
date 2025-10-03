"use client";

import { useState, useEffect } from "react";

type SeverityLevel = "OK" | "WARN" | "ALERT";
type IncidentStatus = "monitoring" | "mitigating";

interface LogEntry {
  id: string;
  timestamp: string;
  severity: SeverityLevel;
  node: string;
  ip: string;
  reason: string;
  errorRate: number;
  latency: number;
  suspiciousEdges: number;
  incidentId?: string;
  reasonCodes?: string[];
  metrics?: {
    packetLoss: number;
    throughput: number;
    connections: number;
  };
  judgeDecision?: string;
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
  const [timeWindow, setTimeWindow] = useState<number>(15); // minutes
  const [searchQuery, setSearchQuery] = useState("");

  // Dummy KPI data with sparklines
  const [kpiData] = useState<KPIData>({
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

  // Dummy log stream
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "log-1",
      timestamp: new Date(Date.now() - 30000).toISOString(),
      severity: "ALERT",
      node: "server1",
      ip: "203.0.113.5",
      reason: "High packet loss + auth failures",
      errorRate: 8.5,
      latency: 298,
      suspiciousEdges: 35,
      incidentId: "INC-001",
      reasonCodes: ["PACKET_LOSS_THRESHOLD", "AUTH_FAILURE_SPIKE", "ANOMALOUS_TRAFFIC_PATTERN"],
      metrics: { packetLoss: 12.5, throughput: 450, connections: 2340 },
      judgeDecision: "Mitigate: Block source IPs + rate limit",
    },
    {
      id: "log-2",
      timestamp: new Date(Date.now() - 45000).toISOString(),
      severity: "ALERT",
      node: "server2",
      ip: "203.0.113.6",
      reason: "Volumetric attack detected",
      errorRate: 9.2,
      latency: 285,
      suspiciousEdges: 32,
      incidentId: "INC-001",
      reasonCodes: ["TRAFFIC_VOLUME_ANOMALY", "PROTOCOL_VIOLATION"],
      metrics: { packetLoss: 15.2, throughput: 890, connections: 4500 },
      judgeDecision: "Mitigate: Enable DDoS protection",
    },
    {
      id: "log-3",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      severity: "WARN",
      node: "server3",
      ip: "198.51.100.23",
      reason: "Port scanning activity",
      errorRate: 4.2,
      latency: 210,
      suspiciousEdges: 22,
      incidentId: "INC-002",
      reasonCodes: ["PORT_SCAN_PATTERN", "RAPID_CONNECTION_ATTEMPTS"],
      metrics: { packetLoss: 2.1, throughput: 230, connections: 156 },
      judgeDecision: "Monitor: Track source IP",
    },
    {
      id: "log-4",
      timestamp: new Date(Date.now() - 90000).toISOString(),
      severity: "WARN",
      node: "loadbalancer-1",
      ip: "192.0.2.100",
      reason: "Elevated latency detected",
      errorRate: 2.8,
      latency: 195,
      suspiciousEdges: 15,
      reasonCodes: ["LATENCY_THRESHOLD_EXCEEDED"],
      metrics: { packetLoss: 1.5, throughput: 567, connections: 890 },
      judgeDecision: "Monitor: Auto-scaling triggered",
    },
    {
      id: "log-5",
      timestamp: new Date(Date.now() - 120000).toISOString(),
      severity: "OK",
      node: "server4",
      ip: "192.0.2.45",
      reason: "Normal operation",
      errorRate: 0.5,
      latency: 120,
      suspiciousEdges: 2,
      reasonCodes: ["HEALTHY"],
      metrics: { packetLoss: 0.1, throughput: 345, connections: 450 },
    },
  ]);

  // Simulate real-time log updates
  useEffect(() => {
    const interval = setInterval(() => {
      const severities: SeverityLevel[] = ["OK", "WARN", "ALERT"];
      const nodes = ["server1", "server2", "server3", "loadbalancer-1"];
      const randomSeverity = severities[Math.floor(Math.random() * severities.length)];
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      
      const newLog: LogEntry = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: randomSeverity,
        node: randomNode,
        ip: `192.0.2.${Math.floor(Math.random() * 255)}`,
        reason: randomSeverity === "ALERT" ? "Critical threshold exceeded" : 
                randomSeverity === "WARN" ? "Anomaly detected" : "Normal operation",
        errorRate: Math.random() * 10,
        latency: 100 + Math.random() * 200,
        suspiciousEdges: Math.floor(Math.random() * 40),
        reasonCodes: randomSeverity === "ALERT" ? ["THRESHOLD_EXCEEDED", "ANOMALY_DETECTED"] : ["HEALTHY"],
      };
      
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Keep last 50 logs
    }, 8000);

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

  const filteredLogs = logs.filter(log => {
    if (selectedSeverity !== "all" && log.severity !== selectedSeverity) return false;
    if (searchQuery && !log.node.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !log.ip.includes(searchQuery)) return false;
    return true;
  });

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
              placeholder="Search node/ip..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <div className="flex gap-2 text-xs">
              <span className="text-gray-500">Last:</span>
              {[5, 15, 30, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => setTimeWindow(mins)}
                  className={`px-2 py-0.5 rounded ${
                    timeWindow === mins ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {mins}m
                </button>
              ))}
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
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">KEY KPIS</h2>
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
          <div className="text-xs text-gray-600 mt-2">Threshold: {kpiData.threshold} — showing last 15min</div>
        </div>

        {/* Live Log Stream */}
        <div className="p-3">
          <h2 className="text-xs font-semibold text-white mb-2 tracking-wider">
            LIVE LOG STREAM ({filteredLogs.length})
          </h2>
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
                      <span className="text-xs text-white font-medium">{log.node}</span>
                      <span className="text-xs text-gray-500">{log.ip}</span>
                    </div>
                    <span className="text-xs text-gray-600 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300 mb-1">{log.reason}</div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-500">
                      ↑ {log.errorRate > 5 ? <span className="text-red-500">{log.errorRate.toFixed(1)}%</span> : `${log.errorRate.toFixed(1)}%`}
                    </span>
                    <span className="text-gray-500">
                      ⏱ {log.latency > 200 ? <span className="text-yellow-500">{log.latency}ms</span> : `${log.latency}ms`}
                    </span>
                    <span className="text-gray-500">
                      🔗 {log.suspiciousEdges > 20 ? <span className="text-yellow-500">{log.suspiciousEdges}</span> : log.suspiciousEdges}
                    </span>
                  </div>
                </div>

                {/* Expanded Reasoning */}
                {expandedLog === log.id && (
                  <div className="ml-4 mt-1 bg-black/70 border border-gray-800 rounded p-2 text-xs space-y-2">
                    <div>
                      <div className="text-gray-500 mb-1">Reason Codes:</div>
                      <div className="flex flex-wrap gap-1">
                        {log.reasonCodes?.map((code, i) => (
                          <span key={i} className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                            {code}
                          </span>
                        ))}
                      </div>
                    </div>
                    {log.metrics && (
                      <div>
                        <div className="text-gray-500 mb-1">Metrics:</div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gray-900/50 p-1.5 rounded">
                            <div className="text-gray-600">Packet Loss</div>
                            <div className="text-white">{log.metrics.packetLoss}%</div>
                          </div>
                          <div className="bg-gray-900/50 p-1.5 rounded">
                            <div className="text-gray-600">Throughput</div>
                            <div className="text-white">{log.metrics.throughput} MB/s</div>
                          </div>
                          <div className="bg-gray-900/50 p-1.5 rounded">
                            <div className="text-gray-600">Connections</div>
                            <div className="text-white">{log.metrics.connections}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {log.judgeDecision && (
                      <div>
                        <div className="text-gray-500 mb-1">Judge Decision:</div>
                        <div className="bg-gray-900/50 p-2 rounded text-gray-300 border-l-2 border-blue-500">
                          {log.judgeDecision}
                        </div>
                      </div>
                    )}
                    {log.incidentId && (
                      <div>
                        <div className="text-gray-500 mb-1">Linked Incident:</div>
                        <div className="text-blue-400 hover:text-blue-300 cursor-pointer">
                          → {log.incidentId}
                        </div>
                      </div>
                    )}
                    <button className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 py-1.5 rounded text-xs transition-colors">
                      Copy JSON
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
