import * as React from 'react';
import { cn } from '../../lib/utils';

const variantStyles = {
  default: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm',
  destructive: 'bg-danger text-white hover:bg-danger/90 shadow-sm',
  outline: 'border border-border bg-surface hover:bg-surface-hover text-text-primary shadow-sm',
  secondary: 'bg-primary-soft text-primary hover:bg-primary-soft/80 shadow-sm',
  ghost: 'hover:bg-surface-hover text-text-secondary hover:text-text-primary',
  link: 'text-primary underline-offset-4 hover:underline',
} as const;

const sizeStyles = {
  default: 'h-9 px-4 py-2 rounded-[var(--radius-md)]',
  sm: 'h-8 px-3 text-xs rounded-[var(--radius-md)]',
  lg: 'h-10 px-6 rounded-[var(--radius-md)]',
  icon: 'h-9 w-9 rounded-[var(--radius-md)]',
} as const;

const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
