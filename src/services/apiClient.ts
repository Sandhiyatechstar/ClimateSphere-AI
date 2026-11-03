/**
 * ClimateSphere AI - Base API Client Architecture
 * 
 * NOTE: API integration is planned for subsequent phases.
 * This module provides the structured client interface, base URL configurations,
 * and error handling utilities ready for real telemetry endpoints (NOAA, ECMWF, Copernicus, Open-Meteo).
 */

export interface ApiResponse<T> {
  data: T | null;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  source: 'placeholder' | 'live_telemetry';
  timestamp: string;
}

export interface ApiClientConfig {
  baseUrl: string;
  timeoutMs: number;
  apiKey?: string;
}

export const API_CONFIG: ApiClientConfig = {
  // If VITE_API_BASE_URL is configured (e.g. Render backend URL in Netlify), use it.
  // Otherwise in local dev, fall back to the standard local backend server.
  // In production builds without an explicit URL, fall back to empty string for relative proxying.
  baseUrl:
    (import.meta.env.VITE_API_BASE_URL as string)?.trim() ||
    (import.meta.env.DEV ? 'http://127.0.0.1:8000' : ''),
  timeoutMs: 75000,
  apiKey: import.meta.env.VITE_API_KEY as string | undefined,
};

/**
 * Construct an absolute URL safely, normalizing slashes and supporting relative proxy paths.
 */
export function buildApiUrl(endpoint: string, baseUrl: string = API_CONFIG.baseUrl): URL {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullPath = `${cleanBase}${cleanEndpoint}`;

  if (fullPath.startsWith('http://') || fullPath.startsWith('https://')) {
    return new URL(fullPath);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return new URL(fullPath, origin);
}

/**
 * Custom application error with structured backend payload
 */
export class ApiClientError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Standardized typed HTTP GET request with abort timeout
 */
export async function apiGet<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const url = buildApiUrl(endpoint);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errPayload: any = null;
      try {
        errPayload = await response.json();
      } catch {
        // Non-JSON response
      }

      const errMsg =
        errPayload?.message ||
        (typeof errPayload?.detail === 'string' ? errPayload.detail : null) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      throw new ApiClientError(errMsg, response.status, errPayload);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof ApiClientError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('That request took longer than expected. Please try again.', 504);
    }
    const message = err instanceof Error ? err.message : 'Network failure connecting to ClimateSphere backend.';
    throw new ApiClientError(message, 0);
  }
}

/**
 * Standardized typed HTTP POST request with abort timeout.
 */
export async function apiPost<T>(endpoint: string, body: unknown): Promise<T> {
  const url = buildApiUrl(endpoint).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errPayload: any = null;
      try {
        errPayload = await response.json();
      } catch {
        // Non-JSON response
      }

      const errMsg =
        errPayload?.message ||
        (typeof errPayload?.detail === 'string' ? errPayload.detail : null) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      throw new ApiClientError(errMsg, response.status, errPayload);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof ApiClientError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('That request took longer than expected. Please try again.', 504);
    }
    const message = err instanceof Error ? err.message : 'Network failure connecting to ClimateSphere backend.';
    throw new ApiClientError(message, 0);
  }
}

/**
 * Standardized multipart/form-data upload request with abort timeout.
 */
export async function apiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const url = buildApiUrl(endpoint).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000); // 60s timeout for large file uploads

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errPayload: any = null;
      try {
        errPayload = await response.json();
      } catch {
        // Non-JSON response
      }

      const errMsg =
        errPayload?.message ||
        (typeof errPayload?.detail === 'string' ? errPayload.detail : null) ||
        `HTTP Error ${response.status}: ${response.statusText}`;

      throw new ApiClientError(errMsg, response.status, errPayload);
    }

    return (await response.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timer);
    if (err instanceof ApiClientError) {
      throw err;
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiClientError('File upload timed out. Please try with smaller files or verify network.', 504);
    }
    const message = err instanceof Error ? err.message : 'Network failure uploading files to ClimateSphere backend.';
    throw new ApiClientError(message, 0);
  }
}

/**
 * Standardized client request wrapper with placeholder fallback.
 */
export async function fetchWithFallback<T>(
  _endpoint: string,
  placeholderData: T
): Promise<ApiResponse<T>> {
  // Currently operating in placeholder mode as per architecture instructions.
  // When live endpoints are configured, active HTTP requests will replace this stub.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        data: placeholderData,
        status: 'success',
        source: 'placeholder',
        timestamp: new Date().toISOString(),
      });
    }, 150);
  });
}
