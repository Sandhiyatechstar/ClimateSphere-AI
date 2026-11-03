import React from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'cyan' | 'blue' | 'navy' | 'emerald' | 'amber' | 'rose' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'cyan',
  size = 'md',
  dot = false,
  className,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    cyan: 'bg-cyanAccent-500/10 text-cyanAccent-600 border border-cyanAccent-500/20',
    blue: 'bg-brand-500/10 text-brand-600 border border-brand-500/20',
    navy: 'bg-navy-900/10 text-navy-800 border border-navy-700/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    neutral: 'bg-slate-100 text-slate-600 border border-slate-200',
  };

  const dotColors: Record<BadgeVariant, string> = {
    cyan: 'bg-cyanAccent-500',
    blue: 'bg-brand-500',
    navy: 'bg-navy-700',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    neutral: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full transition-colors',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotColors[variant])} />}
      {children}
    </span>
  );
};
