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

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('climatesphere_api_url');
    if (saved && saved.trim() && saved !== 'undefined' && saved !== 'null') {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string)?.trim();
  if (envUrl && envUrl !== 'undefined' && envUrl !== 'null') {
    return envUrl.replace(/\/+$/, '');
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:8000';
  }
  return 'https://climatesphere-backend.onrender.com';
};

export const setApiBaseUrl = (url: string): void => {
  if (typeof window !== 'undefined') {
    const clean = url.trim().replace(/\/+$/, '');
    if (clean) {
      localStorage.setItem('climatesphere_api_url', clean);
      API_CONFIG.baseUrl = clean;
    } else {
      localStorage.removeItem('climatesphere_api_url');
      API_CONFIG.baseUrl = getApiBaseUrl();
    }
  }
};

export const API_CONFIG: ApiClientConfig = {
  baseUrl: getApiBaseUrl(),
  timeoutMs: 75000,
  apiKey: import.meta.env.VITE_API_KEY as string | undefined,
};

/**
 * Construct an absolute URL safely, normalizing slashes and supporting relative proxy paths.
 */
export function buildApiUrl(endpoint: string, baseUrl?: string): URL {
  const activeBase = (baseUrl ?? getApiBaseUrl() ?? '').trim().replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullPath = `${activeBase}${cleanEndpoint}`;

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
  const activeBase = getApiBaseUrl();
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  if (!activeBase && isGitHubPages) {
    throw new ApiClientError(
      'The chatbot frontend is live on GitHub Pages, but needs a connected backend API URL to process live queries.',
      503,
      { error: 'backend_not_connected' }
    );
  }

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
  const activeBase = getApiBaseUrl();
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  if (!activeBase && isGitHubPages) {
    throw new ApiClientError(
      'The chatbot frontend is live on GitHub Pages, but needs a connected backend API URL to process live AI queries.',
      503,
      { error: 'backend_not_connected' }
    );
  }

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
      if (response.status === 405) {
        throw new ApiClientError(
          'GitHub Pages cannot process POST requests directly. Please connect your running backend API URL (Render or localhost) in Settings.',
          503,
          { error: 'backend_not_connected' }
        );
      }

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
  const activeBase = getApiBaseUrl();
  const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.endsWith('github.io');
  if (!activeBase && isGitHubPages) {
    throw new ApiClientError(
      'The chatbot frontend is live on GitHub Pages, but needs a connected backend API URL to process file uploads.',
      503,
      { error: 'backend_not_connected' }
    );
  }

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
      if (response.status === 405) {
        throw new ApiClientError(
          'GitHub Pages cannot process upload requests directly. Please connect your running backend API URL (Render or localhost) in Settings.',
          503,
          { error: 'backend_not_connected' }
        );
      }

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
