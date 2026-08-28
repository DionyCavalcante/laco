import * as React from 'react';
import { cn } from '../../lib/utils';
import { type LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  category?: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  valueColor?: string;
  className?: string;
}

function StatCard({
  label,
  category,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBg,
  trend,
  valueColor,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-[var(--radius-lg)] p-5 transition-colors',
        className
      )}
    >
      {/* Header: label + category badge */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
          {label}
        </span>
        {category && (
          <span className="text-[10px] font-medium text-text-muted bg-surface-muted border border-border-light rounded-[var(--radius-sm)] px-1.5 py-0.5">
            {category}
          </span>
        )}
      </div>

      {/* Icon + Value */}
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('w-8 h-8 rounded-[var(--radius-md)] flex items-center justify-center', iconBg || 'bg-primary-soft')}>
            <Icon className={cn('w-4 h-4', iconColor || 'text-primary')} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold tabular-nums', valueColor || 'text-text-primary')}>
              {value}
            </span>
            {trend && (
              <span className={cn(
                'text-[11px] font-medium',
                trend.positive ? 'text-success' : 'text-danger'
              )}>
                {trend.positive ? '+' : ''}{trend.value}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[12px] text-text-muted mt-0.5 truncate">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { StatCard };
