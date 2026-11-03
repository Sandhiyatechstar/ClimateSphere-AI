import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Check,
  Shield,
  ArrowLeft,
  Cpu,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather';
import { PlaceholderNotice } from '../components/common/PlaceholderNotice';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { units, setTemperatureUnit } = useWeather();
  const [saveStatus, setSaveStatus] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(true);
    setTimeout(() => setSaveStatus(false), 2000);
  };

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 bg-earth-orbit p-4 sm:p-8">
      {/* Background Starfield */}
      <div className="fixed inset-0 stars-layer opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2 group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to AI Chat</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Settings className="h-6 w-6 text-cyan-400" />
              System Settings & Integration Credentials
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Configure measurement standards, external weather feeds, and LLM inference keys.
            </p>
          </div>

          {saveStatus && (
            <span className="text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              ✓ Preferences Saved
            </span>
          )}
        </div>

        <PlaceholderNotice
          title="Integration Credentials Vault (Phase 2 Ready)"
          description="Credentials entered here are retained within the local sandbox environment. Live API requests activate upon backend binding."
          endpoint="/v1/config/credentials"
        />

        <form onSubmit={handleSave} className="space-y-6">
          {/* Units */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="h-4 w-4 text-cyan-400" />
              Measurement Standards
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block font-mono">
                  Temperature Scale
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('celsius')}
                    className={`py-1.5 px-3 rounded-lg font-mono text-xs font-medium border transition-all ${
                      units.temperature === 'celsius'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    °C Celsius
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('fahrenheit')}
                    className={`py-1.5 px-3 rounded-lg font-mono text-xs font-medium border transition-all ${
                      units.temperature === 'fahrenheit'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    °F Fahrenheit
                  </button>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block font-mono">
                  Wind Velocity
                </label>
                <select
                  defaultValue="kmh"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="kmh">Kilometers / hour (km/h)</option>
                  <option value="mps">Meters / second (m/s)</option>
                  <option value="knots">Knots (kn)</option>
                  <option value="mph">Miles / hour (mph)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <label className="font-semibold text-slate-200 block font-mono">
                  Atmospheric Pressure
                </label>
                <select
                  defaultValue="hpa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500/40"
                >
                  <option value="hpa">Hectopascals (hPa)</option>
                  <option value="mbar">Millibars (mbar)</option>
                  <option value="inhg">Inches of Mercury (inHg)</option>
                </select>
              </div>
            </div>
          </div>

          {/* AI Providers */}
          <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="h-4 w-4 text-cyan-400" />
                AI Model Provider Integrations (Gemini / Groq / Hugging Face)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                <Shield className="h-3 w-3" /> Secure Vault
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                  Google Gemini API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy_GEMINI_KEY_PLACEHOLDER"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/40"
                  disabled
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                  Groq LPU Inference API Key
                </label>
                <input
                  type="password"
                  placeholder="gsk_GROQ_KEY_PLACEHOLDER"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/40"
                  disabled
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1 font-mono">
                  Hugging Face User Access Token (ClimateBERT)
                </label>
                <input
                  type="password"
                  placeholder="hf_TOKEN_PLACEHOLDER"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500/40"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-tight shadow-cyanGlow transition-all"
            >
              <Check className="h-4 w-4 stroke-[2.5]" />
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
