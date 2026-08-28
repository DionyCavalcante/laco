import React from 'react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import { Search, Bell, User } from 'lucide-react';

interface ScreenContainerProps {
  title: string;
  theme: AstraiTheme;
  children: React.ReactNode;
}

export function ScreenContainer({ title, theme, children }: ScreenContainerProps) {
  const useNewDS = theme.id === 'light';

  /* ───────────────────────────────────────────────
     Novo Design System (light)
     ─────────────────────────────────────────────── */
  if (useNewDS) {
    return (
      <div className="flex-1 flex flex-col min-w-0 h-full bg-background">
        {/* Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-border bg-surface shrink-0">
          <h1 className="font-display text-lg font-bold text-text-primary">
            {title}
          </h1>

          <div className="flex items-center gap-4">
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-text-secondary transition-colors" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="py-1.5 pl-9 pr-4 rounded-[var(--radius-md)] text-[13px] border border-border bg-surface-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all w-52"
              />
            </div>

            <button className="relative text-text-muted hover:text-text-primary transition-colors p-1">
              <Bell className="w-[18px] h-[18px]" />
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-danger rounded-full" />
            </button>

            <div className="w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all">
              <User className="w-4 h-4 text-primary" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    );
  }

  /* ───────────────────────────────────────────────
     Tema legado (mixed / dark / terminal)
     ─────────────────────────────────────────────── */
  return (
    <div className={cn('flex-1 flex flex-col min-w-0 h-full', theme.bgMain)}>
      {/* Header */}
      <header className={cn('h-16 px-8 flex items-center justify-between border-b shrink-0', theme.border)}>
        <h1 className={cn('font-display text-2xl font-bold', theme.textPrimary)}>
          {title}
        </h1>

        <div className="flex items-center gap-6">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
            <input
              type="text"
              placeholder="Pesquisar..."
              className={cn(
                'py-1.5 pl-10 pr-4 rounded-full text-sm border focus:outline-none transition-all w-56',
                theme.id === 'terminal' ? 'bg-black text-green-500 border-green-900 focus:border-green-500'
                  : 'bg-white/5 border-white/5 text-white focus:border-white/20'
              )}
            />
          </div>

          <button className={cn('transition-colors relative', 'text-zinc-500 hover:text-white')}>
            <Bell className="w-5 h-5" />
            <div className={cn(
              'absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2',
              theme.id === 'mixed' ? 'border-[#0B1F2A]' : 'border-[#0D0D0D]'
            )} />
          </button>

          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden cursor-pointer transition-colors',
            'bg-zinc-800 border-white/10 hover:border-astrai-gold/40'
          )}>
            <User className={cn('w-5 h-5',
              theme.id === 'mixed' ? 'text-astrai-gold' : 'text-zinc-500'
            )} />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
        {theme.id === 'mixed' && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.015] pointer-events-none">
            <svg width="600" height="600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-astrai-gold">
              <circle cx="12" cy="12" r="10" />
              <path d="m16.24 7.76-1.41 1.41" /><path d="m7.76 16.24-1.41 1.41" />
              <path d="m16.24 16.24-1.41-1.41" /><path d="m7.76 7.76-1.41-1.41" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v4" /><path d="M12 18v4" /><path d="M2 12h4" /><path d="M18 12h4" />
            </svg>
          </div>
        )}
        <div className="h-full relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
