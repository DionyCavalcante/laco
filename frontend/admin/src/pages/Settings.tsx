import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AstraiTheme } from '../types';
import {
  Plus, Trash2, Clock, X, Check, Loader2, Eye,
  GripVertical, Camera, HelpCircle, Trophy, ChevronRight, Upload,
  RotateCw, Crosshair, ScissorsLineDashed, Sparkles,
} from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { getApiKey } from '../services/api';
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

/* ── PhotoEditor ───────────────────────────────────────────────── */
interface EditorPhotoData { id: string; url: string; side: string; }
interface PhotoEditorProps {
  photo: EditorPhotoData;
  procId: string;
  onClose: () => void;
  onSaved: () => void;
}
function PhotoEditor({ photo, procId, onClose, onSaved }: PhotoEditorProps) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapRef    = useRef<HTMLDivElement>(null);
  const imgRef     = useRef<HTMLImageElement | null>(null);
  const rotRef     = useRef(0);
  const dragging   = useRef(false);

  const [rotation,    setRotation]    = useState(0);
  const [splitActive, setSplitActive] = useState(false);
  const [splitDir,    setSplitDir]    = useState<'vertical'|'horizontal'>('vertical');
  const [splitPos,    setSplitPos]    = useState(0.5);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(true);
  const blobUrlRef = useRef('');

  useEffect(() => {
    // Fetch via blob URL para evitar "tainted canvas" (foto está no Supabase Storage)
    fetch(photo.url)
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const img = new Image();
        img.onload = () => { imgRef.current = img; drawCanvas(0); setLoading(false); };
        img.src = url;
      })
      .catch(console.error);
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  function drawCanvas(rot: number) {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx  = canvas.getContext('2d')!;
    const rad  = rot * Math.PI / 180;
    const sw   = img.naturalWidth, sh = img.naturalHeight;
    const rot90 = rot % 180 !== 0;
    canvas.width  = rot90 ? sh : sw;
    canvas.height = rot90 ? sw : sh;
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(img, -sw / 2, -sh / 2);
    ctx.restore();
  }

  function rotate() {
    const r = (rotRef.current + 90) % 360;
    rotRef.current = r;
    setRotation(r);
    drawCanvas(r);
  }

  function canvasToBlob(c: HTMLCanvasElement): Promise<Blob> {
    return new Promise(res => c.toBlob(b => res(b!), 'image/jpeg', 0.92));
  }

  function sliceCanvas(src: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  }

  async function uploadBlob(blob: Blob) {
    const fd = new FormData();
    fd.append(photo.side, blob, 'photo.jpg');
    await fetch(`/api/upload/procedure/${procId}/photos`, {
      method: 'POST',
      headers: { 'x-api-key': getApiKey() },
      body: fd,
    });
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    try {
      if (splitActive) {
        const cw = canvas.width, ch = canvas.height;
        let a: HTMLCanvasElement, b: HTMLCanvasElement;
        if (splitDir === 'vertical') {
          const px = Math.round(splitPos * cw);
          a = sliceCanvas(canvas, 0, 0, px, ch);
          b = sliceCanvas(canvas, px, 0, cw - px, ch);
        } else {
          const py = Math.round(splitPos * ch);
          a = sliceCanvas(canvas, 0, 0, cw, py);
          b = sliceCanvas(canvas, 0, py, cw, ch - py);
        }
        await uploadBlob(await canvasToBlob(a));
        await uploadBlob(await canvasToBlob(b));
      } else {
        await uploadBlob(await canvasToBlob(canvas));
      }
      await fetch(`/api/upload/photo/${photo.id}`, {
        method: 'DELETE', headers: { 'x-api-key': getApiKey() },
      });
      onSaved();
      onClose();
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging.current || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    if (splitDir === 'vertical') {
      setSplitPos(Math.max(0.1, Math.min(0.9, (e.clientX - rect.left) / rect.width)));
    } else {
      setSplitPos(Math.max(0.1, Math.min(0.9, (e.clientY - rect.top) / rect.height)));
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-white text-lg font-bold">Editar foto — girar ou dividir</p>
      <div
        ref={wrapRef}
        className="relative max-h-[58vh] overflow-hidden flex items-center justify-center"
        onMouseMove={onMouseMove}
        onMouseUp={() => { dragging.current = false; }}
        onMouseLeave={() => { dragging.current = false; }}
      >
        {loading && <Loader2 className="w-10 h-10 text-astrai-gold animate-spin" />}
        <canvas ref={canvasRef} style={{ display: loading ? 'none' : 'block', maxWidth:'100%', maxHeight:'58vh' }} />
        {splitActive && (
          <div
            className="absolute bg-white/90 shadow-lg cursor-grab active:cursor-grabbing"
            style={splitDir === 'vertical'
              ? { left:`${splitPos*100}%`, top:0, bottom:0, width:3, transform:'translateX(-50%)' }
              : { top:`${splitPos*100}%`, left:0, right:0, height:3, transform:'translateY(-50%)' }
            }
            onMouseDown={e => { dragging.current = true; e.preventDefault(); }}
            onTouchStart={e => { dragging.current = true; e.preventDefault(); }}
          />
        )}
      </div>
      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-zinc-700 text-white text-sm font-bold">
          Cancelar
        </button>
        <button onClick={rotate} className="px-4 py-2 rounded-xl bg-zinc-600 text-white text-sm font-bold flex items-center gap-2">
          <RotateCw className="w-4 h-4" /> Girar 90°
        </button>
        <button
          onClick={() => { setSplitActive(a => !a); setSplitPos(0.5); }}
          className={cn('px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2',
            splitActive ? 'bg-astrai-gold text-astrai-blue' : 'bg-zinc-600 text-white')}
        >
          <ScissorsLineDashed className="w-4 h-4" /> {splitActive ? 'Desativar divisão' : 'Dividir foto'}
        </button>
        {splitActive && (
          <button
            onClick={() => { setSplitDir(d => d === 'vertical' ? 'horizontal' : 'vertical'); setSplitPos(0.5); }}
            className="px-4 py-2 rounded-xl bg-zinc-600 text-white text-sm font-bold"
          >
            {splitDir === 'vertical' ? '↕ Mudar para horizontal' : '↔ Mudar para vertical'}
          </button>
        )}
        <button onClick={save} disabled={saving || loading}
          className="px-4 py-2 rounded-xl bg-astrai-gold text-astrai-blue text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar
        </button>
      </div>
      {splitActive && (
        <p className="text-zinc-400 text-xs">Arraste a linha para definir o ponto de divisão</p>
      )}
    </div>
  );
}

/* ── PhotoThumb ────────────────────────────────────────────────── */
interface PhotoThumbProps {
  ph: { id:string; url:string; side:string; rotation?:number; position_x?:number; position_y?:number };
  aspect: string;
  isFocal: boolean;
  small?: boolean;
  onDelete: () => void;
  onRotate: () => void;
  onFocal: () => void;
  onEditor: () => void;
  onFocalClick: (x:number, y:number) => void;
}
function PhotoThumb({ ph, aspect, isFocal, small=false, onDelete, onRotate, onFocal, onEditor, onFocalClick }: PhotoThumbProps) {
  const rot   = ph.rotation || 0;
  const scale = rot % 180 !== 0 ? 1.42 : 1;
  const btn   = small ? 'w-5 h-5' : 'w-7 h-7';
  const ico   = small ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5';

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!isFocal) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onFocalClick(
      Math.round(((e.clientX - rect.left) / rect.width) * 100),
      Math.round(((e.clientY - rect.top)  / rect.height) * 100),
    );
  }

  return (
    <div
      className={cn('relative group rounded-2xl overflow-hidden', aspect, isFocal && 'ring-2 ring-astrai-gold ring-offset-2')}
      style={{ cursor: isFocal ? 'crosshair' : undefined }}
      onClick={handleClick}
    >
      <img src={ph.url} alt="" className="w-full h-full object-cover transition-transform"
        style={{
          transform: rot ? `rotate(${rot}deg) scale(${scale})` : undefined,
          objectPosition: `${ph.position_x ?? 50}% ${ph.position_y ?? 50}%`,
        }}
      />
      {isFocal ? (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
          <Crosshair className="w-8 h-8 text-white drop-shadow-lg animate-pulse" />
          <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-white font-bold">Clique para definir foco</span>
        </div>
      ) : (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute top-1.5 right-1.5 flex gap-1">
            <button title="Girar 90°" onClick={e => { e.stopPropagation(); onRotate(); }}
              className={cn('rounded-full bg-black/60 hover:bg-zinc-700 flex items-center justify-center', btn)}>
              <RotateCw className={cn('text-white', ico)} />
            </button>
            <button title="Enquadrar foco" onClick={e => { e.stopPropagation(); onFocal(); }}
              className={cn('rounded-full bg-black/60 hover:bg-astrai-gold flex items-center justify-center', btn)}>
              <Crosshair className={cn('text-white', ico)} />
            </button>
            <button title="Editar / dividir" onClick={e => { e.stopPropagation(); onEditor(); }}
              className={cn('rounded-full bg-black/60 hover:bg-blue-500 flex items-center justify-center', btn)}>
              <ScissorsLineDashed className={cn('text-white', ico)} />
            </button>
            <button title="Remover" onClick={e => { e.stopPropagation(); onDelete(); }}
              className={cn('rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center', btn)}>
              <X className={cn('text-white', ico)} />
            </button>
          </div>
        </div>
      )}
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
  const [photos,       setPhotos]       = useState<{id:string;side:string;url:string;label:string|null;rotation?:number;position_x?:number;position_y?:number}[]>([]);
  const [uploading,    setUploading]    = useState<string|null>(null);
  const [photoMode,    setPhotoMode]    = useState<'before_after'|'results'|'single'>('before_after');
  const [editorPhoto,    setEditorPhoto]    = useState<EditorPhotoData|null>(null);
  const [focalPhotoId,   setFocalPhotoId]   = useState<string|null>(null);
  const [generatingPage, setGeneratingPage] = useState(false);
  const dragIndex  = useRef<number | null>(null);
  const dragOver   = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([getProcedures(), getProfessionals()])
      .then(([p, pr]) => { setProcs(p); setAllProfs(pr); setLoading(false); })
      .catch(console.error);
  }, []);

  async function loadPhotos(procId: string) {
    try {
      const res = await fetch(`/api/upload/procedure/${procId}/photos`);
      if (res.ok) setPhotos(await res.json());
    } catch { setPhotos([]); }
  }

  async function openEdit(p: Procedure) {
    setEditing(p); setForm({ ...p }); setModalTab('info'); setPhotos([]);
    const pm = (p.photoMode as any);
    setPhotoMode(pm === 'results' ? 'results' : pm === 'single' ? 'single' : 'before_after');
    if (p.id) {
      try { const pp = await getProfessionalsByProcedure(p.id); setSelProfs(pp.map(x => x.id)); }
      catch { setSelProfs([]); }
      loadPhotos(p.id);
    }
  }
  function openNew() {
    setEditing({} as any);
    setForm({ name:'', durationMin:60, price:0, priceOld:0, paymentNote:'', videoUrl:'', revealDelay:5, active:true });
    setSelProfs([]); setModalTab('info'); setPhotos([]); setPhotoMode('before_after');
  }

  async function changePhotoMode(mode: 'before_after'|'results'|'single') {
    setPhotoMode(mode);
    setForm(f => ({ ...f, photoMode: mode }));
    if (editing?.id) {
      await fetch(`/api/procedures/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey() },
        body: JSON.stringify({ photo_mode: mode }),
      }).catch(console.error);
    }
  }

  async function generatePage() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { alert('Variável GEMINI_API_KEY não configurada.'); return; }
    if (!form.name) { alert('Informe o nome do procedimento primeiro.'); return; }
    setGeneratingPage(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é especialista em marketing para clínicas de estética. Gere conteúdo para a página de venda do procedimento "${form.name}"${form.subheadline ? ` (${form.subheadline})` : ''}.

Retorne APENAS um JSON válido (sem markdown, sem explicações) com exatamente estas chaves:
{
  "headline": "frase de impacto curta (máx 12 palavras) que transmite transformação ou resultado",
  "howItWorks": "descrição direta em 2-3 frases de como funciona o procedimento, linguagem acessível",
  "authorityNote": "nota de autoridade em 2-3 frases destacando expertise, tecnologia ou diferenciais da clínica",
  "faqSessionDuration": "resposta curta sobre duração (ex: '45 a 60 minutos')",
  "faqPainDiscomfort": "resposta curta sobre dor (ex: 'Sensação mínima de formigamento, tolerável')",
  "faqAftercare": "lista de 3 a 5 cuidados pós-procedimento, um por linha, começando com -",
  "closingNote": "frase motivacional curta de fechamento (máx 10 palavras)"
}

Use linguagem feminina, sofisticada e acolhedora. Evite termos médicos complexos.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: prompt,
      });

      const text = result.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta inválida da IA');
      const data = JSON.parse(jsonMatch[0]);
      setForm(f => ({
        ...f,
        headline:            data.headline            ?? f.headline,
        howItWorks:          data.howItWorks          ?? f.howItWorks,
        authorityNote:       data.authorityNote       ?? f.authorityNote,
        faqSessionDuration:  data.faqSessionDuration  ?? f.faqSessionDuration,
        faqPainDiscomfort:   data.faqPainDiscomfort   ?? f.faqPainDiscomfort,
        faqAftercare:        data.faqAftercare        ?? f.faqAftercare,
        closingNote:         data.closingNote         ?? f.closingNote,
      }));
    } catch (e: any) {
      alert('Erro ao gerar conteúdo: ' + e.message);
    } finally {
      setGeneratingPage(false);
    }
  }

  async function uploadPhoto(side: 'before'|'after'|'carousel', file: File) {
    if (!editing?.id) return;
    setUploading(side);
    try {
      const fd = new FormData();
      fd.append(side, file);
      const res = await fetch(`/api/upload/procedure/${editing.id}/photos`, {
        method: 'POST',
        headers: { 'x-api-key': getApiKey() },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      await loadPhotos(editing.id);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUploading(null);
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/upload/photo/${photoId}`, {
        method: 'DELETE',
        headers: { 'x-api-key': getApiKey() },
      });
      if (!res.ok) throw new Error('Erro ao deletar foto');
      setPhotos(p => p.filter(x => x.id !== photoId));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function rotatePhoto(photoId: string) {
    try {
      const res = await fetch(`/api/upload/photo/${photoId}/rotate`, {
        method: 'POST', headers: { 'x-api-key': getApiKey() },
      });
      if (!res.ok) return;
      const data = await res.json();
      setPhotos(p => p.map(x => x.id === photoId ? { ...x, rotation: data.rotation } : x));
    } catch { }
  }

  async function saveFocalPoint(photoId: string, pctX: number, pctY: number) {
    setPhotos(p => p.map(x => x.id === photoId ? { ...x, position_x: pctX, position_y: pctY } : x));
    setFocalPhotoId(null);
    await fetch(`/api/upload/photo/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey() },
      body: JSON.stringify({ position_x: pctX, position_y: pctY }),
    }).catch(console.error);
  }

  async function updateLabel(photoId: string, label: string) {
    setPhotos(p => p.map(x => x.id === photoId ? { ...x, label } : x));
    await fetch(`/api/upload/photo/${photoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-api-key': getApiKey() },
      body: JSON.stringify({ label: label || null }),
    }).catch(console.error);
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

  function handleDrop() {
    const from = dragIndex.current;
    const to   = dragOver.current;
    if (from === null || to === null || from === to) return;
    const reordered = [...procs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setProcs(reordered);
    // Salva sort_order de todos que mudaram de posição
    reordered.forEach((p, idx) => {
      if (p.sortOrder !== idx) updateProcedure(p.id, { sort_order: idx }).catch(console.error);
    });
    dragIndex.current = null;
    dragOver.current  = null;
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
                    <motion.div key="images" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-8">

                      {!editing?.id && (
                        <div className={cn('p-5 rounded-2xl border text-sm font-semibold text-center', isLight ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-amber-400/10 border-amber-400/20 text-amber-300')}>
                          Salve o procedimento primeiro para fazer upload de imagens.
                        </div>
                      )}

                      {/* Modo de exibição */}
                      <div className="space-y-3">
                        <label className={cn('block text-[10px] font-black uppercase tracking-widest', isLight ? 'text-zinc-500' : 'text-zinc-400')}>
                          Modo de exibição das fotos
                        </label>
                        <div className={cn('flex rounded-2xl border overflow-hidden', isLight ? 'border-zinc-200' : 'border-white/10')}>
                          {([
                            { value: 'before_after', label: 'Antes / Depois'  },
                            { value: 'results',      label: 'Só Resultados'   },
                            { value: 'single',       label: 'Imagem Única'    },
                          ] as const).map(opt => (
                            <button key={opt.value} onClick={() => changePhotoMode(opt.value)}
                              className={cn('flex-1 py-3 text-sm font-black uppercase tracking-widest transition-all',
                                photoMode === opt.value
                                  ? 'bg-astrai-gold text-astrai-blue'
                                  : (isLight ? 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5')
                              )}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        <p className={cn('text-xs', isLight ? 'text-zinc-400' : 'text-zinc-500')}>
                          {photoMode === 'before_after'
                            ? 'Exibe as fotos em dois lados: Antes e Depois'
                            : photoMode === 'results'
                            ? 'Exibe apenas o carrossel de resultados'
                            : 'Exibe uma única foto em largura total no card'}
                        </p>
                      </div>

                      {/* Imagem Única */}
                      {photoMode === 'single' && (
                        <div className="space-y-4">
                          <label className={cn('block text-sm font-black uppercase tracking-widest', isLight ? 'text-zinc-600' : 'text-zinc-300')}>
                            Foto Principal
                          </label>
                          <div className="max-w-xs">
                            {photos.filter(p => p.side === 'before').slice(0, 1).map(ph => (
                              <PhotoThumb
                                key={ph.id} ph={ph}
                                aspect="aspect-video"
                                isFocal={focalPhotoId === ph.id}
                                onDelete={() => deletePhoto(ph.id)}
                                onRotate={() => rotatePhoto(ph.id)}
                                onFocal={() => setFocalPhotoId(focalPhotoId === ph.id ? null : ph.id)}
                                onEditor={() => setEditorPhoto({ id: ph.id, url: ph.url, side: ph.side })}
                                onFocalClick={(x, y) => saveFocalPoint(ph.id, x, y)}
                              />
                            ))}
                            {editing?.id && photos.filter(p => p.side === 'before').length === 0 && (
                              <label className={cn('aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
                                uploading === 'before' ? 'border-astrai-gold/60 bg-astrai-gold/5' : (isLight ? 'bg-zinc-50 border-zinc-200 hover:border-astrai-gold/50' : 'bg-white/[0.02] border-white/10 hover:border-astrai-gold/40')
                              )}>
                                <input type="file" accept="image/*" className="hidden" disabled={!!uploading}
                                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto('before', f); e.target.value=''; }} />
                                {uploading === 'before'
                                  ? <Loader2 className="w-8 h-8 text-astrai-gold animate-spin" />
                                  : <><Upload className="w-8 h-8 text-zinc-500" /><span className="text-sm font-bold text-zinc-500">Clique para enviar</span></>
                                }
                              </label>
                            )}
                          </div>
                          <p className={cn('text-xs', isLight ? 'text-zinc-400' : 'text-zinc-500')}>
                            Aparece em largura total no card do procedimento
                          </p>
                        </div>
                      )}

                      {/* Antes e Depois — visível apenas no modo before_after */}
                      {photoMode === 'before_after' && (
                        <div className="space-y-4">
                          <label className={cn('block text-sm font-black uppercase tracking-widest', isLight ? 'text-zinc-600' : 'text-zinc-300')}>
                            Fotos Antes e Depois
                          </label>
                          <div className="grid grid-cols-2 gap-6">
                            {(['before','after'] as const).map(side => {
                              const sidePhotos = photos.filter(p => p.side === side);
                              const sideLabel = side === 'before' ? 'Antes' : 'Depois';
                              const isUploading = uploading === side;
                              return (
                                <div key={side} className="space-y-3">
                                  <span className={cn('text-sm font-black uppercase tracking-widest', isLight ? 'text-zinc-500' : 'text-zinc-400')}>{sideLabel}</span>
                                  {sidePhotos.map(ph => (
                                    <PhotoThumb
                                      key={ph.id} ph={ph}
                                      aspect="aspect-square"
                                      isFocal={focalPhotoId === ph.id}
                                      onDelete={() => deletePhoto(ph.id)}
                                      onRotate={() => rotatePhoto(ph.id)}
                                      onFocal={() => setFocalPhotoId(focalPhotoId === ph.id ? null : ph.id)}
                                      onEditor={() => setEditorPhoto({ id: ph.id, url: ph.url, side: ph.side })}
                                      onFocalClick={(x, y) => saveFocalPoint(ph.id, x, y)}
                                    />
                                  ))}
                                  {editing?.id && (
                                    <label className={cn('aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all',
                                      isUploading ? 'border-astrai-gold/60 bg-astrai-gold/5' : (isLight ? 'bg-zinc-50 border-zinc-200 hover:border-astrai-gold/50' : 'bg-white/[0.02] border-white/10 hover:border-astrai-gold/40')
                                    )}>
                                      <input type="file" accept="image/*" className="hidden" disabled={!!uploading}
                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(side, f); e.target.value=''; }} />
                                      {isUploading
                                        ? <Loader2 className="w-8 h-8 text-astrai-gold animate-spin" />
                                        : <><Upload className="w-8 h-8 text-zinc-500" /><span className="text-sm font-bold text-zinc-500">Clique para enviar</span></>
                                      }
                                    </label>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Carrossel */}
                      <div className="space-y-4">
                        <label className={cn('block text-sm font-black uppercase tracking-widest', isLight ? 'text-zinc-600' : 'text-zinc-300')}>
                          {photoMode === 'results' ? 'Fotos de Resultados' : 'Carrossel da página do procedimento'}
                        </label>
                        <div className="flex flex-wrap gap-4">
                          {photos.filter(p => p.side === 'carousel').map(ph => (
                            <div key={ph.id} className="w-28 flex flex-col gap-1">
                              <PhotoThumb
                                ph={ph}
                                aspect="aspect-[4/5]"
                                isFocal={focalPhotoId === ph.id}
                                onDelete={() => deletePhoto(ph.id)}
                                onRotate={() => rotatePhoto(ph.id)}
                                onFocal={() => setFocalPhotoId(focalPhotoId === ph.id ? null : ph.id)}
                                onEditor={() => setEditorPhoto({ id: ph.id, url: ph.url, side: ph.side })}
                                onFocalClick={(x, y) => saveFocalPoint(ph.id, x, y)}
                                small
                              />
                              <input
                                value={ph.label ?? ''}
                                onChange={e => updateLabel(ph.id, e.target.value)}
                                placeholder="Legenda..."
                                className={cn(
                                  'w-full px-2 py-1 rounded-lg border text-xs font-semibold outline-none transition-all',
                                  isLight
                                    ? 'bg-zinc-50 border-zinc-200 text-zinc-700 placeholder-zinc-400 focus:border-astrai-gold/50'
                                    : 'bg-white/5 border-white/10 text-zinc-300 placeholder-zinc-600 focus:border-astrai-gold/40'
                                )}
                              />
                            </div>
                          ))}
                          {editing?.id && photos.filter(p => p.side === 'carousel').length < 10 && (
                            <label className={cn('w-28 aspect-[4/5] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer transition-all',
                              uploading === 'carousel' ? 'border-astrai-gold/60 bg-astrai-gold/5' : (isLight ? 'bg-zinc-50 border-zinc-200 hover:border-astrai-gold/50' : 'bg-white/[0.02] border-white/10 hover:border-astrai-gold/40')
                            )}>
                              <input type="file" accept="image/*" className="hidden" disabled={!!uploading}
                                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto('carousel', f); e.target.value=''; }} />
                              {uploading === 'carousel'
                                ? <Loader2 className="w-5 h-5 text-astrai-gold animate-spin" />
                                : <><Upload className="w-5 h-5 text-zinc-500" /><span className="text-xs font-bold text-zinc-500 text-center">Enviar</span></>
                              }
                            </label>
                          )}
                        </div>
                        <p className={cn('text-xs', isLight ? 'text-zinc-400' : 'text-zinc-500')}>
                          {photoMode === 'results'
                            ? `${photos.filter(p => p.side === 'carousel').length}/10 fotos · Adicione legendas clicando no campo abaixo de cada imagem`
                            : 'Se vazio, usa as fotos antes/depois · Máx. 10 imagens'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Página ── */}
                  {modalTab === 'page' && (
                    <motion.div key="page" initial={{ opacity:0, x:-10 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:10 }} className="space-y-7">

                      {/* Botão gerar com IA */}
                      <button
                        onClick={generatePage}
                        disabled={generatingPage}
                        className={cn(
                          'w-full py-3 px-5 rounded-2xl border flex items-center justify-center gap-2.5 font-black text-sm uppercase tracking-widest transition-all',
                          generatingPage
                            ? 'opacity-70 cursor-not-allowed'
                            : 'hover:scale-[1.01] active:scale-95',
                          isLight
                            ? 'bg-gradient-to-r from-violet-50 to-indigo-50 border-violet-200 text-violet-700 hover:from-violet-100 hover:to-indigo-100'
                            : 'bg-gradient-to-r from-violet-900/20 to-indigo-900/20 border-violet-500/30 text-violet-300 hover:border-violet-400/50'
                        )}
                      >
                        {generatingPage
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando conteúdo...</>
                          : <><Sparkles className="w-4 h-4" /> Gerar conteúdo com IA</>
                        }
                      </button>

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

      {/* ── Editor de foto ── */}
      {editorPhoto && editing?.id && (
        <PhotoEditor
          photo={editorPhoto}
          procId={editing.id}
          onClose={() => setEditorPhoto(null)}
          onSaved={() => { setEditorPhoto(null); if (editing?.id) loadPhotos(editing.id); }}
        />
      )}

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
              <div key={proc.id}
                draggable
                onDragStart={() => { dragIndex.current = i; }}
                onDragEnter={() => { dragOver.current = i; }}
                onDragOver={e => e.preventDefault()}
                onDragEnd={handleDrop}
                className={cn('group flex items-center justify-between px-8 py-5 transition-colors cursor-default',
                  i < procs.length - 1 ? (isLight ? 'border-b border-zinc-50' : 'border-b border-white/[0.03]') : '',
                  isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.02]'
                )}>
                <div className="flex items-center gap-6">
                  <GripVertical className="w-4 h-4 text-zinc-400 cursor-grab active:cursor-grabbing shrink-0" />
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
