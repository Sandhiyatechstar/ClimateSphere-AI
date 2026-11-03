import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  SatelliteDish,
  Compass,
  ArrowLeft,
  Home,
  MessageSquareCode,
  MapPin,
} from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex items-center justify-center p-4 bg-earth-orbit">
      {/* Background Starfield */}
      <div className="fixed inset-0 stars-layer opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center p-8 glass-card border border-slate-800 rounded-3xl shadow-2xl">
        {/* Radar / Lost Telemetry Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-cyan-500/10 text-cyan-400 p-3.5 flex items-center justify-center border border-cyan-500/30 shadow-cyanGlow mb-5">
          <SatelliteDish className="h-8 w-8 text-cyan-400 animate-pulse" />
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
            404 • TELEMETRY LINK LOST
          </span>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Atmospheric Coordinate Not Found
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Unmapped Path: <code className="text-rose-400 bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-800/40">{location.pathname}</code>
          </p>
        </div>

        <p className="text-xs text-slate-300 mt-4 leading-relaxed max-w-sm mx-auto">
          The requested station route, telemetry endpoint, or climate parameter does not exist within the ClimateSphere AI grid.
        </p>

        {/* Suggested Active Navigation Coordinates */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-left">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Available Platform Coordinates:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <Link
              to="/"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-2 font-medium transition-colors"
            >
              <Home className="h-4 w-4 text-cyan-400" />
              <span>AI Chatbot Home</span>
            </Link>
            <Link
              to="/tools/current-weather"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-2 font-medium transition-colors"
            >
              <MessageSquareCode className="h-4 w-4 text-blue-400" />
              <span>Current Weather</span>
            </Link>
            <Link
              to="/tools/research"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-2 font-medium transition-colors"
            >
              <Compass className="h-4 w-4 text-teal-400" />
              <span>Climate Research</span>
            </Link>
            <Link
              to="/stations"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-2 font-medium transition-colors"
            >
              <MapPin className="h-4 w-4 text-amber-400" />
              <span>Stations Catalog</span>
            </Link>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-tight shadow-cyanGlow transition-all"
          >
            <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
            <span>Return to ClimateSphere AI Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
