# ClimateSphere AI

**ClimateSphere AI** is a premium, climate-themed AI chatbot application inspired by **ChatGPT** and **Google Gemini**, dedicated to global weather forecasting, atmospheric physics, climate science, oceanography, and natural disaster intelligence.

---

## Architecture & Visual Redesign Overview

### 1. Main Feature: The AI Chatbot
The entire application centers around a full-screen conversational interface with:
- **Atmospheric Earth-from-Space Background**: Multi-layered cosmic gradients (`#02050e`), blue/cyan Rayleigh scattering limb glow, and subtle dark overlay ensuring optimal text contrast.
- **Header**:
  - ClimateSphere AI orbital logo with glowing atmospheric aura
  - Subtitle: *Global Weather & Climate Assistant*
  - **New Chat** button (instant session reset)
  - **Chat History** button (toggles drawer)
  - **Tools** quick menu trigger
  - **Settings** modal trigger
  - Fast **°C / °F** toggle
- **Hero Welcome Section** *(active when conversation is fresh)*:
  - Heading: *"Explore Our Planet with ClimateSphere AI"*
  - Description: *"Your intelligent companion for weather, climate, and everything happening across our planet."*
  - **4 Compact Suggestion Cards**:
    1. **Weather Forecast** – *"What's the weather in Chennai today?"*
    2. **Climate Science** – *"Explain global warming."*
    3. **Extreme Weather** – *"How do tropical cyclones form?"*
    4. **Climate Research** – *"Analyze global temperature trends."*
- **Conversation Stream** *(appears immediately upon first message)*:
  - User messages in right-aligned radiant pill bubbles
  - Assistant responses formatted with custom **MarkdownContent** (headers, code blocks with copy buttons, scientific tables, quotes, bullet points)
  - **Copy** and **Regenerate** controls on every AI response
  - Scientific data source reference badges
  - Interactive suggested follow-up query chips
- **ChatGPT-Style Floating Chat Input**:
  - Multiline auto-resizing textarea (Enter to send, Shift+Enter for newline)
  - Attachment button (satellite raster & file placeholder)
  - Expandable **Tools** menu trigger
  - Microphone icon (voice query integration placeholder)
  - Cyan-glowing send button with loading state animation

---

### 2. Compact Expandable Tools Menu (8 Dedicated Interfaces)
Instead of permanent dashboard cards, all specialized modules are accessible on-demand via the **Tools menu** or direct routes, each featuring a clean *"← Back to AI Chat"* header:

1. **Current Weather** (`/tools/current-weather`) – Surface temperature, pressure, humidity, wind vector, dew point.
2. **Weather Forecast** (`/tools/forecast`) – 7-day numerical ensemble progression and rain probabilities.
3. **Global Weather Map** (`/tools/weather-map`) – Satellite radar canvas with Doppler, wind, cloud, and isobar layer toggles.
4. **Climate Explorer** (`/tools/climate-explorer`) – Long-term warming trends, CO₂ ppm curves, and cryosphere indicators.
5. **Climate Research** (`/tools/research`) – Reanalysis datasets (Copernicus ERA5, CMIP6) and peer-reviewed research bulletins.
6. **Air Quality** (`/tools/air-quality`) – AQI metrics, PM2.5, PM10, ozone, and WHO health recommendations.
7. **Natural Disaster Monitor** (`/tools/disasters`) – Active cyclone alerts, marine heatwaves, and wildfire risk indices.
8. **Compare Locations** (`/tools/compare`) – Side-by-side meteorological comparison of two locations (e.g. Chennai vs. Reykjavik).

---

### 3. Collapsible Chat History Drawer
- **New Chat** primary action button
- **Search Conversations** input with instant filtering
- Categorized session history with message counts and timestamps
- One-click session switching and individual session deletion
- **Clear All** conversations option

---

## Directory Structure

```text
climatesphere-ai/
├── public/
│   └── vite.svg                      # Platform favicon
├── src/
│   ├── assets/
│   │   └── logo.svg                  # Orbital planetary emblem
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatHistoryDrawer.tsx # Collapsible conversation history drawer
│   │   │   ├── ChatInput.tsx         # ChatGPT-style floating input with auto-growing textarea
│   │   │   ├── ConversationView.tsx  # Message stream with Markdown, Copy, & Regenerate
│   │   │   ├── MarkdownContent.tsx   # Custom markdown parser (tables, code copy, headers)
│   │   │   ├── ToolsMenu.tsx         # Expandable 8-tools modal
│   │   │   └── WelcomeView.tsx       # Welcome hero & 4 primary suggestion cards
│   │   ├── common/
│   │   │   ├── Header.tsx            # Minimalist glassmorphic top navigation bar
│   │   │   ├── SettingsModal.tsx     # Units & LLM credentials modal
│   │   │   ├── Badge.tsx             # Scientific status pills
│   │   │   ├── Button.tsx            # Styled action buttons
│   │   │   ├── Card.tsx              # Clean glassmorphic card containers
│   │   │   └── PlaceholderNotice.tsx # Standardized API integration notice banners
│   │   └── tools/
│   │       └── ToolPageLayout.tsx    # Shared wrapper with "← Back to AI Chat" navigation
│   ├── context/
│   │   ├── ChatContext.tsx           # Multi-session history, search, and message management
│   │   └── WeatherContext.tsx        # Observatories and measurement standards (°C/°F)
│   ├── hooks/
│   │   ├── useChat.ts                # AI chatbot operations
│   │   ├── useMediaQuery.ts          # Responsive breakpoint detection
│   │   └── useWeather.ts             # Observatory and unit state
│   ├── pages/
│   │   ├── HomePage.tsx              # Redesigned full-screen AI Chatbot Homepage
│   │   ├── ChatPage.tsx              # Chat route alias
│   │   ├── ClimateResearchPage.tsx   # Research repository interface
│   │   ├── StationsPage.tsx          # Observatories interface
│   │   ├── SettingsPage.tsx          # Dedicated settings route
│   │   ├── NotFoundPage.tsx          # 404 radar-lost handler
│   │   └── tools/
│   │       ├── AirQualityPage.tsx
│   │       ├── ClimateExplorerPage.tsx
│   │       ├── CompareLocationsPage.tsx
│   │       ├── CurrentWeatherPage.tsx
│   │       ├── DisasterMonitorPage.tsx
│   │       ├── ForecastPage.tsx
│   │       └── WeatherMapPage.tsx
│   ├── services/
│   │   ├── apiClient.ts              # Base client configuration
│   │   ├── chatService.ts            # AI reasoning service (Gemini / Groq / HF ready)
│   │   ├── climateService.ts         # Planetary indicator providers
│   │   └── weatherService.ts         # Station telemetry providers
│   ├── types/
│   │   └── index.ts                  # TypeScript definitions for Chat, Tools, Metrics
│   ├── utils/
│   │   ├── cn.ts                     # Tailwind class merger
│   │   ├── constants.ts              # Primary suggestions and 8 tools config
│   │   └── formatters.ts             # Geographic coordinates & timestamp formatters
│   ├── App.tsx                       # React Router configuration
│   ├── index.css                     # Cosmic Earth-from-space styling & glassmorphism
│   └── main.tsx                      # DOM entry point
├── package.json                      # Dependencies & scripts
├── tailwind.config.js                # Custom palette (space, navy, cyan, teal)
├── tsconfig.json                     # TypeScript compiler configuration
└── vite.config.ts                    # Vite build configuration
```

---

## Commands to Run the Project

### 1. Start Development Server
```bash
npm run dev
```
Open **`http://localhost:5173`** in your browser.

### 2. Run TypeScript Verification
```bash
npx tsc --noEmit
```

### 3. Production Build
```bash
npm run build
```

### 4. Preview Production Build
```bash
npm run preview
```
