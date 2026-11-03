import React from 'react';
import {
  CloudSun,
  Globe2,
  Flame,
  LineChart,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { PRIMARY_SUGGESTIONS } from '../../utils/constants';
import logoUrl from '../../assets/logo.svg';

interface WelcomeViewProps {
  onSelectPrompt: (promptText: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  CloudSun,
  Globe2,
  Flame,
  LineChart,
};

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onSelectPrompt }) => {
  return (
    <div className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain">
      <div className="min-h-full flex flex-col items-center justify-center max-w-3xl mx-auto px-4 py-6 sm:py-8 text-center animate-in fade-in duration-300">
        {/* Central Glowing Planetary Emblem */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-cyan-500/25 rounded-full blur-2xl animate-pulse-slow pointer-events-none" />
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-3xl bg-gradient-to-br from-cyan-400 via-blue-600 to-space-950 p-3 shadow-earthGlow flex items-center justify-center border border-cyan-400/40">
          <img
            src={logoUrl}
            alt="ClimateSphere Planetary Sphere"
            className="h-full w-full object-contain filter drop-shadow-md"
          />
        </div>
      </div>

      {/* Main Heading */}
      <div className="space-y-3 max-w-xl">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-xs font-mono font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Next-Generation Atmospheric Intelligence</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
          Explore Our Planet with{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-400 bg-clip-text text-transparent">
            ClimateSphere AI
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
          Your intelligent companion for weather, climate, and everything happening across our planet.
        </p>
      </div>

      {/* 4 Compact Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 sm:mt-10 text-left">
        {PRIMARY_SUGGESTIONS.map((item) => {
          const Icon = ICON_MAP[item.iconName] || Globe2;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group p-4 rounded-2xl glass-card glass-card-hover border border-slate-700/60 hover:border-cyan-400/50 text-left transition-all duration-200 flex flex-col justify-between focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
              aria-label={`Ask suggested inquiry: ${item.prompt}`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/25 transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 group-hover:text-cyan-300 transition-colors">
                    {item.category}
                  </span>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>

              <p className="text-xs sm:text-sm font-medium text-slate-100 group-hover:text-white leading-snug">
                "{item.prompt}"
              </p>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);
};
