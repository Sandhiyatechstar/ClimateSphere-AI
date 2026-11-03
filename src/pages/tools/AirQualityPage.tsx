import React, { useState, useEffect } from 'react';
import { Wind, HeartPulse, Search, Loader2, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { weatherService, BackendAirPollutionResponse } from '../../services/weatherService';

const AQI_COLORS: Record<number, { text: string; bg: string; border: string; advisory: string }> = {
  1: {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    advisory: 'Air quality is satisfactory and poses little or no risk to health. Ideal for outdoor activities.',
  },
  2: {
    text: 'text-teal-300',
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    advisory: 'Air quality is acceptable. Very sensitive individuals may consider reducing prolonged outdoor exertion.',
  },
  3: {
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    advisory: 'Members of sensitive groups (asthma, elderly) may experience health effects. General public not likely affected.',
  },
  4: {
    text: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    advisory: 'Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.',
  },
  5: {
    text: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    advisory: 'Health alert: The risk of health effects is increased for everyone. Avoid prolonged outdoor exertion.',
  },
};

export const AirQualityPage: React.FC = () => {
  const [cityInput, setCityInput] = useState('Chennai');
  const [activeCity, setActiveCity] = useState('Chennai');
  const [pollutionData, setPollutionData] = useState<BackendAirPollutionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAirQuality = async (city: string) => {
    if (!city.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await weatherService.getAirPollution(city);
      setPollutionData(data);
      setActiveCity(data.city);
    } catch (err: any) {
      setError(err?.message || 'Unable to retrieve air quality telemetry for this location.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAirQuality(activeCity);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchAirQuality(cityInput);
  };

  const aqiInfo = pollutionData
    ? AQI_COLORS[pollutionData.aqi] || AQI_COLORS[3]
    : AQI_COLORS[3];

  const comps = pollutionData?.components;
  const pollutants = [
    { code: 'PM2.5', name: 'Fine Particulate Matter', val: comps ? comps.pm2_5.toFixed(1) : '--', unit: 'µg/m³', desc: 'Combustion & smoke' },
    { code: 'PM10', name: 'Coarse Particulates', val: comps ? comps.pm10.toFixed(1) : '--', unit: 'µg/m³', desc: 'Dust & pollen' },
    { code: 'O₃', name: 'Tropospheric Ozone', val: comps ? comps.o3.toFixed(1) : '--', unit: 'µg/m³', desc: 'Photochemical smog' },
    { code: 'NO₂', name: 'Nitrogen Dioxide', val: comps ? comps.no2.toFixed(1) : '--', unit: 'µg/m³', desc: 'Vehicle emissions' },
    { code: 'SO₂', name: 'Sulfur Dioxide', val: comps ? comps.so2.toFixed(1) : '--', unit: 'µg/m³', desc: 'Industrial emissions' },
    { code: 'CO', name: 'Carbon Monoxide', val: comps ? comps.co.toFixed(1) : '--', unit: 'µg/m³', desc: 'Incomplete combustion' },
  ];

  return (
    <ToolPageLayout
      title="Air Quality & Aerosol Monitoring"
      category="Atmospheric Chemistry"
      description="Real-time Air Quality Index (AQI), particulate matter (PM2.5/PM10), and chemical dispersion telemetry from OpenWeather sensors."
      icon={Wind}
      badge="Live AQI Sensor"
      aiSuggestedPrompt={`What are the current air quality and particulate matter levels in ${activeCity}, and how do they impact health?`}
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
              placeholder="Search global city for air pollution data..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !cityInput.trim()}
            className="px-5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold font-mono transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Fetch Air Quality</span>
          </button>
        </form>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Big AQI Status Banner */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider block">
                AIR QUALITY INDEX (AQI) FOR {pollutionData ? `${pollutionData.city}, ${pollutionData.country}` : activeCity.toUpperCase()}
              </span>
              <span className="text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                [LIVE TELEMETRY]
              </span>
            </div>
            <div className="flex items-baseline justify-center sm:justify-start gap-3">
              <span className={`text-6xl font-black font-mono ${aqiInfo.text}`}>
                {pollutionData ? pollutionData.aqi : '--'}
              </span>
              <span className={`text-lg font-mono font-semibold ${aqiInfo.text}`}>
                {pollutionData ? `[${pollutionData.aqi_label}]` : '[Awaiting Sensor Feed]'}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Scale: 1 (Good) to 5 (Very Poor)
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              {aqiInfo.advisory}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs font-mono text-slate-400 min-w-[240px]">
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <HeartPulse className="h-4 w-4" />
              <span>WHO Global Standards</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Standard: 24h Mean WHO 2021 thresholds. PM2.5 target: &lt;15 µg/m³. PM10 target: &lt;45 µg/m³.
            </p>
            <div className="pt-2 border-t border-slate-800 flex items-center gap-1 text-[10px] text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>Live Chemical Sensor Verified</span>
            </div>
          </div>
        </div>

        {/* Pollutants Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {pollutants.map((p, idx) => (
            <div key={idx} className="p-3.5 rounded-xl glass-card border border-slate-800 space-y-1 hover:border-cyan-500/40 transition-colors">
              <span className="text-xs font-bold font-mono text-cyan-400 block">{p.code}</span>
              <span className="text-[10px] text-slate-400 block leading-tight truncate">{p.name}</span>
              <div className="text-lg font-bold font-mono text-white pt-1">
                {p.val} <span className="text-[10px] font-normal text-slate-400">{p.unit}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 block truncate">{p.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default AirQualityPage;
