import React from 'react';
import { Info, Satellite } from 'lucide-react';
import { cn } from '../../utils/cn';

interface PlaceholderNoticeProps {
  title?: string;
  description?: string;
  endpoint?: string;
  className?: string;
  compact?: boolean;
}

export const PlaceholderNotice: React.FC<PlaceholderNoticeProps> = ({
  title = 'API Integration Placeholder',
  description = 'Awaiting connection to real-time meteorological services (NOAA, ECMWF, Copernicus, Open-Meteo). Metrics shown are architectural mockups.',
  endpoint,
  className,
  compact = false,
}) => {
  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-mono',
          className
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-lg bg-cyanAccent-50/50 border border-cyanAccent-200/60 text-navy-900',
        className
      )}
    >
      <div className="p-1.5 rounded-md bg-white text-cyanAccent-600 shadow-xs border border-cyanAccent-100 shrink-0">
        <Satellite className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-navy-900 uppercase tracking-wider">
            {title}
          </h4>
          <span className="text-[10px] bg-cyanAccent-100 text-cyanAccent-800 px-1.5 py-0.2 rounded font-mono font-medium">
            STAGE: PENDING API BINDING
          </span>
        </div>
        <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
          {description}
        </p>
        {endpoint && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <Info className="h-3 w-3 text-cyanAccent-600" />
            <span>Target Endpoint: <code>{endpoint}</code></span>
          </div>
        )}
      </div>
    </div>
  );
};
