import * as React from 'react';
import { cn } from '../../lib/utils';
import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
}

function PageHeader({ icon: Icon, iconColor, title, subtitle, children, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn('w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center', iconColor || 'bg-primary-soft')}>
            <Icon className="w-[18px] h-[18px] text-primary" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-display font-bold text-text-primary">{title}</h1>
          {subtitle && (
            <p className="text-[13px] text-text-secondary mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}

export { PageHeader };
