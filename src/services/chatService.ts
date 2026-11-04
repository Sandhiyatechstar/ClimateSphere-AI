import {
  ChatMessage,
  AiProviderConfig,
  BackendChatRequest,
  BackendChatResponse,
  FileAttachment,
  BackendAttachmentPayload,
} from '../types';
import { API_CONFIG, ApiClientError, apiPost, apiUpload } from './apiClient';

/**
 * ClimateSphere AI Intelligence Service
 *
 * Routes all user queries through the ClimateSphere FastAPI backend:
 *   POST /api/v1/chat
 *
 * The backend:
 *  - Detects weather queries, fetches verified OpenWeather data, and grounds Gemini responses
 *  - Handles multi-turn conversation history
 *  - Generates progressive 3-tier scientific explanations via Google Gemini
 *  - Returns data_sources, suggested_follow_ups and optional telemetry objects
 *
 * Never exposes API keys in frontend code.
 * Never invents or fabricates weather measurements.
 */

export interface GenerationOptions {
  provider?: AiProviderConfig;
  temperature?: number;
  stream?: boolean;
}

/** Convert frontend ChatMessage[] into the compact history format the backend expects. */
function _toBackendHistory(history: ChatMessage[]): BackendChatRequest['history'] {
  return history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));
}

/** Sanitize error messages to prevent exposing credentials, file paths, or stack traces. */
function _sanitizeErrorMessage(msg: string): string {
  if (!msg) return 'An unexpected error occurred. Please try again.';
  // Redact potential API keys or tokens
  let cleaned = msg.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_KEY]');
  cleaned = cleaned.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
  cleaned = cleaned.replace(/key=[a-zA-Z0-9._-]+/gi, 'key=[REDACTED]');
  // Suppress python/node stack traces and absolute paths
  if (cleaned.includes('Traceback (most recent call last)') || cleaned.includes('File "') || cleaned.includes('at async')) {
    return 'An internal processing error occurred. Please click Regenerate to try again.';
  }
  if (cleaned.length > 180) {
    cleaned = cleaned.slice(0, 180) + '...';
  }
  return cleaned;
}

export const chatService = {
  /**
   * Upload one or more files to the backend for security validation and content extraction.
   */
  async uploadFiles(files: File[]): Promise<FileAttachment[]> {
    if (!files || files.length === 0) return [];

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const serverPayloads = await apiUpload<BackendAttachmentPayload[]>('/api/v1/attachments/upload', formData);

    return serverPayloads.map((p) => {
      const ext = p.filename.includes('.') ? `.${p.filename.split('.').pop()?.toLowerCase()}` : '';
      return {
        id: p.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name: p.filename,
        size: p.size_bytes,
        type: p.content_type,
        fileType: p.file_type,
        extension: ext,
        previewUrl: p.preview_url || undefined,
        extractedText: p.extracted_text || undefined,
        imageBase64: p.image_base64 || undefined,
      };
    });
  },

  /**
   * Send the user's prompt (conversation history and optional attachments) to the AI chat endpoint.
   * Returns a structured ChatMessage from the backend.
   */
  async sendMessage(
    userPrompt: string,
    history: ChatMessage[] = [],
    attachments?: FileAttachment[],
    _options?: GenerationOptions
  ): Promise<ChatMessage> {
    const trimmed = userPrompt.trim();

    const backendAttachments: BackendAttachmentPayload[] | undefined = attachments?.map((att) => ({
      id: att.id,
      filename: att.name,
      content_type: att.type,
      file_type: att.fileType,
      size_bytes: att.size,
      extracted_text: att.extractedText,
      image_base64: att.imageBase64,
      preview_url: att.previewUrl,
    }));

    const requestBody: BackendChatRequest = {
      prompt: trimmed || (attachments && attachments.length > 0 ? 'Please analyze and explain the attached file(s).' : ''),
      history: _toBackendHistory(history),
      attachments: backendAttachments && backendAttachments.length > 0 ? backendAttachments : undefined,
    };

    try {
      const resp = await apiPost<BackendChatResponse>('/api/v1/chat', requestBody);

      return {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: resp.content,
        timestamp: new Date().toISOString(),
        dataSources: resp.data_sources,
        suggestedFollowUps: resp.suggested_follow_ups,
        isPlaceholderResponse: false,
        modelIdentifier: resp.model_identifier,
      };
    } catch (err: unknown) {
      const clientErr = err instanceof ApiClientError ? err : null;
      const status = clientErr ? clientErr.status : 0;
      const rawMsg = clientErr?.message || (err instanceof Error ? err.message : '');
      const errPayload = clientErr?.data as { error?: string; message?: string } | undefined;
      const errCode = errPayload?.error || '';

      let errorContent = '';

      if (errCode === 'backend_not_connected' || status === 405) {
        errorContent = `### 🌐 Backend Connection Required

ClimateSphere AI is live on GitHub Pages! To enable live conversational AI and real-time weather telemetry, connect your backend server.

#### Quick Steps to Connect:
1. **Cloud Backend on Render (Free)**:
   Deploy your repository's \`backend\` service to **[Render](https://render.com/)** using the included \`render.yaml\` blueprint.
2. **Set the Backend URL**:
   Click the ⚙️ **Settings** button in the top right, enter your backend URL (e.g. \`https://climatesphere-backend.onrender.com\` or \`http://127.0.0.1:8000\`), and click **Apply Changes**.`;
      } else if (errCode === 'gemini_api_key_missing' || (status === 503 && rawMsg.toLowerCase().includes('gemini_api_key_missing'))) {
        errorContent = 'The AI conversational service is not configured yet. Please configure the API key in the backend environment and restart the server.';
      } else if (errCode === 'gemini_model_not_found' || errCode === 'model_not_found' || (status === 404 && rawMsg.toLowerCase().includes('model'))) {
        errorContent = 'The requested AI model is currently undergoing updates or unavailable. Please click **Regenerate** below to retry with a supported model.';
      } else if (errCode === 'gemini_auth_error' || errCode === 'groq_auth_error' || status === 401 || status === 403) {
        errorContent = 'The AI service encountered an authentication issue. Please check the backend API key credentials.';
      } else if (errCode === 'gemini_high_demand' || (status === 503 && rawMsg.toLowerCase().includes('high demand'))) {
        errorContent = 'The service is currently experiencing high demand. Please wait a moment and click **Regenerate** below.';
      } else if (errCode === 'gemini_rate_limited' || errCode === 'groq_rate_limited' || status === 429) {
        errorContent = 'The service is receiving a high volume of requests. Please pause a moment and click **Regenerate** below.';
      } else if (
        status === 504 ||
        errCode === 'gemini_timeout' ||
        errCode === 'groq_timeout' ||
        rawMsg.toLowerCase().includes('took longer than expected') ||
        rawMsg.toLowerCase().includes('timed out') ||
        rawMsg.toLowerCase().includes('timeout')
      ) {
        errorContent = 'That request took longer than expected. Please try again or click **Regenerate** below.';
      } else if (status === 0 || rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('network')) {
        const targetUrl = (API_CONFIG.baseUrl || 'the local backend').replace(/\/+$/, '');
        const isRemote = targetUrl.startsWith('http://') || targetUrl.startsWith('https://')
          ? (!targetUrl.includes('localhost') && !targetUrl.includes('127.0.0.1'))
          : false;

        if (isRemote) {
          errorContent = `### ⚠️ ClimateSphere Backend Unreachable

#### Plain Explanation
The frontend was unable to connect to the backend API at \`${targetUrl}\`.

#### Troubleshooting Checklist
1. **Render Free Tier Spin-up**: If your backend is hosted on Render's free tier, the service may be spinning up from a sleep state (takes ~30–60 seconds on the first request). Please wait a moment and click **Regenerate** below.
2. **CORS Configuration**: Verify that your GitHub Pages origin (\`https://sandhiyatechstar.github.io\`) is included in the backend's \`ALLOWED_ORIGINS\` environment variable on Render.
3. **Backend Service Health**: Verify your backend service status at [${targetUrl}/api/v1/health](${targetUrl}/api/v1/health).
4. **Settings API URL**: If using a custom URL, verify the backend address configured in ⚙️ **Settings**.`;
        } else {
          errorContent = `### ⚠️ ClimateSphere Backend Offline

#### Plain Explanation
The frontend cannot reach the local backend server at \`${targetUrl}\`.

#### How to Start the Backend
Open a terminal in the project root and run:
\`\`\`bash
cd backend
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
uvicorn app.main:app --reload --port 8000
\`\`\`

*Once the server starts, resend your message.*`;
        }
      } else if (status === 502 || errCode === 'gemini_server_error' || errCode === 'groq_server_error') {
        errorContent = 'The AI service encountered a temporary upstream error. Please click **Regenerate** below to retry.';
      } else {
        errorContent = `### ⚠️ ClimateSphere AI Service Notice

Unable to process your query at this moment.
> **Status:** HTTP ${status || 'Client Error'}
> **Service Code:** ${errCode || 'service_error'}
> **Details:** ${_sanitizeErrorMessage(rawMsg)}

*Please try again or click **Regenerate** below.*`;
      }

      return {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: new Date().toISOString(),
        isPlaceholderResponse: false,
      };
    }
  },
};
