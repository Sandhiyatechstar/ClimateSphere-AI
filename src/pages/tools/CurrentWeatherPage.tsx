import React, { useState, useEffect } from 'react';
import {
  Thermometer,
  Search,
  Wind,
  Droplets,
  Gauge,
  Sun,
  Eye,
  MapPin,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { useWeather } from '../../hooks/useWeather';
import { weatherService, kelvinToCelsius, kelvinToFahrenheit, windDegreesToCardinal } from '../../services/weatherService';
import { BackendCurrentWeather } from '../../types';

export const CurrentWeatherPage: React.FC = () => {
  const { units } = useWeather();
  const [cityInput, setCityInput] = useState('Chennai');
  const [activeCity, setActiveCity] = useState('Chennai');
  const [weatherData, setWeatherData] = useState<BackendCurrentWeather | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async (targetCity: string) => {
    if (!targetCity.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await weatherService.getCurrentWeather(targetCity);
      setWeatherData(data);
      setActiveCity(data.city);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve station telemetry. Please check the city name.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather(activeCity);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchWeather(cityInput);
  };

  const isCelsius = units.temperature === 'celsius';
  const tempUnit = isCelsius ? '°C' : '°F';
  const displayTemp = weatherData
    ? isCelsius
      ? kelvinToCelsius(weatherData.temperature_k)
      : kelvinToFahrenheit(weatherData.temperature_k)
    : '--';
  const displayFeelsLike = weatherData
    ? isCelsius
      ? kelvinToCelsius(weatherData.feels_like_k)
      : kelvinToFahrenheit(weatherData.feels_like_k)
    : '--';

  return (
    <ToolPageLayout
      title="Current Weather Telemetry"
      category="Surface Meteorology"
      description="Instant atmospheric metrics, barometric pressure, relative humidity, and wind vector data directly from OpenWeather station feeds."
      icon={Thermometer}
      badge="Live Telemetry"
      aiSuggestedPrompt={`What is the current atmospheric state and humidity in ${activeCity}?`}
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Enter global city (e.g. Chennai, London, Tokyo, New York)..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !cityInput.trim()}
            className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Fetch Station Feed</span>
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Big Weather Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <MapPin className="h-3.5 w-3.5" />
                  {weatherData ? `${weatherData.city}, ${weatherData.country}` : activeCity}
                </span>
                <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                  [LIVE STATION FEED]
                </span>
              </div>
              <div className="flex items-baseline gap-2 my-2">
                <span className="text-5xl font-extrabold font-mono text-white">
                  {displayTemp}
                </span>
                <span className="text-xl font-mono text-cyan-400">{tempUnit}</span>
              </div>
              <p className="text-xs text-slate-300 capitalize">
                {weatherData ? `${weatherData.description} • Feels like ${displayFeelsLike}${tempUnit}` : 'Retrieving telemetry...'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
              <span>LAT: {weatherData ? `${weatherData.latitude.toFixed(4)}°` : '--'}</span>
              <span>LON: {weatherData ? `${weatherData.longitude.toFixed(4)}°` : '--'}</span>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              {
                label: 'Atmospheric Pressure',
                val: weatherData ? `${weatherData.pressure_hpa}` : '---',
                unit: 'hPa',
                icon: Gauge,
              },
              {
                label: 'Relative Humidity',
                val: weatherData ? `${weatherData.humidity_pct}` : '--',
                unit: '%',
                icon: Droplets,
              },
              {
                label: 'Wind Velocity',
                val: weatherData ? `${weatherData.wind.speed_mps}` : '--.-',
                unit: `m/s ${weatherData?.wind.direction_deg ? `(${windDegreesToCardinal(weatherData.wind.direction_deg)})` : ''}`,
                icon: Wind,
              },
              {
                label: 'Cloud Cover',
                val: weatherData ? `${weatherData.clouds_pct}` : '-',
                unit: '%',
                icon: Sun,
              },
              {
                label: 'Feels-Like Temp',
                val: `${displayFeelsLike}`,
                unit: tempUnit,
                icon: Thermometer,
              },
              {
                label: 'Horizontal Visibility',
                val: weatherData?.visibility_m ? `${(weatherData.visibility_m / 1000).toFixed(1)}` : '--',
                unit: 'km',
                icon: Eye,
              },
            ].map((m, idx) => {
              const Icon = m.icon;
              return (
                <div key={idx} className="p-4 rounded-xl glass-card border border-slate-800/80 space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <span className="truncate">{m.label}</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">
                    {m.val} <span className="text-xs font-normal text-slate-400">{m.unit}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400/90 block">
                    Status: Verified
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default CurrentWeatherPage;
