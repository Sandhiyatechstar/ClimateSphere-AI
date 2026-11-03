import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Flame, Waves, Wind, Radio, ArrowRight, ExternalLink, ShieldAlert } from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { useChatContext } from '../../context/ChatContext';

export const DisasterMonitorPage: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage } = useChatContext();

  const handleLaunchAdvisory = (promptText: string) => {
    sendMessage(promptText);
    navigate('/');
  };

  const alertCategories = [
    {
      type: 'Tropical Cyclone & Storm Surge',
      basin: 'Global Basins (WMO / JTWC)',
      category: 'Category 1 to 5',
      metric: 'Wind & Pressure Isobars',
      icon: Wind,
      color: 'text-cyan-400',
      prompt: 'How does the WMO categorize tropical cyclone intensity, central barometric pressure, and storm surge risks?',
    },
    {
      type: 'Marine Heatwaves (MHW)',
      basin: 'Oceanic Upper 200m Layer',
      category: 'Moderate to Extreme (Cat 1–4)',
      metric: '+2°C to +4°C SST Deviation',
      icon: Waves,
      color: 'text-amber-400',
      prompt: 'What causes marine heatwaves and how do they impact ocean circulation and coral bleaching?',
    },
    {
      type: 'Wildfire Weather & Drought',
      basin: 'Boreal & Mediterranean Zones',
      category: 'Fire Weather Index (FWI > 38)',
      metric: 'Low RH & High VPD',
      icon: Flame,
      color: 'text-rose-400',
      prompt: 'Explain the Fire Weather Index (FWI), vapor pressure deficit, and how drought conditions accelerate wildfire propagation.',
    },
  ];

  return (
    <ToolPageLayout
      title="Natural Disaster Monitor & Early Warning"
      category="Severe Weather & Risk Prevention"
      description="Active severe weather criteria, tropical cyclone tracking parameters, and early warning guidelines aligned with WMO and GDACS standards."
      icon={AlertTriangle}
      badge="Early Warning Standards"
      aiSuggestedPrompt="How does the WMO Early Warnings for All initiative monitor multi-hazard natural disasters?"
    >
      <div className="space-y-6">
        {/* Notice Banner */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse shrink-0" />
            <span>Severe weather protocols aligned with Global Disaster Alert and Coordination System (GDACS) and WMO standards.</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline">[WMO STANDARDS]</span>
        </div>

        {/* Hazard Classifications Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-2 text-rose-400 font-semibold">
              <ShieldAlert className="h-4 w-4" />
              GLOBAL SEVERE EVENT CATEGORIES & AI ADVISORIES
            </span>
            <span className="text-slate-500">SELECT TO QUERY PROTOCOLS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {alertCategories.map((ev, idx) => {
              const Icon = ev.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleLaunchAdvisory(ev.prompt)}
                  className="group p-5 rounded-2xl glass-card border border-slate-800 hover:border-cyan-500/50 text-left transition-all duration-200 flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                        {ev.type}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                        Explore →
                      </span>
                    </div>

                    <div className="flex items-start gap-2.5 mt-2">
                      <div className="p-2 rounded-lg bg-slate-800/90 text-cyan-400 shrink-0">
                        <Icon className={`h-5 w-5 ${ev.color}`} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white leading-snug group-hover:text-cyan-300 transition-colors">
                          {ev.basin}
                        </h4>
                        <span className="text-[11px] font-mono text-cyan-300 block mt-1">
                          Threshold: {ev.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
                    <span>Key Factor: {ev.metric}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Official Early Warning Portals Links */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <h4 className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Official International Early Warning Portals:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { name: 'Global Disaster Alert and Coordination (GDACS)', url: 'https://www.gdacs.org/' },
              { name: 'WMO Severe Weather Information Centre', url: 'https://severeweather.wmo.int/' },
              { name: 'National Hurricane Center (NOAA NHC)', url: 'https://www.nhc.noaa.gov/' },
            ].map((p, pIdx) => (
              <a
                key={pIdx}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-cyan-950/20 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all"
              >
                <span className="truncate mr-2">{p.name}</span>
                <ExternalLink className="h-3 w-3 opacity-70 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default DisasterMonitorPage;
