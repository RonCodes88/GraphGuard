"""
GeoIP Service for mapping IP addresses to geographic locations
Handles both public and private IP ranges for the CIC DDoS 2019 dataset
"""
import ipaddress
import random
from typing import Dict, Tuple, Optional
from functools import lru_cache


class GeoIPService:
    """
    IP to geographic location mapper
    Handles private IPs (common in CIC DDoS dataset) with simulated geo data
    """

    def __init__(self):
        # Country data with realistic coordinates
        self.country_data = {
            "United States": {
                "cities": ["New York", "Washington DC", "Los Angeles", "Chicago", "Dallas", "Atlanta", "Seattle"],
                "lat_range": (25.0, 49.0),
                "lon_range": (-125.0, -66.0)
            },
            "China": {
                "cities": ["Beijing", "Shanghai", "Shenzhen", "Guangzhou", "Chengdu", "Hangzhou"],
                "lat_range": (18.0, 54.0),
                "lon_range": (73.0, 135.0)
            },
            "United Kingdom": {
                "cities": ["London", "Manchester", "Birmingham", "Edinburgh", "Glasgow"],
                "lat_range": (50.0, 59.0),
                "lon_range": (-8.0, 2.0)
            },
            "Germany": {
                "cities": ["Berlin", "Munich", "Frankfurt", "Hamburg", "Cologne"],
                "lat_range": (47.0, 55.0),
                "lon_range": (6.0, 15.0)
            },
            "Japan": {
                "cities": ["Tokyo", "Osaka", "Kyoto", "Yokohama", "Nagoya"],
                "lat_range": (30.0, 46.0),
                "lon_range": (129.0, 146.0)
            },
            "France": {
                "cities": ["Paris", "Lyon", "Marseille", "Toulouse", "Nice"],
                "lat_range": (42.0, 51.0),
                "lon_range": (-5.0, 8.0)
            },
            "Russia": {
                "cities": ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan"],
                "lat_range": (41.0, 82.0),
                "lon_range": (19.0, 180.0)
            },
            "India": {
                "cities": ["New Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai"],
                "lat_range": (8.0, 35.0),
                "lon_range": (68.0, 97.0)
            },
            "Brazil": {
                "cities": ["Brasília", "São Paulo", "Rio de Janeiro", "Salvador", "Fortaleza"],
                "lat_range": (-34.0, 5.0),
                "lon_range": (-74.0, -35.0)
            },
            "South Korea": {
                "cities": ["Seoul", "Busan", "Incheon", "Daegu", "Daejeon"],
                "lat_range": (33.0, 39.0),
                "lon_range": (124.0, 132.0)
            },
            "Canada": {
                "cities": ["Ottawa", "Toronto", "Vancouver", "Montreal", "Calgary"],
                "lat_range": (42.0, 83.0),
                "lon_range": (-141.0, -52.0)
            },
            "Australia": {
                "cities": ["Canberra", "Sydney", "Melbourne", "Brisbane", "Perth"],
                "lat_range": (-44.0, -10.0),
                "lon_range": (113.0, 154.0)
            },
            "Netherlands": {
                "cities": ["Amsterdam", "Rotterdam", "The Hague", "Utrecht", "Eindhoven"],
                "lat_range": (50.7, 53.5),
                "lon_range": (3.3, 7.2)
            },
            "Singapore": {
                "cities": ["Singapore City", "Jurong", "Woodlands", "Tampines"],
                "lat_range": (1.2, 1.5),
                "lon_range": (103.6, 104.0)
            }
        }

        self.all_countries = list(self.country_data.keys())

        # IP range to country mappings (simulated for private IPs)
        # In CIC DDoS 2019, most IPs are private (192.168.x.x, 10.x.x.x)
        self.ip_cache: Dict[str, Dict] = {}

    @lru_cache(maxsize=10000)
    def _is_private_ip(self, ip: str) -> bool:
        """Check if IP is in private range"""
        try:
            ip_obj = ipaddress.ip_address(ip)
            return ip_obj.is_private
        except ValueError:
            return False

    def _assign_country_by_ip_hash(self, ip: str) -> str:
        """
        Consistently assign country based on IP hash
        Same IP always maps to same country
        """
        # Use IP hash to deterministically select country
        ip_hash = hash(ip)
        country_index = abs(ip_hash) % len(self.all_countries)
        return self.all_countries[country_index]

    def _generate_coords(self, country: str) -> Tuple[float, float]:
        """Generate coordinates within country bounds"""
        country_info = self.country_data[country]
        lat = random.uniform(*country_info["lat_range"])
        lon = random.uniform(*country_info["lon_range"])
        return lat, lon

    @lru_cache(maxsize=10000)
    def lookup(self, ip: str) -> Dict[str, any]:
        """
        Lookup geographic information for an IP address

        Args:
            ip: IP address string

        Returns:
            Dict with country, city, latitude, longitude
        """
        # Check cache first
        if ip in self.ip_cache:
            return self.ip_cache[ip]

        # For private IPs (common in CIC DDoS dataset), use deterministic mapping
        if self._is_private_ip(ip):
            country = self._assign_country_by_ip_hash(ip)
        else:
            # For public IPs, could integrate real GeoIP database (MaxMind, ip2location)
            # For now, use hash-based assignment
            country = self._assign_country_by_ip_hash(ip)

        # Get country data
        country_info = self.country_data[country]
        city = random.choice(country_info["cities"])
        lat, lon = self._generate_coords(country)

        result = {
            "country": country,
            "city": city,
            "latitude": lat,
            "longitude": lon
        }

        # Cache result
        self.ip_cache[ip] = result

        return result

    def bulk_lookup(self, ips: list) -> Dict[str, Dict]:
        """
        Lookup multiple IPs at once

        Args:
            ips: List of IP addresses

        Returns:
            Dict mapping IP to geo info
        """
        results = {}
        for ip in ips:
            results[ip] = self.lookup(ip)
        return results

    def get_country_list(self) -> list:
        """Get list of all available countries"""
        return self.all_countries.copy()

    def get_cities_for_country(self, country: str) -> list:
        """Get list of cities for a specific country"""
        if country in self.country_data:
            return self.country_data[country]["cities"].copy()
        return []


# Singleton instance
geoip_service = GeoIPService()
