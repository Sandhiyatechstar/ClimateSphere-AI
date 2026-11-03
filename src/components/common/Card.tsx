import React, { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accentTop?: boolean;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  accentTop = false,
  hoverEffect = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        'relative bg-white border border-slate-200/80 rounded-xl shadow-subtle p-5 overflow-hidden transition-all duration-200',
        hoverEffect && 'hover:shadow-card hover:border-slate-300',
        className
      )}
      {...props}
    >
      {accentTop && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyanAccent-500 via-brand-500 to-navy-700" />
      )}
      {children}
    </div>
  );
};

export const CardHeader: React.FC<HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('flex items-center justify-between pb-3 border-b border-slate-100 mb-4', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 className={cn('text-base font-semibold text-navy-900 tracking-tight', className)} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => (
  <p className={cn('text-xs text-slate-500 mt-0.5', className)} {...props}>
    {children}
  </p>
);
