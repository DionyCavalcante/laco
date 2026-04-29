import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import { Zap, Calendar, Stars, DollarSign, Target, ArrowUpRight, ArrowDownRight, MoreHorizontal, LayoutGrid } from 'lucide-react';
import { getLeadStats, LeadStats } from '../services/leads';
import { getAppointmentStats, AppointmentStats } from '../services/appointments';

const WEEK = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

export default function Dashboard({ theme }: { theme: AstraiTheme }) {
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [aptStats,  setAptStats]  = useState<AppointmentStats | null>(null);
  const isLight = theme.id === 'light';

  useEffect(() => {
    getLeadStats().then(setLeadStats).catch(console.error);
    getAppointmentStats().then(setAptStats).catch(console.error);
  }, []);

  const faturamento = aptStats?.valor_realizado ?? 0;
  const agendado    = aptStats?.valor_agendado  ?? 0;
  const totalLeads  = leadStats?.total    ?? 0;
  const scheduled   = leadStats?.scheduled ?? 0;
  const convRate    = totalLeads > 0 ? ((scheduled / totalLeads) * 100).toFixed(1) : '0.0';

  const chartData = WEEK.map((name, i) => ({
    name,
    current:  Math.round(agendado  * (0.08 + Math.sin(i)   * 0.06 + 0.03)),
    previous: Math.round(agendado  * (0.07 + Math.sin(i+1) * 0.05 + 0.02)),
  }));

  const statCards = [
    { label:'Faturamento Realizado', value:`R$ ${faturamento.toLocaleString('pt-BR')}`, trend:'+14.2%', icon:DollarSign, color:'text-astrai-gold',  positive:true,  desc:'Total de procedimentos concluídos' },
    { label:'Agendamentos',          value:String(aptStats?.confirmed ?? 0),             trend:'+5.4%',  icon:Calendar,   color:'text-sky-400',     positive:true,  desc:'Confirmados no período' },
    { label:'Taxa de Conversão',     value:`${convRate}%`,                               trend:`${convRate}%`, icon:Target, color:'text-emerald-400', positive:Number(convRate) > 30, desc:'Leads → Agendados' },
  ];

  const indicators = [
    { name:'Leads Total',    value:Math.min(totalLeads,  100), color:'#C9A96E' },
    { name:'Agendados',      value:Math.min(scheduled,   100), color:'#4F46E5' },
    { name:'Realizados',     value:Math.min(aptStats?.done ?? 0, 100), color:'#10B981' },
    { name:'Link Enviado',   value:Math.min(leadStats?.link_sent ?? 0, 100), color:'#EC4899' },
  ];

  const radar = [
    { status:'LEAD', msg:`${totalLeads} leads captados no total`,              color:'bg-astrai-gold/10 text-astrai-gold' },
    { status:'AGEN', msg:`${scheduled} agendamentos convertidos`,              color:'bg-sky-500/10 text-sky-500' },
    { status:'WORK', msg:`${aptStats?.done ?? 0} procedimentos realizados`,    color:'bg-purple-500/10 text-purple-500' },
    { status:'SALE', msg:`R$ ${faturamento.toLocaleString('pt-BR')} faturados`, color:'bg-emerald-500/10 text-emerald-500' },
    { status:'CONV', msg:`${convRate}% de taxa de conversão`,                  color:'bg-zinc-500/10 text-zinc-500' },
  ];

  return (
    <div className={cn('p-8 space-y-10 animate-in fade-in duration-700', isLight ? 'bg-zinc-50/50' : 'bg-[#050D14]')}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-astrai-gold rounded-full" />
            <h1 className={cn('text-3xl font-display italic font-bold', isLight ? 'text-zinc-900' : 'text-white')}>Centro de Comando</h1>
          </div>
          <p className={cn('text-[10px] font-mono tracking-[0.4em] uppercase opacity-40 ml-4 font-black', theme.textSecondary)}>
            Visão estratégica em tempo real · {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-5 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> Layout
          </button>
          <button className="px-5 py-2.5 rounded-xl bg-astrai-gold text-astrai-blue text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-astrai-gold/10 hover:scale-105 transition-all">
            Exportar BI
          </button>
        </div>
      </div>

      {/* Bento */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Chart */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
          className={cn('col-span-12 md:col-span-8 p-10 rounded-[3rem] border relative overflow-hidden flex flex-col min-h-[480px]',
            isLight ? 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/20' : 'bg-white/[0.02] border-white/[0.05]'
          )}>
          <div className="absolute -top-20 -right-20 p-24 opacity-5 rotate-12 pointer-events-none">
            <Stars className="w-64 h-64 text-astrai-gold" />
          </div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
            <div>
              <h3 className={cn('text-2xl font-display italic font-bold', theme.textPrimary)}>Fluxo Bruto Semanal</h3>
              <p className={cn('text-[10px] font-mono uppercase tracking-[0.2em] font-black opacity-30', theme.textSecondary)}>comparativo com a semana anterior</p>
            </div>
            <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5">
              <button className="px-5 py-2 rounded-xl bg-astrai-gold text-astrai-blue text-[10px] font-black uppercase tracking-widest shadow-lg shadow-astrai-gold/20">Atendimento</button>
              <button className="px-5 py-2 rounded-xl text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Procedimentos</button>
            </div>
          </div>
          <div className="flex-1 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top:10, right:10, left:-20, bottom:0 }}>
                <defs>
                  <linearGradient id="gCur"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#C9A96E" stopOpacity={0.2}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#71717a" stopOpacity={0.05}/><stop offset="95%" stopColor="#71717a" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isLight ? '#27272a' : '#71717a', fontSize:10, fontWeight:900 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isLight ? '#27272a' : '#71717a', fontSize:10 }} />
                <Tooltip contentStyle={{ backgroundColor: isLight ? '#fff' : '#0B1F2A', border:'none', borderRadius:24, padding:20, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)' }}
                  labelStyle={{ color:'#C9A96E', marginBottom:8, fontSize:10, textTransform:'uppercase', letterSpacing:2, fontWeight:900 }} />
                <Area type="monotone" dataKey="previous" stroke={isLight ? '#d4d4d8' : '#3f3f46'} strokeWidth={2} strokeDasharray="6 6" fillOpacity={1} fill="url(#gPrev)" />
                <Area type="monotone" dataKey="current"  stroke="#C9A96E" strokeWidth={4} fillOpacity={1} fill="url(#gCur)" animationDuration={2500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="col-span-12 md:col-span-4 space-y-6">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.1 }}
              className={cn('p-8 rounded-[2.5rem] border group transition-all duration-500 flex flex-col relative overflow-hidden h-[155px] justify-center hover:border-astrai-gold/40 hover:scale-[1.02]',
                isLight ? 'bg-white border-zinc-200 shadow-lg' : 'bg-white/[0.02] border-white/[0.05]'
              )}>
              <div className={cn('absolute right-8 top-1/2 -translate-y-1/2 opacity-5 scale-150 transition-transform duration-700 group-hover:scale-[1.8] group-hover:rotate-12', s.color)}>
                <s.icon className="w-12 h-12" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={cn('text-[9px] uppercase font-black tracking-widest opacity-40', theme.textSecondary)}>{s.label}</h4>
                  <div className={cn('flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full', s.positive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                    {s.positive ? <ArrowUpRight className="w-2.5 h-2.5"/> : <ArrowDownRight className="w-2.5 h-2.5"/>}
                    {s.trend}
                  </div>
                </div>
                <p className={cn('text-3xl font-black font-mono tracking-tighter', theme.textPrimary)}>{s.value}</p>
                <p className="text-[10px] text-zinc-500 font-bold mt-1">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Indicadores */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
          className={cn('col-span-12 md:col-span-7 p-10 rounded-[3rem] border backdrop-blur-md', isLight ? 'bg-white border-zinc-200 shadow-xl' : 'bg-white/[0.02] border-white/[0.05]')}
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-astrai-gold/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-astrai-gold" />
              </div>
              <h3 className={cn('text-xl font-display italic font-bold', theme.textPrimary)}>Performance por Indicador</h3>
            </div>
            <button className="text-zinc-500 hover:text-white transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {indicators.map((item, i) => (
              <div key={item.name} className="space-y-3">
                <div className="flex justify-between items-end">
                  <span className={cn('text-[10px] uppercase font-black tracking-widest opacity-60', theme.textSecondary)}>{item.name}</span>
                  <span className="text-astrai-gold font-mono font-bold text-xs">{item.value}</span>
                </div>
                <div className="h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                  <motion.div initial={{ width:0 }} animate={{ width:`${Math.min(item.value,100)}%` }}
                    transition={{ delay: 0.6+(i*0.1), duration:2, ease:'easeOut' }}
                    className="h-full rounded-full" style={{ backgroundColor: item.color }} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Radar */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
          className={cn('col-span-12 md:col-span-5 p-10 rounded-[3rem] border flex flex-col', isLight ? 'bg-white border-zinc-200 shadow-xl' : 'bg-white/[0.02] border-white/[0.05]')}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute inset-0" />
              <div className="w-3 h-3 rounded-full bg-red-500 relative z-10" />
            </div>
            <h3 className={cn('text-[10px] uppercase font-black tracking-[0.4em]', theme.textPrimary)}>Radar Operacional</h3>
          </div>
          <div className="flex-1 space-y-6">
            {radar.map((log, i) => (
              <div key={i} className="flex gap-6 group cursor-default">
                <span className="font-mono text-[9px] font-black opacity-20 shrink-0 mt-1">—</span>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md', log.color)}>{log.status}</span>
                    <div className="h-[1px] flex-1 bg-white/[0.02]" />
                  </div>
                  <p className={cn('text-[11px] font-bold tracking-tight opacity-60 group-hover:opacity-100 transition-opacity', theme.textSecondary)}>{log.msg}</p>
                </div>
              </div>
            ))}
          </div>
          <button className={cn('mt-8 pt-8 border-t border-white/[0.03] text-[9px] font-black uppercase tracking-[0.3em] text-center w-full hover:text-white transition-colors', theme.textSecondary)}>
            Ver todos os eventos <ArrowUpRight className="w-3 h-3 inline ml-1" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
