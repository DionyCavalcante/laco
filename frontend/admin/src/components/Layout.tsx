import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ScreenContainer from './ScreenContainer';

const PAGE_TITLES: Record<string, string> = {
  '/':         'Dashboard',
  '/leads':    'Clientes',
  '/agenda':   'Agenda',
  '/ia':       'Atendimento',
  '/settings': 'Configurações',
};

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<'mixed' | 'light'>('mixed');
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] ?? 'Astrai';

  const isLight = theme === 'light';
  const bgMain = isLight ? '#f5f4f0' : '#0B1F2A';

  return (
    <div className="min-h-screen" style={{ background: bgMain }}>
      <Sidebar
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed(!isCollapsed)}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'mixed' ? 'light' : 'mixed')}
      />

      <div
        className="transition-all duration-300"
        style={{ marginLeft: isCollapsed ? 60 : 220 }}
      >
        <ScreenContainer title={title} theme={theme} />

        <main className="px-6 py-6 max-w-[1200px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
