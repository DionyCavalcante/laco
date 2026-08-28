import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import {
  DollarSign, Calendar, Target, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight, RefreshCw,
  Zap, LayoutDashboard,
} from 'lucide-react';
import { getLeadStats, LeadStats } from '../services/leads';
import { getAppointmentStats, AppointmentStats } from '../services/appointments';
import { PageHeader } from '../components/ui/page-header';
import { StatCard } from '../components/ui/stat-card';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '../components/ui/toggle-group';

const WEEK = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];

export default function Dashboard({ theme }: { theme: AstraiTheme }) {
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [aptStats,  setAptStats]  = useState<AppointmentStats | null>(null);
  const [chartTab, setChartTab]   = useState('atendimento');
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

  const indicators = [
    { name: 'Leads Total',  value: Math.min(totalLeads, 100),           raw: totalLeads,           color: '#0B1F2A' },
    { name: 'Agendados',    value: Math.min(scheduled, 100),            raw: scheduled,            color: '#2563EB' },
    { name: 'Realizados',   value: Math.min(aptStats?.done ?? 0, 100),  raw: aptStats?.done ?? 0,  color: '#059669' },
    { name: 'Link Enviado', value: Math.min(leadStats?.link_sent ?? 0, 100), raw: leadStats?.link_sent ?? 0, color: '#D97706' },
  ];

  const radar = [
    { status: 'LEAD',   msg: `${totalLeads} leads captados no total`,               variant: 'default' as const },
    { status: 'AGEN',   msg: `${scheduled} agendamentos convertidos`,                variant: 'info' as const },
    { status: 'REAL',   msg: `${aptStats?.done ?? 0} procedimentos realizados`,      variant: 'success' as const },
    { status: 'FATUR',  msg: `R$ ${faturamento.toLocaleString('pt-BR')} faturados`,  variant: 'success' as const },
    { status: 'CONV',   msg: `${convRate}% de taxa de conversão`,                    variant: 'secondary' as const },
  ];

  /* ───────────────────────────────────────────────
     Tema legado (mixed / dark / terminal)
     ─────────────────────────────────────────────── */
  if (!isLight) {
    const statCards = [
      { label:'Faturamento Realizado', value:`R$ ${faturamento.toLocaleString('pt-BR')}`, trend:'+14.2%', icon:DollarSign, color:'text-astrai-gold',  positive:true,  desc:'Total de procedimentos concluídos' },
      { label:'Agendamentos',          value:String(aptStats?.confirmed ?? 0),             trend:'+5.4%',  icon:Calendar,   color:'text-sky-400',     positive:true,  desc:'Confirmados no período' },
      { label:'Taxa de Conversão',     value:`${convRate}%`,                               trend:`${convRate}%`, icon:Target, color:'text-emerald-400', positive:Number(convRate) > 30, desc:'Leads → Agendados' },
    ];

    return (
      <div className={cn('p-8 space-y-10 animate-in fade-in duration-700', 'bg-[#050D14]')}>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-astrai-gold rounded-full" />
              <h1 className={cn('text-3xl font-display italic font-bold', theme.textPrimary)}>Centro de Comando</h1>
            </div>
            <p className={cn('text-[10px] font-mono tracking-[0.4em] uppercase opacity-40 ml-4 font-black', theme.textSecondary)}>
              Visão estratégica em tempo real · {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
            className={cn('col-span-12 md:col-span-8 p-10 rounded-[3rem] border relative overflow-hidden flex flex-col min-h-[480px]',
              'bg-white/[0.02] border-white/[0.05]'
            )}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
              <div>
                <h3 className={cn('text-2xl font-display italic font-bold', theme.textPrimary)}>Fluxo Bruto Semanal</h3>
                <p className={cn('text-[10px] font-mono uppercase tracking-[0.2em] font-black opacity-30', theme.textSecondary)}>comparativo com a semana anterior</p>
              </div>
            </div>
            <div className="flex-1 w-full relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top:10, right:10, left:-20, bottom:0 }}>
                  <defs>
                    <linearGradient id="gCur"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#C9A96E" stopOpacity={0.2}/><stop offset="95%" stopColor="#C9A96E" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#71717a" stopOpacity={0.05}/><stop offset="95%" stopColor="#71717a" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:10, fontWeight:900 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill:'#71717a', fontSize:10 }} />
                  <Tooltip contentStyle={{ backgroundColor:'#0B1F2A', border:'none', borderRadius:24, padding:20, boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)' }}
                    labelStyle={{ color:'#C9A96E', marginBottom:8, fontSize:10, textTransform:'uppercase', letterSpacing:2, fontWeight:900 }} />
                  <Area type="monotone" dataKey="previous" stroke="#3f3f46" strokeWidth={2} strokeDasharray="6 6" fillOpacity={1} fill="url(#gPrev)" />
                  <Area type="monotone" dataKey="current"  stroke="#C9A96E" strokeWidth={4} fillOpacity={1} fill="url(#gCur)" animationDuration={2500} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
          <div className="col-span-12 md:col-span-4 space-y-6">
            {statCards.map((s, i) => (
              <motion.div key={s.label} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: i*0.1 }}
                className={cn('p-8 rounded-[2.5rem] border group transition-all duration-500 flex flex-col relative overflow-hidden h-[155px] justify-center',
                  'bg-white/[0.02] border-white/[0.05]'
                )}>
                <div className={cn('absolute right-8 top-1/2 -translate-y-1/2 opacity-5 scale-150', s.color)}>
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
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.4 }}
            className={cn('col-span-12 md:col-span-7 p-10 rounded-[3rem] border', 'bg-white/[0.02] border-white/[0.05]')}
          >
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-astrai-gold/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-astrai-gold" />
                </div>
                <h3 className={cn('text-xl font-display italic font-bold', theme.textPrimary)}>Performance por Indicador</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {indicators.map((item, i) => (
                <div key={item.name} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className={cn('text-[10px] uppercase font-black tracking-widest opacity-60', theme.textSecondary)}>{item.name}</span>
                    <span className="text-astrai-gold font-mono font-bold text-xs">{item.raw}</span>
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
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
            className={cn('col-span-12 md:col-span-5 p-10 rounded-[3rem] border flex flex-col', 'bg-white/[0.02] border-white/[0.05]')}
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
                      <span className="text-[8px] font-black tracking-widest px-2 py-0.5 rounded-md bg-white/5 text-zinc-400">{log.status}</span>
                      <div className="h-[1px] flex-1 bg-white/[0.02]" />
                    </div>
                    <p className={cn('text-[11px] font-bold tracking-tight opacity-60 group-hover:opacity-100 transition-opacity', theme.textSecondary)}>{log.msg}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ───────────────────────────────────────────────
     NOVO Dashboard — Design System Light
     Segue padrão das referências: clean, compacto,
     alta densidade de informação
     ─────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <PageHeader
        icon={LayoutDashboard}
        title="Visão Geral"
        subtitle={`Panorama de alto nível da operação — vendas, atendimento e conversões.`}
      >
        <ToggleGroup value="month" onValueChange={() => {}}>
          <ToggleGroupItem value="week">7 dias</ToggleGroupItem>
          <ToggleGroupItem value="month">Este mês</ToggleGroupItem>
          <ToggleGroupItem value="quarter">90 dias</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
      </PageHeader>

      {/* KPI Grid — 4 colunas como na referência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Faturamento Realizado"
          category="VENDAS"
          icon={DollarSign}
          iconBg="bg-success-soft"
          iconColor="text-success"
          value={`R$ ${faturamento.toLocaleString('pt-BR')}`}
          valueColor="text-success"
          description="Total de procedimentos concluídos"
        />
        <StatCard
          label="Agendamentos"
          category="AGENDA"
          icon={Calendar}
          iconBg="bg-info-soft"
          iconColor="text-info"
          value={aptStats?.confirmed ?? 0}
          description="Confirmados no período"
        />
        <StatCard
          label="Leads Obtidos"
          category="CRM"
          icon={Users}
          iconBg="bg-primary-soft"
          iconColor="text-primary"
          value={totalLeads}
          description="No período selecionado"
        />
        <StatCard
          label="Taxa de Conversão"
          category="METAS"
          icon={Target}
          iconBg="bg-warning-soft"
          iconColor="text-warning"
          value={`${convRate}%`}
          description="Leads → Agendados"
        />
      </div>

      {/* Row 2: Gráfico + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Gráfico principal */}
        <Card className="lg:col-span-8">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-semibold">Fluxo Semanal</CardTitle>
              <p className="text-[12px] text-text-muted mt-0.5">Comparativo com a semana anterior</p>
            </div>
            <ToggleGroup value={chartTab} onValueChange={setChartTab}>
              <ToggleGroupItem value="atendimento">Atendimento</ToggleGroupItem>
              <ToggleGroupItem value="procedimentos">Procedimentos</ToggleGroupItem>
            </ToggleGroup>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCurLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0B1F2A" stopOpacity={0.08} />
                      <stop offset="95%" stopColor="#0B1F2A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gPrevLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9CA3AF" stopOpacity={0.05} />
                      <stop offset="95%" stopColor="#9CA3AF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F1F3" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                      padding: 12,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                    labelStyle={{ color: '#111827', marginBottom: 4, fontSize: 12, fontWeight: 600 }}
                    itemStyle={{ fontSize: 12, color: '#6B7280' }}
                  />
                  <Area type="monotone" dataKey="previous" stroke="#D1D5DB" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#gPrevLight)" name="Semana anterior" />
                  <Area type="monotone" dataKey="current" stroke="#0B1F2A" strokeWidth={2.5} fillOpacity={1} fill="url(#gCurLight)" animationDuration={1500} name="Semana atual" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Radar Operacional */}
        <Card className="lg:col-span-4 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-success animate-ping absolute inset-0" />
                <div className="w-2 h-2 rounded-full bg-success relative z-10" />
              </div>
              <CardTitle>Radar Operacional</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-0">
            <div className="space-y-4">
              {radar.map((log, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Badge variant={log.variant} className="shrink-0 mt-0.5 text-[10px] font-semibold min-w-[48px] justify-center">
                    {log.status}
                  </Badge>
                  <p className="text-[13px] text-text-secondary leading-snug">
                    {log.msg}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Performance por indicador + Resumo de vendas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Performance por indicador */}
        <Card className="lg:col-span-7">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[var(--radius-md)] bg-primary-soft flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-primary" />
              </div>
              <CardTitle>Performance por Indicador</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              {indicators.map((item, i) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{item.name}</span>
                    <span className="text-sm font-bold tabular-nums text-text-primary">{item.raw}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.value, 100)}%` }}
                      transition={{ delay: 0.3 + (i * 0.1), duration: 1.2, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo rápido de vendas */}
        <Card className="lg:col-span-5">
          <CardHeader className="flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[var(--radius-md)] bg-success-soft flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-success" />
              </div>
              <CardTitle>Resumo Financeiro</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2.5 border-b border-border-light">
                <span className="text-[13px] text-text-secondary">Valor agendado</span>
                <span className="text-sm font-semibold text-text-primary tabular-nums">R$ {agendado.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-light">
                <span className="text-[13px] text-text-secondary">Valor realizado</span>
                <span className="text-sm font-semibold text-success tabular-nums">R$ {faturamento.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-border-light">
                <span className="text-[13px] text-text-secondary">Valor perdido</span>
                <span className="text-sm font-semibold text-danger tabular-nums">R$ {(aptStats?.valor_perdido ?? 0).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-[13px] text-text-secondary">Valor em aberto</span>
                <span className="text-sm font-semibold text-warning tabular-nums">R$ {(leadStats?.valor_em_aberto ?? 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
