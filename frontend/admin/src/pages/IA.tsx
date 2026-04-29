import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import {
  MessageSquare, RotateCcw, ShieldCheck, CalendarCheck, TrendingUp,
  DollarSign, Star, Bot, ChevronRight, MoreHorizontal, ArrowUpRight,
} from 'lucide-react';
import { getLeadStats, getLeads, LeadStats } from '../services/leads';
import { getAppointmentStats, AppointmentStats } from '../services/appointments';

const AGENTS = [
  { label:'Vendas novos clientes',       active:true },
  { label:'Vendas clientes recorrentes', active:true },
  { label:'Recuperação de Vendas',       active:true },
  { label:'Agendamento',                 active:true },
  { label:'Remarcação',                  active:true },
  { label:'Suporte & Dúvidas',           active:false },
];

export default function IA({ theme }: { theme: AstraiTheme }) {
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [aptStats,  setAptStats]  = useState<AppointmentStats | null>(null);
  const [wppCount,  setWppCount]  = useState(0);
  const isLight = theme.id === 'light';

  useEffect(() => {
    Promise.all([getLeadStats(), getAppointmentStats(), getLeads({ source:'whatsapp' } as any)])
      .then(([ls, as, wpp]) => { setLeadStats(ls); setAptStats(as); setWppCount(wpp.length); })
      .catch(console.error);
  }, []);

  const faturamento = aptStats?.valor_realizado ?? 0;
  const totalLeads  = leadStats?.total   ?? 0;
  const scheduled   = leadStats?.scheduled ?? 0;
  const convRate    = wppCount > 0 ? ((scheduled/Math.max(totalLeads,1))*100).toFixed(1) : '0.0';

  const renderInsightCard = (title: string, value: string|number, icon: React.ReactNode, variant: 'gold'|'blue'|'emerald', sub?: string) => {
    const v = {
      gold:    { text:'text-astrai-gold',   bg:'bg-astrai-gold/15',   border:'border-astrai-gold/30',   shadow:'shadow-[0_15px_30px_-10px_rgba(201,169,110,0.2)]'  },
      blue:    { text:'text-sky-400',        bg:'bg-sky-400/15',        border:'border-sky-400/30',        shadow:'shadow-[0_15px_30px_-10px_rgba(56,189,248,0.15)]'   },
      emerald: { text:'text-emerald-400',    bg:'bg-emerald-400/15',    border:'border-emerald-400/30',    shadow:'shadow-[0_15px_30px_-10px_rgba(52,211,153,0.15)]'   },
    }[variant];
    return (
      <div className={cn('flex-1 min-w-[180px] p-6 rounded-[2.5rem] flex flex-col gap-5 group transition-all duration-500 relative overflow-hidden border hover:-translate-y-1',
        isLight ? 'bg-white border-zinc-200 shadow-xl hover:bg-zinc-50' : 'bg-white/[0.04] border-white/5 hover:bg-white/[0.06]',
        v.shadow
      )}>
        <div className="flex items-center justify-between relative z-10">
          <div className={cn('w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg', v.bg, v.border, v.text)}>
            {React.cloneElement(icon as React.ReactElement, { className:'w-5 h-5 stroke-[2.5px]' })}
          </div>
          {sub && <span className={cn('text-[10px] font-sans font-black px-3 py-1 rounded-xl border uppercase tracking-widest', isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-500' : 'bg-white/5 border-white/5 text-zinc-500')}>{sub}</span>}
        </div>
        <div className="relative z-10">
          <span className={cn('text-[10px] font-sans uppercase tracking-[0.25em] block mb-1.5 font-black opacity-80', isLight ? 'text-zinc-400' : 'text-zinc-500')}>{title}</span>
          <div className={cn('text-3xl font-display font-black tracking-tight leading-none group-hover:text-astrai-gold transition-all duration-300', isLight ? 'text-zinc-900' : 'text-white')}>{value}</div>
        </div>
      </div>
    );
  };

  const AgentItem = ({ label, active }: { label:string; active:boolean }) => (
    <div className={cn('flex items-center justify-between p-5 rounded-[2rem] border transition-all group', isLight ? 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-lg' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]')}>
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110',
          active ? 'bg-astrai-gold/20 border border-astrai-gold/40 text-astrai-gold' : (isLight ? 'bg-zinc-100 border border-zinc-200 text-zinc-400' : 'bg-white/5 border border-white/10 text-zinc-600')
        )}>
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <span className={cn('text-sm font-bold tracking-tight', theme.textPrimary)}>{label}</span>
          <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mt-0.5">Agente IA</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className={cn('w-10 h-5 rounded-full relative cursor-pointer transition-colors outline outline-1 outline-white/5', active ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-800'))}>
          <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', active ? 'right-1' : 'left-1')} />
        </div>
        <button className="text-zinc-600 hover:text-astrai-gold transition-colors"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );

  const efficiency = [
    { label:'Tempo Médio de Resposta', value:'14s',  percent:98, color:'bg-emerald-500' },
    { label:'Automação Total',         value:`${convRate}%`, percent:Math.min(Number(convRate),100), color:'bg-astrai-gold' },
    { label:'Taxa de Sucesso (Bot)',   value:'88%',  percent:88, color:'bg-sky-400' },
  ];

  return (
    <div className={cn('flex-1 flex flex-col px-10 pt-8 pb-10 overflow-y-auto scrollbar-hide relative min-w-0', theme.bgMain)}>
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-astrai-gold/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-sky-500/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-12 relative z-10">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className={cn('text-5xl font-display font-black tracking-tighter', theme.textPrimary)}>Atendimento</h2>
            <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sistema Ativo</span>
            </div>
          </div>
          <p className={cn('font-medium tracking-tight', theme.textSecondary)}>Gestão inteligente de canais e agentes virtuais de performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end mr-6">
            <span className="text-[10px] font-black text-astrai-gold uppercase tracking-[0.3em]">Nota de Satisfação</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">{[1,2,3,4,5].map(i=><Star key={i} className="w-3.5 h-3.5 fill-astrai-gold text-astrai-gold"/>)}</div>
              <span className={cn('text-2xl font-display font-black', theme.textPrimary)}>4.9</span>
              <span className="text-xs text-zinc-500 font-bold">/ 5.0</span>
            </div>
          </div>
          <button className="bg-astrai-gold text-astrai-blue px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_20px_40px_-10px_rgba(201,169,110,0.4)] hover:scale-105 transition-all flex items-center gap-2">
            Ver Relatórios <ArrowUpRight className="w-4 h-4 stroke-[3px]" />
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5 mb-12 relative z-10">
        {renderInsightCard('Leads WPP',    wppCount,                        <MessageSquare/>, 'blue',    'Canal WPP')}
        {renderInsightCard('Agendados',    scheduled,                       <CalendarCheck/>, 'gold'              )}
        {renderInsightCard('Realizados',   aptStats?.done??0,               <ShieldCheck/>,   'emerald', '+12%'  )}
        {renderInsightCard('Conversões',   scheduled,                       <RotateCcw/>,     'gold'              )}
        {renderInsightCard('Taxa Conv.',   `${convRate}%`,                  <TrendingUp/>,    'emerald'           )}
        {renderInsightCard('Faturamento',  `R$ ${faturamento.toLocaleString('pt-BR')}`, <DollarSign/>, 'blue'   )}
      </div>

      {/* Grid principal */}
      <div className="grid lg:grid-cols-12 gap-8 relative z-10 items-start">
        {/* Agentes */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-astrai-gold" />
              <h3 className={cn('text-xl font-display font-black tracking-tight', theme.textPrimary)}>Agentes de IA Ativos</h3>
            </div>
            <button className="text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-astrai-gold transition-colors flex items-center gap-2">
              Configurar <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {AGENTS.map(a => <AgentItem key={a.label} {...a} />)}
          </div>
        </div>

        {/* Eficiência */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className={cn('p-8 rounded-[3rem] backdrop-blur-3xl flex flex-col gap-6 border', isLight ? 'bg-white border-zinc-200 shadow-2xl' : 'bg-white/[0.02] border-white/5')}>
            <h3 className={cn('text-base font-display font-black tracking-tight border-b pb-4', theme.textPrimary, isLight ? 'border-zinc-100' : 'border-white/5')}>Eficiência de Atendimento</h3>
            <div className="space-y-6">
              {efficiency.map((stat, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{stat.label}</span>
                    <span className={cn('text-sm font-bold', theme.textPrimary)}>{stat.value}</span>
                  </div>
                  <div className={cn('h-1.5 w-full rounded-full overflow-hidden', isLight ? 'bg-zinc-100' : 'bg-white/5')}>
                    <motion.div initial={{ width:0 }} animate={{ width:`${stat.percent}%` }}
                      transition={{ duration:1, delay:0.5+(idx*0.2) }}
                      className={cn('h-full rounded-full', stat.color)} />
                  </div>
                </div>
              ))}
            </div>
            <div className={cn('mt-4 p-5 rounded-2xl border flex flex-col gap-3', isLight ? 'bg-zinc-50 border-zinc-100' : 'bg-black/40 border-white/5')}>
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em]">Último Insight IA</span>
              <p className={cn('text-xs leading-relaxed italic', isLight ? 'text-zinc-600 font-medium' : 'text-zinc-400')}>
                "O agente de <span className="text-astrai-gold font-bold">Agendamento</span> converteu {convRate}% dos leads captados via WhatsApp."
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
