import { api } from './api';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  name: string;
  phone: string;
  procedure: string;
  value: number;                  // em reais (convertido de centavos)
  status: 'new' | 'link_sent' | 'scheduled' | 'confirmed' | 'rejected';
  reject_reason: string | null;   // motivo de não agendamento
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  time: string;                   // data de entrada formatada
  created_at: string;             // ISO date string
  updated_at: string;             // ISO date string
  source: string;
}

export interface LeadDetail {
  id: string;
  name: string;
  phone: string;
  status: string;
  source: string;
  procedure_name: string | null;
  procedure_price: number | null;  // centavos
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadStats {
  total: number;
  scheduled: number;
  link_sent: number;
  new_leads: number;
  rejected: number;
  valor_em_aberto: number;  // em reais
  valor_agendado: number;   // em reais
  valor_realizado: number;  // em reais
}

// ── Mapeamento ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['new', 'link_sent', 'scheduled', 'confirmed', 'rejected']);

function derivePriority(createdAt: string, status: string): Lead['priority'] {
  if (status === 'scheduled' || status === 'confirmed') return 'Baixa';
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours < 4) return 'Urgente';
  if (hours < 24) return 'Alta';
  if (hours < 72) return 'Média';
  return 'Baixa';
}

function formatEntrada(createdAt: string): string {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return new Date(createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function mapLead(raw: any): Lead {
  const status: Lead['status'] = VALID_STATUSES.has(raw.status) ? raw.status : 'new';
  return {
    id: raw.id,
    name: raw.name,
    phone: raw.phone,
    procedure: raw.procedure_name || '',
    value: raw.procedure_price ? Math.round(raw.procedure_price / 100) : 0,
    status,
    reject_reason: raw.reject_reason || null,
    priority: derivePriority(raw.created_at, raw.status),
    time: formatEntrada(raw.created_at),
    created_at: raw.created_at,
    updated_at: raw.updated_at || raw.created_at,
    source: raw.source || 'manual',
  };
}

function mapStats(raw: any): LeadStats {
  return {
    total: Number(raw.total ?? 0),
    scheduled: Number(raw.scheduled ?? 0),
    link_sent: Number(raw.link_sent ?? 0),
    new_leads: Number(raw.new_leads ?? 0),
    rejected: Number(raw.rejected ?? 0),
    valor_em_aberto: Math.round(Number(raw.valor_em_aberto ?? 0) / 100),
    valor_agendado: Math.round(Number(raw.valor_agendado ?? 0) / 100),
    valor_realizado: Math.round(Number(raw.valor_realizado ?? 0) / 100),
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getLeads(params?: {
  status?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}): Promise<Lead[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.search) qs.set('search', params.search);
  if (params?.date_from) qs.set('date_from', params.date_from);
  if (params?.date_to) qs.set('date_to', params.date_to);
  const raw = await api.get<any[]>(`/api/leads${qs.size ? `?${qs}` : ''}`);
  return raw.map(mapLead);
}

export async function getLeadStats(): Promise<LeadStats> {
  const raw = await api.get<any>('/api/leads/stats');
  return mapStats(raw);
}

export async function updateLeadStatus(id: string, status: string): Promise<void> {
  await api.patch(`/api/leads/${id}/status`, { status });
}

export async function createLead(data: { name: string; phone: string }): Promise<Lead> {
  const raw = await api.post<any>('/api/leads', { ...data, source: 'manual', status: 'new' });
  return mapLead(raw);
}

export async function deleteLead(id: string): Promise<void> {
  await api.delete(`/api/leads/${id}`);
}

export async function getLeadDetail(id: string): Promise<LeadDetail> {
  return api.get<LeadDetail>(`/api/leads/${id}`);
}
