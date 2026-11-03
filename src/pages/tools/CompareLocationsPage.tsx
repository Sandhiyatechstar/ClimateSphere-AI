import React, { useState, useEffect } from 'react';
import { GitCompare, Loader2, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { useWeather } from '../../hooks/useWeather';
import {
  weatherService,
  BackendWeatherComparisonResponse,
  kelvinToCelsius,
  kelvinToFahrenheit,
} from '../../services/weatherService';

export const CompareLocationsPage: React.FC = () => {
  const { units } = useWeather();
  const [city1Input, setCity1Input] = useState('Chennai');
  const [city2Input, setCity2Input] = useState('London');
  const [comparisonData, setComparisonData] = useState<BackendWeatherComparisonResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCelsius = units.temperature === 'celsius';
  const tempUnit = isCelsius ? '°C' : '°F';

  const fetchComparison = async (c1: string, c2: string) => {
    if (!c1.trim() || !c2.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await weatherService.compareLocations(c1, c2);
      setComparisonData(data);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve comparison telemetry. Please check the city names.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(city1Input, city2Input);
  }, []);

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComparison(city1Input, city2Input);
  };

  const locA = comparisonData?.location_a;
  const locB = comparisonData?.location_b;

  const tempA = locA ? (isCelsius ? kelvinToCelsius(locA.temperature_k) : kelvinToFahrenheit(locA.temperature_k)) : '--';
  const tempB = locB ? (isCelsius ? kelvinToCelsius(locB.temperature_k) : kelvinToFahrenheit(locB.temperature_k)) : '--';
  const feelsA = locA ? (isCelsius ? kelvinToCelsius(locA.feels_like_k) : kelvinToFahrenheit(locA.feels_like_k)) : '--';
  const feelsB = locB ? (isCelsius ? kelvinToCelsius(locB.feels_like_k) : kelvinToFahrenheit(locB.feels_like_k)) : '--';

  return (
    <ToolPageLayout
      title="Compare Climate & Weather Across Locations"
      category="Spatial Climatology"
      description="Side-by-side meteorological comparison of atmospheric states, temperatures, and microclimates from dual OpenWeather observation stations."
      icon={GitCompare}
      badge="Live Dual Station"
      aiSuggestedPrompt={`Compare the current meteorological conditions, humidity, and weather patterns between ${city1Input} and ${city2Input}.`}
    >
      <div className="space-y-6">
        {/* Dual Location Selectors */}
        <form onSubmit={handleCompare} className="p-4 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Primary Location A
              </span>
              <input
                type="text"
                value={city1Input}
                onChange={(e) => setCity1Input(e.target.value)}
                placeholder="City name (e.g. Chennai, Tokyo)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700/80 space-y-1.5">
              <span className="text-[11px] font-mono text-teal-400 uppercase font-semibold flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                Comparative Location B
              </span>
              <input
                type="text"
                value={city2Input}
                onChange={(e) => setCity2Input(e.target.value)}
                placeholder="Comparison city (e.g. London, New York)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !city1Input.trim() || !city2Input.trim()}
              className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Execute Synoptic Comparison</span>
            </button>
          </div>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Comparison Table */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-mono text-white flex items-center gap-2">
              <GitCompare className="h-4 w-4 text-cyan-400" />
              <span>Comparative Meteorological Matrix</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              [CONCURRENT TELEMETRY]
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-slate-900/80 text-cyan-300 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Atmospheric Parameter</th>
                  <th className="py-2.5 px-3">{locA ? `${locA.city}, ${locA.country}` : 'Location A'}</th>
                  <th className="py-2.5 px-3">{locB ? `${locB.city}, ${locB.country}` : 'Location B'}</th>
                  <th className="py-2.5 px-3">Differential Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Observed Temperature</td>
                  <td className="py-2.5 px-3">{tempA} {tempUnit}</td>
                  <td className="py-2.5 px-3">{tempB} {tempUnit}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">
                    {comparisonData ? `${comparisonData.temp_delta_c > 0 ? `+${comparisonData.temp_delta_c}` : comparisonData.temp_delta_c} °C Delta` : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Apparent (Feels-Like)</td>
                  <td className="py-2.5 px-3">{feelsA} {tempUnit}</td>
                  <td className="py-2.5 px-3">{feelsB} {tempUnit}</td>
                  <td className="py-2.5 px-3 text-cyan-400">Thermal Comfort Index</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Relative Humidity</td>
                  <td className="py-2.5 px-3">{locA ? `${locA.humidity_pct}%` : '--'}</td>
                  <td className="py-2.5 px-3">{locB ? `${locB.humidity_pct}%` : '--'}</td>
                  <td className="py-2.5 px-3 text-cyan-400 font-bold">
                    {comparisonData ? `${comparisonData.humidity_delta_pct > 0 ? `+${comparisonData.humidity_delta_pct}` : comparisonData.humidity_delta_pct}% Delta` : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Atmospheric Pressure</td>
                  <td className="py-2.5 px-3">{locA ? `${locA.pressure_hpa} hPa` : '--'}</td>
                  <td className="py-2.5 px-3">{locB ? `${locB.pressure_hpa} hPa` : '--'}</td>
                  <td className="py-2.5 px-3 text-cyan-400">
                    {locA && locB ? `${locA.pressure_hpa - locB.pressure_hpa} hPa Gradient` : '--'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Wind Speed</td>
                  <td className="py-2.5 px-3">{locA ? `${locA.wind.speed_mps} m/s` : '--'}</td>
                  <td className="py-2.5 px-3">{locB ? `${locB.wind.speed_mps} m/s` : '--'}</td>
                  <td className="py-2.5 px-3 text-cyan-400">Local Vector Dynamics</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-white">Dominant Weather Condition</td>
                  <td className="py-2.5 px-3 capitalize">{locA ? locA.description : '--'}</td>
                  <td className="py-2.5 px-3 capitalize">{locB ? locB.description : '--'}</td>
                  <td className="py-2.5 px-3 text-emerald-400">Real-Time Station Feeds</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default CompareLocationsPage;
