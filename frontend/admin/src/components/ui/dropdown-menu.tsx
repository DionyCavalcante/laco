import * as React from 'react';
import { cn } from '../../lib/utils';

interface DropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';
}

function DropdownMenu({ trigger, children, align = 'end' }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-1 top-full min-w-[160px] rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
            align === 'end' ? 'right-0' : 'left-0'
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

const DropdownMenuItem = React.forwardRef<HTMLButtonElement, DropdownMenuItemProps>(
  ({ className, destructive, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] transition-colors cursor-pointer',
        destructive
          ? 'text-danger hover:bg-danger-soft'
          : 'text-text-primary hover:bg-surface-hover',
        className
      )}
      {...props}
    />
  )
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

function DropdownMenuSeparator() {
  return <div className="my-1 h-[1px] bg-border-light" />;
}

export { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator };
