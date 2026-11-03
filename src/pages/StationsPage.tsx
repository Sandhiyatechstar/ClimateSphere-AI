import React from 'react';
import {
  MapPin,
  Globe2,
  Compass,
  CheckCircle2,
  Clock,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { useWeather } from '../hooks/useWeather';
import { ToolPageLayout } from '../components/tools/ToolPageLayout';
import { PlaceholderNotice } from '../components/common/PlaceholderNotice';
import { formatCoordinates } from '../utils/formatters';

export const StationsPage: React.FC = () => {
  const { stations, selectedStation, setSelectedStation } = useWeather();

  return (
    <ToolPageLayout
      title="Global Monitoring Stations & Observatories"
      category="Surface & Atmospheric Network"
      description="Reference atmospheric observation networks and high-altitude research facilities."
      icon={Globe2}
      aiSuggestedPrompt="What are the primary atmospheric telemetry instruments stationed at Mauna Loa?"
    >
      <div className="space-y-6">
        <PlaceholderNotice
          title="Station Telemetry Link Notice"
          description="Hardware telemetry streaming protocols (MQTT / WebSocket / REST) are mapped for each station. Station status entries reflect architectural demonstration states."
          endpoint="/v1/stations/network"
        />

        {/* Stations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stations.map((station) => {
            const isSelected = selectedStation.id === station.id;

            return (
              <div
                key={station.id}
                className={`p-5 rounded-2xl glass-card transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-400/20 shadow-cyanGlow'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2.5 rounded-xl shrink-0 ${
                          isSelected
                            ? 'bg-cyan-500 text-slate-950 font-bold'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white">
                            {station.name}
                          </h3>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                              Active Context
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          ID: {station.id}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                        station.status === 'online'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : station.status === 'calibrating'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {station.status}
                    </span>
                  </div>

                  {/* Station Specs */}
                  <div className="grid grid-cols-2 gap-3 py-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800 my-3 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Coordinates
                      </span>
                      <span className="font-semibold text-slate-200 text-[11px] flex items-center gap-1 mt-0.5">
                        <Compass className="h-3 w-3 text-cyan-400" />
                        {formatCoordinates(
                          station.coordinates.latitude,
                          station.coordinates.longitude
                        )}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Elevation
                      </span>
                      <span className="font-semibold text-slate-200 text-[11px] mt-0.5 block">
                        {station.elevation}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Geographic Region
                      </span>
                      <span className="font-medium text-slate-300 text-[11px] mt-0.5 block truncate">
                        {station.region}, {station.country}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                        Telemetry Link
                      </span>
                      <span className="font-medium text-slate-300 text-[11px] mt-0.5 flex items-center gap-1">
                        <Radio className="h-3 w-3 text-cyan-400" />
                        {station.lastPing || 'Active'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Selection Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Interval: 60s
                  </span>

                  {isSelected ? (
                    <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 font-mono">
                      <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                      SELECTED OBSERVATORY
                    </span>
                  ) : (
                    <button
                      onClick={() => setSelectedStation(station)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-mono transition-all"
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      <span>Set Active</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ToolPageLayout>
  );
};

export default StationsPage;
