import { TemperatureUnit } from '../types';

/**
 * Formats temperature values according to selected unit.
 */
export function formatTemperature(
  celsiusValue: number | null | undefined,
  unit: TemperatureUnit = 'celsius'
): string {
  if (celsiusValue === null || celsiusValue === undefined) {
    return '--';
  }
  if (unit === 'fahrenheit') {
    const fahrenheit = (celsiusValue * 9) / 5 + 32;
    return `${Math.round(fahrenheit)}°F`;
  }
  return `${Math.round(celsiusValue)}°C`;
}

/**
 * Formats coordinates into standard geographic notation (e.g. 51.5074° N, 0.1278° W).
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDirection = lat >= 0 ? 'N' : 'S';
  const lonDirection = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDirection}, ${Math.abs(lon).toFixed(4)}° ${lonDirection}`;
}

/**
 * Formats ISO timestamps into human-readable local or UTC time strings.
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return isoString;
  }
}

/**
 * Formats byte counts into human-readable strings (e.g. 512 B, 142 KB, 3.4 MB).
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
