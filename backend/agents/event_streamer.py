"""
Event Streaming Service for Real-time Cybersecurity Events
Streams events from CIC dataset with real-time timestamps and pagination
"""

import asyncio
import json
import random
from datetime import datetime, timedelta
from typing import List, Dict, Optional, AsyncGenerator
from dataclasses import dataclass
import os

@dataclass
class StreamedEvent:
    """Real-time event with streaming timestamp"""
    incident_id: str
    severity: str
    country: str
    country_code: str
    ip: str
    reason: str
    change: str
    status: str
    next_step: str
    streamed_at: str  # When this event was streamed (real timestamp)
    original_data: Dict  # Original data from JSON for reference

class EventStreamer:
    """Streams events from CIC dataset with real-time timestamps"""
    
    def __init__(self):
        self.data_dir = "data/processed"
        self.events_pool: List[Dict] = []
        self.streamed_events: List[StreamedEvent] = []
        self.current_scenario = "mixed"
        self.load_events_pool()
    
    def load_events_pool(self):
        """Load all events from JSON files into a pool for streaming"""
        self.events_pool = []
        
        # Load events from all JSON files
        json_files = [
            "DrDoS_DNS.json", "DrDoS_LDAP.json", "DrDoS_MSSQL.json",
            "DrDoS_NetBIOS.json", "DrDoS_NTP.json", "DrDoS_SNMP.json",
            "DrDoS_SSDP.json", "DrDoS_UDP.json", "LDAP.json", "MSSQL.json",
            "NetBIOS.json", "Portmap.json", "Syn.json", "TFTP.json",
            "UDP.json", "UDPLag.json"
        ]
        
        for json_file in json_files:
            file_path = os.path.join(self.data_dir, json_file)
            if os.path.exists(file_path):
                try:
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    # Extract nodes and create events
                    for node in data.get('nodes', []):
                        event = self._create_event_from_node(node, json_file)
                        if event:
                            self.events_pool.append(event)
                            
                except Exception as e:
                    print(f"Error loading {json_file}: {e}")
        
        print(f"Loaded {len(self.events_pool)} events into streaming pool")
    
    def _create_event_from_node(self, node: Dict, source_file: str) -> Optional[Dict]:
        """Create an event from a node in the JSON data"""
        try:
            # Determine severity based on node status and traffic volume
            if node.get('status') == 'suspicious':
                if node.get('traffic_volume', 0) > 10000000:  # High traffic
                    severity = "ALERT"
                else:
                    severity = "WARN"
            else:
                severity = "OK"
            
            # Generate appropriate content based on severity and source file
            reason, change, next_step = self._generate_event_content(severity, source_file)
            
            return {
                'incident_id': f"INC-{source_file.replace('.json', '').upper()}-{random.randint(1000, 9999)}",
                'severity': severity,
                'country': node.get('country', 'Unknown'),
                'country_code': self._get_country_code(node.get('country', 'Unknown')),
                'ip': node.get('ip', '0.0.0.0'),
                'reason': reason,
                'change': change,
                'status': 'monitoring' if severity == 'OK' else 'investigating',
                'next_step': next_step,
                'original_data': node
            }
        except Exception as e:
            print(f"Error creating event from node: {e}")
            return None
    
    def _generate_event_content(self, severity: str, source_file: str) -> tuple:
        """Generate appropriate event content based on severity and source"""
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
            attack_type = source_file.replace('.json', '').replace('DrDoS_', '')
            reasons = [
                f"Potential {attack_type} attack detected",
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
        
        return (
            random.choice(reasons),
            random.choice(changes),
            random.choice(next_steps)
        )
    
    def _get_country_code(self, country_name: str) -> str:
        """Get country code from country name"""
        country_codes = {
            'United States': 'US', 'China': 'CN', 'Russia': 'RU',
            'Germany': 'DE', 'United Kingdom': 'GB', 'France': 'FR',
            'Japan': 'JP', 'South Korea': 'KR', 'India': 'IN',
            'Brazil': 'BR', 'Canada': 'CA', 'Australia': 'AU',
            'Netherlands': 'NL', 'Singapore': 'SG', 'Israel': 'IL',
            'Ukraine': 'UA', 'Italy': 'IT', 'Spain': 'ES',
            'Mexico': 'MX', 'Argentina': 'AR', 'South Africa': 'ZA'
        }
        return country_codes.get(country_name, 'XX')
    
    def set_scenario(self, scenario: str):
        """Set the current scenario (affects event distribution)"""
        self.current_scenario = scenario
    
    async def stream_single_event(self, severity_filter: Optional[str] = None) -> Optional[StreamedEvent]:
        """Stream a single event with real-time timestamp"""
        # Filter events based on severity if specified
        available_events = self.events_pool.copy()
        if severity_filter and severity_filter != 'all':
            available_events = [e for e in available_events if e['severity'] == severity_filter]
        
        if not available_events:
            return None
        
        # Randomly select one event to stream
        event_data = random.choice(available_events)
        
        # Create streamed event with current timestamp
        stream_time = datetime.now()
        
        streamed_event = StreamedEvent(
            incident_id=event_data['incident_id'],
            severity=event_data['severity'],
            country=event_data['country'],
            country_code=event_data['country_code'],
            ip=event_data['ip'],
            reason=event_data['reason'],
            change=event_data['change'],
            status=event_data['status'],
            next_step=event_data['next_step'],
            streamed_at=stream_time.isoformat() + 'Z',
            original_data=event_data['original_data']
        )
        
        # Add to streamed events list
        self.streamed_events.append(streamed_event)
        
        # Keep only last 1000 streamed events to prevent memory issues
        if len(self.streamed_events) > 1000:
            self.streamed_events = self.streamed_events[-1000:]
        
        return streamed_event
    
    def get_streamed_events(self, limit: int = 10, offset: int = 0, severity_filter: Optional[str] = None) -> List[StreamedEvent]:
        """Get paginated streamed events"""
        filtered_events = self.streamed_events.copy()
        
        # Apply severity filter
        if severity_filter and severity_filter != 'all':
            filtered_events = [e for e in filtered_events if e.severity == severity_filter]
        
        # Sort by streamed_at (newest first)
        filtered_events.sort(key=lambda x: x.streamed_at, reverse=True)
        
        # Apply pagination
        return filtered_events[offset:offset + limit]
    
    def get_total_count(self, severity_filter: Optional[str] = None) -> int:
        """Get total count of streamed events"""
        if severity_filter and severity_filter != 'all':
            return len([e for e in self.streamed_events if e.severity == severity_filter])
        return len(self.streamed_events)

# Global instance
event_streamer = EventStreamer()
