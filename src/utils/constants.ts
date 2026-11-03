import { WeatherStation, SuggestedPrompt, ClimateTool } from '../types';

export const APP_CONFIG = {
  name: 'ClimateSphere AI',
  tagline: 'Global Weather & Climate Assistant',
  subheading: 'Your intelligent companion for weather, climate, and everything happening across our planet.',
  version: '2.0.0-preview',
  supportedProviders: ['Google Gemini', 'Groq LPU', 'Hugging Face', 'ECMWF/NOAA Telemetry'],
} as const;

/**
 * 4 Primary Suggestion Cards for Homepage
 */
export const PRIMARY_SUGGESTIONS: SuggestedPrompt[] = [
  {
    id: 'weather-chennai',
    category: 'Weather Forecast',
    title: 'Chennai Weather',
    prompt: "What's the weather in Chennai today?",
    iconName: 'CloudSun',
  },
  {
    id: 'global-warming',
    category: 'Climate Science',
    title: 'Global Warming',
    prompt: 'Explain global warming.',
    iconName: 'Globe2',
  },
  {
    id: 'cyclone-formation',
    category: 'Extreme Weather',
    title: 'Tropical Cyclones',
    prompt: 'How do tropical cyclones form?',
    iconName: 'Flame',
  },
  {
    id: 'temp-trends',
    category: 'Climate Research',
    title: 'Temperature Trends',
    prompt: 'Analyze global temperature trends.',
    iconName: 'LineChart',
  },
];

export const SUGGESTED_RESEARCH_PROMPTS = PRIMARY_SUGGESTIONS;

/**
 * The 8 ClimateSphere AI Specialized Tools
 */
export const CLIMATE_TOOLS: ClimateTool[] = [
  {
    id: 'current-weather',
    name: 'Current Weather',
    description: 'Instant surface temperature, pressure, humidity, and wind telemetry',
    icon: 'Thermometer',
    path: '/tools/current-weather',
    category: 'Weather',
    badge: 'Live Sensor',
  },
  {
    id: 'weather-forecast',
    name: 'Weather Forecast',
    description: '7-day ensemble numerical forecasts and synoptic atmospheric outlooks',
    icon: 'CloudRain',
    path: '/tools/forecast',
    category: 'Weather',
  },
  {
    id: 'weather-map',
    name: 'Global Weather Map',
    description: 'Interactive radar, precipitation fronts, cloud motion, and pressure isobars',
    icon: 'Map',
    path: '/tools/weather-map',
    category: 'Weather',
    badge: 'Radar GIS',
  },
  {
    id: 'climate-explorer',
    name: 'Climate Explorer',
    description: 'Long-term greenhouse gas anomalies, radiative forcing, and cryosphere tracking',
    icon: 'Globe2',
    path: '/tools/climate-explorer',
    category: 'Climate',
  },
  {
    id: 'climate-research',
    name: 'Climate Research',
    description: 'Copernicus ERA5 reanalysis datasets, CMIP6 models, and published bulletins',
    icon: 'BookOpen',
    path: '/tools/research',
    category: 'Climate',
  },
  {
    id: 'air-quality',
    name: 'Air Quality',
    description: 'Global AQI, particulate matter (PM2.5 / PM10), ozone, and chemical dispersion',
    icon: 'Wind',
    path: '/tools/air-quality',
    category: 'Analytics',
  },
  {
    id: 'disaster-monitor',
    name: 'Natural Disaster Monitor',
    description: 'Tracking tropical cyclones, extreme heatwaves, flood alerts, and wildfire risks',
    icon: 'AlertTriangle',
    path: '/tools/disasters',
    category: 'Safety',
    badge: 'Alerts',
  },
  {
    id: 'compare-locations',
    name: 'Compare Locations',
    description: 'Side-by-side meteorological and climate vulnerability comparison',
    icon: 'GitCompare',
    path: '/tools/compare',
    category: 'Analytics',
  },
];

export const DEFAULT_STATIONS: WeatherStation[] = [
  {
    id: 'STN-CHENNAI-01',
    name: 'Chennai Regional Meteorological Observatory',
    region: 'Tamil Nadu',
    country: 'India',
    coordinates: { latitude: 13.0827, longitude: 80.2707, altitudeMeters: 6 },
    elevation: '6 m',
    status: 'online',
    lastPing: 'IMD Station Gateway Active',
  },
  {
    id: 'STN-MAUNA-01',
    name: 'Mauna Loa Atmospheric Observatory',
    region: 'Hawaii',
    country: 'United States',
    coordinates: { latitude: 19.5362, longitude: -155.5763, altitudeMeters: 3397 },
    elevation: '3,397 m',
    status: 'online',
    lastPing: 'NOAA Baseline CO2 Feed Active',
  },
  {
    id: 'STN-SVALBARD-01',
    name: 'Svalbard Global Arctic Station',
    region: 'Spitsbergen',
    country: 'Norway',
    coordinates: { latitude: 78.2232, longitude: 15.6267, altitudeMeters: 40 },
    elevation: '40 m',
    status: 'online',
    lastPing: 'Cryosphere Radiometer Active',
  },
  {
    id: 'STN-CONCORDIA-01',
    name: 'Concordia Dome C Research Station',
    region: 'Antarctic Plateau',
    country: 'Antarctica',
    coordinates: { latitude: -75.1, longitude: 123.3333, altitudeMeters: 3233 },
    elevation: '3,233 m',
    status: 'simulated',
    lastPing: 'Polar Telemetry Standby',
  },
];
