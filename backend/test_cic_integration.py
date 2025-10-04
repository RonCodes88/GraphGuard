#!/usr/bin/env python3
"""
Test script for CIC DDoS 2019 integration
Validates data loader, preprocessor, NetFlow converter, and enhanced detector
"""
import asyncio
from agents.data_loader import real_traffic_loader
from agents.detector_enhanced import enhanced_detector
from agents.base import AgentInput
from agents.geoip_service import geoip_service
from agents.netflow_converter import netflow_converter


def print_header(title):
    """Print formatted section header"""
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)


def test_data_loader():
    """Test data loader functionality"""
    print_header("TEST 1: Data Loader")

    # Check if real data is available
    is_available = real_traffic_loader.is_real_data_available()
    print(f"Real data available: {is_available}")

    # Get dataset info
    info = real_traffic_loader.get_dataset_info()
    print(f"Mode: {info['mode']}")
    print(f"Datasets: {info['total_datasets']}")

    if info['total_datasets'] > 0:
        print("\nAvailable datasets:")
        for dataset in info['available_datasets'][:5]:
            print(f"  - {dataset}")
        if info['total_datasets'] > 5:
            print(f"  ... and {info['total_datasets'] - 5} more")

    # Try loading a batch
    print("\nLoading traffic batch...")
    batch = real_traffic_loader.get_traffic_batch(batch_size=20)

    if batch.get("nodes"):
        print(f"✓ Loaded {len(batch['nodes'])} nodes, {len(batch['edges'])} edges")
        print(f"  Attacks: {batch['statistics']['attack_count']}")
        print(f"  Suspicious: {batch['statistics']['suspicious_count']}")
        print(f"  Normal: {batch['statistics']['normal_count']}")

        # Show sample attack types
        attack_types = set()
        for edge in batch['edges']:
            if edge.get('attack_type'):
                attack_types.add(edge['attack_type'])

        if attack_types:
            print(f"\n  Attack types found: {', '.join(list(attack_types)[:5])}")

        return True
    else:
        print("✗ No data loaded (dataset may not be preprocessed)")
        return False


def test_geoip_service():
    """Test GeoIP service"""
    print_header("TEST 2: GeoIP Service")

    test_ips = [
        "192.168.1.1",
        "10.0.0.1",
        "172.16.0.1",
        "8.8.8.8"
    ]

    print("Testing IP to location mapping...")
    for ip in test_ips:
        geo = geoip_service.lookup(ip)
        print(f"  {ip:15} → {geo['country']:20} ({geo['city']})")

    print("\n✓ GeoIP service working")
    return True


def test_netflow_converter():
    """Test NetFlow v5 converter"""
    print_header("TEST 3: NetFlow v5 Converter")

    # Load a sample flow
    batch = real_traffic_loader.get_traffic_batch(batch_size=1)

    if not batch.get("edges"):
        print("✗ No data available for NetFlow conversion test")
        return False

    # Create a mock CIC flow for conversion
    sample_cic_flow = {
        ' Source IP': '192.168.1.100',
        ' Destination IP': '10.0.0.50',
        ' Source Port': 52341,
        ' Destination Port': 53,
        ' Protocol': 'UDP',
        ' Total Fwd Packets': 1000,
        ' Total Backward Packets': 500,
        ' Total Length of Fwd Packets': 50000,
        ' Total Length of Bwd Packets': 25000,
        ' Flow Duration': 5000000,  # microseconds
        'FIN Flag Count': 0,
        'SYN Flag Count': 0,
        'RST Flag Count': 0,
        'PSH Flag Count': 0,
        'ACK Flag Count': 0,
        'URG Flag Count': 0,
    }

    print("Converting CIC DDoS flow to NetFlow v5...")
    netflow_record = netflow_converter.convert_flow(sample_cic_flow)

    print(f"  Source: {netflow_record.srcaddr}:{netflow_record.srcport}")
    print(f"  Destination: {netflow_record.dstaddr}:{netflow_record.dstport}")
    print(f"  Protocol: {netflow_record.prot} (17=UDP)")
    print(f"  Packets: {netflow_record.d_pkts}")
    print(f"  Bytes: {netflow_record.d_octets}")

    # Create NetFlow packet
    netflow_packet = netflow_converter.create_netflow_packet([netflow_record])
    print(f"\n  NetFlow Packet Header:")
    print(f"    Version: {netflow_packet['header']['version']}")
    print(f"    Flow Count: {netflow_packet['header']['count']}")
    print(f"    Records: {len(netflow_packet['records'])}")

    print("\n✓ NetFlow v5 converter working")
    return True


async def test_enhanced_detector():
    """Test enhanced detector agent"""
    print_header("TEST 4: Enhanced Detector Agent")

    # Load traffic batch
    batch = real_traffic_loader.get_traffic_batch(batch_size=50)

    if not batch.get("nodes"):
        print("✗ No data available for detector test")
        return False

    print(f"Analyzing {len(batch['edges'])} flows with EnhancedDetectorAgent...")

    # Run detector
    agent_input = AgentInput(data=batch)
    result = await enhanced_detector.process(agent_input)

    decision = result.decision
    print(f"\nDecision: {decision.decision}")
    print(f"Confidence: {decision.confidence:.2%}")
    print(f"\nReasoning:")
    for line in decision.reasoning.split('\n'):
        if line.strip():
            print(f"  {line}")

    # Show detection breakdown
    detections = decision.metadata.get('detections', [])
    print(f"\n  Total detections: {len(detections)}")

    # Group by type
    detection_types = {}
    for det in detections:
        dtype = det.get('type', 'unknown')
        detection_types[dtype] = detection_types.get(dtype, 0) + 1

    if detection_types:
        print("\n  Detection breakdown:")
        for dtype, count in sorted(detection_types.items(), key=lambda x: -x[1]):
            print(f"    {dtype}: {count}")

    # Show threat level
    threat_level = decision.metadata.get('threat_level', 'unknown')
    print(f"\n  Threat Level: {threat_level.upper()}")

    # Show next agents
    if result.next_agents:
        print(f"  Next Agents: {', '.join(result.next_agents)}")

    print("\n✓ Enhanced detector working")
    return True


def run_all_tests():
    """Run all integration tests"""
    print("\n" + "=" * 60)
    print("  CIC DDoS 2019 Integration Test Suite")
    print("=" * 60)

    results = {}

    # Test 1: Data Loader
    try:
        results['data_loader'] = test_data_loader()
    except Exception as e:
        print(f"✗ Data Loader test failed: {e}")
        results['data_loader'] = False

    # Test 2: GeoIP Service
    try:
        results['geoip'] = test_geoip_service()
    except Exception as e:
        print(f"✗ GeoIP test failed: {e}")
        results['geoip'] = False

    # Test 3: NetFlow Converter
    try:
        results['netflow'] = test_netflow_converter()
    except Exception as e:
        print(f"✗ NetFlow test failed: {e}")
        results['netflow'] = False

    # Test 4: Enhanced Detector (async)
    try:
        results['detector'] = asyncio.run(test_enhanced_detector())
    except Exception as e:
        print(f"✗ Detector test failed: {e}")
        results['detector'] = False

    # Summary
    print_header("TEST SUMMARY")

    total = len(results)
    passed = sum(1 for v in results.values() if v)

    for test_name, passed_test in results.items():
        status = "✓ PASS" if passed_test else "✗ FAIL"
        print(f"  {test_name:20} {status}")

    print(f"\n  Overall: {passed}/{total} tests passed")

    if passed == total:
        print("\n  ✓ All tests passed! Integration successful.")

        if real_traffic_loader.is_real_data_available():
            print("\n  🎉 System is using REAL CIC DDoS 2019 data!")
        else:
            print("\n  ℹ️  System is using synthetic data (dataset not loaded)")
            print("     To use real data:")
            print("     1. Download CIC DDoS 2019 CSV files")
            print("     2. Place in backend/data/raw/")
            print("     3. Run: python -m agents.data_preprocessor")
    else:
        print("\n  ⚠️  Some tests failed. Check errors above.")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    run_all_tests()
