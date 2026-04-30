import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatPhoneDisplay, getPhoneForWhatsApp } from '../lib/phone';
import { AstraiTheme } from '../types';
import {
  MessageSquare, X,
  Phone, Calendar, Clock, CalendarCheck, ArrowRight, ChevronDown, Trash2,
} from 'lucide-react';
import { Lead, LeadStats } from '../services/leads';
import { Appointment } from '../services/appointments';

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

/* ── status dropdown ──────────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: 'new',       label: 'Captado',      dot: 'bg-sky-400'     },
  { value: 'link_sent', label: 'Link Enviado',  dot: 'bg-amber-400'   },
  { value: 'scheduled', label: 'Agendado',      dot: 'bg-emerald-500' },
  { value: 'confirmed', label: 'Confirmado',    dot: 'bg-emerald-500' },
  { value: 'rejected',  label: 'Não agendou',   dot: 'bg-red-500'     },
];

function StatusDropdown({ status, onChange, isLight }: { status: string; onChange(s: string): void; isLight: boolean }) {
  const [open, setOpen] = useState(false);
  const current = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0];
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all',
          isLight ? 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300' : 'bg-white/5 border-white/10 text-white hover:border-white/20'
        )}>
        <div className="flex items-center gap-2.5">
          <div className={cn('w-2 h-2 rounded-full', current.dot)} />
          {current.label}
        </div>
        <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
              transition={{ duration:0.15 }}
              className={cn('absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl border overflow-hidden shadow-2xl',
                isLight ? 'bg-white border-zinc-200' : 'bg-[#0D1F2D] border-white/10'
              )}>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={cn('w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-left transition-colors',
                    opt.value === status
                      ? (isLight ? 'bg-zinc-100 text-zinc-900' : 'bg-white/10 text-white')
                      : (isLight ? 'text-zinc-600 hover:bg-zinc-50' : 'text-zinc-400 hover:bg-white/5')
                  )}>
                  <div className={cn('w-2 h-2 rounded-full shrink-0', opt.dot)} />
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── custom inline dropdown (appointment status) ──────────────────── */
function InlineDropdown({ label, badgeCls, dot, options, onSelect, isLight }: {
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
      <button onClick={() => setOpen(o => !o)}
        className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all',
          badgeCls
        )}>
        <div className="flex items-center gap-2.5">
          <div className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
          {label}
        </div>
        <ChevronDown className={cn('w-4 h-4 opacity-60 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
              transition={{ duration: 0.12 }}
              className={cn('absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl border overflow-hidden shadow-2xl',
                isLight ? 'bg-white border-zinc-200' : 'bg-[#0D1F2D] border-white/10'
              )}>
              {options.map(opt => {
                const isSelected = opt.label === label;
                return (
                  <button key={opt.value} onClick={() => { onSelect(opt.value); setOpen(false); }}
                    className={cn('w-full flex items-center gap-2.5 px-4 py-3 text-sm font-bold text-left transition-colors',
                      isSelected
                        ? opt.badge
                        : isLight ? 'text-zinc-600 hover:bg-zinc-50' : 'text-zinc-400 hover:bg-white/5'
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

/* ── lead profile drawer ──────────────────────────────────────────── */
function LeadProfileDrawer({ lead, apts, theme, onClose, onStatusChange, onAptStatusChange, onBook, onUpdate, onDelete }: {
  lead: Lead; apts: Appointment[]; theme: AstraiTheme;
  onClose(): void; onStatusChange(s: string): void; onAptStatusChange?(aptId: string, status: string): void; onBook(): void; onUpdate?(data: { name?: string; phone?: string }): void; onDelete?(): void;
}) {
  const isLight = theme.id === 'light';
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState(lead.name);
  const [editPhone, setEditPhone] = useState(lead.phone);
  const waLink = `https://wa.me/${getPhoneForWhatsApp(lead.phone)}`;

  // computed stats
  const visits  = apts.length;
  const ltv     = apts.reduce((s, a) => s + a.value, 0);
  const lastApt  = apts.filter(a => a.status !== 'Cancelado').sort((a,b) => b.date.localeCompare(a.date))[0];
  const nextApt  = apts.filter(a => a.status === 'Confirmado' || a.status === 'Aguardando')
                       .sort((a,b) => a.date.localeCompare(b.date))[0];

  // interests: split procedure by common separators
  const interests = lead.procedure
    ? lead.procedure.split(/[·,\/]/).map(s => s.trim()).filter(Boolean)
    : [];

  // timeline events
  const history: { dot: string; title: string; desc: string; ts?: string }[] = [];
  if (lead.created_at) {
    const d = new Date(lead.created_at);
    history.push({
      dot: 'bg-zinc-500',
      title: 'Lead criado',
      desc: `${d.toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' })}, ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · via ${lead.source}`,
    });
  }
  if (lead.procedure) {
    history.push({
      dot: 'bg-astrai-gold',
      title: `Viu: ${lead.procedure}`,
      desc: 'Acessou o portal de agendamento',
    });
  }
  for (const a of [...apts].sort((a,b) => a.date.localeCompare(b.date))) {
    history.push({
      dot: a.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-400',
      title: `Agendamento ${a.status}`,
      desc: a.status === 'Confirmado' ? 'Pronto para o atendimento' : `${a.procedure} · ${a.date} às ${a.time}`,
    });
  }
  if (lead.reject_reason) {
    history.push({ dot: 'bg-red-500', title: 'Não agendou', desc: lead.reject_reason });
  }

  const sectionTitle = (label: string) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-4 h-4 rounded-full bg-astrai-gold/20 flex items-center justify-center shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-astrai-gold" />
      </div>
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-astrai-gold">{label}</span>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.aside initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className={cn('fixed right-0 top-0 bottom-0 z-50 w-[380px] flex flex-col shadow-2xl overflow-hidden',
          isLight ? 'bg-white' : 'bg-[#07131C]'
        )}>

        {/* ── Top bar ── */}
        <div className={cn('flex items-center justify-between px-5 py-3 shrink-0', isLight ? 'border-b border-zinc-100' : 'border-b border-white/5')}>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-astrai-gold">Digital Profile</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">

          {/* ── Hero ── */}
          <div className="flex flex-col items-center pt-8 pb-6 px-6">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className={cn('w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black shadow-2xl', avColor(isEditing ? editName : lead.name), 'text-white')}>
                {initials(isEditing ? editName : lead.name)}
              </div>
              <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#07131C] shadow-lg" />
            </div>

            {isEditing ? (
              <div className="w-full space-y-3">
                {/* Edit Name */}
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm font-bold text-center outline-none',
                    isLight ? 'bg-white border-zinc-200' : 'bg-white/10 border-white/20 text-white'
                  )}
                  placeholder="Nome"
                />
                {/* Edit Phone */}
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className={cn('w-full px-3 py-2 rounded-lg border text-sm font-bold text-center outline-none',
                    isLight ? 'bg-white border-zinc-200' : 'bg-white/10 border-white/20 text-white'
                  )}
                  placeholder="Telefone"
                />
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onUpdate?.({ name: editName, phone: editPhone });
                      setIsEditing(false);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-astrai-gold text-astrai-blue font-bold text-xs uppercase transition-all hover:scale-[1.02]">
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setEditName(lead.name);
                      setEditPhone(lead.phone);
                      setIsEditing(false);
                    }}
                    className={cn('flex-1 px-3 py-2 rounded-lg border font-bold text-xs uppercase transition-all',
                      isLight ? 'border-zinc-200 text-zinc-600 hover:bg-zinc-50' : 'border-white/10 text-zinc-400 hover:bg-white/5'
                    )}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Name */}
                <h2 className={cn('text-xl font-black tracking-tight text-center mb-1 group cursor-pointer', theme.textPrimary)} onClick={() => setIsEditing(true)}>
                  {lead.name} <span className="opacity-0 group-hover:opacity-50 text-xs">✎</span>
                </h2>

                {/* Phone button */}
                <div className="group cursor-pointer" onClick={() => setIsEditing(true)}>
                  <a href={waLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                    className={cn('flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs font-bold transition-all hover:border-astrai-gold/50 mt-1',
                      isLight ? 'border-zinc-200 text-zinc-600' : 'border-white/10 text-zinc-400'
                    )}>
                    <Phone className="w-3 h-3" /> {formatPhoneDisplay(lead.phone)}
                  </a>
                  <span className="opacity-0 group-hover:opacity-50 text-xs ml-2">✎</span>
                </div>
              </>
            )}
          </div>

          {/* ── Stats ── */}
          <div className={cn('mx-5 p-4 rounded-2xl border grid grid-cols-2 gap-4 mb-6',
            isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.03] border-white/5'
          )}>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Visitas</p>
              <p className={cn('text-2xl font-black', theme.textPrimary)}>{visits}<span className="text-sm ml-0.5 text-zinc-500">x</span></p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">LTV Total</p>
              <p className={cn('text-xl font-black text-astrai-gold leading-tight')}>
                <span className="text-xs">R$</span><br/>{ltv.toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="px-5 space-y-6">

            {/* ── Status Lead ── */}
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-astrai-gold mb-3">Status Lead</p>
              <StatusDropdown status={lead.status} onChange={onStatusChange} isLight={isLight} />
            </div>

            {/* ── Status do Agendamento ── */}
            {apts.length > 0 && (
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-astrai-gold mb-3">Status do Agendamento</p>
                {(() => {
                  const lastApt = apts.sort((a, b) => b.date.localeCompare(a.date))[0];
                  if (!lastApt) return null;

                  const APT_OPTIONS = [
                    { value: 'pending',   label: 'Aguardando', dot: 'bg-amber-400',   badge: 'text-amber-400 bg-amber-400/10 border-amber-400/30'   },
                    { value: 'confirmed', label: 'Confirmado', dot: 'bg-emerald-500', badge: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
                    { value: 'done',      label: 'Concluído',  dot: 'bg-sky-400',     badge: 'text-sky-400 bg-sky-400/10 border-sky-400/30'       },
                    { value: 'cancelled', label: 'Cancelado',  dot: 'bg-red-500',     badge: 'text-red-400 bg-red-400/10 border-red-400/30'       },
                  ];

                  const APT_STATUS_TO_BACKEND: Record<string, string> = {
                    Aguardando: 'pending', Pendente: 'pending',
                    Confirmado: 'confirmed', Cancelado: 'cancelled', Concluído: 'done',
                  };

                  const backendStatus = APT_STATUS_TO_BACKEND[lastApt.status] ?? 'pending';
                  const current = APT_OPTIONS.find(o => o.value === backendStatus) ?? APT_OPTIONS[0];
                  const APT_BADGE: Record<string, string> = {
                    Confirmado: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
                    Aguardando: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
                    Pendente:   'text-amber-400 bg-amber-400/10 border-amber-400/30',
                    Cancelado:  'text-red-400 bg-red-400/10 border-red-400/30',
                  };

                  return (
                    <InlineDropdown
                      label={current.label}
                      badgeCls={cn(APT_BADGE[lastApt.status] ?? APT_BADGE.Pendente, 'border')}
                      dot={current.dot}
                      options={APT_OPTIONS}
                      onSelect={(v) => onAptStatusChange?.(lastApt.id, v)}
                      isLight={isLight}
                    />
                  );
                })()}
              </div>
            )}

            {/* ── Linha de tempo ── */}
            <div>
              {sectionTitle('Linha de Tempo')}
              <div className={cn('rounded-2xl border overflow-hidden', isLight ? 'border-zinc-200' : 'border-white/5')}>
                {[
                  {
                    icon: <Calendar className="w-3.5 h-3.5" />,
                    label: 'Entrou Em',
                    value: fmtDate(lead.created_at),
                  },
                  {
                    icon: <Clock className="w-3.5 h-3.5" />,
                    label: 'Última Atualização',
                    value: fmtDate(lead.updated_at),
                  },
                  {
                    icon: <MessageSquare className="w-3.5 h-3.5" />,
                    label: 'Origem',
                    value: sourceLabel(lead.source),
                  },
                  lastApt && {
                    icon: <CalendarCheck className="w-3.5 h-3.5" />,
                    label: 'Experiência Recente',
                    value: new Date(lastApt.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}),
                  },
                  nextApt && {
                    icon: <CalendarCheck className="w-3.5 h-3.5" />,
                    label: 'Próximo Agendamento',
                    value: `${new Date(nextApt.date).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} às ${nextApt.time}`,
                  },
                ].filter(Boolean).map((item: any, i, arr) => (
                  <div key={i} className={cn('flex items-center gap-3 px-4 py-3',
                    i < arr.length - 1 ? (isLight ? 'border-b border-zinc-50' : 'border-b border-white/[0.04]') : ''
                  )}>
                    <span className="text-astrai-gold/60 shrink-0">{item.icon}</span>
                    <span className="flex-1 text-[11px] text-zinc-500 font-medium">{item.label}</span>
                    <span className={cn('text-[11px] font-black', theme.textPrimary)}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Histórico ── */}
            {history.length > 0 && (
              <div>
                {sectionTitle('Histórico')}
                <div className="space-y-3">
                  {history.map((ev, i) => (
                    <div key={i} className={cn('flex gap-3 p-4 rounded-2xl border',
                      isLight ? 'bg-zinc-50 border-zinc-100' : 'bg-white/[0.02] border-white/[0.04]'
                    )}>
                      <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', ev.dot)} />
                      <div>
                        <p className={cn('text-sm font-bold leading-tight', theme.textPrimary)}>{ev.title}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5 leading-snug">{ev.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Interesses ── */}
            {interests.length > 0 && (
              <div>
                {sectionTitle('Interesses no Portfólio')}
                <div className="flex flex-wrap gap-2">
                  {interests.map((tag, i) => (
                    <span key={i} className={cn('px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest',
                      isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                    )}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="pb-4" />
          </div>
        </div>

        {/* ── Footer CTA ── */}
        <div className={cn('px-5 py-4 shrink-0 border-t flex flex-col gap-2', isLight ? 'border-zinc-100 bg-white' : 'border-white/5 bg-[#07131C]')}>
          <button onClick={onBook}
            className="flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-astrai-gold text-astrai-blue font-black text-sm uppercase tracking-widest shadow-lg shadow-astrai-gold/30 hover:scale-[1.02] active:scale-95 transition-all">
            Agendar Novo Horário
            <ArrowRight className="w-5 h-5 stroke-[3px]" />
          </button>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className={cn('flex items-center justify-center gap-2 w-full px-6 py-2 rounded-2xl border text-xs font-bold transition-all hover:border-astrai-gold/40',
              isLight ? 'border-zinc-200 text-zinc-600' : 'border-white/10 text-zinc-400'
            )}>
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Abrir WhatsApp
          </a>

          {/* ── Excluir lead ── */}
          {onDelete && (
            confirmDelete ? (
              <div className="flex gap-2">
                <button
                  onClick={() => { onDelete(); onClose(); }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-widest hover:bg-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Confirmar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className={cn('flex-1 px-4 py-2 rounded-2xl border text-xs font-bold transition-all',
                    isLight ? 'border-zinc-200 text-zinc-500 hover:bg-zinc-50' : 'border-white/10 text-zinc-500 hover:bg-white/5'
                  )}>
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className={cn('flex items-center justify-center gap-1.5 w-full px-6 py-2 rounded-2xl border text-xs font-bold transition-all',
                  isLight ? 'border-zinc-200 text-zinc-400 hover:border-red-300 hover:text-red-500' : 'border-white/10 text-zinc-600 hover:border-red-500/30 hover:text-red-400'
                )}>
                <Trash2 className="w-3.5 h-3.5" /> Excluir Lead
              </button>
            )
          )}
        </div>
      </motion.aside>
    </>
  );
}

export default LeadProfileDrawer;
