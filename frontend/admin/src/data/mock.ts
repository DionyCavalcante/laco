export interface Lead {
  id: string;
  name: string;
  procedure: string;
  value: number;
  status: 'Novo Lead' | 'Link Enviado' | 'Agendado' | 'Confirmado';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  time: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  procedure: string;
  time: string;
  room: string;
  doctor: string;
  status: 'Confirmado' | 'Aguardando' | 'Pendente';
  value: number;
}

export interface AI_Agent {
  id: string;
  name: string;
  specialty: string;
  status: 'Ativo' | 'Inativo';
  performance: number;
}

export interface Procedure {
  id: string;
  name: string;
  duration: string;
  status: 'Ativo' | 'Inativo';
}

export const leads: Lead[] = [
  { id: '1', name: 'Beatriz Farias', procedure: 'Mamoplastia de Aumento', value: 15200, status: 'Novo Lead', priority: 'Urgente', time: '04' },
  { id: '2', name: 'Carlos Eduardo', procedure: 'Harmonização Facial', value: 4500, status: 'Novo Lead', priority: 'Média', time: '2 HORAS' },
  { id: '3', name: 'Ricardo Costa', procedure: 'Lipo HD High Def', value: 24000, status: 'Link Enviado', priority: 'Média', time: '03' },
  { id: '4', name: 'Ana Martins', procedure: 'Rinoplastia Estruturada', value: 18500, status: 'Agendado', priority: 'Alta', time: '22/AGO' },
  { id: '5', name: 'Sérgio Ramos', procedure: 'Otoplastia', value: 7500, status: 'Confirmado', priority: 'Baixa', time: '03' },
];

export const appointments: Appointment[] = [
  { id: '1', patientName: 'Eduardo Santos', procedure: 'Cirurgia Bucomaxilo', time: '09:30 AM', room: 'Sala 04', doctor: 'Dr. Julian', status: 'Confirmado', value: 4500 },
  { id: '2', patientName: 'Alice Moreira', procedure: 'Dermatologia Clínica', time: '10:45 AM', room: 'Sala 02', doctor: 'Dra. Ana', status: 'Aguardando', value: 850 },
  { id: '3', patientName: 'Roberto Guedes', procedure: 'Implantologia Oral', time: '14:15', room: 'Sala 04', doctor: 'Dr. Julian', status: 'Pendente', value: 6200 },
];

export const aiAgents: AI_Agent[] = [
  { id: '1', name: 'Aura Vendas', specialty: 'Conversão de Links Diretos', status: 'Ativo', performance: 82400 },
  { id: '2', name: 'Aura Scheduler', specialty: 'Gestão de Agendamentos', status: 'Ativo', performance: 45100 },
  { id: '3', name: 'Aura Marketing', specialty: 'Re-engajamento & Promo', status: 'Inativo', performance: 15000 },
];

export const procedures: Procedure[] = [
  { id: '1', name: 'Rinoplastia Ultrassônica', duration: '180 min', status: 'Ativo' },
  { id: '2', name: 'Harmonização Facial - Diamond', duration: '60 min', status: 'Ativo' },
  { id: '3', name: 'Blefaroplastia Superior', duration: '90 min', status: 'Inativo' },
];

export const metrics = {
  revenue: 142850,
  potential: 294000,
  ticketMedio: 4250,
  conversionRate: 24.8,
  leadsTotal: 1284,
  hotLeads: 42,
  scheduled: 156,
  operationalScore: 82,
  responseTime: '12m',
  clinicalEfficiency: 94,
};
