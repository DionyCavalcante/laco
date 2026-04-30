import { api } from './api';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  patientName: string;
  procedure: string;
  time: string;        // "HH:MM"
  endTime: string;     // "HH:MM" calculado
  date: string;        // "YYYY-MM-DD"
  duration: number;    // minutos
  status: 'Confirmado' | 'Aguardando' | 'Pendente' | 'Cancelado';
  value: number;       // em reais
  leadId: string;
  professionalId: string | null;
}

export interface AppointmentStats {
  total: number;
  confirmed: number;
  pending: number;
  done: number;
  valor_agendado: number;   // em reais
  valor_realizado: number;  // em reais
  valor_perdido: number;    // em reais
}

// ── Mapeamento ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, Appointment['status']> = {
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  done: 'Confirmado',
  cancelled: 'Cancelado',
};

function mapAppointment(raw: any): Appointment {
  const dt = new Date(raw.scheduled_at);
  const duration = Number(raw.duration ?? 60);
  const endDt = new Date(dt.getTime() + duration * 60_000);
  return {
    id: raw.id,
    patientName: raw.lead_name || raw.name || '—',
    procedure: raw.procedure_name || '—',
    time: dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    endTime: endDt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    date: dt.toISOString().split('T')[0],
    duration,
    status: STATUS_MAP[raw.status] ?? 'Aguardando',
    value: Math.round(Number(raw.price ?? 0) / 100),
    leadId: raw.lead_id,
    professionalId: raw.professional_id || null,
  };
}

function mapStats(raw: any): AppointmentStats {
  return {
    total: Number(raw.total ?? 0),
    confirmed: Number(raw.confirmed ?? 0),
    pending: Number(raw.pending ?? 0),
    done: Number(raw.done ?? 0),
    valor_agendado: Math.round(Number(raw.valor_agendado ?? 0) / 100),
    valor_realizado: Math.round(Number(raw.valor_realizado ?? 0) / 100),
    valor_perdido: Math.round(Number(raw.valor_perdido ?? 0) / 100),
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getAppointments(params?: {
  date?: string;
  from?: string;
  to?: string;
  status?: string;
  lead_id?: string;
}): Promise<Appointment[]> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.from) qs.set('from', params.from);
  if (params?.to) qs.set('to', params.to);
  if (params?.status) qs.set('status', params.status);
  if (params?.lead_id) qs.set('lead_id', params.lead_id);
  const raw = await api.get<any[]>(`/api/appointments${qs.size ? `?${qs}` : ''}`);
  return raw.map(mapAppointment);
}

export async function getAppointmentStats(): Promise<AppointmentStats> {
  const raw = await api.get<any>('/api/appointments/stats');
  return mapStats(raw);
}

export async function updateAppointmentStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'done' | 'cancelled'
): Promise<void> {
  await api.patch(`/api/appointments/${id}/status`, { status });
}

export async function createAppointment(data: {
  lead_id: string;
  procedure_id: string;
  date: string;
  time: string;
}): Promise<void> {
  await api.post('/api/appointments', data);
}

export async function rescheduleAppointment(id: string, date: string, time: string): Promise<void> {
  await api.patch(`/api/appointments/${id}/reschedule`, { date, time });
}

export async function getSlots(date: string, procedureId?: string): Promise<string[]> {
  const qs = new URLSearchParams({ date });
  if (procedureId) qs.set('procedure_id', procedureId);
  const raw = await api.get<{ slots: { time: string; taken: boolean }[]; reason?: string }>(
    `/api/appointments/slots?${qs}`
  );
  return (raw.slots ?? []).filter((s) => !s.taken).map((s) => s.time);
}
