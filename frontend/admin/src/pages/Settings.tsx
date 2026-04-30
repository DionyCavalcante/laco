import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import {
  Plus, Trash2, Clock, X, Check, Loader2, Eye,
  GripVertical, Camera, HelpCircle, Trophy, ChevronRight,
} from 'lucide-react';
import { getClinic, updateClinic, getSettings, saveSettings, getHours, saveHours } from '../services/settings';
import { getProcedures, createProcedure, updateProcedure, deleteProcedure, Procedure } from '../services/procedures';
import { getProfessionals, createProfessional, updateProfessional, Professional, getProfessionalsByProcedure, setProfessionalsByProcedure, getProfessionalHours, saveProfessionalHours, getProfessionalProcedures, setProfessionalProcedures, ProfessionalHour } from '../services/professionals';

type Tab = 'procedimentos'|'profissionais'|'portal'|'horarios'|'clinica';
const TABS: { key:Tab; label:string }[] = [
  { key:'procedimentos',  label:'Procedimentos'  },
  { key:'profissionais',  label:'Profissionais'  },
  { key:'portal',         label:'Portal'         },
  { key:'horarios',       label:'Horários'       },
  { key:'clinica',        label:'Clínica'        },
];
const DAYS_LABEL = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

export default function Settings({ theme }: { theme: AstraiTheme }) {
  const [tab, setTab] = useState<Tab>('procedimentos');
  const isLight = theme.id === 'light';

  return (
    <div className="flex flex-col h-full p-8 space-y-6">
      <div>
        <h2 className={cn('text-4xl font-display font-bold tracking-tight', theme.textPrimary)}>Configurações</h2>
        <p className="text-sm font-mono text-astrai-gold uppercase tracking-[0.2em] mt-2 font-bold">Gestão da Clínica & Portal</p>
      </div>

      {/* Tab bar */}
      <div className={cn('flex p-1 rounded-2xl border w-fit shadow-inner', isLight ? 'bg-zinc-100 border-zinc-200' : 'bg-black/40 border-white/5')}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn('px-5 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all',
              tab===t.key ? 'bg-astrai-gold text-astrai-blue shadow-lg' : (isLight ? 'text-zinc-400 hover:text-zinc-700' : 'text-zinc-500 hover:text-zinc-300')
            )}>{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }} transition={{ duration:0.2 }}>
            {tab==='clinica'       && <ClinicaTab    theme={theme} isLight={isLight} />}
            {tab==='procedimentos' && <ProcedimentosTab theme={theme} isLight={isLight} />}
            {tab==='profissionais' && <ProfissionaisTab theme={theme} isLight={isLight} />}
            {tab==='portal'        && <PortalTab     theme={theme} isLight={isLight} />}
            {tab==='horarios'      && <HorariosTab   theme={theme} isLight={isLight} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Field helpers ──────────────────────────────────────────────── */
function Field({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</label>
      {children}
    </div>
  );
}
function Input({ value, onChange, placeholder, type='text', isLight }: any) {
  return (
    <input type={type} value={value} onChange={onChange} placeholder={placeholder}
      className={cn('w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all',
        isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900 focus:border-astrai-gold/50' : 'bg-white/5 border-white/10 text-white focus:border-astrai-gold/50'
      )} />
  );
}
function SaveBtn({ saving, saved, onClick }: { saving:boolean; saved:boolean; onClick():void }) {
  return (
    <button onClick={onClick} disabled={saving}
      className={cn('px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
        saved ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
        saving ? 'bg-astrai-gold/50 text-astrai-blue cursor-not-allowed' :
        'bg-astrai-gold text-astrai-blue hover:scale-105'
      )}>
      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : saved ? <Check className="w-3.5 h-3.5"/> : null}
      {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
    </button>
  );
}
function Card({ children, isLight }: { children:React.ReactNode; isLight:boolean }) {
  return (
    <div className={cn('p-8 rounded-[2rem] border', isLight ? 'bg-white border-zinc-200 shadow-lg' : 'bg-white/[0.02] border-white/[0.05]')}>
      {children}
    </div>
  );
}

/* ── Clínica ──────────────────────────────────────────────────── */
function ClinicaTab({ theme, isLight }: { theme:AstraiTheme; isLight:boolean }) {
  const [name,    setName]    = useState('');
  const [slug,    setSlug]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [address, setAddress] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    getClinic().then(c => { setName(c.name); setSlug(c.slug||''); setPhone(c.phone||''); setAddress(c.address||''); }).catch(console.error);
  }, []);

  async function save() {
    setSaving(true);
    try { await updateClinic({ name, slug, phone, address }); setSaved(true); setTimeout(() => setSaved(false), 2500); }
    catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <Card isLight={isLight}>
        <h3 className={cn('text-lg font-display font-bold mb-6', theme.textPrimary)}>Dados da Clínica</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Nome da Clínica"><Input value={name}    onChange={(e:any)=>setName(e.target.value)}    placeholder="Nome" isLight={isLight} /></Field>
          <Field label="Slug (URL)">      <Input value={slug}    onChange={(e:any)=>setSlug(e.target.value)}    placeholder="minha-clinica" isLight={isLight} /></Field>
          <Field label="Telefone">        <Input value={phone}   onChange={(e:any)=>setPhone(e.target.value)}   placeholder="(11) 99999-9999" isLight={isLight} /></Field>
          <Field label="Endereço">        <Input value={address} onChange={(e:any)=>setAddress(e.target.value)} placeholder="Rua, número..." isLight={isLight} /></Field>
        </div>
        {slug && (
          <div className={cn('mt-5 flex items-center gap-3 px-4 py-3 rounded-xl border', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-astrai-gold/5 border-astrai-gold/20')}>
            <Eye className="w-4 h-4 text-astrai-gold" />
            <span className={cn('text-[11px] font-mono truncate', theme.textSecondary)}>
              {window.location.origin.replace(':5173','').replace(':5174','').replace(':5175','')}/<span className="text-astrai-gold">{slug}</span>/agendar
            </span>
          </div>
        )}
        <div className="flex justify-end mt-6"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>
      </Card>
    </div>
  );
}

/* ── Procedimentos ─────────────────────────────────────────────── */
function ProcedimentosTab({ theme, isLight }: { theme:AstraiTheme; isLight:boolean }) {
  const [procs,     setProcs]     = useState<Procedure[]>([]);
  const [allProfs,  setAllProfs]  = useState<Professional[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState<Procedure|null>(null);
  const [modalTab,  setModalTab]  = useState<'info'|'images'|'page'>('info');
  const [form,      setForm]      = useState<Partial<Procedure>>({});
  const [selProfs,  setSelProfs]  = useState<string[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => {
    Promise.all([getProcedures(), getProfessionals()])
      .then(([p, pr]) => { setProcs(p); setAllProfs(pr); setLoading(false); })
      .catch(console.error);
  }, []);

  async function openEdit(p: Procedure) {
    setEditing(p); setForm({ ...p }); setModalTab('info');
    if (p.id) {
      try { const pp = await getProfessionalsByProcedure(p.id); setSelProfs(pp.map(x => x.id)); }
      catch { setSelProfs([]); }
    }
  }
  function openNew() {
    setEditing({} as any);
    setForm({ name:'', durationMin:60, price:0, priceOld:0, paymentNote:'', videoUrl:'', revealDelay:5, active:true });
    setSelProfs([]); setModalTab('info');
  }
  function closeModal() { setEditing(null); setSaved(false); }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        duration: form.durationMin,
        price: form.price,
        price_old: form.priceOld,
        payment_note: form.paymentNote,
        video_url: form.videoUrl,
        reveal_delay: form.revealDelay,
        category: form.category,
        subheadline: form.subheadline,
        headline: form.headline,
        authority_note: form.authorityNote,
        how_it_works: form.howItWorks,
        faq_session_duration: form.faqSessionDuration,
        faq_pain_discomfort: form.faqPainDiscomfort,
        faq_aftercare: form.faqAftercare,
        closing_note: form.closingNote,
      };
      let updated: Procedure;
      if (editing?.id) {
        updated = await updateProcedure(editing.id, payload);
        await setProfessionalsByProcedure(editing.id, selProfs);
        setProcs(p => p.map(x => x.id === updated.id ? updated : x));
      } else {
        updated = await createProcedure(payload as any);
        if (selProfs.length) await setProfessionalsByProcedure(updated.id, selProfs);
        setProcs(p => [...p, updated]);
      }
      setSaved(true); setTimeout(() => { setSaved(false); closeModal(); }, 1200);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Excluir procedimento?')) return;
    try {
      await deleteProcedure(id);
      setProcs(p => p.filter(x => x.id !== id));
    } catch (err: any) {
      alert(err.message || 'Não foi possível excluir o procedimento.');
    }
  }
  async function toggle(proc: Procedure) {
    const u = await updateProcedure(proc.id, { active: !proc.active });
    setProcs(p => p.map(x => x.id === u.id ? u : x));
  }

  const inp = cn('w-full p-4 rounded-xl border outline-none focus:border-astrai-gold/50 transition-all font-semibold text-sm',
    isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-white/[0.03] border-white/10 text-white');
  const lbl = cn('text-[10px] uppercase font-black tracking-widest ml-1', isLight ? 'text-zinc-500' : 'text-zinc-400');

  return (
    <div className="space-y-4">
      {/* ── Modal ── */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}>
            <motion.div initial={{ scale:0.95, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.95, opacity:0, y:20 }}
              className={cn('w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border flex flex-col shadow-2xl',
                isLight ? 'bg-white border-zinc-200' : 'bg-[#0A1A26] border-white/10'
              )}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={cn('px-10 py-7 flex items-center justify-between border-b', isLight ? 'border-zinc-100' : 'border-white/5')}>
                <h3 className={cn('text-xl font-black italic', theme.textPrimary)}>{editing?.id ? 'Editar procedimento' : 'Novo procedimento'}</h3>
                <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>

              {/* Tabs */}
              <div className={cn('grid grid-cols-3 border-b', isLight ? 'border-zinc-100' : 'border-white/5')}>
                {([
                  { id:'info',   label:'Informações', n:'1' },
                  { id:'images', label:'Imagens',      n:'2' },
                  { id:'page',   label:'Página',       n:'3' },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setModalTab(t.id)}
                    className={cn('py-4 flex items-center justify-center gap-3 font-bold outline-none relative transition-all',
                      modalTab === t.id ? 'text-astrai-gold' : 'text-zinc-500 hover:text-zinc-400'
                    )}>
                    <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-colors',
                      modalTab === t.id ? 'bg-astrai-gold text-astrai-blue border-astrai-gold' : 'bg-transparent border-zinc-700'
                    )}>{t.n}</span>
                    <span className="text-sm uppercase tracking-widest">{t.label}</span>
                    {modalTab === t.id && <motion.div layoutId="mTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-astrai-gold" />}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-10 space-y-7">
                <AnimatePresence mode="wait">

                  {/* ── Informações ── */}
                  {modalTab === 'info' && (
                    <motion.div key="info" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-6">
                      <div className="space-y-1.5">
                        <label className={lbl}>Nome do procedimento</label>
                        <input className={inp} value={form.name??''} onChange={e => setForm(f=>({...f, name:e.target.value}))} />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <label className={lbl}>Rótulo do badge na foto</label>
                          <span className="text-[9px] text-zinc-600 font-medium">(opcional — se vazio usa o nome)</span>
                        </div>
                        <input className={inp} placeholder="Ex: Volume Russo, Fio a Fio, Clássico..."
                          value={form.category??''} onChange={e => setForm(f=>({...f, category:e.target.value}))} />
                        <p className="text-[10px] text-zinc-500 ml-1">Aparece como etiqueta sutil no canto da imagem na lista de procedimentos</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className={lbl}>Texto abaixo do nome no agendamento</label>
                        <input className={inp} placeholder='"Sobrancelhas Perfeitas"'
                          value={form.subheadline??''} onChange={e => setForm(f=>({...f, subheadline:e.target.value}))} />
                        <p className="text-[10px] text-zinc-500 ml-1">Aparece no card do procedimento, logo abaixo do nome.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className={lbl}>Duração (minutos)</label>
                          <input className={inp} type="number" value={form.durationMin??60}
                            onChange={e => setForm(f=>({...f, durationMin:Number(e.target.value)}))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lbl}>Preço normal (R$)</label>
                          <input className={inp} type="number" value={form.priceOld??0}
                            onChange={e => setForm(f=>({...f, priceOld:Number(e.target.value)}))} />
                          <p className="text-[10px] text-zinc-500 ml-1">Aparece riscado no portal</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className={lbl}>Preço com desconto (R$)</label>
                          <input className={inp} type="number" value={form.price??0}
                            onChange={e => setForm(f=>({...f, price:Number(e.target.value)}))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className={lbl}>Condição de pagamento</label>
                          <input className={inp} placeholder="ou 3x de R$ 116,67 sem juros"
                            value={form.paymentNote??''} onChange={e => setForm(f=>({...f, paymentNote:e.target.value}))} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className={lbl}>Profissional(is) responsável(is) *</label>
                        <div className={cn('p-4 rounded-xl border space-y-2', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/10')}>
                          {allProfs.length === 0
                            ? <p className="text-[11px] text-zinc-500">Nenhum profissional cadastrado</p>
                            : allProfs.map(pr => (
                              <label key={pr.id} className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={selProfs.includes(pr.id)}
                                  onChange={e => setSelProfs(prev => e.target.checked ? [...prev, pr.id] : prev.filter(x => x !== pr.id))}
                                  className="w-4 h-4 rounded accent-astrai-gold" />
                                <span className={cn('text-sm font-semibold', theme.textPrimary)}>{pr.name}</span>
                              </label>
                            ))
                          }
                        </div>
                        <p className="text-[10px] text-zinc-500 ml-1">
                          Selecione quem pode realizar este procedimento
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between ml-1">
                          <label className={lbl}>Delay para revelar o preço (segundos)</label>
                          <span className="text-astrai-gold font-mono font-bold text-xs">{form.revealDelay ?? 5}s</span>
                        </div>
                        <input type="range" min={0} max={30} step={1} value={form.revealDelay ?? 5}
                          onChange={e => setForm(f => ({...f, revealDelay: Number(e.target.value)}))}
                          className="w-full accent-astrai-gold" />
                        <p className="text-[10px] text-zinc-500 ml-1">O cliente assiste ao vídeo por este tempo antes de ver o preço</p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 ml-1">
                          <label className={lbl}>Link do vídeo (YouTube ou Vimeo)</label>
                          <span className={cn('px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tighter', isLight ? 'bg-zinc-200 text-zinc-500' : 'bg-zinc-800 text-zinc-400')}>em breve</span>
                        </div>
                        <input className={inp} placeholder="https://youtube.com/watch?v=..."
                          value={form.videoUrl??''} onChange={e => setForm(f=>({...f, videoUrl:e.target.value}))} />
                      </div>
                    </motion.div>
                  )}

                  {/* ── Imagens ── */}
                  {modalTab === 'images' && (
                    <motion.div key="images" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-10">
                      <div className="space-y-4">
                        <label className={lbl}>Fotos da página de agendamento — Antes e Depois</label>
                        <div className="grid grid-cols-2 gap-6">
                          {['Antes', 'Depois'].map(label => (
                            <div key={label} className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">{label}</span>
                                <button className="text-astrai-gold text-[9px] font-black uppercase">+ Adicionar</button>
                              </div>
                              <div className={cn('aspect-square rounded-[2rem] border border-dashed flex flex-col items-center justify-center gap-3 group cursor-pointer hover:border-astrai-gold/50 transition-all',
                                isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.02] border-white/10'
                              )}>
                                <Camera className="w-8 h-8 text-zinc-600 group-hover:text-astrai-gold transition-colors" />
                                <span className="text-[9px] text-zinc-600 font-black uppercase">Upload Foto</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className={lbl}>Carrossel da página do procedimento</label>
                          <button className="text-astrai-gold text-[9px] font-black uppercase">+ Adicionar</button>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {[1,2,3].map(i => (
                            <div key={i} className={cn('aspect-[4/5] rounded-2xl border border-dashed flex items-center justify-center group cursor-pointer hover:border-astrai-gold/50 transition-all',
                              isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.02] border-white/10'
                            )}>
                              <Camera className="w-6 h-6 text-zinc-600 group-hover:text-astrai-gold transition-colors" />
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-zinc-600 ml-1">Carrossel de imagens · se vazio, usa as fotos antes/depois · Máx. 10</p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Página ── */}
                  {modalTab === 'page' && (
                    <motion.div key="page" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-7">
                      <div className={cn('p-4 rounded-xl flex flex-wrap gap-4', isLight ? 'bg-zinc-100' : 'bg-white/5')}>
                        {[
                          ['{nome}', 'nome da cliente'],
                          ['**palavra**', 'negrito'],
                          ['==palavra==', 'destaque'],
                        ].map(([code, desc]) => (
                          <div key={code} className="flex items-center gap-2">
                            <span className="text-astrai-gold font-mono text-[10px]">{code}</span>
                            <span className="text-[10px] text-zinc-500 font-bold">{desc}</span>
                          </div>
                        ))}
                      </div>

                      {/* Título */}
                      <div className={cn('p-6 rounded-2xl border space-y-4', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/5')}>
                        <h4 className={cn('text-[10px] uppercase font-black tracking-widest flex items-center gap-2', theme.textPrimary)}>
                          <Plus className="w-3.5 h-3.5 text-astrai-gold" /> Título da página
                        </h4>
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-zinc-500">Headline</label>
                            <input className={cn('w-full p-3 rounded-lg border outline-none text-sm font-medium',
                              isLight ? 'bg-white border-zinc-200 text-zinc-900 focus:border-astrai-gold/40' : 'bg-[#0A1A26] border-white/10 text-white focus:border-astrai-gold/40'
                            )} value={form.headline??''} onChange={e => setForm(f=>({...f, headline:e.target.value}))} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] uppercase font-bold text-zinc-500">Como funciona</label>
                            <textarea rows={3} className={cn('w-full p-3 rounded-lg border outline-none text-sm font-medium resize-none',
                              isLight ? 'bg-white border-zinc-200 text-zinc-900 focus:border-astrai-gold/40' : 'bg-[#0A1A26] border-white/10 text-white focus:border-astrai-gold/40'
                            )} value={form.howItWorks??''} onChange={e => setForm(f=>({...f, howItWorks:e.target.value}))} />
                          </div>
                        </div>
                      </div>

                      {/* Autoridade */}
                      <div className={cn('p-6 rounded-2xl border space-y-4', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/5')}>
                        <h4 className={cn('text-[10px] uppercase font-black tracking-widest flex items-center gap-2', theme.textPrimary)}>
                          <Trophy className="w-3.5 h-3.5 text-astrai-gold" /> Autoridade
                        </h4>
                        <textarea rows={4} className={cn('w-full p-3 rounded-lg border outline-none text-sm font-medium resize-none',
                          isLight ? 'bg-white border-zinc-200 text-zinc-900 focus:border-astrai-gold/40' : 'bg-[#0A1A26] border-white/10 text-white focus:border-astrai-gold/40'
                        )} value={form.authorityNote??''} onChange={e => setForm(f=>({...f, authorityNote:e.target.value}))} />
                      </div>

                      {/* FAQ + Cuidados */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={cn('p-6 rounded-2xl border space-y-4', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/5')}>
                          <h4 className={cn('text-[10px] uppercase font-black tracking-widest flex items-center gap-2', theme.textPrimary)}>
                            <HelpCircle className="w-3.5 h-3.5 text-astrai-gold" /> Dúvidas rápidas
                          </h4>
                          <div className="space-y-3">
                            <input placeholder="Quanto tempo leva?" value={form.faqSessionDuration??''}
                              onChange={e => setForm(f=>({...f, faqSessionDuration:e.target.value}))}
                              className={cn('w-full p-3 rounded-lg border text-[11px] outline-none',
                                isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/5 text-white')} />
                            <input placeholder="Dói ou incomoda?" value={form.faqPainDiscomfort??''}
                              onChange={e => setForm(f=>({...f, faqPainDiscomfort:e.target.value}))}
                              className={cn('w-full p-3 rounded-lg border text-[11px] outline-none',
                                isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/5 text-white')} />
                          </div>
                        </div>
                        <div className={cn('p-6 rounded-2xl border space-y-4', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/5')}>
                          <h4 className={cn('text-[10px] uppercase font-black tracking-widest flex items-center gap-2', theme.textPrimary)}>
                            <Clock className="w-3.5 h-3.5 text-astrai-gold" /> Cuidados pós
                          </h4>
                          <textarea placeholder="Liste os cuidados..." rows={4} value={form.faqAftercare??''}
                            onChange={e => setForm(f=>({...f, faqAftercare:e.target.value}))}
                            className={cn('w-full p-3 rounded-lg border text-[11px] resize-none outline-none',
                              isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/5 text-white')} />
                        </div>
                      </div>

                      {/* Nota de fechamento */}
                      <div className="space-y-1.5">
                        <label className={lbl}>Nota de fechamento</label>
                        <input className={cn('w-full p-3 rounded-lg border outline-none text-sm font-medium',
                          isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-[#0A1A26] border-white/10 text-white'
                        )} value={form.closingNote??''} onChange={e => setForm(f=>({...f, closingNote:e.target.value}))} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className={cn('px-10 py-6 border-t flex justify-between', isLight ? 'border-zinc-100 bg-zinc-50' : 'border-white/5 bg-black/10')}>
                <button onClick={closeModal} className="px-8 py-3 rounded-xl text-zinc-500 font-bold text-xs hover:text-white transition-all uppercase tracking-widest border border-transparent hover:border-white/10">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className={cn('px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg',
                    saved ? 'bg-emerald-500 text-white' : 'bg-astrai-gold text-astrai-blue shadow-astrai-gold/20 hover:scale-105 active:scale-95',
                    saving && 'opacity-60 cursor-not-allowed'
                  )}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                  {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar procedimento'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista ── */}
      <div className={cn('rounded-[2rem] border overflow-hidden', isLight ? 'bg-white border-zinc-200 shadow-lg' : 'bg-white/[0.02] border-white/[0.05]')}>
        <div className={cn('flex items-center justify-between px-8 py-6 border-b', isLight ? 'border-zinc-100 bg-zinc-50' : 'border-white/5')}>
          <div>
            <p className={cn('font-bold italic', theme.textPrimary)}>Procedimentos disponíveis</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono uppercase tracking-widest">Esses procedimentos aparecerão no portal de agendamento</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-astrai-gold text-astrai-blue text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-astrai-gold/20">
            <Plus className="w-4 h-4" /> Novo procedimento
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-astrai-gold" /></div>
        ) : (
          <div>
            {procs.map((proc, i) => (
              <div key={proc.id} className={cn('group flex items-center justify-between px-8 py-5 transition-colors',
                i < procs.length - 1 ? (isLight ? 'border-b border-zinc-50' : 'border-b border-white/[0.03]') : '',
                isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.02]'
              )}>
                <div className="flex items-center gap-6">
                  <GripVertical className="w-4 h-4 text-zinc-700 cursor-grab" />
                  <div>
                    <h4 className={cn('text-base font-black tracking-tight group-hover:text-astrai-gold transition-colors', theme.textPrimary)}>{proc.name}</h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono font-bold mt-1 uppercase tracking-wide">
                      <span>{proc.durationMin} min</span>
                      {proc.priceOld > 0 && proc.priceOld !== proc.price && (
                        <><span className="opacity-20">·</span><span>R$ {proc.priceOld.toLocaleString('pt-BR')}</span><ChevronRight className="w-3 h-3 opacity-30" /><span className="text-astrai-gold">R$ {proc.price.toLocaleString('pt-BR')}</span></>
                      )}
                      {(proc.priceOld === 0 || proc.priceOld === proc.price) && proc.price > 0 && (
                        <><span className="opacity-20">·</span><span>R$ {proc.price.toLocaleString('pt-BR')}</span></>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(proc)}
                    className={cn('px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
                      isLight ? 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                    )}>Editar</button>
                  <button onClick={() => remove(proc.id)}
                    className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                    Remover
                  </button>
                  <div className={cn('w-px h-5 mx-1', isLight ? 'bg-zinc-200' : 'bg-white/5')} />
                  <button onClick={() => toggle(proc)}
                    className={cn('w-10 h-5 rounded-full relative transition-colors shrink-0',
                      proc.active ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')
                    )}>
                    <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', proc.active ? 'right-1' : 'left-1')} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Profissionais ─────────────────────────────────────────────── */
const DAYS_WEEK = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function ProfissionaisTab({ theme, isLight }: { theme:AstraiTheme; isLight:boolean }) {
  const [profs,    setProfs]    = useState<Professional[]>([]);
  const [allProcs, setAllProcs] = useState<{id:string;name:string}[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState<Professional|null>(null);
  const [modalTab, setModalTab] = useState<'info'|'horarios'|'procedimentos'>('info');
  const [profName, setProfName] = useState('');
  const [hours,    setHours]    = useState<ProfessionalHour[]>([]);
  const [selProcs, setSelProcs] = useState<string[]>([]);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    Promise.all([getProfessionals(), getProcedures()])
      .then(([pr, pc]) => { setProfs(pr); setAllProcs(pc.map(p=>({id:p.id,name:p.name}))); setLoading(false); })
      .catch(console.error);
  }, []);

  async function openEdit(p: Professional) {
    setEditing(p); setProfName(p.name); setModalTab('info'); setSaved(false);
    try {
      const [h, pc] = await Promise.all([
        getProfessionalHours(p.id),
        getProfessionalProcedures(p.id),
      ]);
      setHours(h.length ? h : DAYS_WEEK.map((_,i) => ({ day_of_week:i, open: i>0&&i<6, start_time:'09:00', end_time:'18:00' })));
      setSelProcs(pc.map(x=>x.id));
    } catch { setHours([]); setSelProcs([]); }
  }
  function openNew() {
    setEditing({} as any); setProfName(''); setModalTab('info'); setSaved(false);
    setHours(DAYS_WEEK.map((_,i) => ({ day_of_week:i, open: i>0&&i<6, start_time:'09:00', end_time:'18:00' })));
    setSelProcs([]);
  }
  function closeModal() { setEditing(null); setSaved(false); }

  async function save() {
    if (!profName.trim()) return;
    setSaving(true);
    try {
      let prof: Professional;
      if (editing?.id) {
        prof = await updateProfessional(editing.id, { name: profName });
        setProfs(prev => prev.map(x => x.id===prof.id ? prof : x));
      } else {
        prof = await createProfessional(profName.trim());
        setProfs(prev => [...prev, prof]);
      }
      await Promise.all([
        saveProfessionalHours(prof.id, hours),
        setProfessionalProcedures(prof.id, selProcs),
      ]);
      setSaved(true); setTimeout(() => { setSaved(false); closeModal(); }, 1200);
    } catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function toggle(p: Professional) {
    const u = await updateProfessional(p.id, { active: !p.active });
    setProfs(prev => prev.map(x => x.id===u.id ? u : x));
  }

  function setHour(idx: number, field: keyof ProfessionalHour, value: any) {
    setHours(prev => prev.map((h,i) => i===idx ? {...h, [field]:value} : h));
  }

  const inp = cn('w-full p-4 rounded-xl border outline-none focus:border-astrai-gold/50 transition-all font-semibold text-sm',
    isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-white/[0.03] border-white/10 text-white');
  const lbl = cn('text-[10px] uppercase font-black tracking-widest', isLight ? 'text-zinc-500' : 'text-zinc-400');

  return (
    <div className="space-y-4">
      {/* ── Modal ── */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={closeModal}>
            <motion.div initial={{ scale:0.95, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }} exit={{ scale:0.95, opacity:0, y:20 }}
              className={cn('w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[2.5rem] border flex flex-col shadow-2xl',
                isLight ? 'bg-white border-zinc-200' : 'bg-[#0A1A26] border-white/10'
              )}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className={cn('px-10 py-7 flex items-center justify-between border-b', isLight ? 'border-zinc-100' : 'border-white/5')}>
                <h3 className={cn('text-xl font-black italic', theme.textPrimary)}>{editing?.id ? 'Editar profissional' : 'Novo profissional'}</h3>
                <button onClick={closeModal} className="text-zinc-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>

              {/* Tabs */}
              <div className={cn('grid grid-cols-3 border-b', isLight ? 'border-zinc-100' : 'border-white/5')}>
                {([
                  { id:'info',          label:'Informações',  n:'1' },
                  { id:'horarios',      label:'Horários',     n:'2' },
                  { id:'procedimentos', label:'Procedimentos', n:'3' },
                ] as const).map(t => (
                  <button key={t.id} onClick={() => setModalTab(t.id)}
                    className={cn('py-4 flex items-center justify-center gap-3 font-bold outline-none relative transition-all',
                      modalTab === t.id ? 'text-astrai-gold' : 'text-zinc-500 hover:text-zinc-400'
                    )}>
                    <span className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[10px] border transition-colors',
                      modalTab === t.id ? 'bg-astrai-gold text-astrai-blue border-astrai-gold' : 'bg-transparent border-zinc-700'
                    )}>{t.n}</span>
                    <span className="text-sm uppercase tracking-widest">{t.label}</span>
                    {modalTab === t.id && <motion.div layoutId="pTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-astrai-gold" />}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-10 space-y-6">
                <AnimatePresence mode="wait">

                  {/* ── Informações ── */}
                  {modalTab === 'info' && (
                    <motion.div key="info" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-5">
                      <div className="space-y-1.5">
                        <label className={lbl}>Nome</label>
                        <input className={inp} value={profName} onChange={e => setProfName(e.target.value)} placeholder="Nome do profissional" />
                      </div>
                    </motion.div>
                  )}

                  {/* ── Horários ── */}
                  {modalTab === 'horarios' && (
                    <motion.div key="horarios" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-3">
                      {hours.map((h, i) => (
                        <div key={i} className={cn('flex items-center gap-5 px-5 py-4 rounded-2xl border transition-colors',
                          h.open
                            ? (isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.02] border-white/5')
                            : (isLight ? 'border-transparent opacity-50' : 'border-transparent opacity-30')
                        )}>
                          {/* Toggle + Dia */}
                          <div className="flex items-center gap-4 w-28 shrink-0">
                            <button onClick={() => setHour(i, 'open', !h.open)}
                              className={cn('w-10 h-5 rounded-full relative transition-colors shrink-0',
                                h.open ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')
                              )}>
                              <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', h.open ? 'right-1' : 'left-1')} />
                            </button>
                            <span className={cn('text-base font-black tracking-tight', theme.textPrimary)}>{DAYS_WEEK[h.day_of_week]}</span>
                          </div>

                          {h.open ? (
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <input type="time" value={h.start_time} onChange={e => setHour(i,'start_time',e.target.value)}
                                  className={cn('pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono font-bold w-32 outline-none focus:border-astrai-gold/40',
                                    isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/5 text-white'
                                  )} />
                              </div>
                              <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">até</span>
                              <div className="relative">
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <input type="time" value={h.end_time} onChange={e => setHour(i,'end_time',e.target.value)}
                                  className={cn('pl-10 pr-4 py-2.5 rounded-xl border text-sm font-mono font-bold w-32 outline-none focus:border-astrai-gold/40',
                                    isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-black/20 border-white/5 text-white'
                                  )} />
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest italic">Fechado</span>
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}

                  {/* ── Procedimentos ── */}
                  {modalTab === 'procedimentos' && (
                    <motion.div key="procedimentos" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-4">
                      <p className="text-[11px] text-zinc-500">Selecione os procedimentos que este profissional pode realizar.</p>
                      <div className={cn('p-4 rounded-xl border space-y-2', isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-white/[0.01] border-white/10')}>
                        {allProcs.length === 0
                          ? <p className="text-[11px] text-zinc-500">Nenhum procedimento cadastrado</p>
                          : allProcs.map(proc => (
                            <label key={proc.id} className="flex items-center gap-3 cursor-pointer py-1">
                              <input type="checkbox" checked={selProcs.includes(proc.id)}
                                onChange={e => setSelProcs(prev => e.target.checked ? [...prev, proc.id] : prev.filter(x=>x!==proc.id))}
                                className="w-4 h-4 rounded accent-astrai-gold" />
                              <span className={cn('text-sm font-semibold', theme.textPrimary)}>{proc.name}</span>
                            </label>
                          ))
                        }
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className={cn('px-10 py-6 border-t flex justify-between', isLight ? 'border-zinc-100 bg-zinc-50' : 'border-white/5 bg-black/10')}>
                <button onClick={closeModal} className="px-8 py-3 rounded-xl text-zinc-500 font-bold text-xs hover:text-white transition-all uppercase tracking-widest border border-transparent hover:border-white/10">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving}
                  className={cn('px-8 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-2 shadow-lg',
                    saved ? 'bg-emerald-500 text-white' : 'bg-astrai-gold text-astrai-blue shadow-astrai-gold/20 hover:scale-105 active:scale-95',
                    saving && 'opacity-60 cursor-not-allowed'
                  )}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
                  {saving ? 'Salvando…' : saved ? 'Salvo!' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Lista ── */}
      <div className={cn('rounded-[2rem] border overflow-hidden', isLight ? 'bg-white border-zinc-200 shadow-lg' : 'bg-white/[0.02] border-white/[0.05]')}>
        <div className={cn('flex items-center justify-between px-8 py-6 border-b', isLight ? 'border-zinc-100 bg-zinc-50' : 'border-white/5')}>
          <div>
            <p className={cn('font-bold italic', theme.textPrimary)}>Profissionais</p>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono uppercase tracking-widest">Cadastre as pessoas que realizam os procedimentos da clínica</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-astrai-gold text-astrai-blue text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-astrai-gold/20">
            <Plus className="w-4 h-4" /> Novo profissional
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-astrai-gold" /></div>
        ) : (
          <div>
            {profs.map((p, i) => (
              <div key={p.id} className={cn('group flex items-center justify-between px-8 py-5 transition-colors',
                i < profs.length - 1 ? (isLight ? 'border-b border-zinc-50' : 'border-b border-white/[0.03]') : '',
                isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.02]'
              )}>
                <div className="flex items-center gap-5">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black italic',
                    isLight ? 'bg-zinc-100 text-zinc-400' : 'bg-white/5 text-white/30'
                  )}>
                    {p.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h4 className={cn('text-base font-black tracking-tight group-hover:text-astrai-gold transition-colors', theme.textPrimary)}>{p.name}</h4>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-tighter">{p.procedure_count} procedimento(s) vinculado(s)</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(p)}
                    className={cn('px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
                      isLight ? 'bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50' : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
                    )}>Editar</button>
                  <div className={cn('w-px h-5 mx-1', isLight ? 'bg-zinc-200' : 'bg-white/5')} />
                  <button onClick={() => toggle(p)}
                    className={cn('w-10 h-5 rounded-full relative transition-colors shrink-0',
                      p.active ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-700')
                    )}>
                    <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', p.active ? 'right-1' : 'left-1')} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Portal ───────────────────────────────────────────────────── */
function PortalTab({ theme, isLight }: { theme:AstraiTheme; isLight:boolean }) {
  const [greetingMsg,  setGreetingMsg]  = useState('');
  const [revealDelay,  setRevealDelay]  = useState(0);
  const [showPrice,    setShowPrice]    = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  useEffect(() => {
    getSettings().then(s => { setGreetingMsg(s.greeting_msg||''); setRevealDelay(s.reveal_delay||0); setShowPrice(s.show_price!==false); }).catch(console.error);
  }, []);

  async function save() {
    setSaving(true);
    try { await saveSettings({ greeting_msg:greetingMsg, reveal_delay:revealDelay, show_price:showPrice }); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  return (
    <Card isLight={isLight}>
      <h3 className={cn('text-lg font-display font-bold mb-6', theme.textPrimary)}>Configurações do Portal</h3>
      <div className="space-y-5">
        <Field label="Mensagem de boas-vindas">
          <textarea value={greetingMsg} onChange={e=>setGreetingMsg(e.target.value)} rows={3}
            className={cn('w-full px-4 py-2.5 rounded-xl border text-sm outline-none resize-none', isLight ? 'bg-zinc-50 border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white')} />
        </Field>
        <Field label="Delay de revelação (seg)">
          <Input value={revealDelay} onChange={(e:any)=>setRevealDelay(Number(e.target.value))} type="number" isLight={isLight} />
        </Field>
        <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: isLight ? '#e4e4e7' : 'rgba(255,255,255,0.1)' }}>
          <span className={cn('text-sm font-bold', theme.textPrimary)}>Exibir preços no portal</span>
          <button onClick={() => setShowPrice(!showPrice)} className={cn('w-10 h-5 rounded-full relative transition-colors', showPrice ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-800'))}>
            <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', showPrice ? 'right-1' : 'left-1')} />
          </button>
        </div>
      </div>
      <div className="flex justify-end mt-6"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>
    </Card>
  );
}

/* ── Horários ─────────────────────────────────────────────────── */
function HorariosTab({ theme, isLight }: { theme:AstraiTheme; isLight:boolean }) {
  const [hours,   setHours]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    getHours().then(h => {
      const map = Object.fromEntries(h.map((x:any) => [x.day_of_week, x]));
      setHours(Array.from({ length:7 }, (_,i) => map[i] ?? { day_of_week:i, open:i>0&&i<6, start_time:'09:00', end_time:'18:00' }));
      setLoading(false);
    }).catch(console.error);
  }, []);

  function update(idx: number, field: string, val: any) {
    setHours(prev => prev.map((h,i) => i===idx ? {...h,[field]:val} : h));
  }

  async function save() {
    setSaving(true);
    try { await saveHours(hours); setSaved(true); setTimeout(()=>setSaved(false),2500); }
    catch(e) { console.error(e); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-astrai-gold" /></div>;

  return (
    <Card isLight={isLight}>
      <h3 className={cn('text-lg font-display font-bold mb-6', theme.textPrimary)}>Horários de Funcionamento</h3>
      <div className="space-y-3">
        {hours.map((h, i) => (
          <div key={i} className={cn('flex items-center gap-4 p-4 rounded-xl border', isLight ? 'border-zinc-100 bg-zinc-50' : 'border-white/5 bg-white/[0.02]')}>
            <span className={cn('w-10 text-sm font-black shrink-0', theme.textSecondary)}>{DAYS_LABEL[i]}</span>
            <button onClick={() => update(i,'open',!h.open)} className={cn('w-10 h-5 rounded-full relative transition-colors shrink-0', h.open ? 'bg-astrai-gold' : (isLight ? 'bg-zinc-200' : 'bg-zinc-800'))}>
              <div className={cn('absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm', h.open ? 'right-1' : 'left-1')} />
            </button>
            {h.open ? (
              <div className="flex items-center gap-2 flex-1">
                <input type="time" value={h.start_time} onChange={e=>update(i,'start_time',e.target.value)}
                  className={cn('px-3 py-1.5 rounded-lg border text-sm outline-none', isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white')} />
                <span className="text-zinc-500 text-sm">até</span>
                <input type="time" value={h.end_time} onChange={e=>update(i,'end_time',e.target.value)}
                  className={cn('px-3 py-1.5 rounded-lg border text-sm outline-none', isLight ? 'bg-white border-zinc-200 text-zinc-900' : 'bg-white/5 border-white/10 text-white')} />
              </div>
            ) : (
              <span className="text-zinc-600 text-sm italic flex-1">Fechado</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-6"><SaveBtn saving={saving} saved={saved} onClick={save} /></div>
    </Card>
  );
}
