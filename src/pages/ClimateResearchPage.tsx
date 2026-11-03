import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart as ChartIcon,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { ToolPageLayout } from '../components/tools/ToolPageLayout';
import { useChatContext } from '../context/ChatContext';

export const ClimateResearchPage: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage } = useChatContext();

  const handleLaunchResearch = (promptText: string) => {
    sendMessage(promptText);
    navigate('/');
  };

  const researchTopics = [
    {
      title: 'AMOC Circulation Stability',
      tag: 'Ocean Dynamics',
      desc: 'Subpolar freshwater influx, AMOC strength decline, and potential tipping points.',
      prompt: 'Summarize the latest findings on Atlantic Meridional Overturning Circulation (AMOC) stability.',
    },
    {
      title: 'Cryosphere & Sea Level Rise',
      tag: 'Polar Physics',
      desc: 'Greenland and Antarctic ice sheet mass loss, grounding-line retreat, and coastal projections.',
      prompt: 'What does the IPCC AR6 state regarding Greenland and West Antarctic ice sheet stability and sea level rise?',
    },
    {
      title: 'Ocean Heat Content & Acidification',
      tag: 'Marine Chemistry',
      desc: 'Planetary energy imbalance, upper-ocean thermal uptake, and carbonate saturation states.',
      prompt: 'Explain the mechanisms of ocean heat uptake and ocean acidification resulting from anthropogenic CO2.',
    },
    {
      title: 'Radiative Forcing & Equilibrium Sensitivity',
      tag: 'Atmospheric Physics',
      desc: 'Effective radiative forcing, aerosol cooling offsets, and Equilibrium Climate Sensitivity (ECS) ranges.',
      prompt: 'Explain Equilibrium Climate Sensitivity (ECS) and its assessed range (2.5°C to 4.0°C) in IPCC AR6.',
    },
  ];

  return (
    <ToolPageLayout
      title="Climate Science & Research Repositories"
      category="Planetary Anomalies & Research"
      description="Copernicus ERA5 reanalysis datasets, oceanic heat budgets, greenhouse gas anomalies, and peer-reviewed climate bulletins."
      icon={ChartIcon}
      badge="IPCC & Copernicus Hub"
      aiSuggestedPrompt="Summarize the latest findings on Atlantic Meridional Overturning Circulation (AMOC) stability."
    >
      <div className="space-y-6">
        {/* Research Gateway Notice */}
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-xs font-mono text-cyan-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Grounded in IPCC Sixth Assessment Report (AR6), NASA Climate, NOAA, and Copernicus ERA5 bulletins.</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold hidden sm:inline">[PEER-REVIEWED CONSENSUS]</span>
        </div>

        {/* 4 Research Deep-Dive Modules */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span className="flex items-center gap-2 text-cyan-400 font-semibold">
              <BookOpen className="h-4 w-4" />
              PEER-REVIEWED RESEARCH INQUIRY MODULES
            </span>
            <span className="text-slate-500">SELECT TO EXPLORE WITH AI</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {researchTopics.map((topic, idx) => (
              <button
                key={idx}
                onClick={() => handleLaunchResearch(topic.prompt)}
                className="group p-5 rounded-2xl glass-card border border-slate-800 hover:border-cyan-500/50 text-left transition-all duration-200 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {topic.tag}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                      Query AI →
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 font-mono transition-colors">
                    {topic.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {topic.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="text-cyan-400/90 truncate mr-2">"{topic.prompt}"</span>
                  <ArrowRight className="h-4 w-4 text-cyan-400 group-hover:translate-x-1 transition-transform shrink-0" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Official Literature Repositories Links */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <h4 className="text-xs font-mono text-slate-300 font-semibold uppercase tracking-wider">
            Primary Scientific Gateways & Consensus Portals:
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'IPCC AR6 Reports', url: 'https://www.ipcc.ch/assessment-report/ar6/' },
              { name: 'Copernicus Climate Service', url: 'https://climate.copernicus.eu/' },
              { name: 'NASA Global Climate Change', url: 'https://climate.nasa.gov/' },
              { name: 'NOAA Climate.gov', url: 'https://www.climate.gov/' },
            ].map((gate, gIdx) => (
              <a
                key={gIdx}
                href={gate.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-cyan-950/20 border border-slate-800 hover:border-cyan-500/40 text-xs font-mono text-slate-300 hover:text-cyan-300 transition-all"
              >
                <span>{gate.name}</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ClimateResearchPage;
