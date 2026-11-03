import React from 'react';
import {
  Thermometer,
  Gauge,
  Droplets,
  Wind,
  Sun,
  Activity,
  Compass,
  Radar,
  ArrowUpRight,
  ExternalLink,
  Bot,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWeather } from '../hooks/useWeather';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/common/Card';
import { StatCard } from '../components/common/StatCard';
import { PlaceholderNotice } from '../components/common/PlaceholderNotice';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatCoordinates } from '../utils/formatters';

export const DashboardPage: React.FC = () => {
  const { selectedStation, units } = useWeather();

  const tempUnitSymbol = units.temperature === 'celsius' ? '°C' : '°F';

  return (
    <div className="space-y-6">
      {/* Top Banner: Scientific Station Context & API Placeholder Disclaimer */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 text-white shadow-card border border-navy-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="cyan" size="sm" dot>
              MONITORING STATION
            </Badge>
            <span className="text-xs text-slate-400 font-mono">
              ELEVATION: {selectedStation.elevation}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            {selectedStation.name}
          </h1>
          <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-cyanAccent-400" />
            <span>
              Coordinates: {formatCoordinates(selectedStation.coordinates.latitude, selectedStation.coordinates.longitude)}
            </span>
            <span className="text-slate-600">|</span>
            <span>Region: {selectedStation.region}, {selectedStation.country}</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/chat">
            <Button variant="cyan" size="sm">
              <Bot className="h-4 w-4" />
              <span>Query Station with AI</span>
            </Button>
          </Link>
          <Link to="/stations">
            <Button variant="secondary" size="sm" className="bg-navy-800 text-white border-navy-700 hover:bg-navy-700">
              <span>Change Station</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Global Architectural Integration Notice */}
      <PlaceholderNotice
        title="Live Meteorological API Gateway Standby"
        description="Atmospheric telemetry feeds (ECMWF, NOAA GFS, Copernicus ERA5) are ready for endpoint connection. All sensor outputs below display architectural placeholders per initial foundation requirements."
        endpoint="/v1/telemetry/station/current"
      />

      {/* Atmospheric Telemetry Metrics Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-900 font-mono flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyanAccent-600" />
            Real-Time Atmospheric Metrics (Placeholder Grid)
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            REFRESH: STANDBY
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Surface Temperature"
            value="--"
            unit={tempUnitSymbol}
            subtext="Awaiting thermal sensor stream"
            icon={<Thermometer className="h-5 w-5 text-brand-600" />}
            badgeLabel="Sensor Offline"
            badgeVariant="neutral"
            isPlaceholder
          />

          <StatCard
            label="Atmospheric Pressure"
            value="---"
            unit={units.pressure.toUpperCase()}
            subtext="Barometric altimeter feed standby"
            icon={<Gauge className="h-5 w-5 text-cyanAccent-600" />}
            badgeLabel="Pending Cal"
            badgeVariant="neutral"
            isPlaceholder
          />

          <StatCard
            label="Relative Humidity"
            value="--"
            unit="%"
            subtext="Hygrometric sensor feed standby"
            icon={<Droplets className="h-5 w-5 text-brand-600" />}
            badgeLabel="Sensor Standby"
            badgeVariant="neutral"
            isPlaceholder
          />

          <StatCard
            label="Wind Vector & Gusts"
            value="--.-"
            unit={units.windSpeed.toUpperCase()}
            subtext="Anemometer azimuth unmapped"
            icon={<Wind className="h-5 w-5 text-cyanAccent-600" />}
            badgeLabel="Vector Standby"
            badgeVariant="neutral"
            isPlaceholder
          />

          <StatCard
            label="Solar Irradiance / UV"
            value="-"
            unit="UV Index"
            subtext="Pyranometer sensor unmapped"
            icon={<Sun className="h-5 w-5 text-amber-500" />}
            badgeLabel="Photometric Standby"
            badgeVariant="neutral"
            isPlaceholder
          />

          <StatCard
            label="Air Quality Index"
            value="--"
            unit="AQI (PM2.5 / PM10)"
            subtext="Aerosol spectrometer unmapped"
            icon={<Activity className="h-5 w-5 text-emerald-600" />}
            badgeLabel="Awaiting Feed"
            badgeVariant="neutral"
            isPlaceholder
          />
        </div>
      </div>

      {/* Main Grid: Radar/Map Placeholder & AI Assistant Quick Dispatch */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Global Satellite & Radar Map Viewport (Placeholder) */}
        <Card accentTop className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radar className="h-4 w-4 text-cyanAccent-600" />
                  Atmospheric Radar & Cloud Coverage (Placeholder)
                </CardTitle>
                <CardDescription>
                  Geostationary satellite projection and doppler radar imagery feed.
                </CardDescription>
              </div>
              <Badge variant="cyan" size="sm" dot>
                GIS Engine Ready
              </Badge>
            </CardHeader>

            {/* Radar Viewport Placeholder Canvas */}
            <div className="relative h-64 sm:h-80 w-full rounded-lg bg-navy-950 border border-navy-800 overflow-hidden flex flex-col items-center justify-center text-center p-6">
              {/* Radar Grid Lines SVG Background */}
              <div className="absolute inset-0 opacity-20 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full border border-cyanAccent-400" />
                <div className="absolute w-32 h-32 sm:w-44 sm:h-44 rounded-full border border-cyanAccent-400/60" />
                <div className="absolute w-16 h-16 sm:w-24 sm:h-24 rounded-full border border-cyanAccent-400/40" />
                <div className="absolute inset-x-0 h-px bg-cyanAccent-400/40 top-1/2" />
                <div className="absolute inset-y-0 w-px bg-cyanAccent-400/40 left-1/2" />
              </div>

              {/* Center Radar Scanner Sweep Simulation */}
              <div className="relative z-10 space-y-3 max-w-sm">
                <div className="mx-auto w-12 h-12 rounded-xl bg-cyanAccent-500/10 border border-cyanAccent-500/30 flex items-center justify-center text-cyanAccent-400 shadow-cyanGlow">
                  <Radar className="h-6 w-6 animate-spin text-cyanAccent-400" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">
                    Synoptic Weather Map Standby
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Mapbox / Leaflet GL layers ready for integration with NOAA NEXRAD and Copernicus satellite raster feeds.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-navy-900 border border-navy-800 text-xs font-mono text-cyanAccent-300">
                  <span>PROJECTION: WGS 84 / EPSG:4326</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Layers: Isobars, Precipitation, Wind Barbs</span>
            <span className="font-mono text-cyanAccent-600 font-medium">GIS Engine: Unloaded</span>
          </div>
        </Card>

        {/* Right Col: ClimateSphere AI Assistant Quick Launcher */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyanAccent-600" />
                  ClimateSphere AI
                </CardTitle>
                <CardDescription>
                  Conversational meteorological research copilot.
                </CardDescription>
              </div>
              <Badge variant="blue" size="sm">
                Chatbot
              </Badge>
            </CardHeader>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Ask scientific questions regarding atmospheric dynamics, extreme climate events, or station telemetry anomalies.
              </p>

              <div className="space-y-2 pt-2">
                <span className="text-[11px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
                  Suggested Queries
                </span>

                <Link
                  to="/chat"
                  className="block p-2.5 rounded-lg bg-slate-50 hover:bg-cyanAccent-50/50 border border-slate-200 hover:border-cyanAccent-300 text-slate-700 hover:text-navy-950 transition-colors group"
                >
                  <p className="font-medium group-hover:text-cyanAccent-700">
                    "Analyze polar vortex oscillation patterns"
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Atmospheric Dynamics →
                  </span>
                </Link>

                <Link
                  to="/chat"
                  className="block p-2.5 rounded-lg bg-slate-50 hover:bg-cyanAccent-50/50 border border-slate-200 hover:border-cyanAccent-300 text-slate-700 hover:text-navy-950 transition-colors group"
                >
                  <p className="font-medium group-hover:text-cyanAccent-700">
                    "Explain ENSO phase indices for this quarter"
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Climate Oscillation →
                  </span>
                </Link>

                <Link
                  to="/chat"
                  className="block p-2.5 rounded-lg bg-slate-50 hover:bg-cyanAccent-50/50 border border-slate-200 hover:border-cyanAccent-300 text-slate-700 hover:text-navy-950 transition-colors group"
                >
                  <p className="font-medium group-hover:text-cyanAccent-700">
                    "Evaluate atmospheric river moisture flux"
                  </p>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Hydrometeorology →
                  </span>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <Link to="/chat" className="w-full">
              <Button variant="primary" className="w-full" size="sm">
                <span>Launch Full Research Assistant</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};
