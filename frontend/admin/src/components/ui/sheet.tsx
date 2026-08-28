import * as React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ open, onOpenChange, children }: SheetProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </>
  );
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'left' | 'right';
  onClose?: () => void;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, side = 'right', onClose, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'fixed z-50 flex flex-col bg-surface border-border shadow-[0_4px_16px_rgba(0,0,0,0.12)] h-full top-0 w-[380px] transition-transform duration-300',
        side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
        className
      )}
      {...props}
    >
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-[var(--radius-sm)] p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {children}
    </div>
  )
);
SheetContent.displayName = 'SheetContent';

const SheetHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-6 py-4 border-b border-border bg-primary text-primary-foreground',
      className
    )}
    {...props}
  />
));
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-base font-semibold', className)}
    {...props}
  />
));
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm opacity-80', className)}
    {...props}
  />
));
SheetDescription.displayName = 'SheetDescription';

const SheetBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto p-6', className)}
    {...props}
  />
));
SheetBody.displayName = 'SheetBody';

const SheetFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center justify-end gap-3 px-6 py-4 border-t border-border',
      className
    )}
    {...props}
  />
));
SheetFooter.displayName = 'SheetFooter';

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetBody, SheetFooter };
