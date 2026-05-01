import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import {
  ChevronLeft, ChevronRight, Plus, Clock, Calendar as CalendarIcon,
  User as UserIcon, LayoutGrid, List as ListIcon, MoreVertical,
  ChevronDown, Briefcase, TrendingUp, Loader2,
} from 'lucide-react';
import { getAppointments, updateAppointmentStatus, Appointment } from '../services/appointments';
import { getLeads, updateLeadStatus, Lead } from '../services/leads';
import BookingModal, { RescheduleTarget } from '../components/BookingModal';
import LeadProfileDrawer from '../components/LeadProfileDrawer';

const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8);

function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function todayISO() { return toISO(new Date()); }
function weekStart(date: Date) {
  const d = new Date(date); const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); d.setHours(0,0,0,0); return d;
}
function weekDays(anchor: Date): Date[] {
  const mon = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d; });
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate()+n); return r; }
function getWeeksInPeriod(fromISO: string, toISO: string): Date[][] {
  const from = new Date(fromISO);
  const to = new Date(toISO);
  const weeks: Date[][] = [];
  let current = new Date(from);
  current = weekStart(current);
  while (current <= to) {
    weeks.push(weekDays(current));
    current = addDays(current, 7);
  }
  return weeks;
}

const STATUS_COLOR: Record<string, { dot: string; bg: string; text: string }> = {
  'Confirmado': { dot:'bg-emerald-500', bg:'bg-emerald-500/10', text:'text-emerald-400' },
  'Aguardando': { dot:'bg-amber-400',   bg:'bg-amber-400/10',   text:'text-amber-400'   },
  'Cancelado':  { dot:'bg-red-500',     bg:'bg-red-500/10',     text:'text-red-400'     },
};

export default function Agenda({ theme }: { theme: AstraiTheme }) {
  const [view, setView]           = useState<'weekly'|'list'>('weekly');
  const [period, setPeriod]       = useState<'7'|'14'|'30'|'custom'>('7');
  const [anchor, setAnchor]       = useState(new Date());
  const [selDate, setSelDate]     = useState(todayISO());
  const [customFrom, setFrom]     = useState(todayISO());
  const [customTo, setTo]         = useState(toISO(addDays(new Date(), 6)));
  const [appointments, setApts]   = useState<Appointment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [bookingOpen, setBookingOpen]   = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<RescheduleTarget | undefined>();
  const [openLead, setOpenLead]   = useState<Lead | null>(null);
  const [openApts, setOpenApts]   = useState<Appointment[]>([]);
  const isLight = theme.id === 'light';
  const isAstraiBrand = theme.id === 'mixed';

  function handlePeriodChange(newPeriod: '7'|'14'|'30'|'custom') {
    if (newPeriod === 'custom') {
      setPeriod('custom');
      return;
    }
    const days = parseInt(newPeriod);
    const today = new Date();
    setPeriod(newPeriod);
    setFrom(toISO(today));
    setTo(toISO(addDays(today, days - 1)));
    setAnchor(today);
    setSelDate(toISO(today));
  }

  function handleNavigatePeriod(direction: -1 | 1) {
    const periodDays = period === 'custom'
      ? Math.floor((new Date(customTo).getTime() - new Date(customFrom).getTime()) / (1000 * 60 * 60 * 24)) + 1
      : parseInt(period);

    const newFrom = addDays(new Date(customFrom), direction * periodDays);
    setFrom(toISO(newFrom));
    setTo(toISO(addDays(newFrom, periodDays - 1)));
  }

  const days = weekDays(anchor);
  const today = todayISO();
  const weeks = getWeeksInPeriod(customFrom, customTo);
  const allDaysInPeriod = weeks.flat();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAppointments({ from: customFrom, to: customTo });
      setApts(data.filter(a => a.status !== 'Cancelado'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [customFrom, customTo]);

  useEffect(() => { load(); }, [load, customFrom, customTo]);

  async function openDetail(apt: Appointment) {
    try {
      const leads = await getLeads();
      // Tentar encontrar por ID primeiro, depois por nome
      let lead = apt.leadId ? leads.find(l => l.id === apt.leadId) : undefined;
      if (!lead) {
        lead = leads.find(l => l.name === apt.patientName);
      }
      if (lead) {
        setOpenLead(lead);
        const apts = await getAppointments({ lead_id: lead.id });
        setOpenApts(apts);
      } else {
        console.warn('Lead not found for appointment:', apt);
      }
    } catch (e) {
      console.error('Error opening detail:', e);
    }
  }

  async function handleLeadStatus(id: string, status: string) {
    await updateLeadStatus(id, status);
    if (openLead?.id === id) setOpenLead(prev => prev ? { ...prev, status: status as any } : prev);
  }

  async function handleLeadUpdate(id: string, data: { name?: string; phone?: string }) {
    try {
      const updated = { ...openLead! };
      if (data.name) updated.name = data.name;
      if (data.phone) updated.phone = data.phone;
      // TODO: Se houver endpoint PUT /api/leads/{id}, chamar aqui
      setOpenLead(updated);
    } catch (e) {
      console.error('Erro ao atualizar lead:', e);
    }
  }

  async function handleStatus(id: string, status: 'confirmed'|'done'|'cancelled') {
    await updateAppointmentStatus(id, status);
    const map: any = { confirmed:'Confirmado', done:'Confirmado', cancelled:'Cancelado' };
    setApts(prev => prev.map(a => a.id !== id ? a : { ...a, status: map[status] }));
  }

  const selApts = appointments.filter(a => a.date === selDate);
  const totalVal = appointments.reduce((s, a) => s + a.value, 0);
  const confirmed = appointments.filter(a => a.status === 'Confirmado').length;

  const dayLabel = (d: Date) => d.toLocaleDateString('pt-BR', { day:'numeric', month:'short' });
  const periodLabel = `${dayLabel(new Date(customFrom))} – ${dayLabel(new Date(customTo))}`;

  const renderInsightCard = (title: string, value: string | number, icon: React.ReactNode, variant: 'gold'|'blue'|'emerald') => {
    const v = { gold:{ text:'text-astrai-gold', bg:'bg-astrai-gold/10', border:'border-astrai-gold/20' }, blue:{ text:'text-sky-400', bg:'bg-sky-400/10', border:'border-sky-400/20' }, emerald:{ text:'text-emerald-400', bg:'bg-emerald-400/10', border:'border-emerald-400/20' } }[variant];
    return (
      <div className={cn('flex-1 min-w-[200px] p-6 rounded-[2rem] border flex flex-col gap-4 group transition-all duration-300',
        isLight ? 'bg-white border-zinc-200 shadow-lg hover:bg-zinc-50' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.05]'
      )}>
        <div className={cn('w-10 h-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110', v.bg, v.border, v.text)}>{icon}</div>
        <div>
          <span className="text-xs font-mono text-zinc-500 uppercase tracking-[0.2em] block mb-1 font-bold">{title}</span>
          <div className={cn('text-3xl font-sans font-black tracking-tight leading-none group-hover:text-astrai-gold transition-colors', theme.textPrimary)}>{value}</div>
        </div>
      </div>
    );
  };

  const renderGrid = () => (
    <div className={cn('flex flex-col rounded-[2.5rem] border shadow-2xl overflow-hidden',
      isLight ? 'bg-white border-zinc-200' : 'bg-[#0E2836]/40 border-white/5'
    )}>
      {/* Scroll container para múltiplas semanas */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: weeks.length === 1 ? '100%' : `${weeks.length * 1000}px` }}>
          {weeks.map((weekDays, weekIdx) => (
            <div key={weekIdx}>
              {/* Header dias */}
              <div className={cn('grid border-b', isLight ? 'bg-zinc-50 border-zinc-100' : 'bg-black/20 border-white/5')}
                style={{ gridTemplateColumns:'80px repeat(7, 1fr)' }}>
                <div className={cn('p-4 flex items-center justify-center border-r', isLight ? 'border-zinc-100' : 'border-white/5')}>
                  <Clock className="w-4 h-4 text-zinc-600" />
                </div>
                {weekDays.map((d, i) => {
                  const iso = toISO(d);
                  const isToday = iso === today;
                  const isSel   = iso === selDate;
                  const cnt     = appointments.filter(a => a.date === iso).length;
                  return (
                    <button key={iso} onClick={() => { setSelDate(iso); setView('list'); }}
                      className={cn('p-4 text-center border-r last:border-0 transition-colors',
                        isLight ? 'border-zinc-100' : 'border-white/5',
                        isSel && (isLight ? 'bg-astrai-gold/10' : 'bg-astrai-gold/5')
                      )}>
                      <span className="block text-xs font-mono text-zinc-500 uppercase tracking-[0.25em] font-bold mb-1">{DAYS_SHORT[(d.getDay())]}</span>
                      <span className={cn('text-2xl font-display font-bold', isToday||isSel ? 'text-astrai-gold' : theme.textPrimary)}>{d.getDate()}</span>
                      {cnt > 0 && <div className="mt-1 w-1.5 h-1.5 rounded-full bg-astrai-gold mx-auto" />}
                    </button>
                  );
                })}
              </div>
              {/* Grid horas */}
              <div className="relative" style={{ minHeight: 500 }}>
                {HOURS.map(h => (
                  <div key={h} className={cn('flex border-b', isLight ? 'border-zinc-50' : 'border-white/[0.05]')} style={{ height:80 }}>
                    <div className={cn('w-[80px] flex items-start justify-center pt-2 text-xs font-mono border-r font-bold shrink-0',
                      isLight ? 'bg-zinc-50/50 border-zinc-100 text-zinc-400' : 'bg-black/10 border-white/5 text-zinc-400'
                    )}>{h}:00</div>
                    <div className="flex-1" />
                  </div>
                ))}
                {loading && weekIdx === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-astrai-gold" />
                  </div>
                ) : (() => {
                  const toMin = (t: string) => { const [h,m] = t.split(':').map(Number); return h*60+m; };
                  const fmtMin = (m: number) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

                  // Agrupar por dia, depois em clusters de sobreposição temporal
                  type Cluster = { apts: Appointment[]; di: number; startMin: number; endMin: number };
                  const clusters: Cluster[] = [];

                  weekDays.forEach((d, di) => {
                    const dayApts = appointments
                      .filter(a => {
                        if (toISO(d) !== a.date) return false;
                        const [hh] = a.time.split(':').map(Number);
                        return hh >= 8 && hh <= 18;
                      })
                      .sort((a,b) => toMin(a.time) - toMin(b.time));

                    if (!dayApts.length) return;

                    let group: Appointment[] = [dayApts[0]];
                    let maxEnd = toMin(dayApts[0].time) + dayApts[0].duration;

                    for (let i = 1; i < dayApts.length; i++) {
                      const start = toMin(dayApts[i].time);
                      if (start < maxEnd) {
                        group.push(dayApts[i]);
                        maxEnd = Math.max(maxEnd, start + dayApts[i].duration);
                      } else {
                        clusters.push({ apts: group, di, startMin: toMin(group[0].time), endMin: maxEnd });
                        group = [dayApts[i]];
                        maxEnd = start + dayApts[i].duration;
                      }
                    }
                    clusters.push({ apts: group, di, startMin: toMin(group[0].time), endMin: maxEnd });
                  });

                  return (
                    <AnimatePresence>
                      {clusters.map((cl, gi) => {
                        const top    = (cl.startMin / 60 - 8) * 80;
                        const height = Math.max((cl.endMin - cl.startMin) / 60 * 80, 52);
                        const left   = `calc(80px + (100% - 80px) / 7 * ${cl.di} + 2px)`;
                        const width  = `calc((100% - 80px) / 7 - 4px)`;
                        const isMulti = cl.apts.length > 1;
                        const hasPending = cl.apts.some(a => a.status !== 'Confirmado');
                        const borderCls  = hasPending ? 'border-l-amber-400' : 'border-l-emerald-500';
                        const bgCls      = isLight ? 'bg-white border-zinc-200' : 'bg-[#132d3d] border-white/10';
                        const visibleApts = cl.apts.slice(0, 4);
                        const extra       = cl.apts.length - visibleApts.length;

                        return (
                          <motion.div key={`cl-${gi}`}
                            initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}
                            className="absolute z-10 cursor-pointer group"
                            style={{ top, left, width, height }}
                            onClick={() => {
                              if (isMulti) { setSelDate(cl.apts[0].date); setView('list'); }
                              else openDetail(cl.apts[0]);
                            }}>
                            <div className={cn(
                              'w-full h-full rounded-xl border-l-[3px] px-2 py-1.5 flex flex-col overflow-hidden shadow-md group-hover:shadow-lg transition-shadow',
                              bgCls, borderCls
                            )}>
                              {isMulti ? (
                                <>
                                  <p className="text-[11px] font-mono text-zinc-400 font-bold leading-none mb-1">
                                    {fmtMin(cl.startMin)}–{fmtMin(cl.endMin)}
                                  </p>
                                  <div className="flex-1 space-y-0.5 overflow-hidden">
                                    {visibleApts.map(apt => {
                                      const dot = (STATUS_COLOR[apt.status] ?? STATUS_COLOR['Aguardando']).dot;
                                      return (
                                        <div key={apt.id} className="flex items-center gap-1 min-w-0">
                                          <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
                                          <span className={cn('text-[12px] font-bold truncate leading-tight', theme.textPrimary)}>
                                            {apt.patientName}
                                          </span>
                                        </div>
                                      );
                                    })}
                                    {extra > 0 && (
                                      <p className="text-[11px] text-astrai-gold font-bold leading-tight">+{extra} mais</p>
                                    )}
                                  </div>
                                </>
                              ) : (() => {
                                const apt = cl.apts[0];
                                const sc  = STATUS_COLOR[apt.status] ?? STATUS_COLOR['Aguardando'];
                                const short = height < 64;
                                return (
                                  <>
                                    <div className="flex items-center gap-1 min-w-0">
                                      <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', sc.dot)} />
                                      <p className={cn('text-[13px] font-bold truncate leading-tight', theme.textPrimary)}>{apt.patientName}</p>
                                    </div>
                                    {!short && <p className="text-[12px] text-astrai-gold font-bold truncate leading-tight mt-0.5">{apt.procedure}</p>}
                                    <p className="text-[11px] text-zinc-400 font-mono font-bold mt-auto leading-tight">{apt.time}–{apt.endTime}</p>
                                  </>
                                );
                              })()}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderList = () => {
    const todayEvents = appointments.filter(a => a.date === selDate).sort((a,b) => a.time.localeCompare(b.time));
    return (
      <div className="space-y-4">
        {/* Day picker */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {allDaysInPeriod.map((d, i) => {
            const iso = toISO(d);
            const isSel = iso === selDate;
            const cnt = appointments.filter(a => a.date === iso).length;
            return (
              <button key={iso} onClick={() => setSelDate(iso)}
                className={cn('px-6 py-4 rounded-2xl border transition-all text-center min-w-[100px] relative',
                  isSel ? 'bg-astrai-gold border-astrai-gold text-astrai-blue font-bold shadow-xl shadow-astrai-gold/10'
                    : (isLight ? 'bg-white border-zinc-200 text-zinc-500 hover:border-blue-400' : 'bg-[#0E2836]/60 border-white/5 text-zinc-500 hover:border-white/20')
                )}>
                <span className="block text-xs font-mono uppercase tracking-widest opacity-70 mb-1">{DAYS_SHORT[d.getDay()]}</span>
                <span className="text-2xl font-display font-bold">{d.getDate()}</span>
                {cnt > 0 && (
                  <div className={cn('absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border shadow-lg',
                    isSel ? 'bg-astrai-blue border-white/20 text-white' : 'bg-astrai-gold border-astrai-blue/20 text-astrai-blue'
                  )}>{cnt}</div>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-astrai-gold" /></div>
        ) : todayEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 opacity-20 italic font-display">
            <Clock className="w-16 h-16 mb-4" />
            <p className="text-xl">Nenhum agendamento para este dia.</p>
          </div>
        ) : (
          todayEvents.map((apt, idx) => {
            const sc = STATUS_COLOR[apt.status] ?? STATUS_COLOR['Aguardando'];
            return (
              <motion.div key={apt.id} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ delay: idx*0.05 }}
                className={cn('group px-6 py-5 rounded-[1.8rem] border transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer',
                  isLight ? 'bg-white border-zinc-200 hover:bg-zinc-50 shadow-lg' : 'bg-[#0E2836]/60 border-white/5 hover:bg-white/[0.05]'
                )}
                onClick={() => openDetail(apt)}>
                <div className="flex items-center gap-6">
                  {/* Horário */}
                  <div className="w-[130px] shrink-0">
                    <div className={cn('text-[10px] font-black uppercase tracking-[0.25em] mb-1', isLight ? 'text-zinc-500' : 'text-zinc-400')}>Horário</div>
                    <div className={cn('text-2xl font-black tracking-tight tabular-nums', theme.textPrimary)}>{apt.time}</div>
                    <div className={cn('text-[11px] font-mono font-bold tabular-nums mt-0.5', isLight ? 'text-zinc-400' : 'text-zinc-500')}>até {apt.endTime}</div>
                  </div>
                  <div className={cn('h-14 w-px hidden md:block shrink-0', isLight ? 'bg-zinc-200' : 'bg-white/10')} />
                  {/* Info */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className={cn('w-3 h-3 rounded-full shrink-0', sc.dot)} />
                      <h4 className={cn('text-xl font-black group-hover:text-astrai-gold transition-colors', theme.textPrimary)}>{apt.patientName}</h4>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold',
                        isLight ? 'bg-astrai-gold/10 border-astrai-gold/30 text-astrai-gold' : 'bg-astrai-gold/15 border-astrai-gold/30 text-astrai-gold'
                      )}>{apt.procedure}</span>
                      <span className={cn('text-lg font-black tabular-nums', theme.textPrimary)}>R$ {apt.value.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-6">
                      <UserIcon className={cn('w-4 h-4', sc.text)} />
                      <span className={cn('text-sm font-bold', sc.text)}>{apt.status}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                  {apt.status === 'Aguardando' && (
                    <button onClick={() => handleStatus(apt.id,'confirmed')}
                      className="h-10 px-5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white hover:border-emerald-500">
                      Confirmar
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setRescheduleTarget({ id: apt.id, patientName: apt.patientName, procedureName: apt.procedure, date: apt.date, time: apt.time });
                      setBookingOpen(true);
                    }}
                    className="h-10 px-5 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all bg-astrai-gold/10 border-astrai-gold/40 text-astrai-gold hover:bg-astrai-gold hover:text-astrai-blue">
                    Remarcar
                  </button>
                  <button onClick={() => handleStatus(apt.id,'done')}
                    className={cn('p-2 rounded-lg transition-colors', isLight ? 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50' : 'text-zinc-600 hover:text-emerald-400')} title="Concluir">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <>
    <AnimatePresence>
      {openLead && (
        <LeadProfileDrawer
          lead={openLead} apts={openApts} theme={theme}
          onClose={() => { setOpenLead(null); setOpenApts([]); }}
          onStatusChange={(s) => handleLeadStatus(openLead.id, s)}
          onAptStatusChange={(aptId, status) => handleStatus(aptId, status as any)}
          onBook={() => {
            setOpenLead(null);
            setOpenApts([]);
            setRescheduleTarget(undefined);
            setBookingOpen(true);
          }}
          onUpdate={(data) => handleLeadUpdate(openLead.id, data)}
        />
      )}
    </AnimatePresence>

    <AnimatePresence>
      {bookingOpen && (
        <BookingModal
          theme={theme}
          onClose={() => setBookingOpen(false)}
          onSuccess={() => { load(); setBookingOpen(false); }}
          reschedule={rescheduleTarget}
        />
      )}
    </AnimatePresence>
    <div className="flex flex-col h-full space-y-6 p-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 shrink-0">
        <div>
          <h2 className={cn('text-4xl font-display font-bold tracking-tight', theme.textPrimary)}>Gestão de Agenda</h2>
          <p className="text-sm font-mono text-astrai-gold uppercase tracking-[0.2em] mt-2 font-bold">{periodLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Nav período */}
          <button onClick={() => handleNavigatePeriod(-1)} className={cn('p-2 rounded-xl border transition-colors', isLight ? 'border-zinc-200 text-zinc-500 hover:text-blue-600' : 'border-white/10 text-zinc-500 hover:text-white')}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => { const today = new Date(); setFrom(toISO(today)); setTo(toISO(addDays(today, 6))); setPeriod('7'); setSelDate(todayISO()); }} className="px-4 py-2 rounded-xl bg-astrai-gold/10 border border-astrai-gold/20 text-astrai-gold text-xs font-black uppercase tracking-widest">
            Hoje
          </button>
          <button onClick={() => handleNavigatePeriod(1)} className={cn('p-2 rounded-xl border transition-colors', isLight ? 'border-zinc-200 text-zinc-500 hover:text-blue-600' : 'border-white/10 text-zinc-500 hover:text-white')}>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Period Selector */}
          <div className={cn('flex p-1 rounded-2xl border shadow-inner', isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-black/40 border-white/5')}>
            {['7', '14', '30'].map(p => (
              <button key={p} onClick={() => handlePeriodChange(p as '7'|'14'|'30')}
                className={cn('px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all',
                  period === p ? 'bg-astrai-gold text-astrai-blue shadow-lg' : (isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-400 hover:text-zinc-200')
                )}>{p} dias</button>
            ))}
            <button onClick={() => setPeriod('custom')}
              className={cn('px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all',
                period === 'custom' ? 'bg-astrai-gold text-astrai-blue shadow-lg' : (isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-400 hover:text-zinc-200')
              )}>Personalizado</button>
          </div>

          {/* Inputs de data para período personalizado */}
          {period === 'custom' && (
            <div className="flex gap-2">
              <input type="date" value={customFrom} onChange={e => { setFrom(e.target.value); }}
                className={cn('px-3 py-2 rounded-xl text-xs border text-zinc-900', isLight ? 'bg-white border-zinc-200' : 'bg-white/10 border-white/20')} />
              <input type="date" value={customTo} onChange={e => { setTo(e.target.value); }}
                className={cn('px-3 py-2 rounded-xl text-xs border text-zinc-900', isLight ? 'bg-white border-zinc-200' : 'bg-white/10 border-white/20')} />
            </div>
          )}

          {/* View toggle */}
          <div className={cn('flex p-1 rounded-2xl border shadow-inner', isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-black/40 border-white/5')}>
            <button onClick={() => setView('weekly')} className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2',
              view==='weekly' ? 'bg-astrai-gold text-astrai-blue shadow-lg' : (isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-400 hover:text-zinc-200')
            )}><LayoutGrid className="w-4 h-4" /> Semana</button>
            <button onClick={() => setView('list')} className={cn('px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2',
              view==='list' ? 'bg-astrai-gold text-astrai-blue shadow-lg' : (isLight ? 'text-zinc-400 hover:text-zinc-600' : 'text-zinc-400 hover:text-zinc-200')
            )}><ListIcon className="w-4 h-4" /> Dia</button>
          </div>

          <button
            onClick={() => { setRescheduleTarget(undefined); setBookingOpen(true); }}
            className={cn('flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95 border',
            isAstraiBrand ? 'bg-astrai-gold text-astrai-blue border-astrai-gold shadow-astrai-gold/20' : (isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white text-black border-white')
          )}>
            <Plus className="w-4 h-4" /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Insights */}
      <div className="flex flex-wrap gap-4 shrink-0">
        {renderInsightCard('Agendamentos', appointments.length, <Briefcase className="w-5 h-5" />, 'gold')}
        {renderInsightCard('Confirmados', confirmed, <CalendarIcon className="w-5 h-5" />, 'blue')}
        {renderInsightCard('Valor Total', `R$ ${totalVal.toLocaleString('pt-BR')}`, <TrendingUp className="w-5 h-5" />, 'emerald')}
      </div>

      {/* Main */}
      <div className="flex-1 relative overflow-auto">
        {view === 'weekly' ? renderGrid() : renderList()}
      </div>
    </div>
    </>
  );
}
