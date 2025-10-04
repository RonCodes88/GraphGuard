"""
Batch Processor for Progressive Network Data Revelation
Intelligently chunks processed network data into logical batches for visualization
"""
import json
import random
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime
import math

class NetworkBatchProcessor:
    """
    Processes large network datasets into logical batches for progressive visualization
    """
    
    def __init__(self, batch_size: int = 20, batch_interval: float = 3.0):
        self.batch_size = batch_size
        self.batch_interval = batch_interval
        self.processed_data = None
        self.batches = []
        self.current_batch_index = 0
        
    def load_processed_data(self, file_path: str) -> Dict[str, Any]:
        """Load processed network data from JSON file"""
        try:
            import os
            if not os.path.exists(file_path):
                print(f"File not found: {file_path}")
                return {}
                
            with open(file_path, 'r') as f:
                data = json.load(f)
            self.processed_data = data
            print(f"Loaded {len(data.get('nodes', []))} nodes and {len(data.get('edges', []))} edges from {file_path}")
            return data
        except Exception as e:
            print(f"Error loading processed data from {file_path}: {e}")
            return {}
    
    def create_logical_batches(self, country_filter: str = None) -> List[Dict[str, Any]]:
        """
        Create logical batches based on network topology and attack patterns
        Prioritizes showing attack patterns and network relationships
        """
        if not self.processed_data:
            return []
        
        nodes = self.processed_data.get('nodes', [])
        edges = self.processed_data.get('edges', [])
        
        # Filter by country if specified
        if country_filter:
            nodes = [n for n in nodes if n.get('country') == country_filter]
            node_ids = {n['id'] for n in nodes}
            edges = [e for e in edges if e.get('source_id') in node_ids and e.get('target_id') in node_ids]
        
        if not nodes:
            return []
        
        # Strategy 1: Group by attack patterns and network topology
        batches = self._create_attack_pattern_batches(nodes, edges)
        
        # Strategy 2: If not enough attack patterns, create geographic/type-based batches
        if len(batches) < 3:
            batches.extend(self._create_geographic_batches(nodes, edges))
        
        # Strategy 3: Fill remaining with random batches
        remaining_nodes = self._get_remaining_nodes(nodes, batches)
        if remaining_nodes:
            batches.extend(self._create_random_batches(remaining_nodes, edges))
        
        self.batches = batches
        print(f"Created {len(batches)} logical batches for {country_filter or 'all countries'}")
        return batches
    
    def _create_attack_pattern_batches(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict[str, Any]]:
        """Create batches based on attack patterns and network relationships"""
        batches = []
        
        # Find attacked nodes and their relationships
        attacked_nodes = [n for n in nodes if n.get('status') == 'attacked']
        suspicious_nodes = [n for n in nodes if n.get('status') == 'suspicious']
        
        # Batch 1: Show attacked nodes first (most critical)
        if attacked_nodes:
            attack_batch = {
                'batch_number': len(batches),
                'nodes': attacked_nodes[:self.batch_size],
                'edges': [],
                'description': 'Critical: Nodes under attack',
                'priority': 'critical',
                'timestamp': datetime.now().isoformat()
            }
            
            # Add edges connected to attacked nodes
            attacked_node_ids = {n['id'] for n in attack_batch['nodes']}
            attack_edges = [e for e in edges if 
                          e.get('source_id') in attacked_node_ids or 
                          e.get('target_id') in attacked_node_ids]
            attack_batch['edges'] = attack_edges[:self.batch_size * 2]  # Limit edges
            
            batches.append(attack_batch)
        
        # Batch 2: Show suspicious nodes and their connections
        if suspicious_nodes and len(batches) < 5:  # Limit total batches
            suspicious_batch = {
                'batch_number': len(batches),
                'nodes': suspicious_nodes[:self.batch_size],
                'edges': [],
                'description': 'Suspicious activity detected',
                'priority': 'high',
                'timestamp': datetime.now().isoformat()
            }
            
            # Add edges connected to suspicious nodes
            suspicious_node_ids = {n['id'] for n in suspicious_batch['nodes']}
            suspicious_edges = [e for e in edges if 
                              e.get('source_id') in suspicious_node_ids or 
                              e.get('target_id') in suspicious_node_ids]
            suspicious_batch['edges'] = suspicious_edges[:self.batch_size * 2]
            
            batches.append(suspicious_batch)
        
        return batches
    
    def _create_geographic_batches(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict[str, Any]]:
        """Create batches based on geographic distribution"""
        batches = []
        
        # Group nodes by city
        city_groups = {}
        for node in nodes:
            city = node.get('city', 'Unknown')
            if city not in city_groups:
                city_groups[city] = []
            city_groups[city].append(node)
        
        # Create batches for each city (if enough nodes)
        for city, city_nodes in city_groups.items():
            if len(city_nodes) >= 3 and len(batches) < 8:  # Limit batches
                city_batch = {
                    'batch_number': len(batches),
                    'nodes': city_nodes[:self.batch_size],
                    'edges': [],
                    'description': f'Network activity in {city}',
                    'priority': 'medium',
                    'timestamp': datetime.now().isoformat()
                }
                
                # Add edges within this city
                city_node_ids = {n['id'] for n in city_batch['nodes']}
                city_edges = [e for e in edges if 
                            e.get('source_id') in city_node_ids and 
                            e.get('target_id') in city_node_ids]
                city_batch['edges'] = city_edges[:self.batch_size]
                
                batches.append(city_batch)
        
        return batches
    
    def _create_random_batches(self, nodes: List[Dict], edges: List[Dict]) -> List[Dict[str, Any]]:
        """Create random batches for remaining nodes"""
        batches = []
        
        # Shuffle nodes for random distribution
        random.shuffle(nodes)
        
        # Create batches of remaining nodes
        for i in range(0, len(nodes), self.batch_size):
            batch_nodes = nodes[i:i + self.batch_size]
            
            batch = {
                'batch_number': len(batches),
                'nodes': batch_nodes,
                'edges': [],
                'description': f'Additional network nodes',
                'priority': 'low',
                'timestamp': datetime.now().isoformat()
            }
            
            # Add random edges for these nodes
            batch_node_ids = {n['id'] for n in batch_nodes}
            batch_edges = [e for e in edges if 
                          e.get('source_id') in batch_node_ids and 
                          e.get('target_id') in batch_node_ids]
            batch['edges'] = batch_edges[:self.batch_size]
            
            batches.append(batch)
        
        return batches
    
    def _get_remaining_nodes(self, all_nodes: List[Dict], batches: List[Dict]) -> List[Dict]:
        """Get nodes that haven't been included in any batch yet"""
        used_node_ids = set()
        for batch in batches:
            for node in batch.get('nodes', []):
                used_node_ids.add(node['id'])
        
        return [n for n in all_nodes if n['id'] not in used_node_ids]
    
    def get_next_batch(self) -> Optional[Dict[str, Any]]:
        """Get the next batch in sequence"""
        if self.current_batch_index < len(self.batches):
            batch = self.batches[self.current_batch_index]
            self.current_batch_index += 1
            return batch
        return None
    
    def reset_batches(self):
        """Reset to first batch"""
        self.current_batch_index = 0
    
    def get_batch_info(self) -> Dict[str, Any]:
        """Get information about the batch processing"""
        return {
            'total_batches': len(self.batches),
            'current_batch': self.current_batch_index,
            'batch_size': self.batch_size,
            'batch_interval': self.batch_interval,
            'remaining_batches': len(self.batches) - self.current_batch_index
        }
    
    def get_all_batches(self) -> List[Dict[str, Any]]:
        """Get all batches (for debugging)"""
        return self.batches


class CountryBatchManager:
    """
    Manages batch processing for different countries
    """
    
    def __init__(self, processed_data_dir: str = "data/processed"):
        self.processed_data_dir = processed_data_dir
        self.country_processors = {}
        self.available_datasets = [
            "DrDoS_DNS.json", "DrDoS_LDAP.json", "DrDoS_MSSQL.json", 
            "DrDoS_NetBIOS.json", "DrDoS_NTP.json", "DrDoS_SNMP.json",
            "DrDoS_SSDP.json", "DrDoS_UDP.json", "LDAP.json", "MSSQL.json",
            "NetBIOS.json", "Portmap.json", "Syn.json", "TFTP.json",
            "UDP.json", "UDPLag.json"
        ]
    
    def get_country_batches(self, country: str, dataset: str = None) -> List[Dict[str, Any]]:
        """
        Get batches for a specific country from available datasets
        """
        if country not in self.country_processors:
            # Select dataset for this country
            if not dataset:
                dataset = random.choice(self.available_datasets)
            
            file_path = f"{self.processed_data_dir}/{dataset}"
            
            # Create processor for this country
            processor = NetworkBatchProcessor(batch_size=20, batch_interval=3.0)
            data = processor.load_processed_data(file_path)
            
            if not data or not data.get('nodes'):
                print(f"No data found for {country} in {dataset}")
                # Try a different dataset
                for fallback_dataset in self.available_datasets:
                    if fallback_dataset != dataset:
                        fallback_path = f"{self.processed_data_dir}/{fallback_dataset}"
                        fallback_data = processor.load_processed_data(fallback_path)
                        if fallback_data and fallback_data.get('nodes'):
                            print(f"Using fallback dataset {fallback_dataset} for {country}")
                            data = fallback_data
                            break
                
                if not data or not data.get('nodes'):
                    print(f"No data found in any dataset for {country}")
                    self.country_processors[country] = processor
                    return []
            
            # Filter by country to get only relevant data
            processor.create_logical_batches(country_filter=country)
            self.country_processors[country] = processor
        
        batches = self.country_processors[country].get_all_batches()
        if not batches:
            print(f"No batches created for {country}")
            # Try to find similar country names
            available_countries = set()
            for processor in self.country_processors.values():
                if processor.processed_data:
                    countries = {node.get('country') for node in processor.processed_data.get('nodes', [])}
                    available_countries.update(countries)
            
            if available_countries:
                print(f"Available countries: {sorted(available_countries)}")
                # Try to find a similar country name
                for available_country in available_countries:
                    if country.lower() in available_country.lower() or available_country.lower() in country.lower():
                        print(f"Using similar country: {available_country}")
                        return self.get_country_batches(available_country)
            
            return []
        
        return batches
    
    def get_available_countries(self) -> List[str]:
        """Get list of available countries in the datasets"""
        available_countries = set()
        for dataset in self.available_datasets:
            file_path = f"{self.processed_data_dir}/{dataset}"
            try:
                with open(file_path, 'r') as f:
                    data = json.load(f)
                    countries = {node.get('country') for node in data.get('nodes', []) if node.get('country')}
                    available_countries.update(countries)
                    print(f"Found countries in {dataset}: {sorted(countries)}")
            except Exception as e:
                print(f"Error reading {dataset}: {e}")
                continue
        
        result = sorted(list(available_countries))
        print(f"Total available countries: {result}")
        return result
    
    def reset_country_batches(self, country: str):
        """Reset batches for a specific country"""
        if country in self.country_processors:
            self.country_processors[country].reset_batches()


# Global instance
country_batch_manager = CountryBatchManager()
