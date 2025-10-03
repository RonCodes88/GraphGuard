/**
 * Major cities database for network visualization
 */

export interface City {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number;
  isCapital: boolean;
}

export const MAJOR_CITIES: City[] = [
  // United States
  { name: "New York", country: "United States", latitude: 40.7128, longitude: -74.0060, population: 8336817, isCapital: false },
  { name: "Washington DC", country: "United States", latitude: 38.9072, longitude: -77.0369, population: 705749, isCapital: true },
  { name: "Los Angeles", country: "United States", latitude: 34.0522, longitude: -118.2437, population: 3979576, isCapital: false },
  { name: "Chicago", country: "United States", latitude: 41.8781, longitude: -87.6298, population: 2693976, isCapital: false },
  { name: "San Francisco", country: "United States", latitude: 37.7749, longitude: -122.4194, population: 873965, isCapital: false },

  // China
  { name: "Beijing", country: "China", latitude: 39.9042, longitude: 116.4074, population: 21540000, isCapital: true },
  { name: "Shanghai", country: "China", latitude: 31.2304, longitude: 121.4737, population: 27058000, isCapital: false },
  { name: "Shenzhen", country: "China", latitude: 22.5431, longitude: 114.0579, population: 12528300, isCapital: false },
  { name: "Guangzhou", country: "China", latitude: 23.1291, longitude: 113.2644, population: 15300000, isCapital: false },
  { name: "Hong Kong", country: "China", latitude: 22.3193, longitude: 114.1694, population: 7496981, isCapital: false },

  // United Kingdom
  { name: "London", country: "United Kingdom", latitude: 51.5074, longitude: -0.1278, population: 8982000, isCapital: true },
  { name: "Manchester", country: "United Kingdom", latitude: 53.4808, longitude: -2.2426, population: 547627, isCapital: false },
  { name: "Birmingham", country: "United Kingdom", latitude: 52.4862, longitude: -1.8904, population: 1141816, isCapital: false },
  { name: "Edinburgh", country: "United Kingdom", latitude: 55.9533, longitude: -3.1883, population: 524930, isCapital: false },

  // Germany
  { name: "Berlin", country: "Germany", latitude: 52.5200, longitude: 13.4050, population: 3645000, isCapital: true },
  { name: "Munich", country: "Germany", latitude: 48.1351, longitude: 11.5820, population: 1471000, isCapital: false },
  { name: "Frankfurt", country: "Germany", latitude: 50.1109, longitude: 8.6821, population: 753056, isCapital: false },
  { name: "Hamburg", country: "Germany", latitude: 53.5511, longitude: 9.9937, population: 1841179, isCapital: false },

  // Japan
  { name: "Tokyo", country: "Japan", latitude: 35.6762, longitude: 139.6503, population: 13960000, isCapital: true },
  { name: "Osaka", country: "Japan", latitude: 34.6937, longitude: 135.5023, population: 2725006, isCapital: false },
  { name: "Kyoto", country: "Japan", latitude: 35.0116, longitude: 135.7681, population: 1475183, isCapital: false },
  { name: "Yokohama", country: "Japan", latitude: 35.4437, longitude: 139.6380, population: 3748000, isCapital: false },

  // France
  { name: "Paris", country: "France", latitude: 48.8566, longitude: 2.3522, population: 2161000, isCapital: true },
  { name: "Lyon", country: "France", latitude: 45.7640, longitude: 4.8357, population: 513275, isCapital: false },
  { name: "Marseille", country: "France", latitude: 43.2965, longitude: 5.3698, population: 869815, isCapital: false },
  { name: "Nice", country: "France", latitude: 43.7102, longitude: 7.2620, population: 340017, isCapital: false },

  // Russia
  { name: "Moscow", country: "Russia", latitude: 55.7558, longitude: 37.6173, population: 12506000, isCapital: true },
  { name: "Saint Petersburg", country: "Russia", latitude: 59.9343, longitude: 30.3351, population: 5383000, isCapital: false },
  { name: "Novosibirsk", country: "Russia", latitude: 55.0084, longitude: 82.9357, population: 1612833, isCapital: false },

  // India
  { name: "New Delhi", country: "India", latitude: 28.6139, longitude: 77.2090, population: 32941000, isCapital: true },
  { name: "Mumbai", country: "India", latitude: 19.0760, longitude: 72.8777, population: 20411000, isCapital: false },
  { name: "Bangalore", country: "India", latitude: 12.9716, longitude: 77.5946, population: 12326000, isCapital: false },
  { name: "Hyderabad", country: "India", latitude: 17.3850, longitude: 78.4867, population: 10004000, isCapital: false },

  // Brazil
  { name: "Brasília", country: "Brazil", latitude: -15.8267, longitude: -47.9218, population: 3055149, isCapital: true },
  { name: "São Paulo", country: "Brazil", latitude: -23.5505, longitude: -46.6333, population: 12325232, isCapital: false },
  { name: "Rio de Janeiro", country: "Brazil", latitude: -22.9068, longitude: -43.1729, population: 6748000, isCapital: false },

  // Canada
  { name: "Ottawa", country: "Canada", latitude: 45.4215, longitude: -75.6972, population: 994837, isCapital: true },
  { name: "Toronto", country: "Canada", latitude: 43.6532, longitude: -79.3832, population: 2930000, isCapital: false },
  { name: "Vancouver", country: "Canada", latitude: 49.2827, longitude: -123.1207, population: 675218, isCapital: false },
  { name: "Montreal", country: "Canada", latitude: 45.5017, longitude: -73.5673, population: 1780000, isCapital: false },

  // Australia
  { name: "Canberra", country: "Australia", latitude: -35.2809, longitude: 149.1300, population: 431380, isCapital: true },
  { name: "Sydney", country: "Australia", latitude: -33.8688, longitude: 151.2093, population: 5312000, isCapital: false },
  { name: "Melbourne", country: "Australia", latitude: -37.8136, longitude: 144.9631, population: 5078000, isCapital: false },

  // South Korea
  { name: "Seoul", country: "South Korea", latitude: 37.5665, longitude: 126.9780, population: 9776000, isCapital: true },
  { name: "Busan", country: "South Korea", latitude: 35.1796, longitude: 129.0756, population: 3414950, isCapital: false },

  // Italy
  { name: "Rome", country: "Italy", latitude: 41.9028, longitude: 12.4964, population: 2872800, isCapital: true },
  { name: "Milan", country: "Italy", latitude: 45.4642, longitude: 9.1900, population: 1396000, isCapital: false },

  // Spain
  { name: "Madrid", country: "Spain", latitude: 40.4168, longitude: -3.7038, population: 3223000, isCapital: true },
  { name: "Barcelona", country: "Spain", latitude: 41.3874, longitude: 2.1686, population: 1620000, isCapital: false },

  // Mexico
  { name: "Mexico City", country: "Mexico", latitude: 19.4326, longitude: -99.1332, population: 9209000, isCapital: true },
  { name: "Guadalajara", country: "Mexico", latitude: 20.6597, longitude: -103.3496, population: 1495189, isCapital: false },

  // Netherlands
  { name: "Amsterdam", country: "Netherlands", latitude: 52.3676, longitude: 4.9041, population: 872680, isCapital: true },
  { name: "Rotterdam", country: "Netherlands", latitude: 51.9225, longitude: 4.47917, population: 651446, isCapital: false },

  // Sweden
  { name: "Stockholm", country: "Sweden", latitude: 59.3293, longitude: 18.0686, population: 975551, isCapital: true },

  // Norway
  { name: "Oslo", country: "Norway", latitude: 59.9139, longitude: 10.7522, population: 697010, isCapital: true },

  // Switzerland
  { name: "Bern", country: "Switzerland", latitude: 46.9480, longitude: 7.4474, population: 133115, isCapital: true },
  { name: "Zurich", country: "Switzerland", latitude: 47.3769, longitude: 8.5417, population: 421878, isCapital: false },

  // Belgium
  { name: "Brussels", country: "Belgium", latitude: 50.8503, longitude: 4.3517, population: 1208542, isCapital: true },

  // Singapore
  { name: "Singapore", country: "Singapore", latitude: 1.3521, longitude: 103.8198, population: 5685807, isCapital: true },

  // UAE
  { name: "Dubai", country: "United Arab Emirates", latitude: 25.2048, longitude: 55.2708, population: 3331420, isCapital: false },
  { name: "Abu Dhabi", country: "United Arab Emirates", latitude: 24.4539, longitude: 54.3773, population: 1482816, isCapital: true },
];

export function getCitiesByCountry(country: string): City[] {
  return MAJOR_CITIES.filter(city => city.country === country);
}

export function getCapitalCity(country: string): City | undefined {
  return MAJOR_CITIES.find(city => city.country === country && city.isCapital);
}

