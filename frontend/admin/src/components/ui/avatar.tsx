import * as React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

const sizeMap = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

function Avatar({ className, size = 'md', children }: AvatarProps) {
  return (
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-semibold overflow-hidden',
        sizeMap[size],
        className
      )}
    >
      {children}
    </div>
  );
}

function AvatarImage({ src, alt, className }: { src: string; alt?: string; className?: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn('aspect-square h-full w-full object-cover', className)}
    />
  );
}

function AvatarFallback({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('flex items-center justify-center', className)}>
      {children}
    </span>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
