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

      
      {/* Suggestion cards removed */}

    </div>
  </div>
);
};
