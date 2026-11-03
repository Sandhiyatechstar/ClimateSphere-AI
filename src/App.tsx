import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WeatherProvider } from './context/WeatherContext';
import { ChatProvider } from './context/ChatContext';
import { HomePage } from './pages/HomePage';
import { CurrentWeatherPage } from './pages/tools/CurrentWeatherPage';
import { ForecastPage } from './pages/tools/ForecastPage';
import { WeatherMapPage } from './pages/tools/WeatherMapPage';
import { ClimateExplorerPage } from './pages/tools/ClimateExplorerPage';
import { ClimateResearchPage } from './pages/ClimateResearchPage';
import { AirQualityPage } from './pages/tools/AirQualityPage';
import { DisasterMonitorPage } from './pages/tools/DisasterMonitorPage';
import { CompareLocationsPage } from './pages/tools/CompareLocationsPage';
import { StationsPage } from './pages/StationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <WeatherProvider>
      <ChatProvider>
        <HashRouter>
          <Routes>
            {/* Main AI Chatbot Full-Screen Homepage */}
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<Navigate to="/" replace />} />

            {/* Dedicated Tools Menu Routes */}
            <Route path="/tools/current-weather" element={<CurrentWeatherPage />} />
            <Route path="/tools/forecast" element={<ForecastPage />} />
            <Route path="/tools/weather-map" element={<WeatherMapPage />} />
            <Route path="/tools/climate-explorer" element={<ClimateExplorerPage />} />
            <Route path="/tools/research" element={<ClimateResearchPage />} />
            <Route path="/tools/air-quality" element={<AirQualityPage />} />
            <Route path="/tools/disasters" element={<DisasterMonitorPage />} />
            <Route path="/tools/compare" element={<CompareLocationsPage />} />

            {/* Preserved Standalone Station & Settings Routes */}
            <Route path="/research" element={<ClimateResearchPage />} />
            <Route path="/stations" element={<StationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />

            {/* Error 404 Route */}
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </HashRouter>
      </ChatProvider>
    </WeatherProvider>
  );
};

export default App;
