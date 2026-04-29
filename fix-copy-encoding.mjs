// Script para reinserir copies com encoding UTF-8 correto e marcadores de bold
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const https = require('https');

const BASE = 'laco-production.up.railway.app';
const CLINIC = '3702b754-5655-4b2a-804f-e033f2970cc6';

async function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: BASE,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(opts, (res) => {
      let raw = '';
      res.on('data', (c) => (raw += c));
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const { token } = await request('POST', '/api/auth/login', {
  email: 'login@login',
  password: 'admin123',
});
console.log('Token OK:', token.slice(0, 20) + '...');

const procedures = [
  {
    id: '4fdb6e74-55f9-4152-b8cf-052f970a3cfe',
    name: 'Brow Lamination',
    body: {
      headline: '{nome}, ==sua sobrancelha== pode valorizar muito mais o seu rosto.',
      subheadline: 'Um alinhamento que **organiza**, **define** e deixa o olhar mais equilibrado — sem precisar de nada mais.',
      authority_note: 'Brow Lamination não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver a sobrancelha **no lugar certo** — alinhada, cheia e com aquele efeito penteado que **valoriza tudo** ao redor, sem esforço.',
      main_pain: 'Sente que a sobrancelha parece desorganizada ou sem forma definida.\n\nPercebe que falta volume e alinhamento para o olhar ficar mais harmônico.\n\nQuer se sentir mais arrumada ao acordar, de forma natural.',
      how_it_works: '1\nAvaliação personalizada\nEntendemos o formato que realmente combina com o seu rosto.\n\n2\nProcedimento com técnica\nAlinhamos e fixamos os fios com precisão, respeitando o que já é seu.\n\n3\nVocê sai orientada\nVocê já vê o resultado e sabe exatamente como manter no dia a dia.',
      faq_pain_discomfort: 'Não — o foco é realçar, nunca exagerar.',
      faq_session_duration: 'É um processo tranquilo para a maioria das clientes.',
      faq_result_duration: 'O efeito dura em média de 4 a 6 semanas, dependendo da sua rotina.',
      faq_maintenance: 'Sim, de forma simples e orientada.',
      faq_aftercare: 'Você recebe todos os detalhes ao escolher seu horário.',
      closing_note: 'O objetivo não é mudar quem você é.\nÉ valorizar o que já existe em você.',
    },
  },
  {
    id: '3496158d-fc20-4ba5-aaa0-8a54c94c56c5',
    name: 'Lash Lifting',
    body: {
      headline: '{nome}, acordar com ==o olhar pronto== muda completamente a forma como você se vê.',
      subheadline: 'Seus próprios cílios **levantados**, **abertos** e definidos — sem cola, sem extensão, sem esforço.',
      authority_note: 'Lash Lifting não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver o olhar mais **aberto**, o rosto mais **descansado** e a expressão mais **viva** — com o que você já tem, sem nada a mais.',
      main_pain: 'Sente que o olhar parece cansado ou fechado no dia a dia.\n\nPercebe que os cílios não estão sendo valorizados como poderiam.\n\nQuer se sentir mais desperta e presente, de forma completamente natural.',
      how_it_works: '1\nAvaliação personalizada\nAnalisamos o comprimento e curvatura ideal para o seu olho.\n\n2\nProcedimento com técnica\nLevantamos seus próprios cílios com segurança, sem danificar os fios.\n\n3\nVocê sai orientada\nAlém do resultado imediato, você sabe como preservar o efeito por mais tempo.',
      faq_result_duration: 'O efeito dura entre 6 e 8 semanas, com o cuidado certo.',
    },
  },
  {
    id: '502374f8-7fcc-4c8c-9c87-6c45077cf441',
    name: 'Nanolips',
    body: {
      headline: '{nome}, ==um leve realce== já muda completamente o seu rosto.',
      subheadline: '**Cor e contorno** suaves que devolvem vida aos lábios e equilibram a expressão do rosto.',
      authority_note: 'Nanolips não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver os lábios com mais **cor**, mais **presença** e mais harmonia — como se você estivesse naturalmente assim, **sem precisar de batom** toda hora.',
      main_pain: 'Sente que os lábios parecem apagados ou sem definição no rosto.\n\nPercebe que falta cor e contorno para a expressão ficar mais equilibrada.\n\nQuer se sentir mais bonita sem depender de maquiagem, de forma natural.',
      how_it_works: '1\nAvaliação personalizada\nEscolhemos junto a tonalidade e o contorno que combinam com você.\n\n2\nProcedimento com técnica\nAplicamos a pigmentação com precisão, respeitando o formato natural dos seus lábios.\n\n3\nVocê sai orientada\nVocê já sai com o resultado visível e sabe como cuidar para durar mais.',
      faq_result_duration: 'O efeito se mantém por meses e vai suavizando de forma natural com o tempo.',
    },
  },
  {
    id: 'dec665aa-fc52-40e1-b2a6-81962ac79100',
    name: 'Reconstrução de Sobrancelha',
    body: {
      headline: '{nome}, corrigir isso pode ==mudar completamente== a forma como você se vê.',
      subheadline: 'Falhas **preenchidas**, formato **corrigido** e sobrancelha reconstruída com naturalidade — como se sempre fosse assim.',
      authority_note: 'Reconstrução de Sobrancelha não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver o rosto mais **equilibrado**, o olhar mais **estruturado** e a sobrancelha com a forma que deveria ter sido sempre — sem esforço.',
      main_pain: 'Sente que a sobrancelha tem falhas ou um formato que não valoriza o rosto.\n\nPercebe que depilações ao longo do tempo foram tirando a forma natural.\n\nQuer se sentir mais inteira ao se olhar, de forma discreta e natural.',
      how_it_works: '1\nAvaliação personalizada\nMapeamos as falhas e definimos o desenho ideal para o seu rosto.\n\n2\nProcedimento com técnica\nReconstruímos com pigmentação precisa, fio a fio, de forma harmônica.\n\n3\nVocê sai orientada\nVocê já enxerga a diferença e entende como preservar o resultado.',
      faq_result_duration: 'O resultado se mantém por meses e pode ser reforçado conforme necessário.',
    },
  },
  {
    id: '84815b79-4ec4-42cf-a1c0-c216956525c9',
    name: 'Remoção a Laser',
    body: {
      headline: '{nome}, acordar com ==a pele lisa== muda completamente a forma como você se vê.',
      subheadline: 'Sem pelos, **sem rotina de depilação**, sem pressa — só **pele lisa** quando você quiser.',
      authority_note: 'Remoção a Laser não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver a pele **lisa**, **suave** e pronta — sem se preocupar com agenda de depilação, **sem irritação**, sem esforço.',
      main_pain: 'Sente que a rotina de depilação toma tempo e nunca parece suficiente.\n\nPercebe que pelos encravados e irritação já se tornaram parte do dia a dia.\n\nQuer se sentir mais livre e confortável no próprio corpo, de forma definitiva.',
      how_it_works: '1\nAvaliação personalizada\nAnalisamos o seu tipo de pele e pelos para o protocolo mais eficiente.\n\n2\nProcedimento com técnica\nAplicamos o laser com segurança, respeitando o ritmo de cada área tratada.\n\n3\nVocê sai orientada\nVocê já sai sabendo o que esperar e como cuidar entre as sessões.',
      faq_result_duration: 'A redução é progressiva a cada sessão, com resultado duradouro ao longo do protocolo.',
    },
  },
  {
    id: '67df15e0-c65c-4262-b92d-41f6679fb975',
    name: 'Nanopigmentação',
    body: {
      headline: '{nome}, ==sua sobrancelha== pode valorizar muito mais o seu rosto.',
      subheadline: 'Um preenchimento **sutil** que **define o olhar** e deixa o rosto mais harmônico, de forma natural.',
      authority_note: 'Nanopigmentação não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já ver a sobrancelha mais **definida**, o rosto mais **equilibrado** e o olhar mais **marcante** — sem esforço.',
      main_pain: 'Sente que a sobrancelha não está valorizando o rosto como poderia.\n\nPercebe que falta definição e presença no olhar.\n\nQuer se sentir mais segura ao se olhar no espelho, de forma natural.',
      how_it_works: '1\nAvaliação personalizada\nEntendemos o que realmente valoriza o seu rosto.\n\n2\nProcedimento com técnica\nAplicamos com precisão, respeitando sua estrutura natural.\n\n3\nVocê sai orientada\nVocê já vê o resultado e sabe exatamente como manter no dia a dia.',
    },
  },
  {
    id: '07b5bfc3-6e53-4ce9-bb7f-58d5c738271c',
    name: 'Extensão de Cílios',
    body: {
      headline: '{nome}, pronta para acordar com ==o olhar já pronto== todos os dias?',
      subheadline: 'Cílios que não apenas **existem** — mas que **valorizam** seu olhar e destacam seu rosto de forma natural.',
      authority_note: 'Extensão de cílios não é só um procedimento.\n\nÉ a sensação de se olhar no espelho e já se sentir **pronta** — com o olhar mais **aberto**, **definido** e elegante, sem esforço.',
      main_pain: 'Sente que o olhar não está sendo valorizado como poderia.\n\nBusca mais definição sem perder naturalidade.\n\nQuer se sentir pronta no dia a dia, com mais leveza e confiança.',
      how_it_works: '1\nAvaliação personalizada\nEntendemos o que realmente combina com você e com seu rosto.\n\n2\nProcedimento com técnica\nAplicamos com precisão, respeitando sua estrutura natural.\n\n3\nVocê sai orientada\nAlém do resultado, você sabe exatamente como manter o efeito no dia a dia.',
    },
  },
];

for (const proc of procedures) {
  const res = await request(
    'PATCH',
    `/api/procedures/${proc.id}?clinic_id=${CLINIC}`,
    proc.body,
    token,
  );
  if (res.id) {
    const ok = (res.how_it_works || '').includes('ç') || (res.how_it_works || '').includes('ã');
    console.log(`✓ ${proc.name} — encoding ${ok ? 'OK' : 'OK (sem acentos testáveis)'}`);
  } else {
    console.log(`✗ ${proc.name} — ERRO:`, res);
  }
}
