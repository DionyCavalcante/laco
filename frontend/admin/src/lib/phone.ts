/**
 * Normaliza um número de telefone para o padrão de armazenamento: 55 + DDD + número
 * Exemplo: "88 9 8104-8831" → "5588981048831"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return '';

  // Remove espaços, parênteses, hífens e outros caracteres especiais
  const cleaned = phone.replace(/\D/g, '');

  // Se já começa com 55, retorna como está
  if (cleaned.startsWith('55')) {
    return cleaned;
  }

  // Se tem 11 dígitos (DDD + número), adiciona 55 na frente
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }

  // Se tem menos de 11, adiciona 55
  return '55' + cleaned;
}

/**
 * Formata um número de telefone para exibição legível
 * Exemplo: "5588981048831" → "(88) 9 8104-8831"
 */
export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '—';

  // Normaliza primeiro
  const normalized = normalizePhone(phone);

  // Remove o 55 para formatação
  const withoutCountryCode = normalized.slice(2);

  if (withoutCountryCode.length !== 11) {
    return phone; // Retorna original se não conseguir formatar
  }

  // Formato: (DDD) 9 XXXX-XXXX
  const ddd = withoutCountryCode.slice(0, 2);
  const firstPart = withoutCountryCode.slice(2, 7);
  const secondPart = withoutCountryCode.slice(7);

  return `(${ddd}) ${firstPart.slice(0, 1)} ${firstPart.slice(1)}-${secondPart}`;
}

/**
 * Retorna o número para usar em links do WhatsApp (com 55)
 * Exemplo: "5588981048831"
 */
export function getPhoneForWhatsApp(phone: string): string {
  return normalizePhone(phone);
}
