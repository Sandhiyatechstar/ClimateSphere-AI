import { ApiResponse, fetchWithFallback, apiGet } from './apiClient';
import {
  WeatherMetric,
  WeatherStation,
  BackendCurrentWeather,
  BackendForecastResponse,
} from '../types';
import { DEFAULT_STATIONS } from '../utils/constants';

/**
 * Reusable Frontend Weather Service
 * 
 * Directly queries the ClimateSphere AI FastAPI backend for real-time
 * OpenWeatherMap telemetry and 5-day / 3-hour forecasts.
 */

export interface LocationTelemetryPlaceholder {
  locationName: string;
  country: string;
  coordinates: { lat: number; lon: number };
  dataSource: string;
  status: 'Awaiting API Connection (Placeholder)';
  metrics: WeatherMetric[];
}

export interface BackendHealthResponse {
  status: string;
  version: string;
  service: string;
  weather_api_configured: boolean;
}

export interface BackendAirPollutionComponents {
  co: number;
  no?: number | null;
  no2: number;
  o3: number;
  so2: number;
  pm2_5: number;
  pm10: number;
  nh3?: number | null;
}

export interface BackendAirPollutionResponse {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  aqi: number;
  aqi_label: string;
  components: BackendAirPollutionComponents;
  data_source: string;
  retrieved_at: string;
}

export interface BackendWeatherComparisonResponse {
  location_a: BackendCurrentWeather;
  location_b: BackendCurrentWeather;
  temp_delta_c: number;
  humidity_delta_pct: number;
  data_source: string;
  retrieved_at: string;
}

// ── Unit Conversion Helpers ──────────────────────────────────────────────────

export function kelvinToCelsius(k: number): number {
  return Number((k - 273.15).toFixed(1));
}

export function kelvinToFahrenheit(k: number): number {
  return Number(((k - 273.15) * 1.8 + 32).toFixed(1));
}

export function windDegreesToCardinal(deg?: number | null): string {
  if (deg === undefined || deg === null) return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round((deg % 360) / 22.5) % 16;
  return directions[index];
}

// ── Weather Service Export ───────────────────────────────────────────────────

export const weatherService = {
  /**
   * Fetches real-time current weather telemetry for a specific city.
   */
  async getCurrentWeather(city: string): Promise<BackendCurrentWeather> {
    return apiGet<BackendCurrentWeather>('/api/v1/weather/current', { city: city.trim() });
  },

  /**
   * Fetches real-time current weather telemetry by coordinates.
   */
  async getCurrentWeatherByCoords(lat: number, lon: number): Promise<BackendCurrentWeather> {
    return apiGet<BackendCurrentWeather>('/api/v1/weather/current', { lat, lon });
  },

  /**
   * Fetches 5-day / 3-hour weather forecast for a specific city.
   */
  async getWeatherForecast(city: string): Promise<BackendForecastResponse> {
    return apiGet<BackendForecastResponse>('/api/v1/weather/forecast', { city: city.trim() });
  },

  /**
   * Fetches 5-day / 3-hour weather forecast by coordinates.
   */
  async getWeatherForecastByCoords(lat: number, lon: number): Promise<BackendForecastResponse> {
    return apiGet<BackendForecastResponse>('/api/v1/weather/forecast', { lat, lon });
  },

  /**
   * Queries the backend health status.
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    return apiGet<BackendHealthResponse>('/api/v1/health');
  },

  /**
   * Fetches real-time air pollution telemetry and AQI for a specific city.
   */
  async getAirPollution(city: string): Promise<BackendAirPollutionResponse> {
    return apiGet<BackendAirPollutionResponse>('/api/v1/weather/air-pollution', { city: city.trim() });
  },

  /**
   * Compares meteorological conditions between two cities concurrently.
   */
  async compareLocations(city1: string, city2: string): Promise<BackendWeatherComparisonResponse> {
    return apiGet<BackendWeatherComparisonResponse>('/api/v1/weather/compare', {
      city1: city1.trim(),
      city2: city2.trim(),
    });
  },

  // ── Backward-compatible Stubs for legacy dashboard cards ────────────────────

  async getCurrentMetrics(locationQuery = 'Mauna Loa'): Promise<ApiResponse<LocationTelemetryPlaceholder>> {
    const placeholderPayload: LocationTelemetryPlaceholder = {
      locationName: locationQuery,
      country: 'Atmospheric Research Grid',
      coordinates: { lat: 19.5362, lon: -155.5763 },
      dataSource: 'National Oceanic and Atmospheric Administration (NOAA) / ECMWF Gateway [Pending Integration]',
      status: 'Awaiting API Connection (Placeholder)',
      metrics: [
        {
          id: 'temp',
          label: 'Surface Temperature',
          value: '--',
          unit: '°C / °F',
          status: 'placeholder',
          description: 'Awaiting sensor stream connection',
        },
        {
          id: 'pressure',
          label: 'Atmospheric Pressure',
          value: '--',
          unit: 'hPa',
          status: 'placeholder',
          description: 'Barometric sensor calibration pending',
        },
        {
          id: 'humidity',
          label: 'Relative Humidity',
          value: '--',
          unit: '%',
          status: 'placeholder',
          description: 'Hygrometer stream unmapped',
        },
        {
          id: 'wind',
          label: 'Wind Vector & Velocity',
          value: '--',
          unit: 'km/h',
          status: 'placeholder',
          description: 'Anemometer telemetry unmapped',
        },
        {
          id: 'uv',
          label: 'Solar Radiation / UV Index',
          value: '--',
          unit: 'Index',
          status: 'placeholder',
          description: 'Radiometer feed standby',
        },
        {
          id: 'air_quality',
          label: 'Air Quality Index (AQI)',
          value: '--',
          unit: 'AQI',
          status: 'placeholder',
          description: 'Particulate matter detector standby',
        },
      ],
    };

    return fetchWithFallback('/weather/telemetry/current', placeholderPayload);
  },

  async getMonitoringStations(): Promise<ApiResponse<WeatherStation[]>> {
    return fetchWithFallback('/stations/active', DEFAULT_STATIONS);
  },
};
