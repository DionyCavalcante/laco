import * as React from 'react';
import { cn } from '../../lib/utils';

interface ToggleGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function ToggleGroup({ value, onValueChange, children, className }: ToggleGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[var(--radius-md)] border border-border bg-surface-muted p-0.5',
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement<ToggleGroupItemProps>(child)) {
          return React.cloneElement(child, {
            'data-state': child.props.value === value ? 'on' : 'off',
            onClick: () => onValueChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
}

interface ToggleGroupItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  'data-state'?: 'on' | 'off';
}

const ToggleGroupItem = React.forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium transition-colors rounded-[calc(var(--radius-md)-2px)] cursor-pointer',
        props['data-state'] === 'on'
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-text-secondary hover:text-text-primary',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
ToggleGroupItem.displayName = 'ToggleGroupItem';

export { ToggleGroup, ToggleGroupItem };
