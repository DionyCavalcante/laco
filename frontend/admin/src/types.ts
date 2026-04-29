export type AstraiThemeName = 'mixed' | 'dark' | 'light' | 'terminal';

export interface AstraiTheme {
  id: AstraiThemeName;
  bgMain: string;
  bgSidebar: string;
  bgCard: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  border: string;
  isTerminal?: boolean;
}

export const THEMES: Record<AstraiThemeName, AstraiTheme> = {
  mixed: {
    id: 'mixed',
    bgMain: 'bg-[#0B1F2A]',
    bgSidebar: 'bg-[#08171F]',
    bgCard: 'bg-[#0E2836]',
    textPrimary: 'text-[#FAFAF7]',
    textSecondary: 'text-[#F5F5F2]/50',
    accent: 'text-[#C9A96E]',
    border: 'border-white/10',
  },
  dark: {
    id: 'dark',
    bgMain: 'bg-[#000000]',
    bgSidebar: 'bg-[#0A0A0A]',
    bgCard: 'bg-[#111111]',
    textPrimary: 'text-zinc-100',
    textSecondary: 'text-zinc-600',
    accent: 'text-sky-400',
    border: 'border-white/5',
  },
  light: {
    id: 'light',
    bgMain: 'bg-zinc-50',
    bgSidebar: 'bg-white',
    bgCard: 'bg-zinc-100',
    textPrimary: 'text-zinc-900',
    textSecondary: 'text-zinc-500',
    accent: 'text-blue-600',
    border: 'border-zinc-200',
  },
  terminal: {
    id: 'terminal',
    bgMain: 'bg-[#050D05]',
    bgSidebar: 'bg-[#020802]',
    bgCard: 'bg-[#081508]',
    textPrimary: 'text-green-500',
    textSecondary: 'text-green-900',
    accent: 'text-green-400',
    border: 'border-green-900/30',
    isTerminal: true,
  },
};
