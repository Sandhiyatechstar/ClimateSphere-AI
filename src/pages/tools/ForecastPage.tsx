import React, { useState, useEffect } from 'react';
import {
  CloudRain,
  Sun,
  Cloud,
  CloudLightning,
  CloudDrizzle,
  Snowflake,
  Search,
  Loader2,
  AlertCircle,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { useWeather } from '../../hooks/useWeather';
import { weatherService, kelvinToCelsius, kelvinToFahrenheit } from '../../services/weatherService';
import { BackendForecastResponse, BackendForecastSlot } from '../../types';

interface DailyForecastSummary {
  dateStr: string;
  dayName: string;
  minTemp: number;
  maxTemp: number;
  dominantCondition: string;
  maxRainProb: number;
  iconCode: string;
}

function getConditionIcon(code: string) {
  if (code.startsWith('11')) return CloudLightning;
  if (code.startsWith('09') || code.startsWith('10')) return CloudRain;
  if (code.startsWith('13')) return Snowflake;
  if (code.startsWith('50')) return CloudDrizzle;
  if (code === '01d' || code === '01n') return Sun;
  return Cloud;
}

export const ForecastPage: React.FC = () => {
  const { units } = useWeather();
  const [cityInput, setCityInput] = useState('Chennai');
  const [activeCity, setActiveCity] = useState('Chennai');
  const [forecastData, setForecastData] = useState<BackendForecastResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCelsius = units.temperature === 'celsius';
  const tempUnit = isCelsius ? '°C' : '°F';

  const fetchForecast = async (targetCity: string) => {
    if (!targetCity.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await weatherService.getWeatherForecast(targetCity);
      setForecastData(data);
      setActiveCity(data.city);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve forecast telemetry. Please check the city name.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast(activeCity);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchForecast(cityInput);
  };

  // Group 3-hour slots into days
  const dailySummaries: DailyForecastSummary[] = React.useMemo(() => {
    if (!forecastData || !forecastData.slots) return [];
    const daysMap = new Map<string, BackendForecastSlot[]>();

    forecastData.slots.forEach((slot) => {
      const dayKey = slot.forecast_time_utc.split('T')[0];
      if (!daysMap.has(dayKey)) {
        daysMap.set(dayKey, []);
      }
      daysMap.get(dayKey)!.push(slot);
    });

    const summaries: DailyForecastSummary[] = [];
    daysMap.forEach((slots, dayKey) => {
      const temps = slots.map((s) => (isCelsius ? kelvinToCelsius(s.temperature_k) : kelvinToFahrenheit(s.temperature_k)));
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      const rainProbs = slots.map((s) => (s.rain_probability ? s.rain_probability * 100 : 0));
      const maxRainProb = Math.round(Math.max(...rainProbs, 0));

      const dateObj = new Date(dayKey);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const midSlot = slots[Math.floor(slots.length / 2)] || slots[0];

      summaries.push({
        dateStr: dayKey,
        dayName,
        minTemp,
        maxTemp,
        dominantCondition: midSlot.description,
        maxRainProb,
        iconCode: midSlot.icon_code,
      });
    });

    return summaries.slice(0, 5); // 5-day horizon
  }, [forecastData, isCelsius]);

  return (
    <ToolPageLayout
      title="Weather Forecast & Synoptic Prediction"
      category="Numerical Weather Prediction"
      description="5-day numerical weather prediction and precipitation probabilities from OpenWeatherMap ensemble feeds."
      icon={CloudRain}
      badge="Live 5-Day NWP"
      aiSuggestedPrompt={`What is the 5-day weather and rain forecast for ${activeCity}?`}
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
              placeholder="Search global city for 5-day forecast..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !cityInput.trim()}
            className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Fetch Forecast Feed</span>
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 5-Day Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-2">
            <span className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Calendar className="h-3.5 w-3.5" />
              5-DAY FORECAST FOR {forecastData ? `${forecastData.city}, ${forecastData.country}` : activeCity.toUpperCase()}
            </span>
            <span className="text-[11px] text-emerald-400">[VERIFIED NWP MODEL]</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {dailySummaries.map((d, idx) => {
              const Icon = getConditionIcon(d.iconCode);
              return (
                <div
                  key={idx}
                  className="p-4 rounded-xl glass-card border border-slate-800 flex flex-col justify-between text-center space-y-3 hover:border-cyan-500/40 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-200 font-mono">
                    {d.dayName}
                  </span>
                  <div className="mx-auto p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-base font-bold font-mono text-white block">
                      {d.maxTemp}° / <span className="text-slate-400 text-sm font-normal">{d.minTemp}{tempUnit}</span>
                    </span>
                    <span className="text-[11px] text-slate-300 capitalize block mt-0.5 truncate">
                      {d.dominantCondition}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-teal-400 pt-2 border-t border-slate-800/80 flex items-center justify-center gap-1">
                    <CloudRain className="h-3 w-3" />
                    <span>Rain: {d.maxRainProb}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ForecastPage;
