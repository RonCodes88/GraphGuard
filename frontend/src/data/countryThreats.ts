// Shared country threat level data for globe visualization and monitoring
export type ThreatLevel = 'critical' | 'medium' | 'safe';

export interface CountryThreat {
  country: string;
  threatLevel: ThreatLevel;
  lastUpdated: number;
}

// Dummy threat data for countries - will be replaced with real-time data
export const countryThreats: Record<string, ThreatLevel> = {
  "United States": "critical",
  "China": "critical",
  "Russia": "critical",
  "Germany": "medium",
  "United Kingdom": "medium",
  "France": "medium",
  "Japan": "safe",
  "South Korea": "medium",
  "India": "medium",
  "Brazil": "medium",
  "Canada": "safe",
  "Australia": "safe",
  "Netherlands": "safe",
  "Singapore": "safe",
  "Israel": "medium",
  "Ukraine": "critical",
  "Iran": "critical",
  "North Korea": "critical",
  "Turkey": "medium",
  "Mexico": "medium",
  "Spain": "safe",
  "Italy": "safe",
  "Poland": "medium",
  "Sweden": "safe",
  "Norway": "safe",
  "Finland": "safe",
  "Denmark": "safe",
  "Switzerland": "safe",
  "Austria": "safe",
  "Belgium": "safe",
  "Saudi Arabia": "medium",
  "UAE": "safe",
  "Egypt": "medium",
  "South Africa": "medium",
  "Nigeria": "medium",
  "Kenya": "safe",
  "Argentina": "safe",
  "Chile": "safe",
  "Colombia": "medium",
  "Peru": "safe",
  "Venezuela": "medium",
  "Vietnam": "medium",
  "Thailand": "safe",
  "Malaysia": "safe",
  "Indonesia": "medium",
  "Philippines": "medium",
  "Pakistan": "medium",
  "Bangladesh": "medium",
  "New Zealand": "safe",
};

export function getThreatColor(threatLevel: ThreatLevel): number {
  switch (threatLevel) {
    case 'critical':
      return 0xff0000; // Red
    case 'medium':
      return 0xffff00; // Yellow
    case 'safe':
      return 0x00ff00; // Green
  }
}

export function getCountryThreatLevel(country: string): ThreatLevel {
  return countryThreats[country] || 'safe';
}

// Generate random threat level for cities based on country
export function getCityThreatLevel(country: string): ThreatLevel {
  const countryLevel = getCountryThreatLevel(country);
  
  // Cities in critical countries have high chance of being critical
  if (countryLevel === 'critical') {
    const rand = Math.random();
    if (rand < 0.6) return 'critical';
    if (rand < 0.9) return 'medium';
    return 'safe';
  }
  
  // Cities in medium threat countries
  if (countryLevel === 'medium') {
    const rand = Math.random();
    if (rand < 0.3) return 'critical';
    if (rand < 0.7) return 'medium';
    return 'safe';
  }
  
  // Cities in safe countries mostly safe
  const rand = Math.random();
  if (rand < 0.1) return 'medium';
  return 'safe';
}

