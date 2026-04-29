import { api } from './api';

export interface Professional {
  id: string;
  name: string;
  active: boolean;
  procedure_count: number;
}

export interface ProfessionalHour {
  day_of_week: number;
  open: boolean;
  start_time: string;
  end_time: string;
}

export async function getProfessionals(): Promise<Professional[]> {
  return api.get<Professional[]>('/api/professionals');
}

export async function createProfessional(name: string): Promise<Professional> {
  return api.post<Professional>('/api/professionals', { name });
}

export async function updateProfessional(id: string, data: { name?: string; active?: boolean }): Promise<Professional> {
  return api.patch<Professional>(`/api/professionals/${id}`, data);
}

export async function getProfessionalProcedures(id: string): Promise<{ id: string; name: string }[]> {
  return api.get(`/api/professionals/${id}/procedures`);
}

export async function setProfessionalProcedures(id: string, procedure_ids: string[]): Promise<void> {
  await api.put(`/api/professionals/${id}/procedures`, { procedure_ids });
}

export async function getProfessionalsByProcedure(procedureId: string): Promise<{ id: string; name: string; active: boolean }[]> {
  return api.get(`/api/professionals/by-procedure/${procedureId}`);
}

export async function setProfessionalsByProcedure(procedureId: string, professional_ids: string[]): Promise<void> {
  await api.put(`/api/professionals/by-procedure/${procedureId}`, { professional_ids });
}

export async function getProfessionalHours(id: string): Promise<ProfessionalHour[]> {
  return api.get(`/api/professionals/${id}/hours`);
}

export async function saveProfessionalHours(id: string, days: ProfessionalHour[]): Promise<void> {
  await api.put(`/api/professionals/${id}/hours`, days);
}
