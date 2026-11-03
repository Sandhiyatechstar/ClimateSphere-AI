import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Thermometer,
  CloudRain,
  Map,
  Globe2,
  BookOpen,
  Wind,
  AlertTriangle,
  GitCompare,
  X,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { CLIMATE_TOOLS } from '../../utils/constants';

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Thermometer,
  CloudRain,
  Map,
  Globe2,
  BookOpen,
  Wind,
  AlertTriangle,
  GitCompare,
};

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToolClick = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={menuRef}
        className="w-full max-w-2xl bg-space-900/95 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden"
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                ClimateSphere Tools & Observatories
              </h2>
              <p className="text-xs text-slate-400">
                Dedicated interfaces for real-time telemetry, spatial maps, and climate analytics.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close tools menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 8 Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4 max-h-[62vh] overflow-y-auto pr-1 relative z-10">
          {CLIMATE_TOOLS.map((tool) => {
            const Icon = ICON_MAP[tool.icon] || Globe2;

            return (
              <button
                key={tool.id}
                onClick={() => handleToolClick(tool.path)}
                className="group flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all duration-200"
              >
                <div className="p-2 rounded-lg bg-slate-800 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors shrink-0 mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                      {tool.name}
                    </span>
                    {tool.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {tool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                    {tool.description}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 mt-1" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 relative z-10">
          <span className="text-[11px] font-mono">
            All tools launch dedicated interfaces with quick return to AI Chat.
          </span>
          <button
            onClick={onClose}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Stay in Chat
          </button>
        </div>
      </div>
    </div>
  );
};
