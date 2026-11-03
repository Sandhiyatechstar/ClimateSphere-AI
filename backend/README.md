# ClimateSphere AI – Backend

FastAPI backend for the ClimateSphere AI chatbot.
Provides real-time weather data from **OpenWeatherMap** and AI conversational intelligence powered by **Google Gemini**, with a clean, versioned REST API.

---

## Quick Start

### 1 — Prerequisites

- Python 3.11 or newer
- An [OpenWeatherMap](https://home.openweathermap.org/api_keys) account (free tier is sufficient)
- A [Google Gemini](https://aistudio.google.com/app/apikey) API key (free tier is sufficient)

---

### 2 — Create a virtual environment

From the **`backend/`** folder:

```bash
# Windows PowerShell
python -m venv .venv
.venv\Scripts\Activate.ps1

# macOS / Linux
python -m venv .venv
source .venv/bin/activate
```

---

### 3 — Install dependencies

```bash
pip install -r requirements.txt
```

---

### 4 — Configure your API key

Copy the example env file and edit it:

```bash
# Windows PowerShell
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `backend/.env` and fill in your real keys:

```env
OPENWEATHER_API_KEY=your_openweathermap_key_here
GEMINI_API_KEY=your_google_gemini_key_here
```

- **OpenWeatherMap key** → [https://home.openweathermap.org/api_keys](https://home.openweathermap.org/api_keys) (free tier)
- **Gemini key** → [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) (free tier)

> **Security:** `backend/.env` is listed in `.gitignore` and will never be committed. Never paste API keys in frontend code.

---

### 5 — Start the backend server

Run this from the **`backend/`** folder (with the venv active):

```bash
uvicorn app.main:app --reload --port 8000
```

The API is now available at:

| URL | Purpose |
|-----|---------|
| http://localhost:8000/api/v1/health | Health check |
| http://localhost:8000/api/v1/chat | **Gemini AI chat** (POST) |
| http://localhost:8000/api/v1/weather/current | Current weather (GET) |
| http://localhost:8000/api/v1/weather/forecast | 5-day forecast (GET) |
| http://localhost:8000/api/docs | Interactive Swagger UI |
| http://localhost:8000/api/redoc | ReDoc documentation |

---

## API Endpoints

### Health

```
GET /api/v1/health
```

```json
{
  "status": "ok",
  "version": "1.0.0",
  "service": "ClimateSphere AI API",
  "weather_api_configured": true
}
```

---

### Current Weather — by city

```
GET /api/v1/weather/current?city=Chennai
```

```json
{
  "city": "Chennai",
  "country": "IN",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "temperature_k": 305.15,
  "feels_like_k": 307.0,
  "temp_min_k": 303.0,
  "temp_max_k": 307.0,
  "humidity_pct": 65,
  "pressure_hpa": 1008,
  "visibility_m": 10000,
  "clouds_pct": 5,
  "description": "Clear sky",
  "icon_code": "01d",
  "condition_id": 800,
  "wind": {
    "speed_mps": 4.5,
    "direction_deg": 200,
    "gust_mps": 6.0
  },
  "sun": {
    "sunrise_utc": "2024-11-14T00:36:40Z",
    "sunset_utc": "2024-11-14T11:53:20Z"
  },
  "data_source": "OpenWeatherMap Current Weather API",
  "retrieved_at": "2024-11-14T09:00:00Z",
  "observation_time_utc": "2024-11-14T09:00:00Z"
}
```

> Temperatures are in **Kelvin** (source units).  
> Convert: °C = K − 273.15 | °F = (K − 273.15) × 9/5 + 32

---

### Current Weather — by coordinates

```
GET /api/v1/weather/current?lat=13.0827&lon=80.2707
```

---

### 5-Day Forecast — by city

```
GET /api/v1/weather/forecast?city=Chennai
```

```json
{
  "city": "Chennai",
  "country": "IN",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "timezone_offset_seconds": 19800,
  "slots": [
    {
      "forecast_time_utc": "2024-11-14T12:00:00Z",
      "temperature_k": 305.15,
      "feels_like_k": 307.0,
      "temp_min_k": 303.0,
      "temp_max_k": 307.0,
      "humidity_pct": 65,
      "pressure_hpa": 1008,
      "description": "Clear sky",
      "icon_code": "01d",
      "condition_id": 800,
      "wind": { "speed_mps": 4.5, "direction_deg": 200, "gust_mps": null },
      "clouds_pct": 5,
      "rain_probability": 0.1,
      "rain_volume_3h_mm": null
    }
  ],
  "data_source": "OpenWeatherMap 5-Day / 3-Hour Forecast API",
  "retrieved_at": "2024-11-14T09:00:00Z"
}
```

---

### 5-Day Forecast — by coordinates

```
GET /api/v1/weather/forecast?lat=13.0827&lon=80.2707
```

---

## Error responses

All errors return a consistent JSON body:

```json
{
  "error": "city_not_found",
  "message": "The city 'Xyzzy' could not be found. ..."
}
```

| HTTP | `error` key | Cause |
|------|-------------|-------|
| 404 | `city_not_found` | City name not recognised by OpenWeatherMap |
| 422 | _(FastAPI validation)_ | Missing or conflicting query parameters |
| 429 | `weather_service_error` | OpenWeatherMap rate limit hit |
| 503 | `api_key_missing` | `OPENWEATHER_API_KEY` not set in `.env` |
| 502 | `weather_service_error` | OpenWeatherMap returned an error |
| 504 | `weather_service_error` | Request to OpenWeatherMap timed out |

---

## Running tests

From the **`backend/`** folder (with the venv active):

```bash
pytest -v
```

All tests use mocked HTTP responses — **no real API key is needed** to run the test suite.

---

## Running frontend and backend together

Open **two terminals**:

**Terminal 1 — Frontend**
```bash
# From the project root (ChatBot/)
npm run dev
```

**Terminal 2 — Backend**
```bash
# From backend/ with venv active
uvicorn app.main:app --reload --port 8000
```

Frontend: http://localhost:5173  
Backend API: http://localhost:8000
