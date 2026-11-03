import React, { useState } from 'react';
import {
  Settings,
  X,
  Sliders,
  Cpu,
  Check,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useWeather } from '../../hooks/useWeather';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { units, setTemperatureUnit } = useWeather();
  const [activeTab, setActiveTab] = useState<'units' | 'ai'>('units');
  const [selectedProvider, setSelectedProvider] = useState<string>('gemini');
  const [savedNotice, setSavedNotice] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-space-900/95 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                ClimateSphere AI Settings
              </h2>
              <p className="text-xs text-slate-400">
                Personalize measurement units and prepare LLM inference gateways.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('units')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'units'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Measurement Units</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>AI Model Gateways</span>
          </button>
        </div>

        {/* Content Tabs */}
        <div className="py-4 space-y-4 text-xs">
          {activeTab === 'units' ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-2 font-mono">
                  Temperature Scale
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('celsius')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
                      units.temperature === 'celsius'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Celsius (°C)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTemperatureUnit('fahrenheit')}
                    className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
                      units.temperature === 'fahrenheit'
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    Fahrenheit (°F)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1.5 font-mono">
                  Wind Speed Units
                </label>
                <select
                  defaultValue="kmh"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="kmh">Kilometers per hour (km/h)</option>
                  <option value="mps">Meters per second (m/s)</option>
                  <option value="knots">Knots (kn)</option>
                  <option value="mph">Miles per hour (mph)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1.5 font-mono">
                  Barometric Pressure Units
                </label>
                <select
                  defaultValue="hpa"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-cyan-500/50"
                >
                  <option value="hpa">Hectopascals (hPa)</option>
                  <option value="mbar">Millibars (mbar)</option>
                  <option value="inhg">Inches of Mercury (inHg)</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed flex items-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Connect future keys for <strong>Google Gemini</strong>, <strong>Groq LPU</strong>, or <strong>Hugging Face ClimateBERT</strong> to activate live neural inferences.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1 font-mono">
                  Target Inference Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['gemini', 'groq', 'huggingface'].map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setSelectedProvider(prov)}
                      className={`py-2 px-2.5 rounded-xl border text-center font-mono capitalize transition-all ${
                        selectedProvider === prov
                          ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200 font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      {prov}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1 font-mono flex items-center justify-between">
                  <span>API Key (Vault Placeholder)</span>
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Shield className="h-3 w-3 text-emerald-400" /> Secure
                  </span>
                </label>
                <input
                  type="password"
                  placeholder="AI_KEY_PLACEHOLDER_XXXXX"
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded-xl px-3 py-2 font-mono text-xs focus:outline-none focus:border-cyan-500/50"
                  disabled
                />
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  Keys are stored locally in sandbox memory and never transmitted externally.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between relative z-10">
          <span className="text-[11px] font-mono text-slate-500">
            {savedNotice ? '✓ Settings Updated' : 'ClimateSphere Config v2.0'}
          </span>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs shadow-cyanGlow transition-all"
          >
            <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Apply Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
};
