# ClimateSphere AI — Production Deployment Guide

This guide provides end-to-end instructions for deploying ClimateSphere AI to production using:
- **GitHub**: Source code version control.
- **Render**: Python FastAPI backend web service.
- **Netlify**: React + Vite single-page application (SPA).

---

## 1. Architecture & Data Flow

```text
┌───────────────────────────────┐
│ Netlify (Frontend)            │
│ React + Vite SPA              │
│ https://climatesphere.netlify.app ──┐
└───────────────────────────────┘     │
                                      │ HTTPS Requests
                                      ▼
                       ┌───────────────────────────────┐
                       │ Render (Backend)              │
                       │ FastAPI + Uvicorn             │
                       │ https://climatesphere-backend │
                       │ .onrender.com                 │
                       └──────────────┬────────────────┘
                                      │
                 ┌────────────────────┴───────────────────┐
                 ▼                                        ▼
   ┌───────────────────────────┐            ┌───────────────────────────┐
   │ OpenWeatherMap API        │            │ Google Gemini AI API      │
   │ Real-time Telemetry       │            │ Conversational Engine     │
   └───────────────────────────┘            └───────────────────────────┘
```

---

## 2. Environment Variables Matrix

| Service | Environment Variable | Required | Description & Example |
|---|---|:---:|---|
| **Render** (Backend) | `OPENWEATHER_API_KEY` | **Yes** | OpenWeatherMap API Key (e.g. `d7a4...`). |
| **Render** (Backend) | `GEMINI_API_KEY` | **Yes** | Google Gemini API Key from Google AI Studio. |
| **Render** (Backend) | `ALLOWED_ORIGINS` | **Yes** | Netlify URL without trailing slash (e.g. `https://climatesphere.netlify.app`). Localhost origins are retained automatically for dev. |
| **Render** (Backend) | `ENVIRONMENT` | No | Set to `production` (default: `production`). |
| **Render** (Backend) | `LOG_LEVEL` | No | Logging level: `INFO` (default: `INFO`). |
| **Render** (Backend) | `GEMINI_MODEL` | No | Gemini model: `gemini-2.5-flash` (default: `gemini-2.5-flash`). |
| **Netlify** (Frontend) | `VITE_API_BASE_URL` | **Yes** | Full Render backend URL (e.g. `https://climatesphere-backend.onrender.com`). |

---

## 3. Step 1: Push Code to GitHub

> [!IMPORTANT]
> Verify that `.env` files and `.venv/` are **never committed**. The repository `.gitignore` automatically protects secrets.

1. Initialize git and inspect status:
   ```bash
   git init
   git status
   ```
   *Verify `.env`, `backend/.env`, `node_modules/`, `backend/.venv/`, and `dist/` are not listed.*

2. Stage and commit:
   ```bash
   git add .
   git commit -m "feat: complete ClimateSphere AI production configuration"
   ```

3. Push to your GitHub repository:
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

---

## 4. Step 2: Deploy Backend to Render

### Option A: Using the Render Blueprint (`render.yaml`) — Recommended

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render automatically parses [`render.yaml`](file:///c:/Users/sandhiya/OneDrive/Data%20Science%20Intern/ChatBot/render.yaml) and creates the web service with:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/v1/health`
5. Fill in the required environment variables prompted by the blueprint:
   - `OPENWEATHER_API_KEY`: Your real OpenWeatherMap key.
   - `GEMINI_API_KEY`: Your real Gemini API key.
   - `ALLOWED_ORIGINS`: Your Netlify URL (or leave blank initially, then add after Netlify deployment).
6. Click **Apply**.

### Option B: Manual Web Service Setup

If you prefer setting up manually without a blueprint:
1. Click **New +** → **Web Service**.
2. Select your GitHub repository.
3. Configure the service settings:
   - **Name**: `climatesphere-backend`
   - **Region**: Select closest to your users (e.g. Frankfurt, Ohio, Oregon, Singapore).
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/api/v1/health`
   - **Auto-Deploy**: `Yes`
5. In **Environment Variables**, add:
   - `PYTHON_VERSION` = `3.12.0`
   - `ENVIRONMENT` = `production`
   - `LOG_LEVEL` = `INFO`
   - `OPENWEATHER_API_KEY` = `your_openweather_api_key`
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `GEMINI_MODEL` = `gemini-2.5-flash`
   - `ALLOWED_ORIGINS` = `https://<your-netlify-subdomain>.netlify.app`
6. Click **Create Web Service**.
7. Once deployed, copy your Render service URL (e.g. `https://climatesphere-backend.onrender.com`).
8. Test the health endpoint in your browser:
   `https://climatesphere-backend.onrender.com/api/v1/health` → returns `{"status":"ok",...}`.

---

## 5. Step 3: Deploy Frontend to Netlify

1. Log in to [Netlify Dashboard](https://app.netlify.com).
2. Click **Add new site** → **Import an existing project**.
3. Choose **GitHub** and authorize your repository.
4. Netlify will automatically detect [`netlify.toml`](file:///c:/Users/sandhiya/OneDrive/Data%20Science%20Intern/ChatBot/netlify.toml):
   - **Base directory**: (leave blank / root)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click **Add environment variables** before deploying:
   - Key: `VITE_API_BASE_URL`
   - Value: `https://climatesphere-backend.onrender.com` *(your Render backend URL from Step 2)*
6. Click **Deploy ClimateSphere AI**.
7. Once the deploy finishes, note your live Netlify site URL (e.g. `https://climatesphere.netlify.app` or custom domain).

---

## 6. Step 4: Final CORS Sync

Now that your frontend Netlify URL is finalized:
1. Go back to your [Render Dashboard](https://dashboard.render.com).
2. Select your `climatesphere-backend` service → **Environment**.
3. Update `ALLOWED_ORIGINS`:
   ```text
   https://climatesphere.netlify.app
   ```
   *(If you have a custom domain, separate with comma: `https://climatesphere.netlify.app, https://yourdomain.com`).*
4. Click **Save Changes**. Render will automatically redeploy with the updated CORS origin.

---

## 7. In-Memory Rate Limiter & Multi-Instance Architecture Note

ClimateSphere AI includes an in-memory sliding-window rate limiter:
- Chat endpoint limit: 60 requests/minute per client IP.
- Weather endpoint limit: 120 requests/minute per client IP.
- Exceeding quota returns `HTTP 429 Too Many Requests` with a `Retry-After` header.

### Single-Instance vs. Multi-Instance Deployments
- **Current Single-Instance Deployment (Render Free/Starter)**: Operates entirely within process memory. Lightweight, zero-dependency, and requires no external Redis database.
- **Horizontal Multi-Instance Scaling**: If scaling Render to multiple horizontal worker instances or running multiple Uvicorn workers (`-w 4`), memory state is isolated per process. In a distributed multi-node configuration, replace the in-memory dictionary with an external Redis instance (such as [Upstash Serverless Redis](https://upstash.com) or Redis Cloud) to share bucket state globally across all instances.

---

## 8. Verification & Production Checklist

After deploying both services, execute the following verification steps:

- [ ] **Backend Health Check**: Navigate to `https://<render-url>/api/v1/health` and verify `status: ok` and `weather_api_configured: true`.
- [ ] **Interactive API Docs**: Navigate to `https://<render-url>/api/docs` to view Swagger UI.
- [ ] **Frontend Homepage**: Visit `https://<netlify-url>` and confirm the full-screen atmospheric UI renders without console errors.
- [ ] **Live AI Weather Query**: Type *"What is the weather in Chennai?"* and verify:
  - Concise response generated.
  - Temperature, humidity, and wind telemetry populated from OpenWeatherMap.
  - Source pill displays OpenWeatherMap API timestamp.
- [ ] **SPA Route Refresh**: Navigate directly to `https://<netlify-url>/tools/current-weather` and refresh the page. Verify the page loads cleanly (confirming SPA fallback rewrite is functioning).
- [ ] **Copy & Regenerate Actions**: Test copying an AI response and clicking the "Regenerate" button to confirm full conversational lifecycle.
