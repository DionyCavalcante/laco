import { api } from './api';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface Procedure {
  id: string;
  name: string;
  duration: string;   // "60 min"
  durationMin: number;
  price: number;      // em reais
  priceOld: number;   // em reais
  paymentNote: string;
  videoUrl: string;
  active: boolean;
  status: 'Ativo' | 'Inativo';
  sortOrder: number;
  // Campos de página (todos opcionais)
  category?: string;
  description?: string;
  revealDelay?: number;
  headline?: string;
  subheadline?: string;
  authorityNote?: string;
  mainPain?: string;
  emotionalDesire?: string;
  dayToDayFit?: string;
  howItWorks?: string;
  faqSessionDuration?: string;
  faqResultDuration?: string;
  faqPainDiscomfort?: string;
  faqMaintenance?: string;
  faqAftercare?: string;
  benefit1Title?: string;
  benefit1Desc?: string;
  benefit2Title?: string;
  benefit2Desc?: string;
  benefit3Title?: string;
  benefit3Desc?: string;
  photoMode?: string;
  closingNote?: string;
}

// ── Mapeamento ────────────────────────────────────────────────────────────────

function mapProcedure(raw: any): Procedure {
  return {
    id: raw.id,
    name: raw.name,
    duration: `${raw.duration ?? 30} min`,
    durationMin: raw.duration ?? 30,
    price: Math.round(Number(raw.price ?? 0) / 100),
    priceOld: Math.round(Number(raw.price_old ?? 0) / 100),
    paymentNote: raw.payment_note || '',
    videoUrl: raw.video_url || '',
    active: raw.active !== false,
    status: raw.active !== false ? 'Ativo' : 'Inativo',
    sortOrder: raw.sort_order ?? 0,
    // Campos de página
    category: raw.category || '',
    description: raw.description || '',
    revealDelay: raw.reveal_delay ?? 5,
    headline: raw.headline || '',
    subheadline: raw.subheadline || '',
    authorityNote: raw.authority_note || '',
    mainPain: raw.main_pain || '',
    emotionalDesire: raw.emotional_desire || '',
    dayToDayFit: raw.day_to_day_fit || '',
    howItWorks: raw.how_it_works || '',
    faqSessionDuration: raw.faq_session_duration || '',
    faqResultDuration: raw.faq_result_duration || '',
    faqPainDiscomfort: raw.faq_pain_discomfort || '',
    faqMaintenance: raw.faq_maintenance || '',
    faqAftercare: raw.faq_aftercare || '',
    benefit1Title: raw.benefit_1_title || '',
    benefit1Desc: raw.benefit_1_desc || '',
    benefit2Title: raw.benefit_2_title || '',
    benefit2Desc: raw.benefit_2_desc || '',
    benefit3Title: raw.benefit_3_title || '',
    benefit3Desc: raw.benefit_3_desc || '',
    photoMode: raw.photo_mode || '',
    closingNote: raw.closing_note || '',
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function getProcedures(): Promise<Procedure[]> {
  const raw = await api.get<any[]>('/api/procedures');
  return raw.map(mapProcedure);
}

export async function createProcedure(data: {
  name: string;
  duration: number;
  price: number;
  price_old?: number;
  payment_note?: string;
  video_url?: string;
}): Promise<Procedure> {
  const raw = await api.post<any>('/api/procedures', {
    ...data,
    price: data.price * 100,
    price_old: data.price_old ? data.price_old * 100 : undefined,
  });
  return mapProcedure(raw);
}

export async function deleteProcedure(id: string): Promise<void> {
  await api.delete(`/api/procedures/${id}`);
}

export async function updateProcedure(
  id: string,
  data: Partial<{
    name: string;
    duration: number;
    price: number;
    price_old: number;
    payment_note: string;
    video_url: string;
    active: boolean;
    sort_order: number;
    reveal_delay: number;
    category: string;
    description: string;
    headline: string;
    subheadline: string;
    authority_note: string;
    main_pain: string;
    emotional_desire: string;
    day_to_day_fit: string;
    how_it_works: string;
    faq_session_duration: string;
    faq_result_duration: string;
    faq_pain_discomfort: string;
    faq_maintenance: string;
    faq_aftercare: string;
    benefit_1_title: string;
    benefit_1_desc: string;
    benefit_2_title: string;
    benefit_2_desc: string;
    benefit_3_title: string;
    benefit_3_desc: string;
    photo_mode: string;
    closing_note: string;
  }>
): Promise<Procedure> {
  const payload: any = { ...data };
  if (data.price !== undefined) payload.price = data.price * 100;
  if (data.price_old !== undefined) payload.price_old = data.price_old * 100;
  const raw = await api.patch<any>(`/api/procedures/${id}`, payload);
  return mapProcedure(raw);
}
