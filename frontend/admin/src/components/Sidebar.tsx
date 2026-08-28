import React from 'react';
import {
  LayoutDashboard, Calendar, Users, Contact, Settings,
  ChevronLeft, ChevronRight, Moon, Sun, HelpCircle, Search,
  LogOut,
} from 'lucide-react';
import logoIcon from '../assets/logo-icon.png';
import { cn } from '../lib/utils';
import { AstraiTheme, THEMES, AstraiThemeName } from '../types';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  active: string;
  setActive: (id: string) => void;
  theme: AstraiTheme;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onThemeChange: (theme: AstraiThemeName) => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'leads',     icon: Users,           label: 'Clientes' },
  { id: 'agenda',    icon: Calendar,        label: 'Agenda' },
  { id: 'ia',        icon: Contact,         label: 'Atendimento' },
  { id: 'settings',  icon: Settings,        label: 'Configurações' },
];


export function Sidebar({ active, setActive, theme, collapsed, onToggleCollapse, onThemeChange }: SidebarProps) {
  const { logout } = useAuth();
  const useNewDS = theme.id === 'light';

  /* ───────────────────────────────────────────────
     Novo Design System (light)
     ─────────────────────────────────────────────── */
  if (useNewDS) {
    return (
      <aside className={cn(
        'h-screen flex flex-col border-r border-border bg-surface transition-all duration-300 relative z-20',
        collapsed ? 'w-16' : 'w-[220px]'
      )}>
        {/* Brand */}
        <div className={cn('px-4 py-4 flex items-center gap-2.5 overflow-hidden', collapsed && 'justify-center px-2')}>
          <img
            src={logoIcon}
            alt="Astrai"
            className="shrink-0 w-8 h-8 object-contain"
          />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span
                className="text-text-primary tracking-[0.18em] leading-none"
                style={{ fontFamily: '"Cinzel", serif', fontSize: '14px', fontWeight: 600, letterSpacing: '0.2em' }}
              >
                ASTRAI
              </span>
              <span className="text-[9px] text-accent/60 font-mono uppercase tracking-[0.25em] mt-0.5">
                Admin
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {!collapsed && (
            <p className="text-[10px] font-semibold uppercase tracking-wider px-2.5 mb-2 text-text-muted">
              Gestão
            </p>
          )}
          {navItems.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] transition-all duration-150 group',
                  isActive
                    ? 'bg-primary-soft text-primary font-medium'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-colors',
                  isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'
                )} />
                {!collapsed && (
                  <span className="text-[13px] whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-border space-y-1">
          {!collapsed && (
            <button
              onClick={() => onThemeChange('mixed')}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              <Moon className="w-[18px] h-[18px] text-text-muted" />
              <span className="text-[13px]">Tema escuro</span>
            </button>
          )}

          <button
            onClick={onToggleCollapse}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            {collapsed
              ? <ChevronRight className="w-[18px] h-[18px] text-text-muted" />
              : (<><ChevronLeft className="w-[18px] h-[18px] text-text-muted" /><span className="text-[13px]">Recolher</span></>)
            }
          </button>

          {!collapsed && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[var(--radius-md)] text-text-secondary hover:text-danger hover:bg-danger-soft transition-colors"
            >
              <LogOut className="w-[18px] h-[18px] text-text-muted" />
              <span className="text-[13px]">Sair</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  /* ───────────────────────────────────────────────
     Tema legado (mixed / dark / terminal)
     ─────────────────────────────────────────────── */
  const isAstraiBrand = theme.id === 'mixed';

  return (
    <aside className={cn(
      'h-screen flex flex-col border-r transition-all duration-300 relative z-20',
      theme.bgSidebar,
      theme.border,
      collapsed ? 'w-20' : 'w-64'
    )}>
      {/* Brand */}
      <div className={cn('px-5 py-5 flex items-center gap-3 overflow-hidden', collapsed && 'justify-center')}>
        <img
          src={logoIcon}
          alt="Astrai"
          className="shrink-0 w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(201,169,110,0.5)]"
        />
        {!collapsed && (
          <div className="flex flex-col leading-none">
            <span
              className={cn('tracking-[0.18em] leading-none', 'text-white/90')}
              style={{ fontFamily: '"Cinzel", serif', fontSize: '15px', fontWeight: 600, letterSpacing: '0.2em' }}
            >
              ASTRAI
            </span>
            <span className="text-[9px] text-astrai-gold/60 font-mono uppercase tracking-[0.3em] mt-1">
              Admin
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {!collapsed && (
          <p className="text-[9px] font-black uppercase tracking-[0.3em] px-3 mb-3 opacity-30 font-mono" style={{ color: 'inherit' }}>
            Gestão
          </p>
        )}
        {navItems.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative',
                isActive
                  ? (isAstraiBrand
                      ? 'bg-astrai-gold/10 text-astrai-gold-bright'
                      : (theme.isTerminal ? 'bg-green-500/10 text-green-400'
                        : 'bg-white/5 text-white'))
                  : (theme.isTerminal
                      ? 'text-green-900/60 hover:text-green-500 hover:bg-green-500/5'
                      : 'text-zinc-500 hover:text-white hover:bg-white/5'),
                collapsed && 'justify-center'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 shrink-0 transition-colors',
                isActive
                  ? (isAstraiBrand ? 'text-astrai-gold' : (theme.isTerminal ? 'text-green-400' : 'text-white'))
                  : (theme.isTerminal ? 'text-green-900/60 group-hover:text-green-500' : 'text-zinc-500 group-hover:text-white')
              )} />
              {!collapsed && (
                <span className={cn('text-sm font-medium whitespace-nowrap', isActive && isAstraiBrand && 'font-bold')}>
                  {item.label}
                </span>
              )}
              {!collapsed && isActive && (
                <div className={cn(
                  'ml-auto w-1.5 h-1.5 rounded-full shrink-0',
                  isAstraiBrand ? 'bg-astrai-gold shadow-[0_0_8px_rgba(201,169,110,0.8)]'
                    : (theme.isTerminal ? 'bg-green-400' : 'bg-white')
                )} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={cn('px-4 py-6 border-t font-mono space-y-2', theme.border)}>
        {!collapsed && isAstraiBrand && (
          <div className="mb-4 px-2">
            <p className="text-[10px] text-astrai-gold/40 uppercase tracking-widest leading-relaxed">
              Inteligência que guia.<br />Resultados que transformam.
            </p>
          </div>
        )}

        {!collapsed && (
          <div className={cn('flex items-center justify-center mb-4 p-1 rounded-lg', 'bg-black/20')}>
            <button
              onClick={() => onThemeChange('light')}
              className="p-1.5 text-zinc-500 hover:text-white transition-colors"
              title="Alternar tema"
            >
              <Sun className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200',
            theme.isTerminal ? 'text-green-900 hover:text-green-500'
              : 'text-zinc-500 hover:text-white'
          )}
        >
          {collapsed
            ? <ChevronRight className="w-5 h-5 mx-auto" />
            : (<><ChevronLeft className="w-5 h-5" /><span className="text-sm font-medium">Recolher</span></>)
          }
        </button>

        {!collapsed && (
          <button
            onClick={logout}
            className={cn(
              'w-full text-left px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors',
              'text-zinc-600 hover:text-red-400'
            )}
          >
            Sair
          </button>
        )}
      </div>
    </aside>
  );
}
