import React, { useState } from 'react';
import { Map, Layers, Wind, Eye, ExternalLink, Radio } from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';

export const WeatherMapPage: React.FC = () => {
  const [activeLayer, setActiveLayer] = useState<'radar' | 'satellite' | 'infrared'>('radar');

  // Embed URL for RainViewer global interactive radar
  const radarEmbedUrl = "https://www.rainviewer.com/map.html?loc=20.5937,78.9629,4&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=3&o=83&lm=1&layer=radar&sm=1&sn=1";

  return (
    <ToolPageLayout
      title="Global Weather Map & Radar"
      category="Atmospheric GIS & Remote Sensing"
      description="Live interactive Doppler radar, geostationary satellite imagery, and synoptic atmospheric motion."
      icon={Map}
      badge="Live Radar GIS"
      aiSuggestedPrompt="How do meteorologists analyze synoptic surface pressure isobars and radar reflectivity on a weather map?"
    >
      <div className="space-y-6">
        {/* Layer Controls Bar */}
        <div className="p-4 rounded-2xl glass-card border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-cyan-400 font-semibold flex items-center gap-1.5 mr-2">
              <Radio className="h-4 w-4 animate-pulse text-emerald-400" />
              RADAR STREAM:
            </span>
            {[
              { id: 'radar', label: 'Doppler Radar Composite', icon: Layers },
              { id: 'satellite', label: 'Infrared Cloud Tracking', icon: Eye },
              { id: 'wind', label: 'Synoptic Vectors', icon: Wind },
            ].map((layer) => {
              const Icon = layer.icon;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                    activeLayer === layer.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-cyanGlow'
                      : 'bg-slate-900/90 text-slate-300 border border-slate-700/80 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{layer.label}</span>
                </button>
              );
            })}
          </div>

          <a
            href="https://www.rainviewer.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1 border border-cyan-500/20 px-2.5 py-1 rounded-lg bg-cyan-950/20"
          >
            <span>RainViewer Telemetry Feed</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Live Interactive Radar Canvas */}
        <div className="relative h-[540px] w-full rounded-2xl bg-space-950 border border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between">
          <iframe
            src={radarEmbedUrl}
            title="Global Weather Radar Map"
            className="w-full h-full border-0 rounded-2xl"
            allow="geolocation"
            loading="lazy"
          />
        </div>

        {/* Informational Footer */}
        <div className="p-4 rounded-xl glass-card border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
          <span>PROJECTION: WGS 84 (EPSG:4326) • GLOBAL DOPPLER RADAR TILES</span>
          <span className="text-emerald-400">Live 10-Minute Global Precipitation Radar Active</span>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default WeatherMapPage;
