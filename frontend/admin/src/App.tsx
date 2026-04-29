import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ScreenContainer } from './components/ScreenContainer';
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Leads from './pages/Leads';
import IA from './pages/IA';
import Settings from './pages/Settings';
import { AstraiThemeName, THEMES } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Settings2 } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [activeScreen, setActiveScreen] = useState('dashboard');
  const [themeName, setThemeName] = useState<AstraiThemeName>('light');
  const [collapsed, setCollapsed] = useState(false);

  const theme = THEMES[themeName];

  useEffect(() => {
    document.body.className = theme.bgMain;
  }, [theme]);

  const getTitle = () => ({
    dashboard: 'Dashboard',
    agenda: 'Agenda',
    leads: 'Clientes',
    ia: 'Atendimento',
    settings: 'Configurações',
  }[activeScreen] || 'Astrai');

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard': return <Dashboard theme={theme} />;
      case 'agenda':    return <Agenda theme={theme} />;
      case 'leads':     return <Leads theme={theme} />;
      case 'ia':        return <IA theme={theme} />;
      case 'settings':  return <Settings theme={theme} />;
      default:          return <Dashboard theme={theme} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {theme.isTerminal && <div className="scan-overlay" />}

      <Sidebar
        active={activeScreen}
        setActive={setActiveScreen}
        theme={theme}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onThemeChange={(name) => setThemeName(name)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeScreen + themeName}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="flex-1 flex flex-col min-w-0 h-full"
          >
            <ScreenContainer title={getTitle()} theme={theme}>
              {renderScreen()}
            </ScreenContainer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
