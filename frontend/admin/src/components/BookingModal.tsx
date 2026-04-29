import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { normalizePhone } from '../lib/phone';
import { AstraiTheme } from '../types';
import {
  X, Phone, User as UserIcon, Calendar, Loader2,
  CheckCircle2, ChevronDown, UserPlus,
} from 'lucide-react';
import { getLeads, createLead } from '../services/leads';
import { getProcedures, Procedure } from '../services/procedures';
import { getSlots, createAppointment, rescheduleAppointment } from '../services/appointments';

/* ── tipos ── */
export interface RescheduleTarget {
  id: string;
  patientName: string;
  procedureName: string;
  procedureId?: string;
  date: string;
  time: string;
}

interface Props {
  theme: AstraiTheme;
  onClose(): void;
  onSuccess(): void;
  prefillLead?: { id: string; name: string };
  reschedule?: RescheduleTarget;
}

/* ── helpers ── */
function todayISO() { return new Date().toISOString().split('T')[0]; }
function onlyDigits(s: string) { return s.replace(/\D/g, ''); }
function formatPhone(digits: string) {
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
}

function SlotGrid({ slots, selected, onSelect, isLight }: {
  slots: string[]; selected: string; onSelect(t: string): void; isLight: boolean;
}) {
  if (!slots.length) return (
    <p className="text-center text-xs text-zinc-500 py-4 italic">Nenhum horário disponível nesta data.</p>
  );
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map(t => (
        <button key={t} onClick={() => onSelect(t)}
          className={cn('py-2 rounded-xl text-xs font-bold border transition-all',
            selected === t
              ? 'bg-astrai-gold text-astrai-blue border-astrai-gold shadow-lg'
              : isLight
                ? 'bg-white border-zinc-200 text-zinc-700 hover:border-astrai-gold/50'
                : 'bg-white/5 border-white/10 text-zinc-300 hover:border-astrai-gold/40'
          )}>
          {t}
        </button>
      ))}
    </div>
  );
}

export default function BookingModal({ theme, onClose, onSuccess, prefillLead, reschedule }: Props) {
  const isLight = theme.id === 'light';
  const isReschedule = !!reschedule;

  /* ── cliente por telefone ── */
  const [phoneRaw, setPhoneRaw]         = useState('');           // dígitos crus
  const [phoneStatus, setPhoneStatus]   = useState<'idle'|'searching'|'found'|'new'>('idle');
  const [foundLead, setFoundLead]       = useState<{ id: string; name: string } | null>(
    prefillLead ?? null
  );
  const [newName, setNewName]           = useState('');
  const phoneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // se prefill (vindo do perfil do cliente), pula a busca por telefone
  // mas se o id é 'new', não pula (é novo cliente)
  const hasPrefill = !!prefillLead && prefillLead.id !== 'new';

  /* ── procedimentos ── */
  const [procedures, setProcedures]   = useState<Procedure[]>([]);
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [showProcDrop, setShowProcDrop] = useState(false);

  /* ── data e slots ── */
  const [date, setDate]               = useState(reschedule?.date ?? todayISO());
  const [slots, setSlots]             = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState(reschedule?.time ?? '');

  /* ── submit ── */
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  /* ── carregar procedimentos ── */
  useEffect(() => {
    getProcedures().then(ps => {
      const active = ps.filter(p => p.active);
      setProcedures(active);
      if (reschedule?.procedureId) {
        const f = active.find(p => p.id === reschedule.procedureId);
        if (f) setSelectedProc(f);
      } else if (reschedule?.procedureName) {
        const f = active.find(p => p.name === reschedule.procedureName);
        if (f) setSelectedProc(f);
      }
    }).catch(console.error);
  }, []);

  /* ── busca por telefone ── */
  useEffect(() => {
    if (isReschedule || hasPrefill) return;
    const digits = onlyDigits(phoneRaw);
    if (digits.length < 10) {
      setPhoneStatus('idle');
      setFoundLead(null);
      return;
    }
    setPhoneStatus('searching');
    if (phoneRef.current) clearTimeout(phoneRef.current);
    phoneRef.current = setTimeout(async () => {
      try {
        const results = await getLeads({ search: digits });
        const normalized = normalizePhone(digits);
        const exact = results.find(l => normalizePhone(l.phone) === normalized);
        if (exact) {
          setFoundLead({ id: exact.id, name: exact.name });
          setPhoneStatus('found');
        } else {
          setFoundLead(null);
          setPhoneStatus('new');
        }
      } catch {
        setPhoneStatus('new');
      }
    }, 500);
    return () => { if (phoneRef.current) clearTimeout(phoneRef.current); };
  }, [phoneRaw, isReschedule, hasPrefill]);

  /* ── busca de slots ── */
  useEffect(() => {
    if (!date) return;
    setSlots([]);
    setSelectedTime('');
    setLoadingSlots(true);
    getSlots(date, selectedProc?.id)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [date, selectedProc?.id]);

  /* ── submit ── */
  async function handleSubmit() {
    setError('');
    if (!selectedTime) { setError('Selecione um horário.'); return; }

    if (isReschedule) {
      setSaving(true);
      try { await rescheduleAppointment(reschedule!.id, date, selectedTime); onSuccess(); onClose(); }
      catch (e: any) { setError(e.message ?? 'Erro ao remarcar.'); }
      finally { setSaving(false); }
      return;
    }

    if (!selectedProc) { setError('Selecione um procedimento.'); return; }

    let leadId: string;

    if (hasPrefill) {
      leadId = prefillLead!.id;
    } else if (phoneStatus === 'found' && foundLead) {
      leadId = foundLead.id;
    } else if (phoneStatus === 'new') {
      if (!newName.trim()) { setError('Informe o nome do cliente.'); return; }
      setSaving(true);
      try {
        const created = await createLead({ name: newName.trim(), phone: normalizePhone(phoneRaw) });
        leadId = created.id;
      } catch (e: any) {
        setError(e.message ?? 'Erro ao cadastrar cliente.');
        setSaving(false);
        return;
      }
    } else {
      setError('Informe o telefone do cliente.'); return;
    }

    setSaving(true);
    try {
      await createAppointment({ lead_id: leadId, procedure_id: selectedProc.id, date, time: selectedTime });
      onSuccess();
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Erro ao criar agendamento.');
    } finally {
      setSaving(false);
    }
  }

  const clientReady = hasPrefill
    || (phoneStatus === 'found' && !!foundLead)
    || (phoneStatus === 'new' && newName.trim().length > 1);

  const canSubmit = selectedTime && (isReschedule || (clientReady && !!selectedProc));

  const field = (text: string) => (
    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-2 block">{text}</span>
  );
  const inputCls = cn(
    'w-full px-4 py-3 rounded-xl border text-sm font-medium outline-none transition-all',
    isLight
      ? 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-astrai-gold/50'
      : 'bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-astrai-gold/40'
  );

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className={cn(
          'pointer-events-auto w-full max-w-md rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden',
          isLight ? 'bg-white border-zinc-200' : 'bg-[#07131C] border-white/10'
        )}>

          {/* ── Header ── */}
          <div className={cn('flex items-center justify-between px-6 py-4 border-b shrink-0',
            isLight ? 'border-zinc-100' : 'border-white/5'
          )}>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em] text-astrai-gold mb-0.5">
                {isReschedule ? 'Remarcar Agendamento' : 'Novo Agendamento'}
              </p>
              {isReschedule && (
                <p className={cn('text-sm font-bold', theme.textPrimary)}>{reschedule!.patientName}</p>
              )}
              {hasPrefill && !isReschedule && (
                <p className={cn('text-sm font-bold', theme.textPrimary)}>{prefillLead!.name}</p>
              )}
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-5">

            {/* ── Telefone (novo agendamento sem prefill) ── */}
            {!isReschedule && !hasPrefill && (
              <div>
                {field('Telefone do cliente')}

                {/* Input telefone */}
                <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                  isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10',
                  phoneStatus === 'found' && 'border-emerald-500/50',
                  phoneStatus === 'new'   && 'border-astrai-gold/40',
                )}>
                  <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input
                    type="tel"
                    value={formatPhone(phoneRaw)}
                    onChange={e => {
                      const d = onlyDigits(e.target.value).slice(0, 11);
                      setPhoneRaw(d);
                      setPhoneStatus('idle');
                      setFoundLead(null);
                      setNewName('');
                    }}
                    placeholder="(00) 00000-0000"
                    className={cn('flex-1 text-sm font-medium outline-none bg-transparent',
                      isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-600'
                    )}
                  />
                  {phoneStatus === 'searching' && <Loader2 className="w-4 h-4 animate-spin text-astrai-gold shrink-0" />}
                  {phoneStatus === 'found'     && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                  {phoneStatus === 'new'       && <UserPlus className="w-4 h-4 text-astrai-gold shrink-0" />}
                </div>

                {/* Cliente encontrado */}
                <AnimatePresence>
                  {phoneStatus === 'found' && foundLead && (
                    <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                      className={cn('mt-2 flex items-center gap-3 px-4 py-3 rounded-xl border',
                        isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/20'
                      )}>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className={cn('text-sm font-bold', theme.textPrimary)}>{foundLead.name}</p>
                        <p className="text-[10px] text-emerald-500 font-bold">Cliente encontrado</p>
                      </div>
                    </motion.div>
                  )}

                  {/* Novo cliente — pede nome */}
                  {phoneStatus === 'new' && (
                    <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-4 }}
                      className="mt-3 space-y-2">
                      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border',
                        isLight ? 'bg-amber-50 border-amber-200' : 'bg-astrai-gold/10 border-astrai-gold/20'
                      )}>
                        <UserPlus className="w-3.5 h-3.5 text-astrai-gold shrink-0" />
                        <p className="text-[10px] font-bold text-astrai-gold">Telefone não cadastrado — preencha o nome para cadastrar</p>
                      </div>
                      <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
                        isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'
                      )}>
                        <UserIcon className="w-4 h-4 text-zinc-500 shrink-0" />
                        <input
                          autoFocus
                          value={newName}
                          onChange={e => setNewName(e.target.value)}
                          placeholder="Nome completo do cliente"
                          className={cn('flex-1 text-sm font-medium outline-none bg-transparent',
                            isLight ? 'text-zinc-900 placeholder:text-zinc-400' : 'text-white placeholder:text-zinc-600'
                          )}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* ── Procedimento (novo agendamento) ── */}
            {!isReschedule && (
              <div>
                {field('Procedimento')}
                <div className="relative">
                  <button onClick={() => setShowProcDrop(o => !o)}
                    className={cn('w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-bold transition-all',
                      isLight ? 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300' : 'bg-white/5 border-white/10 text-white hover:border-white/20'
                    )}>
                    <span className={selectedProc ? '' : 'text-zinc-500 font-medium'}>
                      {selectedProc ? selectedProc.name : 'Selecionar procedimento…'}
                    </span>
                    <ChevronDown className={cn('w-4 h-4 text-zinc-500 transition-transform', showProcDrop && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {showProcDrop && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowProcDrop(false)} />
                        <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-6 }}
                          transition={{ duration: 0.15 }}
                          className={cn('absolute top-full left-0 right-0 mt-1.5 z-20 rounded-xl border overflow-hidden shadow-2xl max-h-48 overflow-y-auto scrollbar-hide',
                            isLight ? 'bg-white border-zinc-200' : 'bg-[#0D1F2D] border-white/10'
                          )}>
                          {procedures.map(p => (
                            <button key={p.id} onClick={() => { setSelectedProc(p); setShowProcDrop(false); }}
                              className={cn('w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors',
                                p.id === selectedProc?.id
                                  ? (isLight ? 'bg-zinc-100 font-bold text-zinc-900' : 'bg-white/10 font-bold text-white')
                                  : (isLight ? 'text-zinc-600 hover:bg-zinc-50' : 'text-zinc-400 hover:bg-white/5')
                              )}>
                              <span className="font-bold">{p.name}</span>
                              <span className="text-[10px] text-astrai-gold font-black">R$ {p.price.toLocaleString('pt-BR')}</span>
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* ── Procedimento info (remarcação) ── */}
            {isReschedule && (
              <div>
                {field('Procedimento')}
                <div className={cn('px-4 py-3 rounded-xl border text-sm font-bold',
                  isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-700' : 'bg-white/5 border-white/10 text-zinc-300'
                )}>
                  {reschedule!.procedureName}
                </div>
              </div>
            )}

            {/* ── Data ── */}
            <div>
              {field('Data')}
              <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border',
                isLight ? 'bg-white border-zinc-200' : 'bg-white/5 border-white/10'
              )}>
                <Calendar className="w-4 h-4 text-astrai-gold shrink-0" />
                <input type="date" value={date} min={todayISO()}
                  onChange={e => setDate(e.target.value)}
                  className={cn('flex-1 text-sm font-bold outline-none bg-transparent',
                    isLight ? 'text-zinc-900' : 'text-white [color-scheme:dark]'
                  )}
                />
              </div>
            </div>

            {/* ── Horários ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                {field('Horário disponível')}
                {loadingSlots && <Loader2 className="w-3 h-3 animate-spin text-astrai-gold -mt-2 ml-1" />}
              </div>
              {loadingSlots
                ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-astrai-gold" /></div>
                : <SlotGrid slots={slots} selected={selectedTime} onSelect={setSelectedTime} isLight={isLight} />
              }
            </div>

            {error && <p className="text-xs text-red-400 font-bold text-center">{error}</p>}
          </div>

          {/* ── Footer ── */}
          <div className={cn('px-6 py-4 border-t flex gap-3 shrink-0',
            isLight ? 'border-zinc-100 bg-white' : 'border-white/5 bg-[#07131C]'
          )}>
            <button onClick={onClose}
              className={cn('flex-1 py-3 rounded-2xl border text-sm font-bold transition-all',
                isLight ? 'border-zinc-200 text-zinc-700 hover:bg-zinc-50' : 'border-white/10 text-zinc-400 hover:bg-white/5'
              )}>
              Cancelar
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit || saving}
              className={cn(
                'flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2',
                canSubmit && !saving
                  ? 'bg-astrai-gold text-astrai-blue shadow-lg shadow-astrai-gold/30 hover:scale-[1.02] active:scale-95'
                  : 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
              )}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (isReschedule ? 'Remarcar' : 'Agendar')}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
