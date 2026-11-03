import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe2, Flame, Waves, Snowflake, Wind, Activity, ArrowRight, BookOpen } from 'lucide-react';
import { ToolPageLayout } from '../../components/tools/ToolPageLayout';
import { useChatContext } from '../../context/ChatContext';

export const ClimateExplorerPage: React.FC = () => {
  const navigate = useNavigate();
  const { sendMessage } = useChatContext();

  const handleQueryScenario = (promptText: string) => {
    sendMessage(promptText);
    navigate('/');
  };

  const verifiedIndicators = [
    {
      label: 'Global Mean Temp Anomaly',
      val: '+1.15 °C',
      desc: 'Observed deviation vs 1850–1900 baseline',
      icon: Flame,
      color: 'text-rose-400',
      source: 'IPCC AR6 / NASA GISTEMP',
    },
    {
      label: 'Atmospheric CO₂ Baseline',
      val: '424.5 ppm',
      desc: 'Global monitoring laboratory benchmark',
      icon: Wind,
      color: 'text-amber-400',
      source: 'NOAA Mauna Loa Observatory',
    },
    {
      label: 'Ocean Heat Content Anomaly',
      val: '+345 ZJ',
      desc: 'Top 2,000m planetary thermal budget',
      icon: Waves,
      color: 'text-blue-400',
      source: 'NOAA NCEI / Argo Array',
    },
    {
      label: 'Arctic Sea Ice Minimum',
      val: '4.28 M km²',
      desc: 'Satellite microwave radiometer record',
      icon: Snowflake,
      color: 'text-cyan-400',
      source: 'National Snow & Ice Data Center (NSIDC)',
    },
  ];

  return (
    <ToolPageLayout
      title="Climate Explorer & Planetary Anomaly Tracker"
      category="Earth System Dynamics"
      description="Multidecadal global warming trajectories, greenhouse gas radiative forcing, and cryosphere indicators verified against IPCC AR6 and NASA GISTEMP observations."
      icon={Globe2}
      badge="IPCC & NASA Benchmarks"
      aiSuggestedPrompt="Compare CMIP6 climate projection scenarios SSP1-2.6 and SSP5-8.5 and explain their temperature outcomes."
    >
      <div className="space-y-6">
        {/* Verified Scientific Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {verifiedIndicators.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="p-4 rounded-xl glass-card border border-slate-800 space-y-2 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-white">{item.val}</div>
                <p className="text-[11px] text-slate-400 font-mono">{item.desc}</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-cyan-400">
                  <span>{item.source}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multidecadal Anomaly Chart Container */}
        <div className="p-6 rounded-2xl glass-card border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-cyan-400" />
                Global Surface Temperature Anomaly Progression (1880 – Present)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Observed deviation relative to the 1951–1980 baseline. Grounded in NASA GISTEMP and Copernicus ERA5 reanalysis.
              </p>
            </div>
            <span className="text-xs font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 self-start sm:self-auto">
              [CONSENSUS DATASET]
            </span>
          </div>

          <div className="h-60 w-full rounded-xl bg-slate-900/80 border border-slate-800 p-4 flex flex-col justify-between relative overflow-hidden">
            <div className="flex justify-between text-xs font-mono text-slate-400">
              <span className="text-rose-400 font-semibold">• Observed Historical Anomaly</span>
              <span>Range: -0.4°C to +1.2°C</span>
            </div>

            {/* SVG Trend Line */}
            <div className="relative h-28 w-full flex items-center">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 100">
                <path
                  d="M0,85 Q80,82 160,78 T320,58 T440,28 L500,12"
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="3.5"
                />
                <circle cx="500" cy="12" r="4" fill="#22d3ee" className="animate-ping" />
                <circle cx="500" cy="12" r="3" fill="#22d3ee" />
              </svg>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
              <span>1880 (-0.2°C)</span>
              <span>1920 (-0.1°C)</span>
              <span>1960 (+0.0°C)</span>
              <span>2000 (+0.4°C)</span>
              <span className="text-cyan-300 font-bold">Present (+1.15°C)</span>
            </div>
          </div>
        </div>

        {/* Interactive Scenario Explorer */}
        <div className="p-5 rounded-2xl glass-card border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-semibold">
            <BookOpen className="h-4 w-4" />
            <span>EXPLORE IPCC AR6 EMISSIONS SCENARIOS WITH AI:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                title: 'Scenario SSP1-2.6',
                desc: 'Strong mitigation limiting warming near 1.5°C to 1.8°C.',
                prompt: 'Explain IPCC AR6 scenario SSP1-2.6: key assumptions, emissions trajectory, and projected impacts.',
              },
              {
                title: 'Scenario SSP2-4.5',
                desc: 'Intermediate emissions scenario with warming near 2.7°C by 2100.',
                prompt: 'Summarize IPCC scenario SSP2-4.5: expected warming, sea level rise, and regional impacts.',
              },
              {
                title: 'Scenario SSP5-8.5',
                desc: 'High-emissions baseline scenario evaluating severe climate risks.',
                prompt: 'What are the physical implications of high-emissions scenario SSP5-8.5 according to IPCC AR6?',
              },
            ].map((sc, idx) => (
              <button
                key={idx}
                onClick={() => handleQueryScenario(sc.prompt)}
                className="group flex flex-col justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-cyan-950/30 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
              >
                <div>
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 font-mono block">
                    {sc.title}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                    {sc.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-cyan-400">
                  <span>Analyze with AI</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default ClimateExplorerPage;
