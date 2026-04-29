# PRD — Página de Procedimento: Estrutura Narrativa Persuasiva

**Projeto:** Laço — CRM/agendador para clínicas de estética  
**Arquivo principal:** `frontend/agendador/src/App.tsx` (componente `OfferScreen`)  
**Data:** 2026-04-21  
**Status:** Aprovação pendente

---

## 1. Resumo executivo

A página de procedimento é o momento decisivo do funil: a cliente chegou pelo WhatsApp ou Instagram, abriu o link e está avaliando se agenda ou sai. A página atual já tem identidade visual aprovada, carrossel, benefícios e oferta de preço — tudo isso permanece. O que muda é a **ordem e o conteúdo dos blocos**, tornando a leitura mais fluida, personalizada e persuasiva sem parecer um blog ou carta de vendas.

A implementação ocorre em **duas fases**:
- **Fase 1 (MVP):** nova estrutura usando apenas campos já existentes no banco, com fallbacks automáticos.
- **Fase 2 (Completa):** novos campos editáveis no admin para personalização por procedimento.

---

## 2. Problema

A estrutura atual da `OfferScreen` foi construída de forma incremental e apresenta os seguintes problemas de conversão:

1. **Abertura genérica** — a headline não usa o nome da cliente nem o nome da clínica, perdendo o único momento em que a leitura é garantida.
2. **Frase de autoridade ausente** — não há nenhum bloco que conecte a clínica ao procedimento de forma personalizada.
3. **Benefícios desconectados da dor real** — os três cards usam linguagem de produto ("Segurança Máxima", "Recuperação Imediata") em vez de linguagem de resultado esperado pela cliente.
4. **"Para quem é" inexistente** — a cliente não consegue se identificar com o procedimento além dos benefícios.
5. **"Como funciona" inexistente** — não há descrição do processo, o que gera insegurança antes de agendar.
6. **FAQ inexistente** — dúvidas básicas (tempo, duração, dor, manutenção) ficam sem resposta, forçando a cliente a sair da página para buscar informação.
7. **Fechamento impessoal** — a página termina com o footer de preço sem nenhuma frase de encerramento que reduza fricção.

---

## 3. Objetivo

Reorganizar e enriquecer o conteúdo da `OfferScreen` para que a página:

- Pareça uma **conversa premium da clínica com a cliente**, não um texto genérico.
- Responda as dúvidas mais comuns **antes** que a cliente precise sair para pesquisar.
- Use `clientName` e `clinicName` para criar **sensação de personalização** sem ser invasivo.
- Mantenha toda a **identidade visual, componentes e comportamentos** já aprovados.

**Métrica de sucesso:** aumento na taxa de conversão da página para agendamento (cliques em "Escolher meu horário" / visualizações da `OfferScreen`).

---

## 4. Não objetivos / restrições visuais

As seguintes mudanças estão **explicitamente fora de escopo**:

- Redesign de qualquer componente visual (cores, fontes, ícones, espaçamentos, sombras, bordas)
- Mudança no footer fixo de investimento (visual, altura, animação ou comportamento)
- Mudança no comportamento do botão "Escolher meu horário"
- Mudança no botão "Escolher outro procedimento" / "Ver outros procedimentos"
- Mudança na estética do carrossel, cards de benefícios ou animações existentes
- Transformar a página em blog, carta de vendas longa ou landing page separada
- Alterar qualquer rota de API de agendamento (`/identify`, `/track`, `/book`, `/slots`)

**Blocos atuais que serão removidos na Fase 1** (substituídos pela nova estrutura narrativa):
- Seção de **prova social** (avatars picsum + texto "Centenas de clientes satisfeitas") — substituída pela frase de autoridade (Bloco 3), que cumpre a mesma função com mais personalidade e sem depender de imagens externas
- Seção **"A Clínica"** (cards com Stethoscope / Building2 / Cpu + textos genéricos de "Equipe Especialista", "Ambiente Premium", "Tecnologia de Ponta") — substituída pelos blocos "Para quem é" e "Como funciona", que trazem informação útil para a decisão de agendamento em vez de atributos institucionais genéricos

---

## 5. Público-alvo e contexto de uso

**Quem acessa:** clientes vindas de WhatsApp ou Instagram, tipicamente em dispositivos móveis, com atenção fragmentada e expectativa de resposta rápida.

**Comportamento esperado:** escaneiam a página verticalmente, param na imagem, leem o headline, pulam para o preço. Raramente leem todo o texto. A estrutura deve respeitar isso: blocos curtos, títulos que comunicam sozinhos, texto que complementa sem ser obrigatório.

**Contexto de dados disponíveis no momento de exibição:**
- `clientName` — pode estar disponível (cliente veio do WhatsApp com nome preenchido) ou não (acesso direto ao link)
- `clinicName` — sempre disponível via `clinic.name` da API
- `selectedProc` — sempre disponível (procedimento selecionado antes de entrar na OfferScreen)
- Fotos — podem estar ausentes (fallback para imagens genéricas já implementado)

---

## 6. Estrutura narrativa da nova página

A nova estrutura substitui a atual mantendo os mesmos componentes visuais. A ordem dos blocos é:

```
┌─────────────────────────────────────────────┐
│ 1. HEADER PERSONALIZADO                     │
│    Categoria · Headline · Subheadline        │
├─────────────────────────────────────────────┤
│ 2. CARROSSEL PRINCIPAL                      │
│    (mantido idêntico ao atual)              │
├─────────────────────────────────────────────┤
│ 3. FRASE DE AUTORIDADE DA CLÍNICA           │
│    1 frase solta, sem card, sem ícone       │
├─────────────────────────────────────────────┤
│ 4. TRÊS BENEFÍCIOS                          │
│    Cards horizontais com ícone + texto      │
├─────────────────────────────────────────────┤
│ 5. PARA QUEM É                              │
│    Seção com fundo suave, bullets curtos    │
├─────────────────────────────────────────────┤
│ 6. COMO FUNCIONA                            │
│    Seção com título + parágrafo objetivo    │
├─────────────────────────────────────────────┤
│ 7. FAQ RÁPIDO                               │
│    5 itens em accordion colapsado           │
├─────────────────────────────────────────────┤
│ 8. FECHAMENTO PERSONALIZADO                 │
│    1 frase centralizada, tom leve           │
├─────────────────────────────────────────────┤
│ 9. FOOTER FIXO (sem alteração)              │
│    Investimento · CTA principal · CTA sec.  │
└─────────────────────────────────────────────┘
```

---

## 7. Requisitos funcionais

### RF-01 — Bloco 1: Header personalizado

**Função narrativa:** primeira impressão. A leitora precisa sentir que aquela página foi feita para ela.

**Composição visual (manter estilo atual):**
- `category` — label uppercase, `text-[10px] font-bold tracking-[0.2em] text-secondary`. Fallback: `"Estética"`. Pequeno, discreto, ancora o contexto antes do headline.
- `headline` — título principal, `text-[22px] font-extrabold text-primary tracking-tight`. Peso máximo da página. Deve ser a frase que faz a cliente parar de rolar.
  - Com `clientName`: `"{clientName}, veja como {proc.name} pode realçar o que é seu"`
  - Sem `clientName`: `"Veja como {proc.name} pode realçar sua beleza natural"`
- `subheadline` — complemento em fonte fina, `text-[11px] font-medium text-on-surface-variant opacity-80 max-w-[280px] mx-auto leading-relaxed`. Deve soar como uma promessa honesta, não um slogan. Fallback: truncar `description` em 90 caracteres ou usar template neutro.

**Ritmo:** os três elementos têm pesos visuais claramente distintos — label quase invisível, headline impactante, subheadline sussurrado. Sem elementos extras, sem ícones, sem separadores.

---

### RF-02 — Bloco 2: Carrossel principal

**Função narrativa:** prova visual imediata. A imagem fala antes de qualquer texto.

**Composição visual (zero alteração):**
- `rounded-2xl overflow-hidden shadow-2xl` — card de imagem com bordas bem arredondadas e sombra profunda, destacado do fundo branco
- Gradiente escuro na base (`bg-gradient-to-t from-primary/60`) — ancora visualmente o rodapé da imagem e cria contraste para os dots de navegação
- Dots de progresso — `h-1.5 rounded-full`: ativo em `w-6 bg-white`, inativo em `w-1.5 bg-white/40` — minimalistas, não distraem
- Setas de navegação — `w-6 h-6 rounded-full bg-black/15` nas laterais, visíveis sem sobrepor a imagem
- Autoplay a cada 4s; setas habilitam navegação manual

**Fontes de imagem (prioridade):** fotos `side = carousel` → fotos `before`/`after` → Unsplash genérico

---

### RF-03 — Bloco 3: Frase de autoridade

**Função narrativa:** após ver as imagens, a cliente precisa sentir que a clínica entende *ela* — não que vende um produto padrão.

**Composição visual:**
- Sem card, sem fundo colorido, sem ícone — o bloco existe apenas como texto, flutuando entre o carrossel e os benefícios
- `text-center text-[12px] text-on-surface-variant leading-relaxed italic` — fonte leve, ligeiramente em itálico para dar tom de voz humana
- `max-w-[300px] mx-auto` — limita a largura para que a frase nunca ocupe mais de 2 linhas no mobile
- `mb-8` de margem com os blocos adjacentes — mesmo respiro dos demais blocos da página

**Tom:** não é slogan de marca. É uma frase que poderia ter sido dita pela profissional na recepção.
- Fase 1: `"Na {clinicName}, cada atendimento começa por entender o que combina com você."`
- Fase 2: campo `authority_note` personalizado por procedimento

---

### RF-04 — Bloco 4: Três benefícios

**Função narrativa:** reforçar o resultado esperado com linguagem de experiência, não de produto.

**Composição visual (manter estilo atual dos cards):**
- Grid vertical com `gap-3` — cada card em `rounded-xl shadow-sm border border-outline-variant/5 bg-white p-4`
- Layout horizontal interno: ícone à esquerda + texto à direita (`flex items-center gap-4`)
- Ícone: círculo `w-10 h-10 rounded-full bg-secondary/10 text-secondary` com ícone lucide `size={20}` — suave, sem peso excessivo
- Título do card: `text-sm font-bold text-primary` — lido como uma promessa curta
- Descrição: `text-[10px] text-on-surface-variant opacity-70 leading-tight` — detalha em tom discreto, sem competir com o título

**Conteúdo — atualizar fallbacks para linguagem de resultado:**

| Posição | Ícone atual | Título fallback novo | Descrição fallback nova |
|---------|-------------|----------------------|------------------------|
| 1 | `Sparkles` | "Resultado com sua identidade" | "Respeitamos o que é seu — o resultado combina com você, não com um padrão." |
| 2 | `Bolt` | "Sem complicar sua rotina" | "O procedimento se encaixa no seu dia a dia sem exigir cuidados complexos." |
| 3 | `ShieldCheck` | "Profissional que te orienta" | "Você não sai com dúvidas. Cada etapa é explicada antes e depois." |

Usar `benefit_1/2/3_title` e `benefit_1/2/3_desc` do banco quando preenchidos — fallbacks entram apenas se vazios.

---

### RF-05 — Bloco 5: Para quem é

**Função narrativa:** fazer a cliente se reconhecer. Quem lê isso deve pensar "é exatamente meu caso".

**Composição visual:**
- Seção com fundo `bg-surface-container-low rounded-2xl p-6` — mesmo padrão da seção "A Clínica" já existente. Cria respiro visual e agrupa o conteúdo como uma área própria.
- Título da seção: `text-base font-extrabold text-primary mb-3` — mesmo peso da seção "A Clínica" atual
- Conteúdo em bullets curtos, sem numeração, com marcador simples (`·` ou `—`) em `text-secondary`:
  - Cada bullet em `text-[12px] text-on-surface-variant leading-relaxed py-1`
  - Máximo 3 bullets, máximo 1 linha cada um no mobile

**Fase 1 — fallback em texto corrido** (quando `description` disponível):
> Usar os primeiros 150 caracteres de `description`. Se vazio, usar: `"Para quem quer cuidar da aparência com atenção personalizada e resultado que respeita a sua naturalidade."`

**Fase 2 — bullets montados dos campos:**
- `· {main_pain}` (dor: o que incomoda hoje)
- `· {emotional_desire}` (desejo: o que quer conquistar)
- `· {day_to_day_fit}` (rotina: como isso muda o dia a dia)

---

### RF-06 — Bloco 6: Como funciona

**Função narrativa:** eliminar a insegurança de "o que vai acontecer lá dentro". Transparência antes do agendamento.

**Composição visual:**
- Continua dentro do mesmo fundo `bg-surface-container-low rounded-2xl p-6` do Bloco 5 — os dois blocos podem coexistir na mesma seção com um separador leve (`border-t border-outline-variant/10 pt-4 mt-4`) **ou** aparecer como seções separadas. Decisão na implementação conforme o volume de texto.
- Título: `"Como funciona na {clinicName}"` — `text-sm font-bold text-primary mb-2 uppercase tracking-wider`
- Corpo: `text-[12px] text-on-surface-variant leading-relaxed` — parágrafo único, máximo 3 linhas no mobile
- Sem ícones, sem bullets — leitura fluida como uma explicação verbal

**Fase 1:** usar `description` se tiver mais de 80 caracteres; senão:
> `"A profissional avalia o que combina com você, realiza o procedimento com cuidado e orienta cada passo antes de você sair."`

**Fase 2:** campo `how_it_works` por procedimento.

---

### RF-07 — Bloco 7: FAQ rápido

**Função narrativa:** antecipar as 5 dúvidas que sempre aparecem antes de agendar. Quem lê o FAQ não precisa mandar mensagem para perguntar.

**Composição visual — accordion:**
- Cada item: `border-b border-outline-variant/10 py-3` — separador minimalista, sem card com sombra
- Pergunta: `text-[13px] font-semibold text-primary` à esquerda + `ChevronDown size={14} text-secondary` à direita — `flex justify-between items-center cursor-pointer`
- Resposta (expandida): `text-[11px] text-on-surface-variant leading-relaxed pb-2 pt-1` — aparece com `motion` da `AnimatePresence` já disponível no projeto (height de 0 para auto, `opacity 0→1`)
- Estado inicial: todos colapsados — a página parece curta e leve; o conteúdo está lá para quem quiser
- Um item aberto por vez (comportamento de accordion real) — fecha o anterior ao abrir um novo

**5 perguntas e fallbacks:**

| # | Pergunta | Fallback Fase 1 | Campo Fase 2 |
|---|----------|----------------|--------------|
| 1 | Quanto tempo leva? | `"Em média {proc.duration} minutos, podendo variar conforme a avaliação."` | `faq_session_duration` |
| 2 | Quanto tempo dura o resultado? | `"O resultado pode variar conforme seus cuidados e características individuais."` | `faq_result_duration` |
| 3 | Dói ou incomoda? | `"Pode haver um leve desconforto. A profissional orienta durante todo o atendimento."` | `faq_pain_discomfort` |
| 4 | Manutenção / cuidados pós | Ver lógica abaixo | `faq_maintenance` ou `faq_aftercare` |
| 5 | Onde fica a clínica? | Ver lógica abaixo | Fixo — não configurável |

**Lógica da 4ª pergunta:**
- `faq_maintenance` preenchido → pergunta: "Quando preciso fazer manutenção?"
- `faq_maintenance` vazio + `faq_aftercare` preenchido → pergunta: "Quais cuidados preciso ter depois?"
- Ambos vazios → fallback: `"A profissional orienta a frequência ideal durante a consulta."`

**5ª pergunta — sempre exibida:**
- Pergunta: "Onde fica a clínica?"
- Com `clinic.address`: `"O atendimento é realizado na {clinicName} ({clinic.address}). Não fazemos visitas a domicílio."`
- Sem `clinic.address`: `"O atendimento é realizado na {clinicName}, de forma presencial. Não fazemos visitas a domicílio."`
- Tom: acolhedor, não burocrático — a segunda frase existe para esclarecer, não para recusar

---

### RF-08 — Bloco 8: Fechamento personalizado

**Função narrativa:** o último texto que a cliente lê antes do footer com o preço. Deve reduzir a última fricção — a pequena voz que diz "e se não for para mim?".

**Composição visual:**
- Sem card, sem fundo — texto solto, centralizado, com `mb-10` antes do espaço do footer fixo
- `text-center text-[11px] text-on-surface-variant leading-relaxed italic max-w-[280px] mx-auto`
- Fonte levemente menor e em itálico — tom de conversa, não de argumento de venda
- Não usar aspas tipográficas; o texto já tem o peso necessário sozinho

**Conteúdo:**
- Com `clientName`: `"Antes de agendar, {clientName}: o objetivo não é mudar quem você é. É realçar o que já existe em você."`
- Sem `clientName`: `"O objetivo não é mudança drástica. É realçar o que já existe em você."`
- Fase 2: campo `closing_note` por procedimento — se preenchido, substituir o template inteiro

---

### RF-09 — Bloco 9: Footer fixo

**Zero alteração.** Visual, comportamento, animação de reveal (loading bar + texto rotacionando), CTA principal dourado (`#D4BC9A → #B89A6A`) e CTA secundário com borda `border-white/20` permanecem idênticos ao atual. Altura fixa, fundo `#2C2010`, `rounded-t-[2.5rem]`, `shadow-[0_-10px_40px_rgba(0,0,0,0.18)]`.

---

## 8. Requisitos de conteúdo / copy

- Todo texto deve ser **mobile-first**: frases curtas, parágrafos de no máximo 2 linhas
- Nenhum bloco deve parecer um artigo de blog
- Proibido usar as seguintes expressões em fallbacks ou templates:
  - "resultado garantido", "sem dor", "sem risco", "segurança máxima", "recuperação imediata", "100%"
- Preferir:
  - "pode variar", "avaliação individual", "respeitando seus fios/pele/rosto/objetivo", "o efeito que combina com você", "o que combina com a sua rotina"
- `clientName` deve aparecer **no máximo 2 vezes**: headline (Bloco 1) e fechamento (Bloco 8)
- `clinicName` deve aparecer **em 2 ou 3 pontos**: headline, autoridade (Bloco 3) e como funciona (Bloco 6)

---

## 9. Requisitos de personalização

| Variável | Disponibilidade | Uso |
|----------|----------------|-----|
| `clientName` | Opcional — pode estar vazio | Headline e fechamento. Se vazio, omitir do template, nunca exibir "undefined" |
| `clinicName` | Sempre disponível | Autoridade, como funciona. Fallback: "a clínica" |
| `proc.name` | Sempre disponível | Headlines e templates quando `headline` vazio |
| `proc.duration` | Sempre disponível | Fallback para FAQ "Quanto tempo leva?" |
| `proc.description` | Opcional | Para quem é, como funciona |
| `proc.headline/subheadline` | Opcionais | Bloco 1 |
| `proc.benefit_*` | Opcionais | Bloco 4 |

**Regra crítica:** a página nunca pode quebrar nem exibir texto incompleto independentemente de quais campos estiverem vazios.

---

## 10. Requisitos de imagem

- O carrossel principal (Bloco 2) continua usando a lógica atual:
  1. Fotos `side = carousel`
  2. Fallback para `before` + `after`
  3. Fallback para imagens Unsplash genéricas
- **Fase 2 — opcional:** se houver pares `before`/`after` suficientes (≥ 1 par), exibir um bloco compacto de antes/depois entre o Bloco 6 (Como funciona) e o Bloco 7 (FAQ), com layout lado a lado e labels "Antes" / "Depois". Usar o mesmo estilo visual de card/rounded já existente. Este bloco só aparece se o par estiver disponível — nunca exibir placeholder de imagem.

---

## 11. FAQ — notas de implementação

O detalhamento completo de perguntas, fallbacks, lógica da 4ª e 5ª pergunta e comportamento visual está especificado no **RF-07** (Seção 7). Esta seção registra apenas a nota técnica pendente:

- **Verificar** se `clinic.address` já existe na tabela `clinics` e é retornado por `GET /api/portal/:slug`. Se não existir, adicionar à migration da Fase 2 e incluir no payload da rota do portal.
- O accordion deve usar `AnimatePresence` + `motion.div` já disponíveis no projeto — sem nova dependência.

---

## 12. Regras de fallback

Toda a página deve funcionar sem nenhum campo opcional preenchido. Hierarquia:

```
Campo personalizado (Fase 2)
  → Campo existente (Fase 1)
    → Template derivado de proc.name / proc.duration / clientName / clinicName
      → Fallback genérico neutro sem promessas absolutas
```

Os fallbacks genéricos **nunca** devem:
- Fazer promessas de resultado absoluto
- Usar nome de procedimento de forma gramaticalmente incorreta
- Exibir variáveis não resolvidas (ex: `{clientName}` literal)

---

## 13. Impacto em banco / API / admin

### Fase 1 — zero mudança no banco
Apenas reorganização do frontend usando campos já existentes.

### Fase 2 — novos campos em `procedures`

```sql
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS authority_note TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS main_pain TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS emotional_desire TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS day_to_day_fit TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS how_it_works TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS faq_session_duration TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS faq_result_duration TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS faq_pain_discomfort TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS faq_maintenance TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS faq_aftercare TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS closing_note TEXT;
```

### API (`PATCH /api/procedures/:id`)
- Adicionar os novos campos ao `COALESCE` do UPDATE existente
- Nenhuma quebra de contrato — campos opcionais com `null` como default

### Admin (`backend/public/config/index.html`)

O modal "Editar procedimento" já possui 3 abas (steps). A aba **3 — Página** (`step-panel-3`) contém hoje:
- `f-headline` / `f-subheadline`
- `f-b1-title` / `f-b1-desc`, `f-b2-title` / `f-b2-desc`, `f-b3-title` / `f-b3-desc`

Os campos novos devem ser adicionados **abaixo dos benefícios existentes**, dentro do mesmo `step-panel-3`, agrupados por seção com divisores visuais (`border-top` + label de seção), seguindo o padrão de estilo já existente (`.field`, `.field-row`, `.field-hint`).

#### Campos a adicionar na aba Página — Fase 2

**Seção: Autoridade da clínica**
| ID do campo | Label | Tipo | Placeholder / hint |
|-------------|-------|------|--------------------|
| `f-authority-note` | Frase de autoridade | `textarea` (1 linha) | `"Na {clínica}, cada atendimento é pensado para respeitar sua individualidade."` — Se vazio, usa fallback automático |

**Seção: Para quem é**
| ID do campo | Label | Tipo | Placeholder / hint |
|-------------|-------|------|--------------------|
| `f-main-pain` | Dor principal | `input` | `"Ex: sobrancelhas falhadas ou sem formato"` |
| `f-emotional-desire` | Desejo | `input` | `"Ex: quer realçar o olhar sem exagero"` |
| `f-day-to-day-fit` | Rotina / dia a dia | `input` | `"Ex: quer se sentir mais arrumada sem depender de maquiagem"` |
| | | | *Se todos vazios, usa texto fallback neutro* |

**Seção: Como funciona**
| ID do campo | Label | Tipo | Placeholder / hint |
|-------------|-------|------|--------------------|
| `f-how-it-works` | Como funciona | `textarea` | `"Ex: a profissional avalia o formato do seu rosto, define o desenho e remove apenas o necessário."` — Se vazio, usa fallback automático |

**Seção: Dúvidas rápidas (FAQ)**
| ID do campo | Label | Tipo | Placeholder / hint |
|-------------|-------|------|--------------------|
| `f-faq-duration` | Quanto tempo leva? | `input` | `"Ex: Em média 30 a 40 minutos"` — Se vazio, usa `duration` do procedimento |
| `f-faq-result` | Quanto tempo dura o resultado? | `input` | `"Ex: 15 a 30 dias"` |
| `f-faq-pain` | Dói ou incomoda? | `input` | `"Ex: Pode haver leve desconforto, mas costuma ser bem tolerado"` |
| `f-faq-maintenance` | Manutenção | `input` | `"Ex: A cada 15 a 30 dias"` — Se vazio, usa pergunta de cuidados pós se `f-faq-aftercare` preenchido |
| `f-faq-aftercare` | Cuidados pós-procedimento | `input` | `"Ex: Evitar molhar a área nas primeiras 24h"` — Usado como 4ª pergunta quando manutenção vazio |

**Seção: Fechamento**
| ID do campo | Label | Tipo | Placeholder / hint |
|-------------|-------|------|--------------------|
| `f-closing-note` | Frase de fechamento | `textarea` (1 linha) | `"Ex: o objetivo não é mudança drástica. É realçar o que já existe em você."` — Aparece antes do CTA. Se vazio, usa fallback automático |

#### Integração com o JS do admin

Na função `openEditProc(proc)` (onde os campos são populados), adicionar:
```js
document.getElementById('f-authority-note').value = proc?.authority_note || ''
document.getElementById('f-main-pain').value       = proc?.main_pain || ''
document.getElementById('f-emotional-desire').value= proc?.emotional_desire || ''
document.getElementById('f-day-to-day-fit').value  = proc?.day_to_day_fit || ''
document.getElementById('f-how-it-works').value    = proc?.how_it_works || ''
document.getElementById('f-faq-duration').value    = proc?.faq_session_duration || ''
document.getElementById('f-faq-result').value      = proc?.faq_result_duration || ''
document.getElementById('f-faq-pain').value        = proc?.faq_pain_discomfort || ''
document.getElementById('f-faq-maintenance').value = proc?.faq_maintenance || ''
document.getElementById('f-faq-aftercare').value   = proc?.faq_aftercare || ''
document.getElementById('f-closing-note').value    = proc?.closing_note || ''
```

Na função `buildProcPayload()` (onde o body do PATCH é montado), adicionar:
```js
authority_note:        document.getElementById('f-authority-note').value.trim() || null,
main_pain:             document.getElementById('f-main-pain').value.trim() || null,
emotional_desire:      document.getElementById('f-emotional-desire').value.trim() || null,
day_to_day_fit:        document.getElementById('f-day-to-day-fit').value.trim() || null,
how_it_works:          document.getElementById('f-how-it-works').value.trim() || null,
faq_session_duration:  document.getElementById('f-faq-duration').value.trim() || null,
faq_result_duration:   document.getElementById('f-faq-result').value.trim() || null,
faq_pain_discomfort:   document.getElementById('f-faq-pain').value.trim() || null,
faq_maintenance:       document.getElementById('f-faq-maintenance').value.trim() || null,
faq_aftercare:         document.getElementById('f-faq-aftercare').value.trim() || null,
closing_note:          document.getElementById('f-closing-note').value.trim() || null,
```

#### Regras visuais do admin
- Usar o mesmo padrão `.field`, `.field-row`, `.field-hint` já existentes no modal
- Cada seção nova separada por `border-top: 0.5px solid rgba(0,0,0,0.07)` + label em `font-size:12px;font-weight:500;color:#555`
- Todos os campos são opcionais — nunca bloquear o "Salvar procedimento" por campos vazios
- O placeholder de cada campo deve mostrar exatamente o texto que o portal exibirá como fallback quando vazio
- Implementar após Fase 1 estar estável em produção

---

## 14. Requisitos de UX mobile-first

- Nenhum bloco deve ter mais de **3 linhas de texto** no mobile sem interação do usuário
- FAQ deve ser colapsado por padrão (evitar scroll longo antes do CTA)
- A frase de autoridade (Bloco 3) e o fechamento (Bloco 8) devem ser `text-center` para leitura rápida
- Espaçamento entre blocos: manter o padrão `mb-8` já em uso na página
- Padding lateral: manter `px-6` atual
- O scroll até o footer fixo deve funcionar normalmente — nenhum bloco novo pode criar overflow horizontal ou quebrar o layout

---

## 15. Critérios de aceite

- [ ] A página continua visualmente consistente com a `OfferScreen` atual
- [ ] O footer fixo de investimento permanece igual em visual e comportamento
- [ ] O CTA principal continua levando para o fluxo de agendamento
- [ ] O CTA secundário continua voltando para seleção de procedimentos
- [ ] A estrutura nova aparece sem quebrar quando `clientName` está vazio
- [ ] A estrutura nova aparece sem quebrar quando `clinicName` está vazio
- [ ] A estrutura nova aparece sem quebrar quando não há fotos cadastradas
- [ ] A estrutura nova aparece sem quebrar quando todos os campos opcionais estão vazios
- [ ] Nenhum fallback contém promessas absolutas
- [ ] A página continua curta e escaneável no mobile (sem scroll excessivo antes do CTA)
- [ ] O conteúdo parece personalizado para a clínica e cliente, não genérico
- [ ] O FAQ funciona em accordion com chevron, sem novo design system
- [ ] Nenhuma variável não resolvida (ex: `{clientName}` literal) é exibida em produção

---

## 16. Fora de escopo

- Redesign visual de qualquer componente
- Mudança no fluxo de agendamento (calendário, slots, confirmação, sucesso)
- Geração de conteúdo por IA (especificada na Fase 3 abaixo)
- A/B testing de estruturas (fora do MVP)
- Personalização por segmento de cliente (novos/retornantes)
- Push ou notificações pós-visita
- Analytics de scroll ou heatmap
- Tradução ou internacionalização

---

## 17. Riscos

| Risco | Probabilidade | Mitigação |
|-------|-------------|-----------|
| Fallbacks mal escritos que fazem a página parecer genérica demais | Alta | Revisar todos os templates antes de Fase 1 ir a produção |
| Accordion do FAQ quebrando layout em telas muito pequenas (< 320px) | Baixa | Testar em 320px; usar `min-w-0` e `overflow-hidden` |
| Campos novos (Fase 2) não sendo preenchidos pelos operadores do admin | Alta | Placeholder no admin sempre mostra o fallback que será exibido; documentar no onboarding |
| `clinicName` com nome longo quebrando frases de template | Média | Truncar a `24` caracteres nos templates se necessário |
| Reveal delay (footer) colidindo visualmente com o bloco de fechamento (Bloco 8) | Baixa | Testar no emulador mobile com `reveal_delay` = 0 e = 10 |

---

## 18. Plano de implementação em fases

### Fase 1 — MVP (nova estrutura com campos existentes)

**Escopo:** reorganizar `OfferScreen` em `App.tsx` com os 9 blocos, usando apenas dados já disponíveis e fallbacks automáticos.

**Tarefas:**
1. Reordenar blocos existentes (Header, Carrossel, Benefícios) e remover os blocos de prova social e "A Clínica" (ver Seção 4)
2. Adicionar Bloco 3 — Frase de autoridade (1 frase com fallback)
3. Adicionar Bloco 5 — Para quem é (usando `description` ou fallback)
4. Adicionar Bloco 6 — Como funciona (usando `description` ou fallback)
5. Adicionar Bloco 7 — FAQ (5 perguntas: 4 com fallbacks baseados em `duration` + 1 fixa de endereço/presencial)
6. Adicionar Bloco 8 — Fechamento personalizado
7. Atualizar fallbacks dos benefícios (Bloco 4) para linguagem de resultado
8. Build + sync + deploy

**Zero mudanças em:** banco, API, admin, rotas, autenticação, fluxo de agendamento.

---

### Fase 2 — Personalização completa (novos campos)

**Escopo:** adicionar campos no banco e formulário no admin para personalização por procedimento.

**Tarefas:**
1. Migration SQL com os novos campos
2. Atualizar `PATCH /api/procedures/:id` para aceitar e persistir os campos
3. Atualizar `GET /api/portal/:slug` para retornar os campos novos
4. Adicionar seção no admin (`config/index.html`) para editar os campos por procedimento
5. Atualizar `OfferScreen` para usar os campos novos quando disponíveis (substituindo fallbacks)
6. Opcional: bloco antes/depois (par `before[0]` + `after[0]`) entre Como funciona e FAQ
7. Build + sync + deploy

---

### Fase 3 — Geração de conteúdo por IA *(implementar após Fase 2)*

**Conceito:** botão "Gerar com IA" na aba Página do modal de edição do procedimento. Com um clique, o backend roda um prompt e preenche automaticamente todos os campos de conteúdo da página.

#### Experiência esperada no admin

1. Operador abre "Editar procedimento" → aba Página
2. Clica em **"✦ Gerar com IA"** (botão no topo da seção, antes dos campos)
3. Botão entra em estado de loading ("Gerando...")
4. Após resposta (~3–5s), todos os campos da aba são preenchidos automaticamente
5. Operador revisa, ajusta se quiser, e clica em "Salvar procedimento" normalmente

Os campos preenchidos automaticamente são exatamente os mesmos da Fase 2:
`authority_note`, `main_pain`, `emotional_desire`, `day_to_day_fit`, `how_it_works`, `faq_session_duration`, `faq_result_duration`, `faq_pain_discomfort`, `faq_maintenance`, `closing_note` — além de sugestões para `headline`, `subheadline` e os 3 benefícios se estiverem vazios.

#### Backend — nova rota

```
POST /api/procedures/:id/generate-page
x-api-key: <API_SECRET>
```

**Input (lido do banco no momento da chamada):**
- `proc.name`, `proc.description`, `proc.duration`, `proc.price`
- `clinic.name`

**Processamento:**
- Monta prompt com os dados acima seguindo as regras de copy do PRD (tom personalizado, sem promessas absolutas, mobile-first, curto)
- Chama a API da OpenAI com o prompt
- Retorna JSON com todos os campos preenchidos

**Output esperado (JSON):**
```json
{
  "headline": "...",
  "subheadline": "...",
  "benefit_1_title": "...", "benefit_1_desc": "...",
  "benefit_2_title": "...", "benefit_2_desc": "...",
  "benefit_3_title": "...", "benefit_3_desc": "...",
  "authority_note": "...",
  "main_pain": "...",
  "emotional_desire": "...",
  "day_to_day_fit": "...",
  "how_it_works": "...",
  "faq_session_duration": "...",
  "faq_result_duration": "...",
  "faq_pain_discomfort": "...",
  "faq_maintenance": "...",
  "closing_note": "..."
}
```

A rota **não salva automaticamente** — apenas retorna o JSON. O admin preenche os campos e o operador salva manualmente. Isso garante revisão humana antes de publicar.

#### Prompt — diretrizes

O prompt deve instruir o modelo a:
- Escrever na perspectiva da clínica falando com a cliente
- Usar o nome do procedimento e da clínica nos pontos certos (headline, autoridade, como funciona)
- Seguir as regras de copy do PRD: sem promessas absolutas, texto curto, mobile-first
- Retornar **apenas o JSON**, sem explicações, para facilitar o parse

#### Requisitos técnicos

- Variável de ambiente `OPENAI_API_KEY` deve estar configurada no Railway
- Usar `gpt-4o-mini` para baixo custo e latência (~1–2s) — conteúdo estruturado simples não exige o modelo completo
- Timeout de 15s na chamada; se exceder, retornar erro amigável no admin: "Não foi possível gerar o conteúdo. Tente novamente."
- A rota é protegida por `x-api-key` (mesmo middleware das outras rotas autenticadas)

#### UI do botão no admin

- Posicionado no topo da seção de campos da aba Página, antes do primeiro campo
- Estilo: `btn btn-ghost` com ícone de sparkle (✦) — discreto, não primário
- Estado loading: desabilitar botão + texto "Gerando..." + spinner inline
- Após sucesso: preencher campos via JS (sem reload) + feedback visual breve ("Conteúdo gerado! Revise e salve.")
- Após erro: alerta inline abaixo do botão

#### O que não muda

- O operador **sempre** revisa antes de salvar — a IA sugere, humano decide
- Os campos continuam editáveis normalmente após o preenchimento automático
- O fluxo de save continua sendo o botão "Salvar procedimento" existente

---

*Este PRD deve ser revisado e aprovado antes do início da Fase 1.*
