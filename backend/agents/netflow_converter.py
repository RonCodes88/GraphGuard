"""
NetFlow v5 Converter
Converts CIC DDoS 2019 dataset flows to NetFlow v5 compatible format
Provides industry-standard network flow representation
"""
import struct
import json
from datetime import datetime
from typing import Dict, List, Any
from pydantic import BaseModel


class NetFlowV5Header(BaseModel):
    """NetFlow v5 Header structure"""
    version: int = 5
    count: int  # Number of flow records (1-30)
    sys_uptime: int  # Milliseconds since device boot
    unix_secs: int  # Seconds since epoch
    unix_nsecs: int  # Nanoseconds
    flow_sequence: int  # Sequence number
    engine_type: int = 0  # Flow switching engine type
    engine_id: int = 0  # Slot number
    sampling_interval: int = 0  # Sampling mode and interval


class NetFlowV5Record(BaseModel):
    """NetFlow v5 Flow Record structure"""
    srcaddr: str  # Source IP address
    dstaddr: str  # Destination IP address
    nexthop: str = "0.0.0.0"  # Next hop router IP
    input: int = 0  # SNMP index of input interface
    output: int = 0  # SNMP index of output interface
    d_pkts: int  # Packets in the flow
    d_octets: int  # Total bytes in the flow
    first: int  # SysUptime at start of flow
    last: int  # SysUptime at end of flow
    srcport: int  # TCP/UDP source port
    dstport: int  # TCP/UDP destination port
    tcp_flags: int = 0  # Cumulative OR of TCP flags
    prot: int  # IP protocol type (6=TCP, 17=UDP, 1=ICMP)
    tos: int = 0  # IP Type of Service
    src_as: int = 0  # Source AS number
    dst_as: int = 0  # Destination AS number
    src_mask: int = 0  # Source address prefix mask
    dst_mask: int = 0  # Destination address prefix mask


class NetFlowV5Converter:
    """
    Convert CIC DDoS data to NetFlow v5 format
    Enables integration with enterprise NetFlow analysis tools
    """

    # Protocol mappings
    PROTOCOL_MAP = {
        "TCP": 6,
        "UDP": 17,
        "ICMP": 1,
        "IGMP": 2,
        "SCTP": 132
    }

    # TCP flag mappings
    TCP_FLAGS = {
        "FIN": 0x01,
        "SYN": 0x02,
        "RST": 0x04,
        "PSH": 0x08,
        "ACK": 0x10,
        "URG": 0x20
    }

    def __init__(self):
        self.flow_sequence = 0
        self.start_time = datetime.now()

    def _get_sys_uptime(self) -> int:
        """Calculate system uptime in milliseconds"""
        elapsed = datetime.now() - self.start_time
        return int(elapsed.total_seconds() * 1000)

    def _ip_to_int(self, ip: str) -> int:
        """Convert IP address string to integer"""
        parts = ip.split('.')
        return (int(parts[0]) << 24) + (int(parts[1]) << 16) + (int(parts[2]) << 8) + int(parts[3])

    def _parse_protocol(self, protocol_str: str) -> int:
        """Convert protocol string to number"""
        protocol_upper = protocol_str.upper() if protocol_str else "TCP"
        return self.PROTOCOL_MAP.get(protocol_upper, 6)  # Default to TCP

    def _calculate_tcp_flags(self, flow_data: Dict) -> int:
        """
        Calculate TCP flags from CICFlowMeter features
        Combines individual flag counts into cumulative OR
        """
        flags = 0

        # CICFlowMeter provides counts for each flag
        flag_fields = {
            'FIN Flag Count': self.TCP_FLAGS['FIN'],
            'SYN Flag Count': self.TCP_FLAGS['SYN'],
            'RST Flag Count': self.TCP_FLAGS['RST'],
            'PSH Flag Count': self.TCP_FLAGS['PSH'],
            'ACK Flag Count': self.TCP_FLAGS['ACK'],
            'URG Flag Count': self.TCP_FLAGS['URG']
        }

        for field_name, flag_value in flag_fields.items():
            if flow_data.get(field_name, 0) > 0:
                flags |= flag_value

        return flags

    def convert_flow(self, cic_flow: Dict[str, Any]) -> NetFlowV5Record:
        """
        Convert a single CIC DDoS flow to NetFlow v5 record

        Args:
            cic_flow: Dictionary with CIC DDoS flow data

        Returns:
            NetFlowV5Record object
        """
        # Extract basic flow identifiers
        src_ip = cic_flow.get(' Source IP', cic_flow.get('Source IP', '0.0.0.0')).strip()
        dst_ip = cic_flow.get(' Destination IP', cic_flow.get('Destination IP', '0.0.0.0')).strip()
        src_port = int(cic_flow.get(' Source Port', cic_flow.get('Source Port', 0)))
        dst_port = int(cic_flow.get(' Destination Port', cic_flow.get('Destination Port', 0)))
        protocol = cic_flow.get(' Protocol', cic_flow.get('Protocol', 'TCP')).strip()

        # Extract traffic statistics
        total_fwd_packets = int(cic_flow.get(' Total Fwd Packets', cic_flow.get('Total Fwd Packets', 0)))
        total_bwd_packets = int(cic_flow.get(' Total Backward Packets', cic_flow.get('Total Backward Packets', 0)))
        d_pkts = total_fwd_packets + total_bwd_packets

        # Calculate total bytes (octets)
        total_fwd_bytes = int(cic_flow.get(' Total Length of Fwd Packets', cic_flow.get('Total Length of Fwd Packets', 0)))
        total_bwd_bytes = int(cic_flow.get(' Total Length of Bwd Packets', cic_flow.get('Total Length of Bwd Packets', 0)))
        d_octets = total_fwd_bytes + total_bwd_bytes

        # Flow timing (convert microseconds to milliseconds)
        flow_duration = int(cic_flow.get(' Flow Duration', cic_flow.get('Flow Duration', 0)))
        sys_uptime = self._get_sys_uptime()
        first = sys_uptime - (flow_duration // 1000)  # Start time
        last = sys_uptime  # End time

        # Parse protocol
        prot = self._parse_protocol(protocol)

        # Calculate TCP flags
        tcp_flags = self._calculate_tcp_flags(cic_flow) if prot == 6 else 0

        return NetFlowV5Record(
            srcaddr=src_ip,
            dstaddr=dst_ip,
            d_pkts=d_pkts,
            d_octets=d_octets,
            first=first,
            last=last,
            srcport=src_port,
            dstport=dst_port,
            prot=prot,
            tcp_flags=tcp_flags
        )

    def convert_batch(self, cic_flows: List[Dict[str, Any]]) -> List[NetFlowV5Record]:
        """
        Convert multiple CIC DDoS flows to NetFlow v5 records

        Args:
            cic_flows: List of CIC DDoS flow dictionaries

        Returns:
            List of NetFlowV5Record objects
        """
        return [self.convert_flow(flow) for flow in cic_flows]

    def create_netflow_packet(self, records: List[NetFlowV5Record]) -> Dict[str, Any]:
        """
        Create a NetFlow v5 packet (header + records) in JSON format

        Args:
            records: List of NetFlowV5Record objects (max 30)

        Returns:
            Dictionary representing NetFlow v5 packet
        """
        # NetFlow v5 supports max 30 records per packet
        records = records[:30]

        now = datetime.now()
        header = NetFlowV5Header(
            count=len(records),
            sys_uptime=self._get_sys_uptime(),
            unix_secs=int(now.timestamp()),
            unix_nsecs=int((now.timestamp() % 1) * 1e9),
            flow_sequence=self.flow_sequence
        )

        self.flow_sequence += len(records)

        return {
            "header": header.dict(),
            "records": [record.dict() for record in records]
        }

    def export_to_json(self, netflow_packet: Dict[str, Any], filepath: str):
        """
        Export NetFlow v5 packet to JSON file

        Args:
            netflow_packet: NetFlow packet dictionary
            filepath: Output file path
        """
        with open(filepath, 'w') as f:
            json.dump(netflow_packet, f, indent=2)

    def get_flow_statistics(self, records: List[NetFlowV5Record]) -> Dict[str, Any]:
        """
        Calculate statistics from NetFlow records

        Args:
            records: List of NetFlowV5Record objects

        Returns:
            Dictionary with flow statistics
        """
        if not records:
            return {
                "total_flows": 0,
                "total_packets": 0,
                "total_bytes": 0,
                "protocols": {},
                "avg_packets_per_flow": 0,
                "avg_bytes_per_flow": 0
            }

        total_packets = sum(r.d_pkts for r in records)
        total_bytes = sum(r.d_octets for r in records)

        # Protocol distribution
        protocol_counts = {}
        protocol_names = {6: "TCP", 17: "UDP", 1: "ICMP"}
        for record in records:
            prot_name = protocol_names.get(record.prot, f"Protocol_{record.prot}")
            protocol_counts[prot_name] = protocol_counts.get(prot_name, 0) + 1

        return {
            "total_flows": len(records),
            "total_packets": total_packets,
            "total_bytes": total_bytes,
            "protocols": protocol_counts,
            "avg_packets_per_flow": total_packets / len(records),
            "avg_bytes_per_flow": total_bytes / len(records)
        }


# Singleton instance
netflow_converter = NetFlowV5Converter()
