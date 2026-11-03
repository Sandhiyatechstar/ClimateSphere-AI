/**
 * ClimateSphere AI - Global Weather Forecasting & Climate Research Platform
 * TypeScript Type Definitions
 */

// Weather & Atmospheric Metric Models
export interface BackendWindInfo {
  speed_mps: number;
  direction_deg?: number | null;
  gust_mps?: number | null;
}

export interface BackendSunInfo {
  sunrise_utc: string;
  sunset_utc: string;
}

export interface BackendCurrentWeather {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  temperature_k: number;
  feels_like_k: number;
  temp_min_k?: number | null;
  temp_max_k?: number | null;
  humidity_pct: number;
  pressure_hpa: number;
  visibility_m?: number | null;
  clouds_pct: number;
  description: string;
  icon_code: string;
  condition_id: number;
  wind: BackendWindInfo;
  sun: BackendSunInfo;
  data_source: string;
  retrieved_at: string;
  observation_time_utc: string;
}

export interface BackendForecastSlot {
  forecast_time_utc: string;
  temperature_k: number;
  feels_like_k: number;
  temp_min_k: number;
  temp_max_k: number;
  humidity_pct: number;
  pressure_hpa: number;
  description: string;
  icon_code: string;
  condition_id: number;
  wind: BackendWindInfo;
  clouds_pct: number;
  rain_probability?: number | null;
  rain_volume_3h_mm?: number | null;
}

export interface BackendForecastResponse {
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone_offset_seconds: number;
  slots: BackendForecastSlot[];
  data_source: string;
  retrieved_at: string;
}

export interface BackendErrorResponse {
  error?: string;
  message?: string;
  detail?: string | Array<{ msg: string }>;
}

export interface WeatherMetric {
  id: string;
  label: string;
  value: string | number;
  unit: string;
  change?: string;
  isPositiveChange?: boolean;
  status: 'normal' | 'advisory' | 'warning' | 'critical' | 'placeholder';
  description?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
}

export interface WeatherStation {
  id: string;
  name: string;
  region: string;
  country: string;
  coordinates: Coordinates;
  elevation: string;
  status: 'online' | 'calibrating' | 'offline' | 'simulated';
  lastPing?: string;
}

export interface AtmosphericLayerData {
  layerName: string;
  altitudeRange: string;
  temperature: string;
  pressure: string;
  density: string;
}

// Climate Research Models
export interface ClimateAnomalyRecord {
  year: number;
  temperatureAnomalyCelsius: number;
  co2Ppm: number;
  seaLevelRiseMm: number;
  arcticIceExtentMillionSqKm: number;
}

export interface ClimateResearchHighlight {
  id: string;
  title: string;
  category: 'Atmospheric Physics' | 'Cryosphere' | 'Oceanic Circulation' | 'Extreme Events';
  date: string;
  summary: string;
  source: string;
  doi?: string;
}

// Chatbot Models
export type MessageRole = 'user' | 'assistant' | 'system';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // MIME type
  fileType: 'image' | 'document' | 'data';
  extension: string;
  url?: string;
  previewUrl?: string;
  extractedText?: string;
  imageBase64?: string;
  isUploading?: boolean;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  dataSources?: string[];
  suggestedFollowUps?: string[];
  isPlaceholderResponse?: boolean;
  modelIdentifier?: string; // 'Gemini 2.5 Flash' | 'Groq openai/gpt-oss-20b'
  attachments?: FileAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SuggestedPrompt {
  id: string;
  category: string;
  title: string;
  prompt: string;
  iconName: 'CloudSun' | 'Globe2' | 'Flame' | 'LineChart';
}

// Tools Menu Item Definition
export interface ClimateTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  category: 'Weather' | 'Climate' | 'Analytics' | 'Safety';
  badge?: string;
}

// Application State & Settings
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type WindSpeedUnit = 'kmh' | 'mph' | 'mps' | 'knots';
export type PressureUnit = 'hpa' | 'mbar' | 'inhg';

export interface UnitPreferences {
  temperature: TemperatureUnit;
  windSpeed: WindSpeedUnit;
  pressure: PressureUnit;
}

export interface AiProviderConfig {
  activeProvider: 'gemini' | 'groq' | 'huggingface' | 'mock';
  geminiApiKey?: string;
  groqApiKey?: string;
  huggingFaceApiKey?: string;
  temperature: number;
}

// ── Gemini Chat API types (Backend POST /api/v1/chat) ──────────────────────────

export interface BackendChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BackendAttachmentPayload {
  id?: string;
  filename: string;
  content_type: string;
  file_type: 'image' | 'document' | 'data';
  size_bytes: number;
  extracted_text?: string | null;
  image_base64?: string | null;
  preview_url?: string | null;
}

export interface BackendChatRequest {
  prompt: string;
  history?: BackendChatHistoryMessage[];
  city?: string;
  attachments?: BackendAttachmentPayload[];
}

export interface BackendChatResponse {
  content: string;
  data_sources: string[];
  suggested_follow_ups: string[];
  model_identifier: string;
  weather_telemetry?: BackendCurrentWeather | null;
  forecast_telemetry?: BackendForecastResponse | null;
  retrieved_at: string;
}

export interface NavItem {
  name: string;
  path: string;
  iconName: string;
  badge?: string;
}
