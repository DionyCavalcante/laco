import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatPhoneDisplay, getPhoneForWhatsApp } from '../lib/phone';
import { AstraiTheme } from '../types';
import {
  Search, User as UserIcon, MessageSquare, Trash2,
  TrendingUp, CheckCircle2, Loader2,
  ChevronDown, Plus, Copy, Check,
} from 'lucide-react';
import { getLeads, getLeadStats, deleteLead, updateLeadStatus, Lead, LeadStats } from '../services/leads';
import { getAppointments, updateAppointmentStatus, Appointment } from '../services/appointments';
import { getClinic } from '../services/settings';
import BookingModal from '../components/BookingModal';
import LeadProfileDrawer from '../components/LeadProfileDrawer';

/* ── helpers ──────────────────────────────────────────────────────── */
function fmtDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const SOURCE_LABEL: Record<string, string> = {
  whatsapp: 'WhatsApp', manual: 'Manual', instagram: 'Instagram',
  facebook: 'Facebook', site: 'Site', portal: 'Portal',
};
function sourceLabel(src: string) {
  return SOURCE_LABEL[src?.toLowerCase?.()] ?? src ?? '—';
}
function initials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
function avColor(name: string) {
  const cols = ['bg-sky-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500'];
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return cols[h % cols.length];
}

/* ── status maps ──────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  new: 'Captado', link_sent: 'Link Enviado', scheduled: 'Agendado',
  confirmed: 'Confirmado', rejected: 'Não agendou',
};
const STATUS_BADGE: Record<string, string> = {
  new:       'text-sky-400 bg-sky-400/10 border-sky-400/30',
  link_sent: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  scheduled: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  confirmed: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  rejected:  'text-red-400 bg-red-400/10 border-red-400/30',
};
const APT_BADGE: Record<string, string> = {
  Confirmado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
  Aguardando: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  Pendente:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
  Cancelado:  'text-red-400 bg-red-400/10 border-red-400/30',
};

/* ── dropdown inline reutilizável (tabela) ───────────────────────── */
function InlineDrop({ label, badgeCls, dot, options, onSelect, isLight }: {
  label: string;
  badgeCls: string;
  dot: string;
  options: { value: string; label: string; dot: string; badge: string }[];
  onSelect(v: string): void;
  isLight: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      {/* ── Trigger ── */}
      <button onClick={() => setOpen(o => !o)}
        className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all whitespace-nowrap',
          badgeCls
        )}>
        <div className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
        {label}
        <ChevronDown className={cn('w-3 h-3 opacity-60 transition-transform ml-0.5', open && 'rotate-180')} />
      </button>

      {/* ── Lista ── */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration: 0.12 }}
              className={cn('absolute top-full left-0 mt-1.5 z-20 rounded-xl border overflow-hidden shadow-2xl min-w-[160px]',
                isLight ? 'bg-white border-zinc-200' : 'bg-[#0D1F2D] border-white/10'
              )}>
              {options.map(opt => {
                const isSelected = opt.label === label;
                return (
                  <button key={opt.value} onClick={() => { onSelect(opt.value); setOpen(false); }}
                    className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-bold text-left transition-colors',
                      isSelected
                        ? opt.badge                                                          // cor do badge da opção (bg + text)
                        : isLight ? 'text-zinc-600 hover:bg-zinc-50' : 'text-zinc-300 hover:bg-white/5'
                    )}>
                    <div className={cn('w-2 h-2 rounded-full shrink-0', opt.dot)} />
                    {opt.label}
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── apt status dropdown (inline na tabela) ──────────────────────── */
const APT_OPTIONS = [
  { value: 'pending',   label: 'Aguardando', dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10'   },
  { value: 'confirmed', label: 'Confirmado', dot: 'bg-emerald-500', badge: 'text-emerald-400 bg-emerald-400/10' },
  { value: 'done',      label: 'Concluído',  dot: 'bg-sky-400',     badge: 'text-sky-400 bg-sky-400/10'       },
  { value: 'cancelled', label: 'Cancelado',  dot: 'bg-red-500',     badge: 'text-red-400 bg-red-400/10'       },
];
const APT_STATUS_TO_BACKEND: Record<string, string> = {
  Aguardando: 'pending', Pendente: 'pending',
  Confirmado: 'confirmed', Cancelado: 'cancelled', Concluído: 'done',
};

function AptDropdown({ apt, onChange, isLight }: {
  apt: Appointment; onChange(status: string): void; isLight: boolean;
}) {
  const backendStatus = APT_STATUS_TO_BACKEND[apt.status] ?? 'pending';
  const current = APT_OPTIONS.find(o => o.value === backendStatus) ?? APT_OPTIONS[0];
  return (
    <InlineDrop
      label={current.label}
      badgeCls={cn(APT_BADGE[apt.status] ?? APT_BADGE.Pendente)}
      dot={current.dot}
      options={APT_OPTIONS}
      onSelect={onChange}
      isLight={isLight}
    />
  );
}

/* ── lead status inline (tabela) — mesma base de InlineDrop ─────── */
const LEAD_OPTIONS_INLINE = [
  { value: 'new',       label: 'Captado',      dot: 'bg-sky-400',    badge: 'text-sky-400 bg-sky-400/10'         },
  { value: 'link_sent', label: 'Link Enviado',  dot: 'bg-amber-400',  badge: 'text-amber-400 bg-amber-400/10'     },
  { value: 'scheduled', label: 'Agendado',      dot: 'bg-emerald-500',badge: 'text-emerald-400 bg-emerald-400/10' },
  { value: 'confirmed', label: 'Confirmado',    dot: 'bg-emerald-500',badge: 'text-emerald-400 bg-emerald-400/10' },
  { value: 'rejected',  label: 'Não agendou',   dot: 'bg-red-500',    badge: 'text-red-400 bg-red-400/10'         },
];

function LeadStatusInline({ status, onChange, isLight }: { status: string; onChange(s: string): void; isLight: boolean }) {
  const current = LEAD_OPTIONS_INLINE.find(o => o.value === status) ?? LEAD_OPTIONS_INLINE[0];
  return (
    <InlineDrop
      label={current.label}
      badgeCls={cn(current.badge, 'border', status === 'new' ? 'border-sky-400/30' : status === 'link_sent' ? 'border-amber-400/30' : status === 'rejected' ? 'border-red-400/30' : 'border-emerald-400/30')}
      dot={current.dot}
      options={LEAD_OPTIONS_INLINE}
      onSelect={onChange}
      isLight={isLight}
    />
  );
}


/* ── main page ────────────────────────────────────────────────────── */
const FILTERS = [
  { key: 'todos',      label: 'Todos'        },
  { key: 'rejected',   label: 'Não agendaram'},
  { key: 'link_sent',  label: 'Link enviado' },
  { key: 'scheduled',  label: 'Agendados'    },
];

export default function Leads({ theme }: { theme: AstraiTheme }) {
  const [leads,     setLeads]     = useState<Lead[]>([]);
  const [aptMap,    setAptMap]    = useState<Map<string, Appointment>>(new Map());
  const [stats,     setStats]     = useState<LeadStats | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState('todos');
  const [openLead,  setOpenLead]  = useState<Lead | null>(null);
  const [openApts,  setOpenApts]  = useState<Appointment[]>([]);
  const [bookingLead, setBookingLead] = useState<{ id: string; name: string } | null>(null);
  const [slug,      setSlug]      = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const isLight = theme.id === 'light';

  useEffect(() => { getClinic().then(c => setSlug(c.slug)).catch(() => {}); }, []);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const [ls, st, apts] = await Promise.all([
        getLeads(q ? { search: q } : undefined),
        getLeadStats(),
        getAppointments(),
      ]);
      setLeads(ls);
      setStats(st);
      // Build lead_id → most recent appointment map
      const m = new Map<string, Appointment>();
      for (const a of apts) {
        if (a.leadId && (!m.has(a.leadId) || a.date > (m.get(a.leadId)!.date))) m.set(a.leadId, a);
      }
      setAptMap(m);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setTimeout(() => load(search || undefined), 400);
    return () => clearTimeout(t);
  }, [search, load]);

  async function openDetail(lead: Lead) {
    setOpenLead(lead);
    try { const apts = await getAppointments({ lead_id: lead.id }); setOpenApts(apts); }
    catch { setOpenApts([]); }
  }

  async function handleDelete(id: string) {
    await deleteLead(id);
    setLeads(p => p.filter(l => l.id !== id));
    if (openLead?.id === id) { setOpenLead(null); setOpenApts([]); }
  }

  async function handleStatus(id: string, status: string) {
    await updateLeadStatus(id, status);
    setLeads(p => p.map(l => l.id === id ? { ...l, status: status as any } : l));
    if (openLead?.id === id) setOpenLead(prev => prev ? { ...prev, status: status as any } : prev);
  }

  async function handleLeadUpdate(id: string, data: { name?: string; phone?: string }) {
    try {
      const updated = { ...openLead! };
      if (data.name) updated.name = data.name;
      if (data.phone) updated.phone = data.phone;
      // TODO: Se houver endpoint PUT /api/leads/{id}, chamar aqui
      // await updateLead(id, data);
      setOpenLead(updated);
      setLeads(p => p.map(l => l.id === id ? updated : l));
    } catch (e) {
      console.error('Erro ao atualizar lead:', e);
    }
  }

  const APT_DISPLAY: Record<string, Appointment['status']> = {
    pending: 'Aguardando', confirmed: 'Confirmado', done: 'Confirmado', cancelled: 'Cancelado',
  };
  async function handleAptStatus(leadId: string, aptId: string, status: string) {
    await updateAppointmentStatus(aptId, status as any);
    setAptMap(prev => {
      const next = new Map(prev);
      const apt = next.get(leadId);
      if (apt) next.set(leadId, { ...apt, status: APT_DISPLAY[status] ?? 'Aguardando' });
      return next;
    });
  }

  const convRate = stats?.total ? ((stats.scheduled / stats.total) * 100).toFixed(1) : '0.0';

  const visible = leads.filter(l => {
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.phone.includes(search);
    const matchFilter = filter === 'todos' || l.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <AnimatePresence>
        {openLead && (
          <LeadProfileDrawer
            lead={openLead} apts={openApts} theme={theme}
            onClose={() => { setOpenLead(null); setOpenApts([]); }}
            onStatusChange={(s) => handleStatus(openLead.id, s)}
            onAptStatusChange={(aptId, status) => handleAptStatus(openLead.id, aptId, status)}
            onBook={() => setBookingLead({ id: openLead.id, name: openLead.name })}
            onUpdate={(data) => handleLeadUpdate(openLead.id, data)}
            onDelete={() => handleDelete(openLead.id)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bookingLead && (
          <BookingModal
            theme={theme}
            prefillLead={bookingLead}
            onClose={() => setBookingLead(null)}
            onSuccess={() => { load(); setBookingLead(null); }}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col h-full p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0">
          <div>
            <h2 className={cn('text-4xl font-display font-bold tracking-tight', theme.textPrimary)}>Clientes</h2>
            <p className="text-sm font-mono text-astrai-gold uppercase tracking-[0.2em] mt-2 font-bold">Gestão de Leads & Conversões</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setBookingLead({ id: 'new', name: '' });
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all shadow-xl hover:scale-[1.02] active:scale-95 bg-astrai-gold text-astrai-blue border border-astrai-gold shadow-astrai-gold/30">
              <Plus className="w-4 h-4 stroke-[3px]" /> Novo Cliente
            </button>
            {slug && (
              <div className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl border text-sm group cursor-pointer transition-all hover:border-astrai-gold/40', isLight ? 'bg-white border-zinc-200' : 'bg-astrai-gold/5 border-astrai-gold/20')}
                onClick={() => {
                  const link = `${window.location.origin.replace(':5173', '').replace(':5174', '').replace(':5175', '')}/${slug}/agendar`;
                  navigator.clipboard.writeText(link);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-astrai-gold">Link</span>
                <span className={cn('font-mono text-[11px] truncate max-w-[260px]', theme.textSecondary)}>
                  {window.location.origin.replace(':5173', '').replace(':5174', '').replace(':5175', '')}/{slug}/agendar
                </span>
                <span className={cn('ml-auto shrink-0 transition-all opacity-0 group-hover:opacity-100', copiedLink && 'opacity-100 text-emerald-500')}>
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4 text-zinc-500" />}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          {[
            { label: 'Total Leads',  value: stats?.total ?? 0,     icon: UserIcon,     color: 'text-astrai-gold', bg: 'bg-astrai-gold/10' },
            { label: 'Link Enviado', value: stats?.link_sent ?? 0, icon: MessageSquare, color: 'text-amber-400',  bg: 'bg-amber-400/10'   },
            { label: 'Agendados',    value: stats?.scheduled ?? 0, icon: CheckCircle2,  color: 'text-emerald-400',bg: 'bg-emerald-400/10' },
            { label: 'Conversão',    value: `${convRate}%`,        icon: TrendingUp,    color: 'text-sky-400',    bg: 'bg-sky-400/10'     },
          ].map(kpi => (
            <div key={kpi.label} className={cn('p-6 rounded-[2rem] border transition-all hover:border-astrai-gold/30',
              isLight ? 'bg-white border-zinc-200 shadow-lg' : 'bg-white/[0.02] border-white/[0.05]'
            )}>
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', kpi.bg)}>
                <kpi.icon className={cn('w-4 h-4', kpi.color)} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{kpi.label}</p>
              <p className={cn('text-2xl font-black font-mono', kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className={cn('flex-1 rounded-[2rem] border overflow-hidden flex flex-col', isLight ? 'bg-white border-zinc-200' : 'bg-white/[0.02] border-white/[0.05]')}>
          {/* Toolbar */}
          <div className={cn('flex items-center gap-3 p-4 border-b flex-wrap', isLight ? 'border-zinc-100' : 'border-white/5')}>
            <div className="relative flex-1 min-w-[180px] max-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input type="text" placeholder="Buscar por nome ou telefone…" value={search} onChange={e => setSearch(e.target.value)}
                className={cn('w-full pl-9 pr-3 py-2 text-sm rounded-xl outline-none border',
                  isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/5 text-white focus:border-astrai-gold/40'
                )} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={cn('px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all',
                    filter === f.key
                      ? 'bg-astrai-gold text-astrai-blue border-astrai-gold'
                      : isLight ? 'border-zinc-200 text-zinc-500 hover:border-zinc-300' : 'border-white/10 text-zinc-500 hover:border-white/20'
                  )}>{f.label}</button>
              ))}
            </div>
          </div>

          {/* Table head */}
          <div className={cn('grid text-xs font-black uppercase tracking-[0.15em] px-5 py-3 border-b',
            isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-500' : 'bg-black/20 border-white/10 text-zinc-300'
          )} style={{ gridTemplateColumns: '40px 1.6fr 1fr 1.1fr 1fr 1fr 0.8fr 48px' }}>
            <div />
            <div>Cliente</div>
            <div>Procedimento</div>
            <div>Status Lead</div>
            <div>Agendamento</div>
            <div>Motivo</div>
            <div className="text-right">Data</div>
            <div />
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-astrai-gold" /></div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <UserIcon className="w-12 h-12 mb-3" /><p className="font-display italic text-lg">Nenhum lead encontrado</p>
              </div>
            ) : visible.map((lead, idx) => {
              const apt = aptMap.get(lead.id);
              return (
                <motion.div key={lead.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.02 }}
                  className={cn('grid items-center px-5 py-3.5 border-b transition-all group cursor-pointer',
                    isLight ? 'border-zinc-50 hover:bg-zinc-50' : 'border-white/[0.03] hover:bg-white/[0.03]'
                  )}
                  style={{ gridTemplateColumns: '40px 1.6fr 1fr 1.1fr 1fr 1fr 0.8fr 48px' }}
                  onClick={() => openDetail(lead)}>

                  {/* Avatar */}
                  <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-white text-[11px] font-black shrink-0', avColor(lead.name))}>
                    {initials(lead.name)}
                  </div>

                  {/* Cliente: nome + telefone */}
                  <div className="min-w-0 pr-3">
                    <p className={cn('text-sm font-semibold truncate group-hover:text-astrai-gold transition-colors', theme.textPrimary)}>{lead.name}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">{formatPhoneDisplay(lead.phone)}</p>
                  </div>

                  {/* Procedimento */}
                  <p className="text-sm text-zinc-400 truncate pr-3">{lead.procedure || '—'}</p>

                  {/* Status Lead — dropdown inline customizado */}
                  <LeadStatusInline
                    status={lead.status}
                    onChange={s => handleStatus(lead.id, s)}
                    isLight={isLight}
                  />

                  {/* Agendamento — dropdown inline */}
                  <div>
                    {apt ? (
                      <AptDropdown
                        apt={apt}
                        isLight={isLight}
                        onChange={s => handleAptStatus(lead.id, apt.id, s)}
                      />
                    ) : (
                      <span className="text-zinc-600 text-sm">—</span>
                    )}
                  </div>

                  {/* Motivo */}
                  <p className="text-sm text-zinc-400 truncate pr-2">
                    {lead.reject_reason || '—'}
                  </p>

                  {/* Data */}
                  <p className="text-sm text-zinc-400 text-right pr-1">{lead.time}</p>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={e => e.stopPropagation()}>
                    <button onClick={() => window.open(`https://wa.me/${getPhoneForWhatsApp(lead.phone)}`, '_blank')}
                      className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="WhatsApp">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(lead.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
