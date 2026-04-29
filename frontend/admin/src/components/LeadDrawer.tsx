import React, { useEffect, useState } from 'react';
import { X, MessageCircle, Loader2 } from 'lucide-react';
import { getLeadDetail, updateLeadStatus, LeadDetail } from '../services/leads';
import { getAppointments, updateAppointmentStatus, Appointment } from '../services/appointments';

const G   = '#C9A96E';
const T0  = '#F5F5F2';
const T1  = 'rgba(245,245,242,0.60)';
const T2  = 'rgba(245,245,242,0.35)';
const BRD = 'rgba(255,255,255,0.08)';
const CARD = '#0f2736';

const STATUS_LABELS: Record<string, string> = {
  new:'Novo lead', link_sent:'Link enviado',
  scheduled:'Agendado', confirmed:'Confirmado', rejected:'Não agendou',
};
const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  new:       { bg:'rgba(29,95,173,0.18)',  color:'#4a87d4' },
  link_sent: { bg:'rgba(154,107,16,0.18)', color:'#d4943a' },
  scheduled: { bg:'rgba(46,140,102,0.18)', color:'#4ead85' },
  confirmed: { bg:'rgba(46,140,102,0.18)', color:'#4ead85' },
  rejected:  { bg:'rgba(163,45,45,0.18)',  color:'#c94f4f' },
};
const APT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label:'Pendente',   bg:'rgba(154,107,16,0.18)', color:'#d4943a' },
  confirmed: { label:'Confirmado', bg:'rgba(46,140,102,0.18)', color:'#4ead85' },
  done:      { label:'Concluído',  bg:'rgba(255,255,255,0.07)', color:T1 },
  cancelled: { label:'Cancelado',  bg:'rgba(163,45,45,0.18)',  color:'#c94f4f' },
};
const REJECT_LABELS: Record<string, string> = {
  orcamento:'Fora do orçamento', outro:'Quer ver outro procedimento',
};

function avColors(name: string): string {
  const c = ['av-0','av-1','av-2','av-3','av-4','av-5'];
  let h = 0; for (const ch of name) h = (h*31+ch.charCodeAt(0))&0xffff; return c[h%c.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
}
function fmtDateTime(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
function fmtBRL(cents: number | null) {
  if (!cents) return '—';
  return 'R$ ' + (cents/100).toLocaleString('pt-BR', { minimumFractionDigits:2 });
}

interface Props {
  leadId: string | null;
  slug: string;
  onClose: () => void;
  onStatusChanged?: () => void;
}

export default function LeadDrawer({ leadId, slug, onClose, onStatusChanged }: Props) {
  const [lead, setLead]       = useState<LeadDetail | null>(null);
  const [apts, setApts]       = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    setLead(null); setApts([]); setLoading(true);
    Promise.all([getLeadDetail(leadId), getAppointments({ lead_id: leadId })])
      .then(([l, a]) => { setLead(l); setApts(a); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leadId]);

  async function changeStatus(status: string) {
    if (!lead) return;
    await updateLeadStatus(lead.id, status);
    setLead(prev => prev ? { ...prev, status } : prev);
    onStatusChanged?.();
  }

  async function changeAptStatus(id: string, status: 'confirmed' | 'done' | 'cancelled') {
    await updateAppointmentStatus(id, status);
    setApts(prev => prev.map(a => a.id !== id ? a : { ...a, status: APT_STATUS[status]?.label ?? a.status }));
  }

  if (!leadId) return null;

  const waLink = lead
    ? `https://wa.me/55${lead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Olá ${lead.name.split(' ')[0]}! Segue o link para agendar: ${window.location.origin.replace(':5173','').replace(':5174','').replace(':5175','')}/${slug}/agendar`)}`
    : '#';

  const ss = lead ? (STATUS_COLORS[lead.status] ?? STATUS_COLORS.new) : STATUS_COLORS.new;

  const timeline = lead ? [
    { dot:'rgba(255,255,255,0.3)', title:'Lead criado', sub: fmtDateTime(lead.created_at) + ` · via ${lead.source||'whatsapp'}` },
    lead.procedure_name && { dot:G, title:`Viu: ${lead.procedure_name}`, sub:'Acessou o portal de agendamento' },
    lead.status==='link_sent' && { dot:'#d4943a', title:'Link de agendamento enviado', sub: fmtDateTime(lead.updated_at) },
    lead.reject_reason && { dot:'#c94f4f', title:'Não agendou', sub: REJECT_LABELS[lead.reject_reason]||lead.reject_reason },
    ...apts.map(a => ({ dot:'#4ead85', title:`Agendamento: ${a.procedure}`, sub:`${a.date} às ${a.time} · ${a.status}` })),
  ].filter(Boolean) as { dot: string; title: string; sub: string }[] : [];

  return (
    <>
      <div className="fixed inset-0 z-50" style={{ background:'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{ width:440, background:'#0B1F2A', boxShadow:'-4px 0 32px rgba(0,0,0,0.5)', borderLeft:`1px solid ${BRD}` }}>

        {/* Head */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom:`1px solid ${BRD}` }}>
          <p className="text-[14px] font-semibold" style={{ color:T0 }}>Detalhes do Lead</p>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:T2, padding:4 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ background:'rgba(255,255,255,0.02)' }}>
          {loading ? (
            <div className="flex justify-center pt-20"><Loader2 className="w-5 h-5 animate-spin" style={{ color:G }} /></div>
          ) : !lead ? null : (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>

              {/* Hero card */}
              <div style={{ background:CARD, borderRadius:14, border:`1px solid ${BRD}`, padding:20 }}>
                <div className="flex items-start gap-4">
                  <div className={`av ${avColors(lead.name)}`} style={{ width:50, height:50, fontSize:18, flexShrink:0 }}>
                    {initials(lead.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[17px] font-semibold" style={{ color:T0 }}>{lead.name}</p>
                    <p className="text-[13px] mt-1" style={{ color:T1 }}>{lead.phone}</p>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className="badge" style={{ background:ss.bg, color:ss.color }}>{STATUS_LABELS[lead.status]||lead.status}</span>
                      <span className="badge" style={{ background:'rgba(255,255,255,0.07)', color:T2 }}>via {lead.source||'whatsapp'}</span>
                      <span className="badge" style={{ background:'rgba(255,255,255,0.07)', color:T2 }}>{fmtDate(lead.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5"
                      style={{ background:'#25D366', color:'white', fontSize:11, padding:'6px 12px', borderRadius:8, textDecoration:'none', fontFamily:'inherit', fontWeight:500 }}>
                      <MessageCircle className="w-3 h-3" /> Enviar link
                    </a>
                    <select value={lead.status} onChange={e => changeStatus(e.target.value)}
                      style={{ padding:'6px 10px', fontSize:12, border:`1px solid ${BRD}`, borderRadius:8, color:T0, background:'#0f2736', cursor:'pointer', outline:'none', fontFamily:'inherit' }}>
                      <option value="new">Novo lead</option>
                      <option value="link_sent">Link enviado</option>
                      <option value="scheduled">Agendado</option>
                      <option value="rejected">Não agendou</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Informações */}
              <DrawerSection title="Informações">
                <InfoRow label="Procedimento" value={lead.procedure_name||'—'} color={G} />
                <InfoRow label="Valor"        value={fmtBRL(lead.procedure_price)} color="#4ead85" />
                <InfoRow label="Total gasto"  value={fmtBRL(apts.reduce((s,a)=>s+(a.value*100),0))} color="#4ead85" />
                {lead.reject_reason && <InfoRow label="Motivo recusa" value={REJECT_LABELS[lead.reject_reason]||lead.reject_reason} color="#c94f4f" />}
                <InfoRow label="Origem"       value={lead.source||'whatsapp'} />
                <InfoRow label="Entrou em"    value={fmtDateTime(lead.created_at)} />
              </DrawerSection>

              {/* Agendamentos */}
              <DrawerSection title={`Agendamentos (${apts.length})`}>
                {apts.length === 0 ? (
                  <p className="text-center py-6 text-[13px]" style={{ color:T2 }}>Nenhum agendamento registrado.</p>
                ) : apts.map(a => {
                  const aptSs = APT_STATUS[
                    a.status==='Confirmado'?'confirmed':a.status==='Aguardando'?'pending':a.status==='Cancelado'?'cancelled':'done'
                  ]||APT_STATUS.pending;
                  const key = a.status==='Confirmado'?'confirmed':a.status==='Aguardando'?'pending':a.status==='Cancelado'?'cancelled':'done';
                  return (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3" style={{ borderBottom:`1px solid ${BRD}` }}>
                      <div style={{ width:3, height:36, borderRadius:2, background:G, flexShrink:0 }} />
                      <div className="flex-1">
                        <p className="text-[13px] font-medium" style={{ color:T0 }}>{a.procedure}</p>
                        <p className="text-[11px] mt-0.5" style={{ color:T2 }}>{a.date} às {a.time}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className="badge" style={{ background:aptSs.bg, color:aptSs.color }}>{aptSs.label}</span>
                        <select value={key} onChange={e => changeAptStatus(a.id, e.target.value as any)}
                          style={{ padding:'3px 8px', fontSize:11, border:`1px solid ${BRD}`, borderRadius:6, background:'#0f2736', color:T0, cursor:'pointer', outline:'none', fontFamily:'inherit' }}>
                          <option value="pending">Pendente</option>
                          <option value="confirmed">Confirmado</option>
                          <option value="done">Concluído</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                      </div>
                    </div>
                  );
                })}
              </DrawerSection>

              {/* Timeline */}
              <DrawerSection title="Histórico">
                <div style={{ padding:'14px 20px' }}>
                  {timeline.map((e, i) => (
                    <div key={i} className="flex gap-3" style={{ marginBottom: i<timeline.length-1?16:0 }}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div style={{ width:9, height:9, borderRadius:'50%', background:e.dot, marginTop:3, flexShrink:0 }} />
                        {i<timeline.length-1 && <div style={{ width:1, background:BRD, flex:1, marginTop:4 }} />}
                      </div>
                      <div style={{ flex:1, paddingBottom:4 }}>
                        <p className="text-[13px] font-medium" style={{ color:T0, marginBottom:2 }}>{e.title}</p>
                        <p className="text-[11px]" style={{ color:T2 }}>{e.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DrawerSection>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background:'#0f2736', borderRadius:14, border:`1px solid rgba(255,255,255,0.08)`, overflow:'hidden' }}>
      <div style={{ padding:'12px 20px', borderBottom:`1px solid rgba(255,255,255,0.08)` }}>
        <p className="text-[12px] font-semibold" style={{ color:'rgba(245,245,242,0.60)' }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 20px', borderBottom:`1px solid rgba(255,255,255,0.05)`, fontSize:13 }}>
      <span style={{ color:'rgba(245,245,242,0.50)' }}>{label}</span>
      <span style={{ fontWeight:500, color: color??'#F5F5F2', textAlign:'right', maxWidth:'60%' }}>{value}</span>
    </div>
  );
}
