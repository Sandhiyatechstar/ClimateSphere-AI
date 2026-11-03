import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'cyan' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles = {
    primary:
      'bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-700 shadow-sm border border-navy-700',
    secondary:
      'bg-slate-100 text-navy-800 hover:bg-slate-200 focus:ring-slate-300 border border-slate-200',
    cyan:
      'bg-cyanAccent-500 text-navy-950 font-semibold hover:bg-cyanAccent-400 focus:ring-cyanAccent-400 shadow-sm hover:shadow-cyanGlow',
    outline:
      'border border-slate-300 bg-white text-navy-800 hover:bg-slate-50 hover:border-slate-400 focus:ring-cyanAccent-400',
    ghost:
      'text-slate-600 hover:text-navy-900 hover:bg-slate-100 focus:ring-slate-300',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
