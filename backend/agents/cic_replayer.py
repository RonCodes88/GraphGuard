"""
CIC-DDoS2019 JSONL Event Replayer
Streams pre-baked CIC-DDoS2019 JSONL events with configurable scenarios
"""

import asyncio
import json
import os
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, AsyncGenerator
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import random

# Event data model
class CICEvent(BaseModel):
    ts: str
    incident_id: str
    severity: str  # "OK" | "WARN" | "ALERT"
    country: str
    countryCode: str
    ip: str
    reason: str
    change: str
    status: str
    next_step: str

# Stats model
class CICStats(BaseModel):
    alerts: int
    warns: int
    oks: int
    activeIncidents: int
    online: int
    totalCountries: int

# Scenario model
class ScenarioRequest(BaseModel):
    name: str  # "benign" | "mixed" | "ddos"

class CICReplayer:
    def __init__(self):
        self.current_scenario = "mixed"
        self.events: List[CICEvent] = []
        self.active_incidents: Dict[str, CICEvent] = {}
        self.country_history: Dict[str, List[CICEvent]] = {}
        self.replay_speed = 60  # 60x speed
        self.is_streaming = False
        
        # Built-in sample data
        self.sample_data = {
            "benign": self._generate_benign_events(),
            "mixed": self._generate_mixed_events(),
            "ddos": self._generate_ddos_events()
        }
        
        # Load initial data
        self._load_scenario_data()
    
    def _generate_benign_events(self) -> List[CICEvent]:
        """Generate benign/normal traffic events"""
        countries = [
            {"name": "United States", "code": "US"},
            {"name": "Canada", "code": "CA"},
            {"name": "United Kingdom", "code": "GB"},
            {"name": "Germany", "code": "DE"},
            {"name": "France", "code": "FR"},
            {"name": "Japan", "code": "JP"},
            {"name": "Australia", "code": "AU"},
            {"name": "Netherlands", "code": "NL"},
            {"name": "Sweden", "code": "SE"},
            {"name": "Switzerland", "code": "CH"}
        ]
        
        events = []
        base_time = datetime.now() - timedelta(minutes=15)  # Start 15 minutes ago instead of 2 hours
        
        for i in range(200):
            country = random.choice(countries)
            timestamp = base_time + timedelta(minutes=i*2)
            
            event = CICEvent(
                ts=timestamp.isoformat(),
                incident_id=f"INC-BENIGN-{i:04d}",
                severity="OK",
                country=country["name"],
                countryCode=country["code"],
                ip=f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
                reason="Normal traffic pattern detected",
                change="No significant changes",
                status="monitoring",
                next_step="Continue monitoring"
            )
            events.append(event)
        
        return events
    
    def _generate_mixed_events(self) -> List[CICEvent]:
        """Generate mixed normal/suspicious/attack events"""
        countries = [
            {"name": "United States", "code": "US"},
            {"name": "China", "code": "CN"},
            {"name": "Russia", "code": "RU"},
            {"name": "Germany", "code": "DE"},
            {"name": "United Kingdom", "code": "GB"},
            {"name": "France", "code": "FR"},
            {"name": "Japan", "code": "JP"},
            {"name": "South Korea", "code": "KR"},
            {"name": "India", "code": "IN"},
            {"name": "Brazil", "code": "BR"},
            {"name": "Canada", "code": "CA"},
            {"name": "Australia", "code": "AU"},
            {"name": "Netherlands", "code": "NL"},
            {"name": "Singapore", "code": "SG"},
            {"name": "Israel", "code": "IL"},
            {"name": "Ukraine", "code": "UA"}
        ]
        
        events = []
        base_time = datetime.now() - timedelta(minutes=15)  # Start 15 minutes ago instead of 2 hours
        
        # Generate events with different severity levels
        severity_weights = {"OK": 0.6, "WARN": 0.25, "ALERT": 0.15}
        
        for i in range(300):
            country = random.choice(countries)
            timestamp = base_time + timedelta(minutes=i*1.5)
            
            # Weighted random severity
            severity = random.choices(
                list(severity_weights.keys()),
                weights=list(severity_weights.values())
            )[0]
            
            if severity == "OK":
                reason = "Normal traffic pattern detected"
                change = "No significant changes"
                next_step = "Continue monitoring"
            elif severity == "WARN":
                reasons = [
                    "Unusual traffic spike detected",
                    "Port scan activity observed",
                    "Suspicious connection pattern",
                    "Anomalous data transfer",
                    "Potential reconnaissance activity"
                ]
                reason = random.choice(reasons)
                change = "Traffic volume increased by 150%"
                next_step = "Investigate further"
            else:  # ALERT
                reasons = [
                    "DDoS attack detected",
                    "Ransomware campaign in progress",
                    "APT infiltration attempt",
                    "Zero-day exploit detected",
                    "Data exfiltration in progress"
                ]
                reason = random.choice(reasons)
                change = "Critical security breach detected"
                next_step = "Immediate mitigation required"
            
            event = CICEvent(
                ts=timestamp.isoformat(),
                incident_id=f"INC-MIXED-{i:04d}",
                severity=severity,
                country=country["name"],
                countryCode=country["code"],
                ip=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
                reason=reason,
                change=change,
                status="monitoring" if severity == "OK" else "investigating",
                next_step=next_step
            )
            events.append(event)
        
        return events
    
    def _generate_ddos_events(self) -> List[CICEvent]:
        """Generate DDoS attack scenario events"""
        countries = [
            {"name": "United States", "code": "US"},
            {"name": "China", "code": "CN"},
            {"name": "Russia", "code": "RU"},
            {"name": "North Korea", "code": "KP"},
            {"name": "Iran", "code": "IR"},
            {"name": "Germany", "code": "DE"},
            {"name": "United Kingdom", "code": "GB"},
            {"name": "France", "code": "FR"},
            {"name": "Japan", "code": "JP"},
            {"name": "South Korea", "code": "KR"}
        ]
        
        events = []
        base_time = datetime.now() - timedelta(minutes=15)  # Start 15 minutes ago instead of 2 hours
        
        # Generate mostly attack events
        severity_weights = {"OK": 0.1, "WARN": 0.2, "ALERT": 0.7}
        
        for i in range(400):
            country = random.choice(countries)
            timestamp = base_time + timedelta(minutes=i*1.2)
            
            # Weighted random severity (mostly attacks)
            severity = random.choices(
                list(severity_weights.keys()),
                weights=list(severity_weights.values())
            )[0]
            
            if severity == "OK":
                reason = "Normal traffic pattern detected"
                change = "No significant changes"
                next_step = "Continue monitoring"
            elif severity == "WARN":
                reasons = [
                    "Suspicious traffic pattern",
                    "Potential DDoS precursor",
                    "Unusual connection behavior",
                    "Anomalous packet patterns"
                ]
                reason = random.choice(reasons)
                change = "Traffic patterns showing signs of attack"
                next_step = "Prepare mitigation measures"
            else:  # ALERT
                reasons = [
                    "DDoS volumetric attack in progress",
                    "Distributed denial of service detected",
                    "Massive traffic flood targeting infrastructure",
                    "Botnet-driven DDoS campaign",
                    "Multi-vector DDoS attack"
                ]
                reason = random.choice(reasons)
                change = "Critical infrastructure under attack"
                next_step = "Activate emergency response"
            
            event = CICEvent(
                ts=timestamp.isoformat(),
                incident_id=f"INC-DDOS-{i:04d}",
                severity=severity,
                country=country["name"],
                countryCode=country["code"],
                ip=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
                reason=reason,
                change=change,
                status="mitigating" if severity == "ALERT" else "investigating",
                next_step=next_step
            )
            events.append(event)
        
        return events
    
    def _load_scenario_data(self):
        """Load data for current scenario"""
        self.events = self.sample_data[self.current_scenario].copy()
        self._update_active_incidents()
        self._update_country_history()
    
    def _update_active_incidents(self):
        """Update active incidents from events"""
        self.active_incidents = {}
        for event in self.events:
            if event.severity in ["WARN", "ALERT"]:
                # Keep the latest event for each incident_id
                if event.incident_id not in self.active_incidents:
                    self.active_incidents[event.incident_id] = event
                else:
                    # Keep the more recent event
                    if event.ts > self.active_incidents[event.incident_id].ts:
                        self.active_incidents[event.incident_id] = event
    
    def _update_country_history(self):
        """Update country history from events"""
        self.country_history = {}
        for event in self.events:
            if event.countryCode not in self.country_history:
                self.country_history[event.countryCode] = []
            self.country_history[event.countryCode].append(event)
    
    def _generate_fresh_events(self, count: int = 5) -> List[CICEvent]:
        """Generate fresh events with current timestamps"""
        countries = [
            {"name": "United States", "code": "US"},
            {"name": "China", "code": "CN"},
            {"name": "Russia", "code": "RU"},
            {"name": "Germany", "code": "DE"},
            {"name": "United Kingdom", "code": "GB"},
            {"name": "France", "code": "FR"},
            {"name": "Japan", "code": "JP"},
            {"name": "South Korea", "code": "KR"},
            {"name": "India", "code": "IN"},
            {"name": "Brazil", "code": "BR"},
            {"name": "Canada", "code": "CA"},
            {"name": "Australia", "code": "AU"},
            {"name": "Netherlands", "code": "NL"},
            {"name": "Singapore", "code": "SG"},
            {"name": "Israel", "code": "IL"},
            {"name": "Ukraine", "code": "UA"}
        ]
        
        fresh_events = []
        now = datetime.now()
        
        # Generate events with timestamps from the last few minutes
        for i in range(count):
            country = random.choice(countries)
            # Random timestamp within the last 2 minutes for more dynamic updates
            minutes_ago = random.randint(0, 2)
            seconds_ago = random.randint(0, 59)
            timestamp = now - timedelta(minutes=minutes_ago, seconds=seconds_ago)
            
            # Ensure timestamp is properly formatted with timezone
            timestamp_str = timestamp.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'
            
            # Weighted severity based on scenario
            if self.current_scenario == "benign":
                severity_weights = {"OK": 0.8, "WARN": 0.15, "ALERT": 0.05}
            elif self.current_scenario == "ddos":
                severity_weights = {"OK": 0.1, "WARN": 0.2, "ALERT": 0.7}
            else:  # mixed
                severity_weights = {"OK": 0.5, "WARN": 0.3, "ALERT": 0.2}
            
            severity = random.choices(
                list(severity_weights.keys()),
                weights=list(severity_weights.values())
            )[0]
            
            # Generate appropriate reason based on severity
            if severity == "OK":
                reasons = [
                    "Normal traffic pattern detected",
                    "Regular network activity",
                    "Standard communication flow",
                    "Baseline traffic observed"
                ]
                changes = [
                    "No significant changes",
                    "Traffic within normal parameters",
                    "Standard operational status"
                ]
                next_steps = [
                    "Continue monitoring",
                    "Maintain current security posture",
                    "No action required"
                ]
            elif severity == "WARN":
                reasons = [
                    "Unusual traffic pattern detected",
                    "Traffic volume spike observed",
                    "Suspicious network behavior",
                    "Anomalous connection pattern"
                ]
                changes = [
                    "Traffic volume increased by 150%",
                    "Unusual connection frequency",
                    "Network behavior deviation detected"
                ]
                next_steps = [
                    "Investigate further",
                    "Monitor closely",
                    "Review security logs"
                ]
            else:  # ALERT
                reasons = [
                    "Potential cyber attack detected",
                    "Critical security breach detected",
                    "APT infiltration attempt",
                    "Malicious activity identified"
                ]
                changes = [
                    "Critical security event",
                    "Unauthorized access attempt",
                    "Suspicious data exfiltration"
                ]
                next_steps = [
                    "Immediate response required",
                    "Activate incident response",
                    "Block suspicious IPs"
                ]
            
            event = CICEvent(
                ts=timestamp_str,
                incident_id=f"INC-{self.current_scenario.upper()}-{random.randint(1000, 9999)}",
                severity=severity,
                country=country["name"],
                countryCode=country["code"],
                ip=f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
                reason=random.choice(reasons),
                change=random.choice(changes),
                status="monitoring" if severity == "OK" else "investigating",
                next_step=random.choice(next_steps)
            )
            fresh_events.append(event)
        
        return fresh_events

    def get_events(self, window: str = "15m", severity: Optional[str] = None, limit: int = 10, offset: int = 0) -> List[CICEvent]:
        """Get events with pagination"""
        # Filter events by severity if specified
        filtered_events = self.events.copy()
        if severity:
            filtered_events = [e for e in filtered_events if e.severity == severity]
        
        # Sort by timestamp (newest first)
        filtered_events.sort(key=lambda x: x.ts, reverse=True)
        
        # Apply pagination
        paginated_events = filtered_events[offset:offset + limit]
        
        return paginated_events
    
    async def stream_single_event(self, severity_filter: Optional[str] = None) -> Optional[CICEvent]:
        """Stream a single event with real-time timestamp"""
        # Generate a fresh event instead of using event_streamer
        fresh_events = self._generate_fresh_events(1)
        
        if not fresh_events:
            return None
        
        # Filter by severity if specified
        event = fresh_events[0]
        if severity_filter and event.severity != severity_filter:
            # Try to generate an event with the requested severity
            for _ in range(10):  # Try up to 10 times
                fresh_events = self._generate_fresh_events(1)
                if fresh_events[0].severity == severity_filter:
                    event = fresh_events[0]
                    break
        
        return event
    
    def get_total_events_count(self, severity_filter: Optional[str] = None) -> int:
        """Get total count of events"""
        if severity_filter:
            return len([e for e in self.events if e.severity == severity_filter])
        return len(self.events)
    
    def get_stats(self, window: str = "15m") -> CICStats:
        """Get statistics for time window"""
        events = self.get_events(window)
        
        alerts = sum(1 for e in events if e.severity == "ALERT")
        warns = sum(1 for e in events if e.severity == "WARN")
        oks = sum(1 for e in events if e.severity == "OK")
        
        # Count unique incident IDs for active incidents
        incident_ids = set(e.incident_id for e in events if e.severity in ["WARN", "ALERT"])
        active_incidents = len(incident_ids)
        
        # Count unique countries seen in window
        countries_seen = set(e.countryCode for e in events)
        online = len(countries_seen)
        
        # Total countries (from all data)
        total_countries = len(self.country_history)
        
        return CICStats(
            alerts=alerts,
            warns=warns,
            oks=oks,
            activeIncidents=active_incidents,
            online=online,
            totalCountries=total_countries
        )
    
    def set_scenario(self, scenario_name: str):
        """Switch to different scenario"""
        if scenario_name not in self.sample_data:
            raise ValueError(f"Unknown scenario: {scenario_name}")
        
        self.current_scenario = scenario_name
        self._load_scenario_data()
    
    async def stream_events(self) -> AsyncGenerator[str, None]:
        """Stream events in real-time"""
        self.is_streaming = True
        
        try:
            # Start from the beginning of the scenario data
            start_time = datetime.now()
            base_time = datetime.fromisoformat(self.events[0].ts.replace('Z', '+00:00'))
            
            for event in self.events:
                if not self.is_streaming:
                    break
                
                # Calculate when this event should be sent
                event_time = datetime.fromisoformat(event.ts.replace('Z', '+00:00'))
                time_diff = (event_time - base_time).total_seconds()
                send_time = start_time + timedelta(seconds=time_diff / self.replay_speed)
                
                # Wait until it's time to send this event
                now = datetime.now()
                if send_time > now:
                    await asyncio.sleep((send_time - now).total_seconds())
                
                # Send the event
                yield f"data: {event.json()}\n\n"
                
        finally:
            self.is_streaming = False
    
    def stop_streaming(self):
        """Stop the event stream"""
        self.is_streaming = False

# Global replayer instance
replayer = CICReplayer()

# FastAPI app for the replayer
app = FastAPI(
    title="CIC-DDoS2019 Event Replayer",
    description="Streams pre-baked CIC-DDoS2019 JSONL events with configurable scenarios",
    version="1.0.0"
)

@app.get("/")
async def root():
    """Root endpoint for CIC replayer"""
    return {
        "message": "CIC-DDoS2019 Event Replayer",
        "endpoints": {
            "events": "/events",
            "stream_single_event": "/stream-single-event",
            "stats": "/stats",
            "stream": "/stream",
            "scenario": "/scenario"
        }
    }

@app.get("/events")
async def get_events(
    window: str = Query("15m", description="Time window: 5m, 15m, 60m, etc."),
    severity: Optional[str] = Query(None, description="Filter by severity: OK, WARN, ALERT"),
    limit: int = Query(10, description="Number of events to return"),
    offset: int = Query(0, description="Number of events to skip")
):
    """Get recent events with pagination"""
    try:
        events = replayer.get_events(window, severity, limit, offset)
        total_count = replayer.get_total_events_count(severity)
        return {
            "events": events, 
            "count": len(events), 
            "total_count": total_count,
            "limit": limit,
            "offset": offset,
            "has_more": offset + len(events) < total_count,
            "window": window
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/stream-single-event")
async def stream_single_event(
    severity: Optional[str] = Query(None, description="Filter by severity: OK, WARN, ALERT")
):
    """Stream a single event with real-time timestamp"""
    try:
        event = await replayer.stream_single_event(severity)
        if event:
            return {
                "event": event,
                "streamed_at": datetime.now().isoformat() + "Z"
            }
        else:
            return {
                "event": None,
                "message": "No events available to stream",
                "streamed_at": datetime.now().isoformat() + "Z"
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/stats")
async def get_stats(window: str = Query("15m", description="Time window: 5m, 15m, 60m, etc.")):
    """Get statistics for time window"""
    try:
        stats = replayer.get_stats(window)
        return stats
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/stream")
async def stream_events():
    """Stream events in real-time via Server-Sent Events"""
    return StreamingResponse(
        replayer.stream_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/scenario")
async def set_scenario(scenario: ScenarioRequest):
    """Switch to different scenario"""
    try:
        replayer.set_scenario(scenario.name)
        return {
            "message": f"Switched to {scenario.name} scenario",
            "scenario": scenario.name,
            "event_count": len(replayer.events)
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/scenario")
async def get_current_scenario():
    """Get current scenario info"""
    return {
        "scenario": replayer.current_scenario,
        "event_count": len(replayer.events),
        "active_incidents": len(replayer.active_incidents),
        "countries": len(replayer.country_history)
    }

@app.post("/stop")
async def stop_streaming():
    """Stop event streaming"""
    replayer.stop_streaming()
    return {"message": "Streaming stopped"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
