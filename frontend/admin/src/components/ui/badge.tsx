import * as React from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  default: 'bg-primary-soft text-primary',
  secondary: 'bg-surface-muted text-text-secondary border border-border',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  outline: 'border border-border text-text-secondary',
} as const;

export interface BadgeProps {
  variant?: keyof typeof variantStyles;
  className?: string;
  children?: React.ReactNode;
}

function Badge({ className, variant = 'default', children }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 text-[11px] font-medium transition-colors',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </div>
  );
}

export { Badge };
