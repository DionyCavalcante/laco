import { api } from './api';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface PortalSettings {
  reveal_delay: number;
  show_price: boolean;
  greeting_msg: string;
}

export interface ClinicInfo {
  name: string;
  slug: string;
  address: string | null;
}

export interface HourEntry {
  day_of_week: number;   // 0=Dom … 6=Sáb
  open: boolean;
  start_time: string;    // "HH:MM"
  end_time: string;      // "HH:MM"
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getSettings(): Promise<PortalSettings> {
  return api.get<PortalSettings>('/api/settings');
}

export async function saveSettings(data: Partial<PortalSettings>): Promise<void> {
  await api.post('/api/settings', data);
}

export async function getClinic(): Promise<ClinicInfo> {
  return api.get<ClinicInfo>('/api/settings/clinic');
}

export async function updateClinic(data: { name: string; slug?: string; address?: string; phone?: string }): Promise<{ ok: boolean; slug?: string }> {
  return api.patch('/api/settings/clinic', {
    name: data.name,
    slug: data.slug ?? undefined,
    address: data.address ?? null,
    phone: data.phone ?? undefined,
  });
}

export async function getHours(): Promise<HourEntry[]> {
  return api.get<HourEntry[]>('/api/hours');
}

export async function saveHours(hours: HourEntry[]): Promise<void> {
  await api.post('/api/hours', hours);
}
