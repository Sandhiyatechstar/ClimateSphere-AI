import React from 'react';
import { Card } from './Card';
import { Badge, BadgeVariant } from './Badge';
import { cn } from '../../utils/cn';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: React.ReactNode;
  badgeLabel?: string;
  badgeVariant?: BadgeVariant;
  className?: string;
  isPlaceholder?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  badgeLabel = 'Placeholder',
  badgeVariant = 'neutral',
  className,
  isPlaceholder = true,
}) => {
  return (
    <Card
      hoverEffect
      className={cn('flex flex-col justify-between p-4 bg-white border-slate-200/90', className)}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-navy-50 text-brand-600 border border-slate-100">
            {icon}
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        {badgeLabel && (
          <Badge size="sm" variant={badgeVariant}>
            {badgeLabel}
          </Badge>
        )}
      </div>

      <div className="my-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-navy-900">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-mono text-slate-500 font-medium">
              {unit}
            </span>
          )}
        </div>
        {subtext && (
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            {subtext}
          </p>
        )}
      </div>

      {isPlaceholder && (
        <div className="pt-2 mt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>SOURCE: UNBOUND</span>
          <span className="text-cyanAccent-600 font-medium">READY FOR FEED</span>
        </div>
      )}
    </Card>
  );
};
