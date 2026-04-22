/**
 * Portal de Agendamento — Laço
 * Design: Front-Agendador (DionyCavalcante)
 * API: preservada do agendar.html original
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  MoreVertical,
  PlayCircle,
  Sparkles,
  Bolt,
  ShieldCheck,
  Stethoscope,
  Building2,
  Cpu,
  Calendar,
  Edit3,
  CheckCircle,
  Eye,
  MapPin,
  Star,
  MessageCircle,
  Check,
  Leaf,
  ChevronRight,
  ChevronLeft,
  Clock,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

// ─── Constantes de roteamento ──────────────────────────────────────────────
const pathParts = window.location.pathname.split('/').filter(Boolean);
const SLUG = pathParts[0] || '';
const API = window.location.origin;

// ─── Types ─────────────────────────────────────────────────────────────────
type Step = 'loading' | 'login' | 'gallery' | 'offer' | 'booking' | 'success' | 'exit' | 'appointments';

interface ClinicData {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  address: string | null;
}

interface Procedure {
  id: string;
  name: string;
  duration: number;
  price?: number;
  price_old?: number;
  video_url?: string;
  payment_note?: string;
  reveal_delay?: number;
  description?: string;
  headline?: string;
  subheadline?: string;
  benefit_1_title?: string;
  benefit_1_desc?: string;
  benefit_2_title?: string;
  benefit_2_desc?: string;
  benefit_3_title?: string;
  benefit_3_desc?: string;
  photo_mode?: 'before_after' | 'results';
  // Fase 2 — campos da página de procedimento
  category?: string;
  authority_note?: string;
  main_pain?: string;
  emotional_desire?: string;
  day_to_day_fit?: string;
  how_it_works?: string;
  faq_session_duration?: string;
  faq_result_duration?: string;
  faq_pain_discomfort?: string;
  faq_maintenance?: string;
  faq_aftercare?: string;
  closing_note?: string;
}

interface PortalSettings {
  reveal_delay: number;
  show_price: boolean;
  greeting_msg: string;
}

interface Slot {
  time: string;
  taken: boolean;
}

type Photo = { url: string; rotation: number; position_x?: number; position_y?: number };
type ApiPhoto = Photo & { side: string };
type ProcPhotos = Record<string, { before: Photo[]; after: Photo[]; carousel: Photo[] }>;

interface BookingFormData {
  name: string;
  whatsapp: string;
  date: string;      // YYYY-MM-DD (para API)
  dateLabel: string; // "15 de Maio" (para exibição)
  time: string;
}

interface MyAppointment {
  id: string;
  procedure_id: string;
  procedure_name: string;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'done';
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtPrice(cents?: number | null): string | null {
  if (!cents) return null;
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter((w) => /^[A-ZÀ-Ú]/i.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function photoUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('data:') || url.startsWith('http') ? url : `${API}${url}`;
}

function formatPhoneDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ─── API ───────────────────────────────────────────────────────────────────
async function apiInitPortal() {
  const [portalRes, settingsRes] = await Promise.all([
    fetch(`${API}/api/portal/${SLUG}`),
    fetch(`${API}/api/settings?slug=${SLUG}`).catch(() => null),
  ]);
  if (!portalRes.ok) throw new Error('portal not found');
  const data = await portalRes.json();

  let settings: PortalSettings = { reveal_delay: 5, show_price: true, greeting_msg: 'Escolha o procedimento que te interessa:' };
  if (settingsRes?.ok) {
    const s = await settingsRes.json();
    settings = {
      reveal_delay: s.reveal_delay || 5,
      show_price: s.show_price !== false,
      greeting_msg: s.greeting_msg || settings.greeting_msg,
    };
  }
  return { clinic: data.clinic as ClinicData, procedures: (data.procedures || []) as Procedure[], settings };
}

async function apiLoadPhotos(procedures: Procedure[]): Promise<ProcPhotos> {
  const results = await Promise.allSettled(
    procedures.map((p) =>
      fetch(`${API}/api/upload/procedure/${p.id}/photos`)
        .then((r) => (r.ok ? r.json() : []))
        .then((photos: ApiPhoto[]) => ({
          id: p.id,
          before:   photos.filter((x) => x.side === 'before').map((x)   => ({ url: x.url, rotation: x.rotation || 0, position_x: x.position_x, position_y: x.position_y })),
          after:    photos.filter((x) => x.side === 'after').map((x)    => ({ url: x.url, rotation: x.rotation || 0, position_x: x.position_x, position_y: x.position_y })),
          carousel: photos.filter((x) => x.side === 'carousel').map((x) => ({ url: x.url, rotation: x.rotation || 0, position_x: x.position_x, position_y: x.position_y })),
        }))
    )
  );
  const map: ProcPhotos = {};
  results.forEach((r) => {
    if (r.status === 'fulfilled') map[r.value.id] = { before: r.value.before, after: r.value.after, carousel: r.value.carousel };
  });
  return map;
}

async function apiIdentify(name: string, phone: string): Promise<string | null> {
  try {
    const r = await fetch(`${API}/api/portal/${SLUG}/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone }),
    });
    if (r.ok) {
      const d = await r.json();
      return d.lead_id ?? null;
    }
  } catch {}
  return null;
}

async function apiTrack(leadId: string, procedureId: string) {
  fetch(`${API}/api/portal/${SLUG}/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lead_id: leadId, procedure_id: procedureId }),
  }).catch(() => {});
}

async function apiFetchSlots(date: string, procedureId: string): Promise<Slot[]> {
  const r = await fetch(`${API}/api/portal/${SLUG}/slots?date=${date}&procedure_id=${procedureId}`);
  const data = await r.json();
  if (data.reason === 'closed' || !data.slots?.length) return [];
  return data.slots as Slot[];
}

async function apiBook(payload: {
  lead_id: string | null;
  name: string;
  phone: string;
  procedure_id: string;
  date: string;
  time: string;
}) {
  const r = await fetch(`${API}/api/portal/${SLUG}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error('booking failed');
}

async function apiRejectReason(reason: string, name: string, phone: string, procedureId: string) {
  fetch(`${API}/api/portal/${SLUG}/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phone, procedure_id: procedureId, reject_reason: reason }),
  }).catch(() => {});
}

async function apiMyAppointments(phone: string): Promise<MyAppointment[]> {
  try {
    const r = await fetch(`${API}/api/portal/${SLUG}/appointments?phone=${phone.replace(/\D/g, '')}`);
    if (!r.ok) return [];
    return r.json();
  } catch {
    return [];
  }
}

async function apiConfirmAppointment(id: string, phone: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await fetch(`${API}/api/portal/${SLUG}/appointments/${id}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, '') }),
    });
    const d = await r.json();
    return r.ok ? { ok: true } : { ok: false, error: d.error };
  } catch {
    return { ok: false, error: 'Erro de conexão' };
  }
}

async function apiCancelAppointment(id: string, phone: string, isReschedule = false): Promise<{ ok: boolean; error?: string; code?: string }> {
  try {
    const r = await fetch(`${API}/api/portal/${SLUG}/appointments/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.replace(/\D/g, ''), ...(isReschedule && { is_reschedule: true }) }),
    });
    const d = await r.json();
    return r.ok ? { ok: true } : { ok: false, error: d.error, code: d.code };
  } catch {
    return { ok: false, error: 'Erro de conexão' };
  }
}


// ─── Header ────────────────────────────────────────────────────────────────
const Header = ({
  onBack,
  showExitIntent,
  clinicName,
}: {
  onBack?: () => void;
  showExitIntent?: () => void;
  clinicName?: string;
}) => (
  <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-outline-variant/10 h-[45px]">
    <div className="max-w-lg mx-auto px-6 h-full flex items-center justify-between">
      <button onClick={onBack} className="text-primary/50 hover:opacity-70 transition-opacity">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase text-center flex-1">
        {clinicName || 'Agendamento'}
      </h1>
      <div className="w-6" />
    </div>
  </header>
);

// ─── ExitIntent ────────────────────────────────────────────────────────────
const ExitIntent = ({
  isOpen,
  onClose,
  onSelect,
  clientName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (option: string) => void;
  clientName: string;
}) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
              <Sparkles size={32} />
            </div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight mb-3">
              {clientName ? `${clientName.split(' ')[0]}, antes de continuar...` : 'Antes de continuar...'}
            </h2>
            <p className="text-on-surface-variant text-base leading-relaxed opacity-70 mb-8">
              Sua experiência é nossa prioridade. Conte-nos por que deseja sair desta oferta.
            </p>
            <div className="w-full space-y-4">
              {[
                { title: 'Quero ver outro procedimento', desc: 'Explorar catálogo completo' },
                { title: 'Fora do meu orçamento', desc: 'Ver opções mais acessíveis' },
              ].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(opt.title)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left transition-all active:scale-[0.98] bg-white border border-outline-variant/30 rounded-2xl shadow-sm hover:shadow-md group"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-primary mb-1">{opt.title}</h3>
                    <p className="text-sm text-on-surface-variant opacity-60">{opt.desc}</p>
                  </div>
                  <ArrowLeft className="rotate-180 text-outline group-hover:text-primary transition-colors" size={20} />
                </button>
              ))}
            </div>
            <button onClick={onClose} className="mt-6 text-sm font-bold text-secondary uppercase tracking-widest">
              Voltar para a oferta
            </button>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

// ─── ExitPage ──────────────────────────────────────────────────────────────
const ExitPage = ({
  onBack,
  onSelect,
  clientName,
  clinicName,
}: {
  onBack: () => void;
  onSelect: (option: string) => void;
  clientName: string;
  clinicName: string;
}) => (
  <div className="min-h-screen bg-white flex flex-col">
    <header className="flex items-center justify-between px-6 h-[50px] shrink-0 max-w-lg mx-auto w-full">
      <button onClick={onBack} className="text-primary/50 hover:opacity-70 transition-opacity">
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase text-center flex-1">
        {clinicName}
      </h1>
      <div className="w-5" />
    </header>

    <main className="flex-1 px-6 flex flex-col items-center text-center justify-center pb-24 max-w-lg mx-auto w-full">
      <h2 className="font-serif italic text-aura-navy text-[26px] leading-tight mb-3">
        {clientName ? `${clientName.split(' ')[0]}, antes de ir...` : 'Antes de ir...'}
      </h2>
      <div className="mb-5 max-w-[240px]">
        <p className="text-aura-slate text-[12px] leading-relaxed opacity-60">
          Conte pra gente o que aconteceu!
        </p>
        <p className="text-aura-navy text-[12px] leading-relaxed font-semibold opacity-75 mt-0.5">
          Sua experiência é nossa prioridade.
        </p>
      </div>

      <div className="w-full space-y-2.5">
        {[
          { title: 'Quero ver outro procedimento', desc: 'Explorar o catálogo completo' },
          { title: 'Fora do meu orçamento', desc: 'Ver opções mais acessíveis' },
        ].map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opt.title)}
            className="w-full px-5 py-4 flex items-center justify-between text-left transition-all active:scale-[0.98] bg-white rounded-2xl group"
            style={{ border: '1px solid rgba(200,170,130,0.25)', boxShadow: '0 2px 16px rgba(26,31,44,0.05)' }}
          >
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold text-aura-navy leading-tight mb-0.5">{opt.title}</h3>
              <p className="text-[10px] text-aura-slate opacity-50 font-medium">{opt.desc}</p>
            </div>
            <ChevronRight className="text-aura-gold/60 group-hover:translate-x-1 transition-transform shrink-0 ml-3" size={16} strokeWidth={1.5} />
          </button>
        ))}
      </div>
    </main>
  </div>
);

// ─── GalleryPage ───────────────────────────────────────────────────────────
const GalleryPage = ({
  procedures,
  procPhotos,
  clinicData,
  clientName,
  onSelectProc,
  onExit,
  onShowAppointments,
}: {
  procedures: Procedure[];
  procPhotos: ProcPhotos;
  clinicData: ClinicData | null;
  clientName: string;
  onSelectProc: (proc: Procedure) => void;
  onExit: () => void;
  onShowAppointments: () => void;
}) => {
  const initials = clinicData ? getInitials(clinicData.name) : '?';
  const firstName = clientName ? clientName.split(' ')[0] : null;

  // Monta items de galeria a partir dos procedimentos reais
  const items = procedures.map((p) => {
    const photos = procPhotos[p.id] || { before: [], after: [], carousel: [] };
    const isResults = p.photo_mode === 'results';
    const mapPhoto = (photo?: Photo) => photo
      ? { url: photoUrl(photo.url), rotation: photo.rotation, position_x: photo.position_x, position_y: photo.position_y }
      : null;
    return {
      proc: p,
      isResults,
      before: isResults ? mapPhoto(photos.after[0]) : mapPhoto(photos.before[0]),
      after: isResults ? mapPhoto(photos.after[1]) : mapPhoto(photos.after[0]),
    };
  });

  return (
    <div className="min-h-screen bg-aura-soft-blue pb-12 overflow-x-hidden">
      <header className="hero-gradient rounded-b-[2.5rem] luxury-shadow relative overflow-hidden pt-6 pb-8 border-b border-white">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-aura-gold/5 rounded-full blur-3xl" />
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex items-center justify-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 border border-aura-navy/10 rounded-full flex items-center justify-center">
                <span className="text-[8px] font-bold tracking-tighter">{initials}</span>
              </div>
              <h1 className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-aura-navy/70">
                {clinicData?.name || 'Clínica'}
              </h1>
            </div>
          </div>
          <div className="relative z-10 flex items-end justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-[0.3em] text-aura-slate/50 font-bold mb-1">
                {firstName ? 'Bem-vinda de volta' : 'Bem-vinda'}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif italic text-aura-navy/90 text-2xl lowercase">olá,</span>
                {(() => {
                  const name = firstName || 'Ane';
                  return (
                    <span className="text-aura-gold leading-none" style={{ fontFamily: '"Pinyon Script", cursive' }}>
                      <span style={{ fontSize: '52px' }}>{name[0].toUpperCase()}</span>
                      <span style={{ fontSize: '42px' }}>{name.slice(1)}</span>
                    </span>
                  );
                })()}
              </div>
            </div>
            <div className="max-w-[130px] pb-1">
              <p className="text-aura-slate text-[11px] font-medium leading-tight italic border-l border-aura-gold/30 pl-3">
                Seu momento de autocuidado
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab switcher */}
      <div className="px-6 mt-4 relative z-30 max-w-2xl mx-auto">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 12px rgba(26,31,44,0.06)' }}>
          <button
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #2C2010 0%, #1A1F2C 100%)' }}
          >
            <Calendar size={12} />
            Agendar
          </button>
          <button
            onClick={onShowAppointments}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-aura-slate/60 flex items-center justify-center gap-1.5 transition-all hover:text-aura-navy"
          >
            <CheckCircle size={12} />
            Agendamentos{clientName ? `, ${clientName.split(' ')[0]}` : ''}
          </button>
        </div>
      </div>

      <main className="px-6 mt-6 relative z-20 max-w-2xl mx-auto">
        {items.length === 0 && (
          <p className="text-center text-aura-slate/50 text-sm py-16">Nenhum procedimento disponível.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map(({ proc, before, after, isResults }, idx) => (
          <motion.article
            key={proc.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onClick={() => onSelectProc(proc)}
            className="card-transition bg-white rounded-3xl overflow-hidden shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] border border-white/50 cursor-pointer"
          >
            <div className="relative h-64 flex">
              <div className="relative w-1/2 h-full overflow-hidden border-r border-white/20">
                {before ? (
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url(${before.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${before.position_x ?? 50}% ${before.position_y ?? 50}%`,
                    transform: before.rotation ? `rotate(${before.rotation}deg)` : undefined,
                    scale: (before.rotation && before.rotation % 180 !== 0) ? '1.42' : undefined,
                  }} />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">{isResults ? 'Caso 1' : 'Antes'}</div>
                )}
                <span className="absolute bottom-3 left-3 ba-label">{isResults ? 'Caso 1' : 'Antes'}</span>
              </div>
              <div className="relative w-1/2 h-full overflow-hidden">
                {after ? (
                  <div className="absolute inset-0" style={{
                    backgroundImage: `url(${after.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: `${after.position_x ?? 50}% ${after.position_y ?? 50}%`,
                    transform: after.rotation ? `rotate(${after.rotation}deg)` : undefined,
                    scale: (after.rotation && after.rotation % 180 !== 0) ? '1.42' : undefined,
                  }} />
                ) : (
                  <div className="w-full h-full bg-purple-50 flex items-center justify-center text-xs text-purple-300">{isResults ? 'Caso 2' : 'Depois'}</div>
                )}
                <span className="absolute bottom-3 right-3 ba-label">{isResults ? 'Caso 2' : 'Depois'}</span>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-xl font-bold text-aura-navy">{proc.name}</h3>
                  <p className="text-sm text-aura-slate mt-1 italic">
                    {proc.description || '"Resultado comprovado"'}
                  </p>
                </div>
                <span className="text-xs font-semibold text-aura-violet bg-aura-violet/5 px-2 py-1 rounded">
                  {proc.duration} min
                </span>
              </div>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center text-xs text-aura-slate/60 font-medium">
                  <Check className="w-4 h-4 mr-1 text-green-500" />
                  Resultados Reais
                </div>
                <div className="bg-aura-navy text-white p-3 rounded-2xl hover:bg-aura-violet transition-colors">
                  <ArrowLeft className="rotate-180" size={20} />
                </div>
              </div>
            </div>
          </motion.article>
        ))}
        </div>
      </main>

      <footer className="mt-12 px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-aura-slate/40 font-bold">
            {clinicData?.name} © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

// ─── LoadingScreen ─────────────────────────────────────────────────────────
const LoadingScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = Math.floor(Math.random() * 1500) + 1500; // 1.5–3s
    const start = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min((elapsed / duration) * 100, 100);
      setProgress(next);
      if (next === 100) {
        clearInterval(timer);
        setTimeout(onComplete, 400);
      }
    }, 50);
    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center bg-white">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-8">
        <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-4 mx-auto">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
            <Sparkles size={32} />
          </motion.div>
        </div>
        <h2 className="text-xl font-bold text-primary">Preparando sua experiência</h2>
        <p className="text-sm text-on-surface-variant mt-2">Verificando horários exclusivos...</p>
      </motion.div>
      <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden max-w-xs">
        <motion.div
          className="h-full bg-gradient-to-r from-secondary to-secondary-container"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// ─── OfferPage ─────────────────────────────────────────────────────────────
const OfferPage = ({
  selectedProc,
  procPhotos,
  portalSettings,
  clinicName,
  clinicAddress,
  clientName,
  onNext,
  onBack,
  onShowExit,
}: {
  selectedProc: Procedure | null;
  procPhotos: ProcPhotos;
  portalSettings: PortalSettings;
  clinicName: string;
  clinicAddress: string | null;
  clientName: string;
  onNext: () => void;
  onBack: () => void;
  onShowExit: () => void;
}) => {
  const [currentImg, setCurrentImg] = useState(0);
  const [showFooter, setShowFooter] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const carouselPhotos = selectedProc ? (procPhotos[selectedProc.id]?.carousel || []) : [];
  const fallbackProcPhotos = selectedProc ? [
    ...(procPhotos[selectedProc.id]?.before || []),
    ...(procPhotos[selectedProc.id]?.after || []),
  ] : [];
  const allProcPhotos: Photo[] = (carouselPhotos.length > 0 ? carouselPhotos : fallbackProcPhotos)
    .map((p) => ({ url: photoUrl(p.url), rotation: p.rotation }));
  const fallbackImages: Photo[] = [
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?q=80&w=800&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop',
  ].map((url) => ({ url, rotation: 0 }));
  const images = allProcPhotos.length >= 1 ? allProcPhotos : fallbackImages;

  const revealMs = (portalSettings.reveal_delay || 5) * 1000;

  useEffect(() => {
    const imgTimer = setInterval(() => setCurrentImg((prev) => (prev + 1) % images.length), 4000);
    const footerTimer = setTimeout(() => setShowFooter(true), revealMs);
    return () => { clearInterval(imgTimer); clearTimeout(footerTimer); };
  }, [images.length, revealMs]);

  const price = selectedProc ? fmtPrice(selectedProc.price) : null;
  const priceOld = selectedProc ? fmtPrice(selectedProc.price_old) : null;
  const discount =
    selectedProc?.price && selectedProc?.price_old
      ? Math.round(((selectedProc.price_old - selectedProc.price) / selectedProc.price_old) * 100)
      : null;

  // ── Derivações de conteúdo ──────────────────────────────────────────────
  const firstName = clientName ? clientName.split(' ')[0] : null;
  const procName = selectedProc?.name || 'este procedimento';
  const clinic = clinicName || 'a clínica';

  const headline = selectedProc?.headline ||
    (firstName
      ? `${firstName}, veja como ${procName} pode realçar o que é seu`
      : `Veja como ${procName} pode realçar sua beleza natural`);

  const subheadline = selectedProc?.subheadline ||
    (selectedProc?.description
      ? selectedProc.description.slice(0, 90) + (selectedProc.description.length > 90 ? '...' : '')
      : 'Sobrancelhas mais alinhadas, definidas e naturais — sem perder sua identidade.');

  const authorityNote = selectedProc?.authority_note ||
    `Na ${clinic}, cada atendimento começa entendendo o que realmente combina com você.`;

  // Para quem é: Fase 2 usa bullets dos campos; Fase 1 usa description
  const forWhomBullets = [
    selectedProc?.main_pain,
    selectedProc?.emotional_desire,
    selectedProc?.day_to_day_fit,
  ].filter(Boolean) as string[];

  const forWhomFallbackBullets = [
    'Para quem sente que a sobrancelha não valoriza o olhar.',
    'Para quem busca mais definição sem perder naturalidade.',
    firstName
      ? `Para quem quer se sentir pronta no dia a dia, ${firstName}, sem depender de maquiagem.`
      : 'Para quem quer se sentir pronta no dia a dia, sem depender de maquiagem.',
  ];

  const howItWorks = selectedProc?.how_it_works || null;

  const howItWorksSteps = selectedProc?.how_it_works ? null : [
    { num: '1', title: 'Avaliação personalizada', desc: 'Avaliamos o que realmente combina com você.' },
    { num: '2', title: 'Procedimento com técnica', desc: 'Depois, realizamos o procedimento com técnica e cuidado, respeitando seu desenho natural.' },
    { num: '3', title: 'Você sai orientada', desc: 'Você sai com o olhar mais definido — e sabendo como manter o resultado no dia a dia.' },
  ];

  // FAQ — 4ª pergunta: manutenção ou cuidados pós
  const faq4 = selectedProc?.faq_maintenance
    ? { q: 'Preciso de manutenção?', a: selectedProc.faq_maintenance }
    : selectedProc?.faq_aftercare
      ? { q: 'Quais cuidados preciso ter depois?', a: selectedProc.faq_aftercare }
      : { q: 'Preciso de manutenção?', a: 'Sim, de forma simples e espaçada — você será orientada.' };

  // 5ª pergunta — endereço
  const clinicLocationAnswer = clinicAddress
    ? `O atendimento é realizado na ${clinic} (${clinicAddress}). Não fazemos visitas a domicílio.`
    : `Você recebe todas as informações ao escolher seu horário.`;

  const faqItems: { q: string; a: string }[] = [
    {
      q: 'Vai ficar artificial?',
      a: selectedProc?.faq_pain_discomfort || (firstName
        ? `Não, ${firstName}. O procedimento respeita seu formato natural, evitando qualquer efeito marcado.`
        : 'Não. O procedimento respeita seu formato natural, evitando qualquer efeito marcado.'),
    },
    {
      q: 'Dói ou incomoda?',
      a: selectedProc?.faq_session_duration || 'É um processo tranquilo e confortável para a maioria das clientes.',
    },
    {
      q: 'Quanto tempo dura o resultado?',
      a: selectedProc?.faq_result_duration || 'O efeito se mantém por semanas, mantendo o olhar alinhado no dia a dia.',
    },
    faq4,
    { q: 'Onde fica a clínica?', a: clinicLocationAnswer },
  ];

  const closingNote = selectedProc?.closing_note ||
    (firstName
      ? `Antes de agendar, ${firstName}: o objetivo não é mudar quem você é. É realçar o que já existe em você.`
      : 'Antes de agendar: o objetivo não é mudar quem você é. É realçar o que já existe em você.');

  return (
    <div className="pb-64 min-h-screen flex flex-col bg-white">
      <Header onBack={onBack} showExitIntent={onShowExit} clinicName={clinicName} />
      <main className="pt-16 flex-1 flex flex-col">

        {/* ── HERO: Headline + Imagem Âncora ── */}
        <section className="px-6 pt-6 pb-8 text-center max-w-lg mx-auto w-full">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="text-secondary font-bold text-[9px] mb-4 block uppercase tracking-[0.3em]">
              {selectedProc?.category || 'Estética'}
            </span>
            <h2 className="text-[28px] font-extrabold text-primary tracking-tight leading-[1.15] mb-5">
              {headline}
            </h2>
            <p className="text-on-surface-variant text-[13px] leading-relaxed opacity-65 max-w-[270px] mx-auto">
              {subheadline}
            </p>
          </motion.div>
        </section>

        {/* Imagem âncora — card tall com overlay editorial */}
        <section className="px-5 pb-14 max-w-lg mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 0.8 }}
            className="relative rounded-[28px] overflow-hidden"
            style={{ boxShadow: '0 24px 60px -12px rgba(200,170,130,0.22)' }}
          >
            <div className="relative aspect-[4/5] overflow-hidden bg-surface-container-low">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImg}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full object-cover"
                  src={images[currentImg].url}
                  alt="Procedimento"
                  style={images[currentImg].rotation ? { transform: `rotate(${images[currentImg].rotation}deg)`, scale: images[currentImg].rotation % 180 !== 0 ? '1.4' : '1' } : undefined}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/75 via-transparent to-transparent" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentImg((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:bg-black/35 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setCurrentImg((prev) => (prev + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:bg-black/35 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
              {/* Overlay editorial */}
              <div className="absolute bottom-0 inset-x-0 p-6 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex gap-0.5">
                    {[0,1,2,3,4].map(s => <Star key={s} size={11} className="text-secondary fill-secondary" />)}
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/75">Resultado Natural</span>
                </div>
                <p className="font-serif text-white/90 italic text-[15px] leading-snug">
                  {firstName ? `Personalizado para ${firstName}.` : 'Personalizado para você.'}
                </p>
                {images.length > 1 && (
                  <div className="flex gap-1.5 mt-3">
                    {images.map((_, i) => (
                      <div key={i} className={cn('h-1 rounded-full transition-all duration-300', currentImg === i ? 'w-6 bg-white' : 'w-1.5 bg-white/35')} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Pain & Promise ── */}
        <section className="px-6 pb-20 max-w-lg mx-auto w-full">
          <div className="space-y-8 text-primary/85 leading-relaxed">
            <p className="text-[15px] leading-loose">
              {authorityNote}
            </p>
            <div className="border-l-4 border-secondary/60 pl-6 py-3 rounded-r-2xl" style={{ background: 'rgba(200,170,130,0.07)' }}>
              <h3 className="font-extrabold text-primary text-[18px] mb-3 leading-tight">
                {procName} não é apenas um procedimento.
              </h3>
              <p className="text-[13px] text-on-surface-variant leading-relaxed opacity-80">
                {firstName
                  ? `É a liberdade de acordar como você mesma, ${firstName} — com o olhar definido e pronto.`
                  : 'É a liberdade de acordar pronta — com o olhar definido e natural.'}
              </p>
            </div>
          </div>
        </section>

        {/* ── Três benefícios ── */}
        <section className="py-16 px-6" style={{ background: '#ffffff', borderTop: '1px solid rgba(198,198,206,0.12)', borderBottom: '1px solid rgba(198,198,206,0.12)' }}>
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <span className="text-[9px] uppercase tracking-[0.25em] text-secondary font-bold">por que escolher</span>
              <h3 className="text-[22px] font-extrabold text-primary mt-2 leading-tight">
                Um resultado que valoriza,{'\u00A0'}não transforma
              </h3>
            </div>
            <div className="space-y-3">
              {[
                { icon: <Sparkles size={18} />, title: selectedProc?.benefit_1_title || 'Resultado com sua identidade', desc: selectedProc?.benefit_1_desc || 'Realçamos o que você já tem — sem criar algo artificial.' },
                { icon: <Bolt size={18} />, title: selectedProc?.benefit_2_title || 'Sem complicar sua rotina', desc: selectedProc?.benefit_2_desc || 'Você mantém o efeito no dia a dia, sem depender de maquiagem.' },
                { icon: <ShieldCheck size={18} />, title: selectedProc?.benefit_3_title || 'Acompanhamento profissional', desc: selectedProc?.benefit_3_desc || 'Você é orientada em cada etapa, com segurança e clareza.' },
              ].map((benefit, idx) => (
                <div key={idx} className="bg-surface-container-low rounded-2xl px-5 py-5 flex items-start gap-4 border border-outline-variant/[0.06]">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                    {benefit.icon}
                  </div>
                  <div className="pt-1">
                    <h4 className="font-bold text-primary text-[14px] leading-snug mb-1.5">{benefit.title}</h4>
                    <p className="text-[12px] text-on-surface-variant leading-relaxed opacity-65">{benefit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Depoimento editorial — blockquote grande ── */}
        <section className="px-6 py-20 text-center max-w-lg mx-auto w-full">
          <div className="mb-8 flex justify-center">
            <div className="flex gap-1">
              {[0,1,2,3,4].map(s => <Star key={s} size={14} className="text-secondary fill-secondary opacity-75" />)}
            </div>
          </div>
          <blockquote className="font-serif text-[22px] italic mb-7 leading-snug text-primary">
            "Eu tinha medo de ficar artificial, mas o resultado foi natural — parece que sempre foi meu. Minhas amigas não sabem que é procedimento."
          </blockquote>
          <cite className="text-[9px] tracking-[0.3em] font-bold uppercase text-on-surface-variant/55 not-italic">
            — Cliente Premium
          </cite>
          <p className="text-center text-[10px] text-on-surface-variant opacity-40 mt-8 leading-relaxed">
            {firstName ? `${firstName}, cada` : 'Cada'} resultado é pensado para valorizar o seu rosto — nunca seguir um padrão.
          </p>
        </section>

        {/* ── Para quem é — seção escura ── */}
        <section className="py-20 px-6" style={{ background: '#1A1F2C' }}>
          <div className="max-w-lg mx-auto">
            <h3 className="font-extrabold text-[22px] text-white mb-10 leading-tight">
              {firstName ? `Isso é para você, ${firstName}:` : 'Isso é para você se:'}
            </h3>
            <div className="space-y-0">
              {(forWhomBullets.length > 0 ? forWhomBullets : forWhomFallbackBullets).map((bullet, i) => (
                <div key={i} className="flex gap-4 items-start pt-5 border-t border-white/[0.07]">
                  <div className="w-6 h-6 rounded-full bg-secondary/15 border border-secondary/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={11} className="text-secondary" />
                  </div>
                  <p className="text-[14px] text-white/80 font-light leading-relaxed pb-5">{bullet}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Como funciona ── */}
        <section className="px-6 py-16 max-w-lg mx-auto w-full">
          <div className="mb-7">
            <span className="text-[9px] uppercase tracking-[0.25em] text-secondary font-bold">processo</span>
            <h3 className="text-[20px] font-extrabold text-primary mt-1">
              {firstName ? `${firstName}, veja` : 'Veja'} como funciona na {clinic}
            </h3>
          </div>
          {howItWorksSteps ? (
            <div>
              {howItWorksSteps.map((step, idx) => (
                <div key={step.num} className="flex items-start gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/12 border border-secondary/20 flex items-center justify-center">
                      <span className="text-[12px] font-bold text-secondary">{step.num}</span>
                    </div>
                    {idx < howItWorksSteps.length - 1 && (
                      <div className="w-px bg-secondary/20 my-2" style={{ minHeight: 28 }} />
                    )}
                  </div>
                  <div className={cn('pt-1', idx < howItWorksSteps.length - 1 ? 'pb-8' : 'pb-0')}>
                    <p className="text-[14px] font-bold text-primary leading-snug mb-1.5">{step.title}</p>
                    <p className="text-[12px] text-on-surface-variant leading-relaxed opacity-70">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-on-surface-variant leading-relaxed opacity-80">{howItWorks}</p>
          )}
        </section>

        {/* ── FAQ em card ── */}
        <section className="px-6 pb-16 max-w-lg mx-auto w-full">
          <div className="mb-6">
            <span className="text-[9px] uppercase tracking-[0.25em] text-secondary font-bold">dúvidas</span>
            <h3 className="text-[20px] font-extrabold text-primary mt-1">Transparência Total</h3>
            {firstName && (
              <p className="text-[12px] text-on-surface-variant opacity-50 italic mt-1">
                {firstName}, não deve sobrar nenhuma dúvida.
              </p>
            )}
          </div>
          <div className="bg-surface-container-low rounded-3xl p-5 border border-outline-variant/10">
            {faqItems.map((item, idx) => (
              <div key={idx} className={cn(idx < faqItems.length - 1 && 'border-b border-outline-variant/15')}>
                <button
                  className="w-full flex justify-between items-center py-5 text-left gap-3"
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                >
                  <span className="text-[14px] font-medium text-primary">{item.q}</span>
                  <ChevronRight
                    size={14}
                    className={cn('text-secondary shrink-0 transition-transform duration-200', openFaq === idx ? 'rotate-90' : '')}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {openFaq === idx && (
                    <motion.div
                      key="answer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-[13px] text-on-surface-variant leading-relaxed pb-5 pt-0.5 opacity-75">
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* ── Fechamento editorial ── */}
        <section className="px-6 pb-10 max-w-lg mx-auto w-full text-center">
          <div className="w-8 h-px bg-secondary/30 mx-auto mb-7" />
          <div className="w-9 h-9 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <Sparkles size={15} className="text-secondary" />
          </div>
          <p className="font-serif text-[19px] italic text-primary mb-3 leading-snug max-w-[260px] mx-auto">
            {closingNote}
          </p>
          <p className="text-[9px] uppercase font-bold tracking-[0.2em] text-on-surface-variant/35 mt-5">
            {clinic} · Estética de Resultados
          </p>
        </section>

        {/* ── Escassez leve ── */}
        <section className="px-6 pb-12 max-w-lg mx-auto w-full">
          <div className="border-l-4 border-secondary/55 rounded-r-2xl pl-5 pr-5 py-6" style={{ background: 'rgba(200,170,130,0.07)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={13} className="text-secondary" />
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-secondary">disponibilidade</span>
            </div>
            <h3 className="text-[15px] font-bold text-primary mb-1.5">Atendimento com tempo e cuidado</h3>
            <p className="text-[12px] text-on-surface-variant leading-relaxed opacity-80">
              Para garantir um resultado realmente personalizado, os atendimentos são limitados por dia.
            </p>
            <p className="text-[13px] font-semibold text-secondary mt-2.5">
              Os horários disponíveis podem variar rapidamente.
            </p>
          </div>
        </section>

      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.18)] rounded-t-[2.5rem] px-8 pt-4 pb-3 h-[175px]" style={{ background: '#2C2010' }}>
        <div className="relative h-full">
          <AnimatePresence mode="wait">
            {!showFooter ? (
              <motion.div
                key="loading"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col items-center justify-center h-full space-y-4"
              >
                <div className="text-center w-full">
                  <h3 className="font-bold text-white/80 tracking-tight text-xs mb-3">
                    Preparando sua oferta personalizada
                  </h3>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: portalSettings.reveal_delay, ease: 'easeInOut' }}
                      className="h-full bg-gradient-to-r from-secondary to-secondary-container"
                    />
                  </div>
                </div>
                <div className="h-5 overflow-hidden w-full relative">
                  <motion.div
                    animate={{ y: [0, -20, -40] }}
                    transition={{ duration: portalSettings.reveal_delay, times: [0, 0.33, 0.66], ease: 'easeInOut' }}
                    className="flex flex-col items-center"
                  >
                    <p className="h-5 text-[9px] text-center text-white/50 uppercase tracking-[0.2em] font-bold flex items-center">
                      Verificando horários disponíveis...
                    </p>
                    <p className="h-5 text-[9px] text-center text-white/50 uppercase tracking-[0.2em] font-bold flex items-center">
                      Ajustando melhor opção para você...
                    </p>
                    <p className="h-5 text-[9px] text-center text-white/50 uppercase tracking-[0.2em] font-bold flex items-center">
                      Liberando acesso aos horários...
                    </p>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="flex flex-col h-full justify-center"
              >
                <div className="flex justify-between items-center w-full mb-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.2em]">Investimento</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-[20px] font-black text-white tracking-tight">{price}</span>
                      {priceOld && <span className="text-xs text-white/25 line-through">{priceOld}</span>}
                    </div>
                    {discount && <span className="text-[9px] text-white/40">{discount}% de desconto hoje</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#D4BC9A', animation: 'pulse-gold 2.5s ease-in-out infinite' }} />
                    <p className="text-[9px] text-white/45 leading-snug max-w-[120px] italic">
                      Agende enquanto temos horários disponíveis
                    </p>
                  </div>
                </div>

                <motion.button
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={onNext}
                  className="w-full rounded-lg h-[72px] px-6 font-bold uppercase tracking-widest text-[12px] flex items-center justify-center gap-3 active:scale-95 transition-all mb-2"
                  style={{ background: 'linear-gradient(135deg, #D4BC9A 0%, #B89A6A 100%)', color: '#1A1F2C', boxShadow: '0 4px 20px rgba(184,154,106,0.35)', animation: 'pulse-gold 2.5s ease-in-out infinite' }}
                >
                  <Calendar size={15} />
                  Escolher meu horário
                </motion.button>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  onClick={onBack}
                  className="w-full h-[56px] rounded-lg border border-white/20 text-white/60 text-[11px] font-semibold uppercase tracking-widest flex items-center justify-center gap-1.5 hover:border-white/35 hover:text-white/75 transition-all"
                >
                  <Edit3 size={10} />
                  Escolher outro procedimento
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </footer>
    </div>
  );
};

// ─── BookingFlow ────────────────────────────────────────────────────────────
const BookingFlow = ({
  selectedProc,
  prefillName,
  prefillPhone,
  onComplete,
  onBack,
  onShowExit,
  clinicName,
}: {
  selectedProc: Procedure | null;
  prefillName: string;
  prefillPhone: string;
  onComplete: (data: BookingFormData, rawPhone: string) => void;
  onBack: () => void;
  onShowExit: () => void;
  clinicName: string;
}) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [formData, setFormData] = useState<BookingFormData>({
    name: prefillName,
    whatsapp: prefillPhone ? formatPhoneDisplay(prefillPhone) : '',
    date: '',
    dateLabel: '',
    time: '',
  });

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [noSlots, setNoSlots] = useState(false);

  const dateSectionRef = useRef<HTMLDivElement>(null);
  const timeSectionRef = useRef<HTMLDivElement>(null);

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    setFormData((f) => ({ ...f, whatsapp: formatPhoneDisplay(digits) }));
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days: (number | null)[] = [];
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const rawPhone = formData.whatsapp.replace(/\D/g, '');
  const isStep1Valid = formData.name.length > 2 && rawPhone.length >= 10;
  const isStep2Valid = formData.date !== '';
  const isStep3Valid = formData.time !== '';

  // Auto-skip step 1 se pré-preenchido
  const autoStep1 = prefillName.length > 2 && prefillPhone.replace(/\D/g, '').length >= 10;
  const [showStep2, setShowStep2] = useState(autoStep1);
  const [showStep3, setShowStep3] = useState(false);

  useEffect(() => {
    if (isStep1Valid && !showStep2) {
      const t = setTimeout(() => {
        setShowStep2(true);
        setTimeout(() => dateSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isStep1Valid, showStep2]);

  useEffect(() => {
    if (isStep2Valid && !showStep3) {
      setShowStep3(true);
      setTimeout(() => timeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, [isStep2Valid, showStep3]);

  const handleSelectDay = async (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const label = `${day} de ${monthNames[month - 1]}`;
    setFormData((f) => ({ ...f, date: dateStr, dateLabel: label, time: '' }));
    setSlots([]);
    setNoSlots(false);
    if (!selectedProc) return;
    setLoadingSlots(true);
    try {
      const fetched = await apiFetchSlots(dateStr, selectedProc.id);
      if (fetched.length === 0) setNoSlots(true);
      else setSlots(fetched);
    } catch {
      setNoSlots(true);
    } finally {
      setLoadingSlots(false);
    }
  };

  const morningSlots = slots.filter((s) => parseInt(s.time.split(':')[0]) < 12);
  const afternoonSlots = slots.filter((s) => parseInt(s.time.split(':')[0]) >= 12);

  const handleConfirm = () => {
    if (!isStep3Valid) return;
    onComplete(formData, rawPhone);
  };

  return (
    <div className="min-h-screen bg-background pb-40">
      <Header onBack={onBack} showExitIntent={onShowExit} clinicName={clinicName} />
      <main className="pt-24 px-6 max-w-lg mx-auto w-full">
        <section className="mb-8 text-center">
          <h2 className="text-[24px] font-extrabold tracking-tight text-primary leading-tight mb-2">
            Finalize seu Agendamento
          </h2>
          {selectedProc && (
            <p className="text-on-surface-variant font-medium text-[12px]">{selectedProc.name}</p>
          )}
        </section>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map((s) => {
            const isActive = s === 1 || (s === 2 && showStep2) || (s === 3 && showStep3);
            const isCompleted = (s === 1 && isStep1Valid) || (s === 2 && isStep2Valid) || (s === 3 && isStep3Valid);
            return (
              <React.Fragment key={s}>
                <div className={cn('flex flex-col items-center gap-1 transition-opacity', !isActive && 'opacity-40')}>
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors',
                      isCompleted ? 'bg-secondary text-white' : isActive ? 'bg-secondary/20 text-secondary border-2 border-secondary' : 'bg-surface-container-highest text-on-surface'
                    )}
                  >
                    {isCompleted ? <Check size={14} strokeWidth={4} /> : s}
                  </div>
                  <span className={cn('text-[10px] font-bold uppercase tracking-tighter', isActive ? 'text-secondary' : 'text-on-surface-variant')}>
                    {s === 1 ? 'Identificação' : s === 2 ? 'Data' : 'Horário'}
                  </span>
                </div>
                {s < 3 && <div className={cn('h-[1px] w-8 mt-[-12px] transition-colors', isCompleted ? 'bg-secondary' : 'bg-outline-variant/30')} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* Step 1 */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-1.5 h-6 bg-secondary rounded-full" />
            <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">1. Seus Dados</h3>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant ml-1">Nome Completo</label>
              <input
                className="w-full h-14 px-4 bg-white border border-outline-variant/20 rounded-xl focus:border-secondary transition-all outline-none text-sm"
                placeholder="Como deseja ser chamado(a)?"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant ml-1">WhatsApp</label>
              <input
                className="w-full h-14 px-4 bg-white border border-outline-variant/20 rounded-xl focus:border-secondary transition-all outline-none text-sm"
                placeholder="(00) 00000-0000"
                type="tel"
                inputMode="numeric"
                value={formData.whatsapp}
                onChange={(e) => handlePhoneChange(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* Step 2 — Date */}
        <AnimatePresence>
          {showStep2 && (
            <motion.section
              ref={dateSectionRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 pt-8 border-t border-outline-variant/10"
            >
              <div className="flex flex-col gap-6 mb-8">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-secondary rounded-full" />
                  <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">2. Escolha a Data</h3>
                </div>
                <div className="flex items-center justify-between bg-surface-container-low/50 p-2 rounded-2xl border border-outline-variant/5">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-secondary transition-all active:scale-90"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary/40 mb-0.5">Calendário</span>
                    <span className="text-sm font-black text-primary uppercase tracking-widest">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="w-10 h-10 flex items-center justify-center hover:bg-white rounded-xl text-secondary transition-all active:scale-90"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-tr from-secondary/5 via-transparent to-aura-violet/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 border border-outline-variant/10 shadow-2xl shadow-primary/5">
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {weekDays.map((d) => (
                      <span key={d} className="text-[10px] font-black text-primary/30 uppercase text-center tracking-tighter">{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-2">
                    {getDaysInMonth(currentMonth).map((day, i) => {
                      if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const dt = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                      const isPast = dt < today;
                      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const isSelected = formData.date === dateStr;
                      return (
                        <button
                          key={i}
                          disabled={isPast}
                          onClick={() => handleSelectDay(currentMonth.getFullYear(), currentMonth.getMonth() + 1, day)}
                          className={cn(
                            'aspect-square flex flex-col items-center justify-center rounded-xl transition-all active:scale-95 text-sm relative overflow-hidden',
                            isSelected ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-110 z-10 font-black' : isPast ? 'text-on-surface-variant/20 cursor-not-allowed' : 'text-primary font-bold hover:bg-secondary/10 border border-outline-variant/5'
                          )}
                        >
                          {isSelected && (
                            <motion.div layoutId="activeDay" className="absolute inset-0 bg-gradient-to-br from-secondary to-secondary-container" />
                          )}
                          <span className="relative z-10">{day}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Step 3 — Time */}
        <AnimatePresence>
          {showStep3 && (
            <motion.section
              ref={timeSectionRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12 pt-8 border-t border-outline-variant/10"
            >
              <div className="flex items-center gap-2 mb-6">
                <span className="w-1.5 h-6 bg-secondary rounded-full" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface">3. Escolha o Horário</h3>
              </div>

              {loadingSlots && (
                <div className="flex justify-center py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                    <Sparkles size={24} className="text-secondary" />
                  </motion.div>
                </div>
              )}

              {noSlots && !loadingSlots && (
                <p className="text-center text-on-surface-variant/60 text-sm py-8">
                  Sem horários disponíveis neste dia.
                </p>
              )}

              {!loadingSlots && slots.length > 0 && (
                <div className="space-y-8">
                  {morningSlots.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-secondary"><Star size={16} /></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/50">Manhã</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {morningSlots.map((s) => (
                          <button
                            key={s.time}
                            disabled={s.taken}
                            onClick={() => !s.taken && setFormData((f) => ({ ...f, time: s.time }))}
                            className={cn(
                              'py-2.5 rounded-lg font-bold text-[12px] border transition-all active:scale-95 relative',
                              formData.time === s.time ? 'bg-secondary/5 text-secondary border-secondary border-2' : s.taken ? 'bg-gray-50 text-gray-300 line-through cursor-not-allowed' : 'bg-white text-primary border-outline-variant/15 hover:border-secondary/50'
                            )}
                          >
                            {s.time}
                            {formData.time === s.time && (
                              <div className="absolute top-0 right-0 p-0.5 bg-secondary text-white rounded-bl-lg">
                                <Check size={8} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {afternoonSlots.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-secondary"><Star size={16} /></span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface/50">Tarde</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {afternoonSlots.map((s) => (
                          <button
                            key={s.time}
                            disabled={s.taken}
                            onClick={() => !s.taken && setFormData((f) => ({ ...f, time: s.time }))}
                            className={cn(
                              'py-2.5 rounded-lg font-bold text-[12px] border transition-all active:scale-95 relative',
                              formData.time === s.time ? 'bg-secondary/5 text-secondary border-secondary border-2' : s.taken ? 'bg-gray-50 text-gray-300 line-through cursor-not-allowed' : 'bg-white text-primary border-outline-variant/15 hover:border-secondary/50'
                            )}
                          >
                            {s.time}
                            {formData.time === s.time && (
                              <div className="absolute top-0 right-0 p-0.5 bg-secondary text-white rounded-bl-lg">
                                <Check size={8} strokeWidth={4} />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        <article className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-start gap-4 mt-8">
          <div className="p-2 bg-white rounded-full text-secondary shadow-sm flex-shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-primary mb-1">Agendamento Seguro</h4>
            <p className="text-[10px] text-on-surface-variant leading-relaxed">
              Cancelamento grátis até 24h antes. Seus dados estão protegidos!
            </p>
          </div>
        </article>
      </main>

      <footer className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white/90 backdrop-blur-xl p-6 border-t border-outline-variant/10 z-50">
        <div>
          <button
            onClick={handleConfirm}
            disabled={!isStep3Valid}
            className={cn(
              'w-full h-16 rounded-full text-white font-bold tracking-widest uppercase flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 group',
              !isStep3Valid ? 'bg-surface-container-highest text-primary opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-secondary to-secondary-container shadow-secondary/20'
            )}
          >
            Confirmar Agendamento
            <CheckCircle className="group-hover:translate-x-1 transition-transform" size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};

// ─── SuccessPage ────────────────────────────────────────────────────────────
const SuccessPage = ({
  data,
  selectedProc,
  clinicData,
  onViewAppointments,
}: {
  data: BookingFormData;
  selectedProc: Procedure | null;
  clinicData: ClinicData | null;
  onViewAppointments: () => void;
}) => (
  <div className="min-h-screen bg-white flex flex-col">
    <header className="flex items-center justify-between px-6 h-[50px] shrink-0 max-w-lg mx-auto w-full">
      <div className="w-5" />
      <h1 className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase text-center flex-1">
        {clinicData?.name || ''}
      </h1>
      <div className="w-5" />
    </header>

    <main className="flex-1 px-6 pb-12 flex flex-col items-center max-w-lg mx-auto w-full">
      {/* Ícone de confirmação */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="mt-8 mb-5 w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #D4BC9A 0%, #B89A6A 100%)', boxShadow: '0 8px 24px rgba(184,154,106,0.3)' }}
      >
        <CheckCircle size={30} className="text-white" strokeWidth={2} />
      </motion.div>

      {/* Título */}
      <h2 className="font-serif italic text-aura-navy text-[28px] leading-tight text-center mb-2">
        Agendamento Confirmado!
      </h2>
      <p className="text-aura-slate text-[12px] leading-relaxed text-center max-w-[240px] opacity-70 mb-8">
        {data.name}, preparemos tudo com muito carinho para te receber!
      </p>

      {/* Card de detalhes */}
      <div className="w-full bg-white rounded-2xl p-5 mb-4"
        style={{ border: '1px solid rgba(200,170,130,0.2)', boxShadow: '0 2px 20px rgba(26,31,44,0.05)' }}>
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-aura-gold/70 mb-4 block">
          Detalhes do agendamento
        </span>
        <div className="space-y-4">
          {[
            { icon: <Eye size={16} />, label: 'Procedimento', value: selectedProc?.name || '—' },
            { icon: <Calendar size={16} />, label: 'Data e Horário', value: `${data.dateLabel} às ${data.time}h` },
            { icon: <MessageCircle size={16} />, label: 'Cliente', value: data.name },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-aura-gold/70"
                style={{ background: 'rgba(200,170,130,0.08)' }}>
                {item.icon}
              </div>
              <div>
                <p className="text-[10px] text-aura-slate/50 font-medium">{item.label}</p>
                <p className="text-[14px] font-semibold text-aura-navy leading-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ver agendamentos */}
      <button
        onClick={onViewAppointments}
        className="w-full mb-4 inline-flex items-center justify-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95"
        style={{ background: '#1A1F2C', boxShadow: '0 4px 14px rgba(26,31,44,0.25)' }}
      >
        <CheckCircle size={16} />
        Ver meus agendamentos
      </button>

      {/* Dúvidas */}
      <div className="w-full rounded-2xl px-5 py-4 text-center"
        style={{ background: 'rgba(200,170,130,0.06)', border: '1px solid rgba(200,170,130,0.15)' }}>
        <p className="text-[11px] font-semibold text-aura-navy/70 mb-0.5">Alguma dúvida?</p>
        <p className="text-[10px] text-aura-slate/50 mb-4">Estamos à disposição para qualquer ajuste.</p>
        <a
          href="https://wa.me/"
          className="inline-flex items-center gap-2 text-white text-[10px] font-bold uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95"
          style={{ background: '#25D366', boxShadow: '0 4px 14px rgba(37,211,102,0.3)' }}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Falar pelo WhatsApp
        </a>
      </div>
    </main>
  </div>
);

// ─── MyAppointmentsPage ────────────────────────────────────────────────────
const MyAppointmentsPage = ({
  clinicData,
  clientPhone,
  clientName,
  onBack,
  onReschedule,
}: {
  clinicData: ClinicData | null;
  clientPhone: string;
  clientName: string;
  onBack: () => void;
  onReschedule: (apt: MyAppointment) => void;
}) => {
  const [appointments, setAppointments] = useState<MyAppointment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);

  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function fmtDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} de ${monthNames[d.getMonth()]} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}h`;
  }

  function hoursUntil(iso: string): number {
    return (new Date(iso).getTime() - Date.now()) / 3600000;
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Aguardando', color: '#B89A6A', bg: 'rgba(184,154,106,0.12)' },
    confirmed: { label: 'Confirmado', color: '#16A34A', bg: 'rgba(22,163,74,0.1)' },
    done:      { label: 'Realizado',  color: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
  };

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  }

  function reload() {
    if (!clientPhone) return;
    setLoading(true);
    apiMyAppointments(clientPhone).then((data) => {
      setAppointments(data);
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!clientPhone) return;
    setLoading(true);
    apiMyAppointments(clientPhone).then((data) => {
      setAppointments(data);
      setLoading(false);
    });
  }, [clientPhone]);

  async function handleConfirm(apt: MyAppointment) {
    setActionLoading(apt.id + '_confirm');
    const res = await apiConfirmAppointment(apt.id, clientPhone);
    setActionLoading(null);
    if (res.ok) { showToast('Agendamento confirmado!'); reload(); }
    else showToast(res.error || 'Erro ao confirmar', true);
  }

  async function handleCancel(apt: MyAppointment) {
    if (hoursUntil(apt.scheduled_at) <= 24) {
      showToast('Não é possível cancelar com menos de 24 horas de antecedência.', true);
      return;
    }
    setActionLoading(apt.id + '_cancel');
    const res = await apiCancelAppointment(apt.id, clientPhone);
    setActionLoading(null);
    if (res.ok) { showToast('Agendamento cancelado.'); reload(); }
    else showToast(res.error || 'Erro ao cancelar', true);
  }

  function handleRescheduleClick(apt: MyAppointment) {
    if (hoursUntil(apt.scheduled_at) <= 24) {
      showToast('Não é possível remarcar com menos de 24 horas de antecedência.', true);
      return;
    }
    onReschedule(apt);
  }

  const firstName = clientName ? clientName.split(' ')[0] : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 h-[50px] shrink-0 max-w-lg mx-auto w-full">
        <button onClick={onBack} className="text-primary/50 hover:opacity-70 transition-opacity">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[10px] font-bold tracking-[0.2em] text-primary/60 uppercase text-center flex-1">
          {clinicData?.name || 'Agendamento'}
        </h1>
        <div className="w-5" />
      </header>

      {/* Tab switcher */}
      <div className="px-6 mt-2 relative z-30 max-w-lg mx-auto w-full">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 2px 12px rgba(26,31,44,0.06)' }}>
          <button
            onClick={onBack}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-aura-slate/60 flex items-center justify-center gap-1.5 transition-all hover:text-aura-navy"
          >
            <Calendar size={12} />
            Agendar
          </button>
          <button
            className="flex-1 py-2.5 rounded-xl text-[11px] font-bold text-white flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #2C2010 0%, #1A1F2C 100%)' }}
          >
            <CheckCircle size={12} />
            Agendamentos{clientName ? `, ${clientName.split(' ')[0]}` : ''}
          </button>
        </div>
      </div>

      <main className="flex-1 px-6 pb-12 max-w-lg mx-auto w-full">
        <div className="mt-6 mb-5">
          <h2 className="font-serif italic text-aura-navy text-[24px] leading-tight mb-1">
            {firstName ? `Olá, ${firstName}!` : 'Meus agendamentos'}
          </h2>
          <p className="text-aura-slate text-[12px] opacity-60">
            Seus agendamentos ativos
          </p>
        </div>

        {/* Não identificada */}
        {!clientPhone && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(200,170,130,0.08)' }}>
              <Calendar size={24} style={{ color: 'rgba(184,154,106,0.5)' }} />
            </div>
            <p className="text-aura-navy/60 font-semibold text-[14px] mb-1">Você ainda não está identificada</p>
            <p className="text-[12px]" style={{ color: 'rgba(107,114,128,0.5)' }}>
              Realize um agendamento para acompanhar seus horários aqui.
            </p>
          </div>
        )}

        {/* Loading */}
        {clientPhone && loading && (
          <div className="flex justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
              <Sparkles size={24} style={{ color: '#B89A6A' }} />
            </motion.div>
          </div>
        )}

        {/* Resultados */}
        {clientPhone && !loading && appointments !== null && (
          <>
            {appointments.length > 0 ? (
              <div className="space-y-3">
                {appointments.map((apt) => {
                  const sc = statusConfig[apt.status] || statusConfig.pending;
                  const canModify = hoursUntil(apt.scheduled_at) > 24;
                  const isDone = apt.status === 'done';
                  return (
                    <motion.div
                      key={apt.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-2xl p-4"
                      style={{ border: '1px solid rgba(200,170,130,0.15)', boxShadow: '0 2px 16px rgba(26,31,44,0.04)' }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-aura-navy leading-tight mb-1.5 truncate">
                            {apt.procedure_name}
                          </p>
                          <div className="flex items-center gap-1.5" style={{ color: 'rgba(107,114,128,0.7)' }}>
                            <Calendar size={11} />
                            <span className="text-[11px] font-medium">{fmtDate(apt.scheduled_at)}</span>
                          </div>
                        </div>
                        <span
                          className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                          style={{ color: sc.color, background: sc.bg }}
                        >
                          {sc.label}
                        </span>
                      </div>

                      {/* Ações */}
                      {!isDone && (
                        <div className="flex gap-2 pt-2" style={{ borderTop: '1px solid rgba(200,170,130,0.1)' }}>
                          {/* Confirmar */}
                          {apt.status !== 'confirmed' && (
                            <button
                              onClick={() => handleConfirm(apt)}
                              disabled={actionLoading === apt.id + '_confirm'}
                              className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                              style={{ background: 'rgba(22,163,74,0.08)', color: '#16A34A' }}
                            >
                              <Check size={11} />
                              {actionLoading === apt.id + '_confirm' ? '...' : 'Confirmar'}
                            </button>
                          )}
                          {/* Remarcar */}
                          <button
                            onClick={() => handleRescheduleClick(apt)}
                            disabled={!!actionLoading}
                            className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                            style={{
                              background: canModify ? 'rgba(184,154,106,0.1)' : 'rgba(0,0,0,0.04)',
                              color: canModify ? '#B89A6A' : 'rgba(107,114,128,0.4)',
                            }}
                          >
                            <Edit3 size={11} />
                            Remarcar
                          </button>
                          {/* Cancelar */}
                          <button
                            onClick={() => handleCancel(apt)}
                            disabled={!!actionLoading}
                            className="flex-1 py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                            style={{
                              background: canModify ? 'rgba(220,38,38,0.06)' : 'rgba(0,0,0,0.04)',
                              color: canModify ? 'rgba(220,38,38,0.7)' : 'rgba(107,114,128,0.4)',
                            }}
                          >
                            <ChevronLeft size={11} />
                            Cancelar
                          </button>
                        </div>
                      )}

                      {/* Aviso 24h */}
                      {!isDone && !canModify && (
                        <p className="text-[10px] mt-2 text-center leading-relaxed" style={{ color: 'rgba(220,38,38,0.6)' }}>
                          Cancelamento e remarcação indisponíveis pois faltam menos de 24h para o seu procedimento.{' '}
                          {clinicData?.phone ? (
                            <a
                              href={`https://wa.me/55${clinicData.phone.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#25D366', textDecoration: 'underline', fontWeight: 700 }}
                            >
                              Caso queira remarcar ou cancelar, aperte aqui e chame no WhatsApp
                            </a>
                          ) : (
                            'Entre em contato para remarcar ou cancelar.'
                          )}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(200,170,130,0.08)' }}>
                  <Calendar size={24} style={{ color: 'rgba(184,154,106,0.5)' }} />
                </div>
                <p className="text-aura-navy/60 font-semibold text-[14px] mb-1">Nenhum agendamento ativo</p>
                <p className="text-[12px]" style={{ color: 'rgba(107,114,128,0.5)' }}>
                  Que tal agendar seu próximo procedimento?
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-[12px] font-semibold shadow-lg"
            style={{
              background: toast.error ? 'rgba(220,38,38,0.92)' : 'rgba(22,163,74,0.92)',
              color: '#fff',
              backdropFilter: 'blur(8px)',
              maxWidth: '90vw',
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// ─── App ────────────────────────────────────────────────────────────────────
export default function App() {
  const [currentStep, setCurrentStep] = useState<Step>('loading');
  const [clinicData, setClinicData] = useState<ClinicData | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [procPhotos, setProcPhotos] = useState<ProcPhotos>({});
  const [portalSettings, setPortalSettings] = useState<PortalSettings>({ reveal_delay: 5, show_price: true, greeting_msg: '' });
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [leadId, setLeadId] = useState<string | null>(null);
  const [bookingResult, setBookingResult] = useState<BookingFormData | null>(null);
  const [isExitIntentOpen, setIsExitIntentOpen] = useState(false);
  const [initError, setInitError] = useState(false);
  const [reschedulingAptId, setReschedulingAptId] = useState<string | null>(null);

  // Init roda imediatamente; loading screen roda em paralelo
  // Ambos precisam terminar antes de avançar
  const initReady = useRef(false);
  const animReady = useRef(false);
  const hasQueryParams = useRef(false);

  const maybeAdvance = useCallback(() => {
    if (initReady.current && animReady.current) {
      setCurrentStep(hasQueryParams.current ? 'gallery' : 'login');
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { clinic, procedures: procs, settings } = await apiInitPortal();
        setClinicData(clinic);
        setProcedures(procs);
        setPortalSettings(settings);
        document.title = `${clinic.name} — Agendamento`;
        apiLoadPhotos(procs).then(setProcPhotos);

        const params = new URLSearchParams(window.location.search);
        const pName = params.get('name');
        const pPhone = params.get('phone');
        if (pName && pPhone) {
          hasQueryParams.current = true;
          setClientName(pName);
          setClientPhone(pPhone);
          const id = await apiIdentify(pName, pPhone);
          if (id) setLeadId(id);
        }
      } catch {
        setInitError(true);
      } finally {
        initReady.current = true;
        maybeAdvance();
      }
    })();
  }, [maybeAdvance]);

  const handleLoginComplete = async (name: string, phone: string) => {
    setClientName(name);
    setClientPhone(phone);
    const id = await apiIdentify(name, phone);
    if (id) setLeadId(id);
    setCurrentStep('gallery');
  };

  const handleLoadingAnimDone = useCallback(() => {
    animReady.current = true;
    maybeAdvance();
  }, [maybeAdvance]);

  const handleSelectProc = (proc: Procedure) => {
    setSelectedProc(proc);
    if (leadId) apiTrack(leadId, proc.id);
    setCurrentStep('offer');
  };

  const handleExitSelect = (option: string) => {
    setIsExitIntentOpen(false);
    if (selectedProc) {
      apiRejectReason(option, clientName, clientPhone, selectedProc.id);
    }
    if (option === 'Quero ver outro procedimento') {
      setCurrentStep('gallery');
    } else {
      setCurrentStep('gallery');
    }
  };

  const handleBookingComplete = async (data: BookingFormData, rawPhone: string) => {
    // Identifica o lead se ainda não identificado
    let lid = leadId;
    if (!lid) {
      setClientName(data.name);
      setClientPhone(rawPhone);
      lid = await apiIdentify(data.name, rawPhone);
      if (lid) setLeadId(lid);
    }
    await apiBook({
      lead_id: lid,
      name: data.name,
      phone: rawPhone,
      procedure_id: selectedProc!.id,
      date: data.date,
      time: data.time,
    });
    // Se é uma remarcação, cancela o agendamento antigo e volta para appointments
    if (reschedulingAptId) {
      await apiCancelAppointment(reschedulingAptId, rawPhone || clientPhone, true);
      setReschedulingAptId(null);
      setCurrentStep('appointments');
      return;
    }
    setBookingResult(data);
    setCurrentStep('success');
  };

  const handleRescheduleFromAppointments = (apt: MyAppointment) => {
    const proc = procedures.find((p) => p.id === apt.procedure_id) || {
      id: apt.procedure_id,
      name: apt.procedure_name,
      duration: 60,
    } as Procedure;
    setSelectedProc(proc);
    setReschedulingAptId(apt.id);
    setCurrentStep('booking');
  };

  return (
    <div className="min-h-screen">
      <ExitIntent
        isOpen={isExitIntentOpen}
        onClose={() => setIsExitIntentOpen(false)}
        onSelect={handleExitSelect}
        clientName={clientName}
      />

      <AnimatePresence mode="wait">
        {currentStep === 'loading' && (
          <motion.div key="loading" exit={{ opacity: 0 }}>
            <LoadingScreen onComplete={handleLoadingAnimDone} />
          </motion.div>
        )}

        {currentStep === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LoginPage
              clinicName={clinicData?.name}
              onNext={handleLoginComplete}
            />
          </motion.div>
        )}

        {currentStep === 'gallery' && (
          <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GalleryPage
              procedures={procedures}
              procPhotos={procPhotos}
              clinicData={clinicData}
              clientName={clientName}
              onSelectProc={handleSelectProc}
              onExit={() => setIsExitIntentOpen(true)}
              onShowAppointments={() => setCurrentStep('appointments')}
            />
          </motion.div>
        )}

        {currentStep === 'appointments' && (
          <motion.div key="appointments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <MyAppointmentsPage
              clinicData={clinicData}
              clientPhone={clientPhone}
              clientName={clientName}
              onBack={() => setCurrentStep('gallery')}
              onReschedule={handleRescheduleFromAppointments}
            />
          </motion.div>
        )}

        {currentStep === 'offer' && (
          <motion.div key="offer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OfferPage
              selectedProc={selectedProc}
              procPhotos={procPhotos}
              portalSettings={portalSettings}
              clinicName={clinicData?.name || ''}
              clinicAddress={clinicData?.address || null}
              clientName={clientName}
              onNext={() => setCurrentStep('booking')}
              onBack={() => setCurrentStep('exit')}
              onShowExit={() => setIsExitIntentOpen(true)}
            />
          </motion.div>
        )}

        {currentStep === 'exit' && (
          <motion.div key="exit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ExitPage
              onBack={() => setCurrentStep('offer')}
              onSelect={handleExitSelect}
              clientName={clientName}
              clinicName={clinicData?.name || ''}
            />
          </motion.div>
        )}

        {currentStep === 'booking' && (
          <motion.div key="booking" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <BookingFlow
              selectedProc={selectedProc}
              prefillName={clientName}
              prefillPhone={clientPhone}
              onComplete={handleBookingComplete}
              onBack={() => {
                if (reschedulingAptId) { setReschedulingAptId(null); setCurrentStep('appointments'); }
                else setCurrentStep('offer');
              }}
              onShowExit={() => setIsExitIntentOpen(true)}
              clinicName={clinicData?.name || ''}
            />
          </motion.div>
        )}

        {currentStep === 'success' && bookingResult && (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SuccessPage
              data={bookingResult}
              selectedProc={selectedProc}
              clinicData={clinicData}
              onViewAppointments={() => setCurrentStep('appointments')}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
