import React from 'react';
import {
  Plus,
  Settings,
  Compass,
  PanelLeft,
} from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { useWeather } from '../../hooks/useWeather';
import logoUrl from '../../assets/logo.svg';

interface HeaderProps {
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = () => {
  const {
    startNewChat,
    toggleHistory,
    isHistoryOpen,
    toggleSettings,
    toggleToolsMenu,
  } = useChatContext();

  const { units, setTemperatureUnit } = useWeather();

  return (
    <header className="sticky top-0 z-30 h-16 w-full glass-header px-4 sm:px-6 flex items-center justify-between gap-3">
      {/* Left: Sidebar Toggle + Brand Logo & Subtitle */}
      <div className="flex items-center gap-3">
        {/* Toggle Chat History Sidebar */}
        <button
          onClick={toggleHistory}
          className={`p-2 rounded-xl border transition-all ${
            isHistoryOpen
              ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-xs'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800 hover:border-slate-700'
          }`}
          title={isHistoryOpen ? "Hide chat history" : "Open chat history"}
          aria-label="Toggle chat history"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <button
          onClick={startNewChat}
          className="flex items-center gap-3 text-left group focus:outline-none"
          title="Return to Welcome Screen / New Chat"
        >
          {/* Orbital Logo with Blue Glow */}
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-space-950 p-1.5 flex items-center justify-center shadow-cyanGlow transition-transform group-hover:scale-105">
            <img
              src={logoUrl}
              alt="ClimateSphere AI"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white group-hover:text-cyan-300 transition-colors">
                ClimateSphere
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                AI
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
              Global Weather & Climate Assistant
            </span>
          </div>
        </button>
      </div>

      {/* Right Actions: Temperature Units, Tools, New Chat, Settings */}
      <div className="flex items-center gap-2">
        {/* Temperature Unit Quick Toggle */}
        <div className="hidden md:flex items-center p-0.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setTemperatureUnit('celsius')}
            className={`px-2 py-1 rounded-lg font-medium transition-all ${
              units.temperature === 'celsius'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            °C
          </button>
          <button
            onClick={() => setTemperatureUnit('fahrenheit')}
            className={`px-2 py-1 rounded-lg font-medium transition-all ${
              units.temperature === 'fahrenheit'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            °F
          </button>
        </div>

        {/* Tools Menu Trigger Button */}
        <button
          onClick={toggleToolsMenu}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white text-xs font-medium transition-all"
          title="Explore Climate Tools"
        >
          <Compass className="h-3.5 w-3.5 text-cyan-400" />
          <span>Tools</span>
        </button>

        {/* New Chat Primary Button */}
        <button
          onClick={startNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-all shadow-xs"
          title="Start a new chat session"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span className="hidden xs:inline">New Chat</span>
        </button>

        {/* Settings Button */}
        <button
          onClick={toggleSettings}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800 transition-colors"
          title="Application Settings"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};
