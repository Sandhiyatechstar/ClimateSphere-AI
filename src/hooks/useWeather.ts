import { useWeatherContext } from '../context/WeatherContext';

/**
 * Custom hook to interact with global weather telemetry and station selections.
 */
export function useWeather() {
  return useWeatherContext();
}
