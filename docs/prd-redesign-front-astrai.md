# PRD — Redesign do Admin CRM com Design Astrai

**Data:** 2026-04-28
**Autor:** Claude (gerado com análise comparativa front_astrai × front_laco)
**Status:** Draft — Revisado (v3)

---

## 1. Objetivo

Substituir o design atual do admin CRM (`front_laco`) pelo design premium do `front_astrai`, mantendo **todas as funcionalidades e integrações com o backend existente** e incorporando os novos elementos visuais e de UX do design Astrai.

O resultado final deve ser um painel admin que:
- Usa o visual Astrai (dark theme `#0B1F2A`, gold `#C9A96E`, glassmorphism, rounded cards `3rem`, tipografia serif/mono)
- Mantém todas as chamadas API do backend Laço (leads, appointments, procedures, settings, professionals, hours)
- Adiciona funcionalidades visuais do novo design que faltam no atual (sistema de temas, animações, bento grid, radar operacional)
- Preserva funcionalidades do atual que o design novo ainda não contempla (funil de conversão, pipeline leads, status de leads, drawer de lead, etc.)

### 1.1 Contexto Técnico Crítico

- **Auth:** O admin usa autenticação por API Key (`x-api-key` header), gerenciada pelo `AuthContext.tsx`. O front_astrai não tem auth — precisa ser integrado.
- **Routing:** O admin usa `react-router-dom` com `BrowserRouter`. O front_astrai usa state-based navigation (`activeScreen` useState). **Decisão: manter react-router-dom** para compatibilidade com as rotas do backend (`/:slug`, `/:slug/config`, etc.).
- **API client:** O front_laco usa um wrapper `fetch` customizado (`services/api.ts`) com `x-api-key` header automático. O front_astrai não tem API client. **Preservar 100% do api.ts existente**.
- **Build output:** O front_laco compila para `backend/public/` com `emptyOutDir: false`. O `portal.html` (booking) e os arquivos Astrai (config/, cadastro/, onboarding/, superadmin/) devem ser preservados.
- **Preço em centavos:** O backend armazena preços em centavos. O `procedures.ts` faz `price / 100` na leitura e `price * 100` na escrita. Esse mapeamento precisa ser preservado.

---

## 2. Análise Comparativa: Telas

### 2.1 Dashboard

| Aspecto | front_laco (atual) | front_astrai (novo) | Decisão |
|---------|-------------------|--------------------|---------| 
| **KPIs** | 4 cards (Faturamento, Pipeline, Ticket Médio, Conversão) — dados reais da API | 3 cards (Faturamento Estimado, Ocupação, Ticket Médio) — dados mockados | **MANTER dados reais** com layout visual do novo (cards rounded-3rem, trends animados) |
| **Gráfico principal** | Funil de Conversão (bar chart horizontal) — dados reais | AreaChart semanal Recharts — mockado | **MANTER funil com dados reais** + **ADICIONAR AreaChart** de receita semanal (novo endpoint necessário) |
| **Sidebar financeira** | 3 mini-cards (Financeiro, Pipeline Leads, Agenda) — dados reais | Não existe | **MANTER** com visual novo |
| **Performance por serviço** | Não existe | Barra de progresso por procedimento — mockado | **ADICIONAR** com dados reais (appointments por procedimento) |
| **Radar Operacional** | Não existe | Feed de atividade em tempo real — mockado | **ADICIONAR** com dados reais (últimos leads + appointments) |
| **Bento Grid Layout** | Grid simples 2 colunas | Bento grid 12 colunas com cards de tamanhos variados | **ADOTAR** layout bento |

### 2.2 Agenda

| Aspecto | front_laco (atual) | front_astrai (novo) | Decisão |
|---------|-------------------|--------------------|---------| 
| **Grade semanal** | Calendário 7 dias + timeline vertical por hora — dados reais | Grade semanal visual com appointments posicionados absolutamente — mockado | **ADOTAR visual novo** com dados reais |
| **Filtros** | Período (semana/15 dias/custom) + tabs Calendário/Lista | Período + profissional + procedimento + view weekly/list | **ADOTAR filtros novos** (profissional e procedimento vêm do backend) |
| **Métricas** | KPIs sidebar (agendamentos, confirmados, pendentes, valor) | 3 insight cards no topo (agendamentos, valor agendado, valor confirmado) | **ADOTAR insight cards do novo** com dados reais |
| **Vista dia/lista** | Tab Calendário (timeline) + Tab Lista (tabela) — dados reais | View Weekly (grid) + View Dia (cards) — mockado | **ADOTAR ambas as views** com dados reais |
| **Ações** | Confirmar, Realizado (por appointment) | Check-in — mockado | **MANTER ações do atual** (confirmar, realizado, cancelar) com visual novo |
| **Indicador "agora"** | Linha horizontal na hora atual | Indicador gold animado com horário | **ADOTAR visual novo** |

### 2.3 Clientes / Leads

| Aspecto | front_laco (atual) | front_astrai (novo) | Decisão |
|---------|-------------------|--------------------|---------| 
| **Tabela** | Tabela com colunas (avatar, nome, telefone, procedimento, status, valor, data) + busca + filtro por status — dados reais | Cards/lista com busca + filtros por tag/status + drawer lateral de detalhes — mockado | **ADOTAR layout visual novo** com dados reais |
| **Status de leads** | Select dropdown por lead (Novo Lead, Link Enviado, Agendado, Confirmado, Rejeitado) — funcional | Tags coloridas (VIP, FIEL, NOVO) + statusLead (Captado, Não agendou, Agendado) — mockado | **MANTER status funcional do atual** + **ADICIONAR tags visuais** |
| **Drawer de detalhes** | LeadDrawer — abre ao clicar no lead, mostra histórico + detalhes — funcional | Sidebar lateral com histórico, serviços, métricas — mockado | **ADOTAR visual do drawer novo** com dados reais do LeadDrawer |
| **Link de agendamento** | Banner com URL + botão copiar — funcional | Não existe | **MANTER** com visual novo |
| **KPIs** | 4 mini cards (total, link enviado, agendados, conversão) — dados reais | Não existe | **MANTER** no topo com visual novo |
| **Ações** | WhatsApp, excluir (hover) — funcional | Não existe explicitamente | **MANTER ações** |

### 2.4 Atendimento / IA

| Aspecto | front_laco (atual) | front_astrai (novo) | Decisão |
|---------|-------------------|--------------------|---------| 
| **Layout** | 2 colunas: resumo circular esquerda + performance + agents direita — dados reais via API | 6 insight cards + agents grid + efficiency monitor — mockado | **ADOTAR layout novo** com dados reais |
| **Agents** | 3 agents fixos (Vendas, Suporte, Remarcação) com badge ativo/inativo | 6 agents com toggle on/off — mockado | **MANTER 3 agents reais** com visual novo (toggle switches) |
| **Métricas** | Performance ring (conversão%), leads WPP, agendados, realizados, faturamento — dados reais | 6 insight cards (Conversas, Remarcações, Recuperações, Agendamentos, Taxa Conversão, Faturamento) — mockado | **MANTER métricas reais** + adicionar visual novo |
| **Monitor eficiência** | Não existe | Card com barras de progresso (tempo resposta, automação, taxa sucesso) | **ADICIONAR** com métricas reais quando disponíveis, placeholder enquanto não |
| **Insight IA** | Não existe | Card com último insight gerado pela IA | **ADICIONAR** como feature futura |

### 2.5 Configurações

| Aspecto | front_laco (atual) | front_astrai (novo) | Decisão |
|---------|-------------------|--------------------|---------| 
| **Navegação** | Sidebar vertical com 6 tabs (Procedimentos, Horários, Portal, Equipe, Segurança, Notificações) | Tabs horizontais com 5 tabs (Clínica, Procedimentos, Profissionais, Portal, Horários) | **ADOTAR tabs horizontais do novo** com animação |
| **Tab Clínica** | Dentro de "Portal" (nome, slug, endereço, link de agendamento) — funcional | Tab dedicada (nome, slug, link, endereço, tolerância de atraso) — mockado | **ADOTAR tab separada** com dados reais + campo tolerância |
| **Tab Procedimentos** | Tabela + modal simples (nome, duração, preço, preço antigo, pagamento, vídeo) — funcional | Lista drag-and-drop + modal 3 abas (Info, Imagens, Página) — mockado | **ADOTAR modal 3 abas** mantendo CRUD funcional |
| **Modal Procedimento - Info** | Campos básicos (nome, duração, preço, preço antigo, pagamento, vídeo) | Campos expandidos (+ badge label, profissionais responsáveis, delay reveal, condição pagamento) | **ADOTAR campos expandidos** — os que já existem no backend ficam funcionais, os novos vão como campos |
| **Modal Procedimento - Imagens** | Não existe no modal (upload é separado) | Upload antes/depois + carrossel página do procedimento | **ADOTAR** integrando com sistema de upload existente (`/api/upload`) |
| **Modal Procedimento - Página** | Não existe | Edição da landing page do procedimento (headline, subheadline, autoridade, FAQ, cuidados pós) | **ADOTAR** — campos já existem no backend (`authority_note`, `main_pain`, `faq_*`, `closing_note`, etc.) |
| **Tab Profissionais** | Placeholder "Em desenvolvimento" | Lista de profissionais + toggle ativo — mockado | **ADOTAR** com dados reais (`/api/professionals`) |
| **Tab Horários** | Toggle + time inputs por dia — funcional | Toggle + time inputs com visual premium — mockado | **ADOTAR visual novo** mantendo lógica funcional |
| **Tab Portal** | Nome, slug, greeting, reveal delay, show price — funcional | Não existe como tab separada | **MANTER funcionalidades** dentro da tab Clínica ou como sub-tab |

---

## 3. Elementos Globais de Design

### 3.1 Sistema de Temas (NOVO)

O front_astrai implementa 4 temas: `mixed` (padrão), `dark`, `light`, `terminal`.

**Decisão:** Implementar apenas `mixed` (dark gold — identidade Astrai) e `light` como toggle. Terminal é easter egg, dark puro é redundante.

### 3.2 Sidebar

| front_laco | front_astrai | Decisão |
|-----------|-------------|---------|
| Layout com sidebar fixa (branca, minimalista, 5 items: Dashboard, Leads, Agenda, IA, Config) | Sidebar collapsible com logo, 5 items (Dashboard, Atendimento, Agenda, Clientes, Config), toggle dark/light, collapse button | **ADOTAR sidebar nova** com collapse + logo Astrai + theme toggle |

### 3.3 Header

| front_laco | front_astrai | Decisão |
|-----------|-------------|---------|
| Não existe header global (título por página) | ScreenContainer com header (título, search, notificações, avatar) | **ADOTAR** header global |

### 3.4 Design Tokens

```css
/* Paleta Astrai */
--astrai-blue: #0B1F2A;
--astrai-gold: #C9A96E;
--astrai-gold-bright: #D4A832;
--astrai-offwhite: #F5F5F2;
--astrai-bone: #FAFAF7;

/* Tipografia (NOTA: front_laco atual usa Plus Jakarta Sans como --font-sans.
   Astrai usa Inter como primaria. Substituir Plus Jakarta Sans por Inter como fonte
   principal e mover Plus Jakarta Sans para --font-display) */
--font-sans: "Inter";
--font-display: "Plus Jakarta Sans";
--font-mono: "JetBrains Mono";

/* Border Radius */
Cards: rounded-[2.5rem] a rounded-[3rem]
Buttons: rounded-xl a rounded-2xl
Inputs: rounded-xl

/* Espaçamento */
Cards padding: p-8 a p-10
Section gaps: space-y-6 a space-y-10
```

### 3.5 Animações

- `framer-motion` (já no novo como `motion/react`)
- AnimatePresence para transição de telas
- motion.div com fade-in + slide para cards
- Barras de progresso animadas

---

## 4. Dependências Técnicas

### 4.1 Pacotes a Adicionar

| Pacote | Motivo | Status no front_laco |
|--------|--------|---------------------|
| `recharts` | Gráficos (AreaChart no Dashboard) | **NAO INSTALADO — instalar** |

**Pacotes ja presentes (NAO precisam ser instalados):**
| Pacote | Versao atual |
|--------|-------------|
| `motion` (framer-motion) | `^12.23.24` |
| `clsx` | `^2.1.1` |
| `tailwind-merge` | `^3.5.0` |
| `lucide-react` | `^0.546.0` |

O `cn()` helper ja existe em `lib/utils.ts` e ja usa `clsx + tailwind-merge` — nao precisa de alteracao.

### 4.2 Pacotes a Manter

| Pacote | Motivo |
|--------|--------|
| `react-router-dom` | Roteamento SPA — OBRIGATÓRIO (front_astrai não usa, mas o backend serve rotas como `/:slug/config` que redirecionam para o admin) |
| `lucide-react` | Ícones (já usado em ambos) |

### 4.3 Integrações Backend Existentes (PRESERVAR)

Todos os services em `front_laco/src/services/`:
- `api.ts` — wrapper fetch com `x-api-key` header automático (NÃO é axios — é fetch puro)
- `leads.ts` — CRUD leads + stats + lead detail
- `appointments.ts` — CRUD appointments + stats + status update + slots
- `procedures.ts` — CRUD procedures (com mapeamento centavos→reais)
- `settings.ts` — portal settings + clinic info + hours

### 4.4 Auth System (PRESERVAR)

- `context/AuthContext.tsx` — gerencia API Key via localStorage
- Login screen embutida no AuthProvider (se não tem key, mostra login)
- **O front_astrai não tem auth.** O AuthContext do front_laco DEVE ser preservado e integrado ao novo layout.
- A tela de login precisa ser redesenhada com o visual Astrai (dark blue + gold).

### 4.5 Endpoints Backend Já Disponíveis

| Endpoint | Usado no atual | Usado no novo design | Status |
|----------|---------------|---------------------|--------|
| `GET /api/leads` | Sim | Sim (Clientes) | OK |
| `GET /api/leads/stats` | Sim | Sim | OK |
| `GET /api/leads/:id` | Sim (LeadDrawer) | Sim | OK |
| `PATCH /api/leads/:id/status` | Sim | Sim | OK |
| `DELETE /api/leads/:id` | Sim | Sim | OK |
| `GET /api/appointments` | Sim | Sim (Agenda) | OK |
| `GET /api/appointments/stats` | Sim | Sim (Dashboard) | OK |
| `GET /api/appointments/slots` | Sim | Sim | OK |
| `PATCH /api/appointments/:id/status` | Sim | Sim | OK |
| `PATCH /api/appointments/:id/reschedule` | Sim | Sim | OK |
| `GET /api/procedures` | Sim | Sim (Config) | OK |
| `POST /api/procedures` | Sim | Sim | OK |
| `PATCH /api/procedures/:id` | Sim | Sim — **NOTA: aceita 32 campos** incluindo headline, subheadline, benefits, FAQ, authority_note, etc. | OK |
| `PATCH /api/procedures/order` | Sim | Sim (drag-and-drop) | OK |
| `DELETE /api/procedures/:id` | Sim (front_laco chama) | Sim | **ENDPOINT NAO EXISTE NO BACKEND** — `procedures.js` so tem GET, POST, PATCH. O front_laco chama `api.delete` mas o backend nao tem a rota. Criar endpoint ou remover botao excluir. |
| `GET /api/professionals` | Não (placeholder) | Sim | OK (retorna `procedure_count`) |
| `POST /api/professionals` | Não | Sim | OK |
| `PATCH /api/professionals/:id` | Não | Sim (nome + active) | OK |
| `GET /api/professionals/:id/procedures` | Não | Sim (modal procedimento) | OK |
| `PUT /api/professionals/:id/procedures` | Não | Sim (vincular procedimentos) | OK |
| `GET /api/professionals/by-procedure/:id` | Não | Sim (modal info) | OK |
| `PUT /api/professionals/by-procedure/:id` | Não | Sim (checkbox profissionais) | OK |
| `GET /api/professionals/:id/hours` | Não | Sim (horários por profissional) | OK |
| `PUT /api/professionals/:id/hours` | Não | Sim | OK |
| `GET /api/hours` | Sim | Sim | OK |
| `POST /api/hours` | Sim | Sim | OK |
| `GET /api/settings` | Sim | Sim | OK |
| `POST /api/settings` | Sim | Sim | OK |
| `GET /api/settings/clinic` | Sim | Sim | OK |
| `PATCH /api/settings/clinic` | Sim | Sim | OK |
| `POST /api/upload` | Sim (via procedures) | Sim (modal imagens) | OK |

### 4.6 Campos do Procedimento Disponíveis no Backend

O `PATCH /api/procedures/:id` já aceita TODOS estes campos (muitos não são usados no front_laco atual):

**Já usados no front_laco:**
`name`, `duration`, `price`, `price_old`, `payment_note`, `video_url`, `active`, `sort_order`

**Disponíveis mas NÃO usados (usar no modal 3 abas):**
- **Info:** `reveal_delay`, `category`, `description`
- **Página:** `headline`, `subheadline`, `authority_note`, `main_pain`, `emotional_desire`, `day_to_day_fit`, `how_it_works`
- **FAQ:** `faq_session_duration`, `faq_result_duration`, `faq_pain_discomfort`, `faq_maintenance`, `faq_aftercare`
- **Benefícios:** `benefit_1_title`, `benefit_1_desc`, `benefit_2_title`, `benefit_2_desc`, `benefit_3_title`, `benefit_3_desc`
- **Visual:** `photo_mode`, `closing_note`

Esses campos mapeiam 1:1 com o modal "Página" do front_astrai.

---

## 5. Estrutura de Componentes Proposta

```
src/
├── App.tsx                     # BrowserRouter + Routes + tema global (NÃO mudar para state-based)
├── main.tsx                    # Entry point com AuthProvider + BrowserRouter
├── types.ts                    # AstraiTheme + THEMES + interfaces de domínio
├── index.css                   # Tailwind v4 + @theme tokens Astrai + fontes Google
├── lib/
│   └── utils.ts                # cn() helper (clsx + tailwind-merge)
├── context/
│   └── AuthContext.tsx          # Auth por API Key (PRESERVAR — redesenhar LoginScreen com visual Astrai)
├── components/
│   ├── Layout.tsx              # Wrapper: Sidebar + ScreenContainer + children (substitui o atual)
│   ├── Sidebar.tsx             # Sidebar collapsible com logo, nav items (NavLink), theme toggle, collapse
│   ├── ScreenContainer.tsx     # Header bar (título, search, notif bell, avatar, logout)
│   ├── LeadDrawer.tsx          # Drawer lateral de lead (redesenhar com visual Astrai)
│   └── ui/                     # Componentes reutilizáveis
│       ├── InsightCard.tsx     # Card de métrica animado (usado em Dashboard, Agenda, Atendimento)
│       ├── Switch.tsx          # Toggle switch gold/zinc
│       └── Modal.tsx           # Modal base com AnimatePresence + backdrop
├── pages/
│   ├── Dashboard.tsx           # Bento grid + KPIs reais + funil + performance + radar
│   ├── Agenda.tsx              # Grade semanal + filtros + views + ações status
│   ├── Clients.tsx             # Leads com visual novo + drawer + KPIs + WhatsApp + status
│   ├── Atendimento.tsx         # Agents IA + métricas reais + eficiência
│   └── Settings.tsx            # Tabs horizontais: Clínica, Procedimentos, Profissionais, Portal, Horários
└── services/                   # PRESERVAR api.ts intacto. Expandir tipos/mapeamentos nos demais conforme necessario.
    ├── api.ts                  # fetch wrapper com x-api-key — NAO TOCAR
    ├── leads.ts                # getLeads, getLeadStats, getLeadDetail, updateLeadStatus, deleteLead
    ├── appointments.ts         # getAppointments, getAppointmentStats, updateAppointmentStatus, getSlots — EXPANDIR: adicionar professionalId ao tipo Appointment
    ├── procedures.ts           # getProcedures, createProcedure, updateProcedure, deleteProcedure (centavos→reais) — EXPANDIR: adicionar campos de pagina ao tipo e mapProcedure
    └── settings.ts             # getSettings, saveSettings, getClinic, updateClinic, getHours, saveHours — EXPANDIR: updateClinic precisa aceitar slug e phone
```

### 5.1 Services Novos a Criar

O `services/` atual não cobre profissionais. Será necessário criar:

```typescript
// services/professionals.ts (NOVO)
// getProfessionals() — GET /api/professionals
// createProfessional(name) — POST /api/professionals
// updateProfessional(id, {name, active}) — PATCH /api/professionals/:id
// getProfessionalProcedures(id) — GET /api/professionals/:id/procedures
// setProfessionalProcedures(id, procedure_ids) — PUT /api/professionals/:id/procedures
// getProfessionalsByProcedure(procedureId) — GET /api/professionals/by-procedure/:procedureId
// setProfessionalsByProcedure(procedureId, professional_ids) — PUT /api/professionals/by-procedure/:procedureId
// getProfessionalHours(id) — GET /api/professionals/:id/hours
// saveProfessionalHours(id, days) — PUT /api/professionals/:id/hours
```

Tambem precisa expandir services existentes:

**`services/procedures.ts` — expandir:**
- O `Procedure` interface atual so tem: id, name, duration, durationMin, price, priceOld, paymentNote, videoUrl, active, status, sortOrder
- `mapProcedure()` ignora campos de pagina (headline, authority_note, etc.). Precisa mapear esses campos.
- `updateProcedure()` precisa aceitar os novos campos no tipo `Partial<...>`.
- **NOTA:** `deleteProcedure()` chama `api.delete('/api/procedures/${id}')` mas o endpoint NAO EXISTE no backend. Precisa criar `DELETE /api/procedures/:id` no backend ou remover a funcao.

**`services/appointments.ts` — expandir:**
- `Appointment` interface nao tem `professionalId`. O backend retorna `professional_id` nos appointments.
- `mapAppointment()` precisa mapear `professional_id` para uso no filtro por profissional da Agenda.

**`services/settings.ts` — expandir:**
- `ClinicInfo` so tem `name, slug, address`. Backend retorna tambem `phone, status, onboarding_step, onboarding_completed_at`.
- `updateClinic(name, address)` nao envia `slug` nem `phone`. Backend `PATCH /api/settings/clinic` aceita `name, slug, address, phone`.
- A Tab Clinica do novo design precisa de edicao de slug — expandir a funcao para `updateClinic({name, slug, address, phone})`.

### 5.2 Notas sobre Routing

O front_astrai usa `activeScreen` (useState) para navegação. **NÃO adotar esse padrão.** O backend Express serve rotas como:
- `/:slug` → `painel.html` (admin)
- `/:slug/config` → `config/index.html` (admin config)

O admin CRM precisa de `react-router-dom` com `BrowserRouter` para que deep links funcionem. As rotas devem ser:
- `/` → Dashboard
- `/leads` → Clientes
- `/agenda` → Agenda
- `/ia` → Atendimento
- `/settings` → Configurações

### 5.3 Notas sobre o Layout.tsx

O `Layout.tsx` atual faz:
1. Renderiza `Sidebar` (fixed left)
2. Aplica `ml-[220px]` ou `ml-[56px]` conforme collapse
3. Renderiza `header` sticky com título + botão logout
4. Renderiza `main` com `children`

O novo `Layout.tsx` deve:
1. Renderizar `Sidebar` (novo design, com `NavLink` em vez de `button onClick`)
2. Renderizar `ScreenContainer` como wrapper (header com search, notif, avatar, logout)
3. Aplicar `AnimatePresence` nas transições de rota
4. Manter integração com `useAuth()` para logout e nome do usuário

---

## 6. Stories de Implementação

### Story 0: Pre-requisitos Backend (ANTES de comecar o frontend)
- [ ] Criar `DELETE /api/procedures/:id` no backend (`procedures.js`) — o front_laco ja chama esse endpoint mas ele nao existe
- [ ] Verificar se `DELETE /api/leads/:id` existe no backend (confirmar que funciona)

### Story 1: Infraestrutura de Design
- [ ] Configurar tokens CSS Astrai no `index.css` via `@theme` (Tailwind v4) — substituir paleta purple por dark/gold
- [ ] Instalar `recharts` (unico pacote novo — `motion`, `clsx`, `tailwind-merge` ja estao no projeto)
- [ ] Criar `types.ts` com `AstraiTheme`, `THEMES` (apenas `mixed` e `light`)
- [ ] Configurar fonte Inter via Google Fonts (substituir Plus Jakarta Sans como `--font-sans`, mover Plus Jakarta Sans para `--font-display`)
- [ ] Redesenhar `LoginScreen` dentro do `AuthContext.tsx` com visual Astrai (dark blue + gold)
- [ ] `lib/utils.ts` com `cn()` — ja esta correto, nao precisa de alteracao

### Story 2: Layout + Sidebar + ScreenContainer
- [ ] Reescrever `Layout.tsx` para novo design (Sidebar + ScreenContainer + content area)
- [ ] Reescrever `Sidebar.tsx` com design novo MAS usando `NavLink` (react-router-dom, nao onClick)
- [ ] **Sidebar: buscar nome da clinica via `getClinic()`** — atualmente hardcoded como "Clinica Bella Estetica" em `Sidebar.tsx:46`
- [ ] Implementar ScreenContainer com header (titulo dinamico via `useLocation`, search, notif, avatar, logout via `useAuth`)
- [ ] Transicao AnimatePresence entre rotas
- [ ] Manter `App.tsx` com `Routes` + `Route` (NAO mudar para state-based)
- [ ] Logo Astrai (imagens `logo_icon.png` e `logo_text.png` precisam existir em `public/`)

### Story 3: Dashboard
- [ ] Bento grid layout 12 colunas
- [ ] KPI cards com dados reais (`getLeadStats`, `getAppointmentStats`)
- [ ] Funil de conversão (manter dados reais, visual novo)
- [ ] Performance por serviço (novo — derivar de appointments por procedimento)
- [ ] Radar Operacional (novo — últimos leads + appointments como feed)
- [ ] Sidebar financeira (manter dados reais, visual novo)

### Story 4: Agenda
- [ ] Expandir `Appointment` interface com `professionalId` (backend ja retorna `professional_id`)
- [ ] Grade semanal com appointments posicionados (visual novo + dados reais)
- [ ] Filtros: periodo + profissional + procedimento (filtro profissional usa `professionalId` do appointment)
- [ ] View Weekly (grid semanal com cards de appointment)
- [ ] View Dia/Lista (lista de appointments do dia)
- [ ] Indicador "agora" animado
- [ ] Insight cards no topo com métricas reais
- [ ] Ações: confirmar, realizado, cancelar (manter lógica atual)

### Story 5: Clientes (Leads)
- [ ] Lista de leads com visual novo (cards ao invés de tabela)
- [ ] Busca + filtros por status + tags
- [ ] Drawer lateral de detalhes (redesenhar LeadDrawer)
- [ ] KPIs no topo (total, link enviado, agendados, conversão)
- [ ] Link de agendamento com copiar
- [ ] Ações: WhatsApp, excluir, mudar status
- [ ] Preservar toda a lógica de CRUD do atual

### Story 6: Atendimento (IA)
- [ ] Layout com insight cards (6 métricas)
- [ ] Grid de agents IA com toggle on/off
- [ ] Monitor de eficiência com barras de progresso
- [ ] Métricas reais via API leads + appointments
- [ ] Card de insight IA (placeholder para futuro)

### Story 7: Configurações
- [ ] Tabs horizontais com animação (Clínica, Procedimentos, Profissionais, Portal, Horários)
- [ ] Tab Clinica: nome, slug, phone, link de agendamento (copiar), endereco — **NOTA: expandir `updateClinic()` para aceitar slug e phone** (backend ja suporta)
- [ ] Tab Procedimentos: lista com sort_order + modal 3 abas
- [ ] Modal aba Info: nome, badge label, duração, preço, preço antigo, condição pagamento, vídeo, delay reveal, profissionais (checkboxes via `/api/professionals/by-procedure/:id`)
- [ ] Modal aba Imagens: upload antes/depois via `/api/upload` + carrossel da página do procedimento
- [ ] Modal aba Página: headline, subheadline, authority_note, FAQ (5 campos), benefícios (3×title+desc), closing_note — **todos esses campos JÁ existem no PATCH /api/procedures/:id**
- [ ] Tab Profissionais: lista + criar/editar/toggle ativo (`/api/professionals`) + vincular procedimentos
- [ ] Tab Portal: greeting_msg, reveal_delay, show_price (CRUD real via `saveSettings`)
- [ ] Tab Horários: visual novo com toggle + time inputs (lógica real via `getHours`/`saveHours`)

### Story 8: Build & Deploy
- [ ] Build com `emptyOutDir: false` (preservar portal.html e Astrai files)
- [ ] Testar todas as rotas de SPA
- [ ] Verificar que /:slug/agendar continua servindo portal.html
- [ ] Deploy para produção

---

## 7. Problema Crítico: Routing Backend × SPA

### 7.1 Estado Atual — Duas Aplicações Admin Coexistindo

O `backend/public/` contém **dois admin systems** diferentes:

| Arquivo | O que é | Quem serve |
|---------|---------|------------|
| `painel.html` | Admin antigo Astrai (HTML monolítico, 55KB) | `/:slug` e `/painel` |
| `config/index.html` | Config antigo Astrai (HTML monolítico, 95KB) | `/config` e `/:slug/config` |
| `hoje.html` | Agenda-do-dia Astrai (HTML monolítico) | `/:slug/hoje` |
| `relatorio.html` | Relatório Astrai (HTML monolítico) | `/:slug/relatorio` |
| `cliente.html` | Ficha do cliente Astrai (HTML monolítico) | `/:slug/cliente` |
| `login.html` | Login Astrai (HTML monolítico) | `/login` |
| `portal.html` | Portal de agendamento Astrai (React build separado) | `/:slug/agendar` |
| `index.html` | **CRM front_laco (React SPA)** | **Nenhuma rota o serve!** |

### 7.2 Problema Crítico

O `index.html` gerado pelo build do front_laco **não é servido por nenhuma rota do backend em produção**.

- `/` → redireciona para `/login` (que serve `login.html`)
- `/leads`, `/agenda`, `/ia`, `/settings` → seriam capturados por `/:slug` → serve `painel.html`
- `express.static(pub, { index: false })` → não serve `index.html` automaticamente

**Em dev** funciona porque o Vite dev server (porta 5173) serve o SPA diretamente e proxia `/api` para o backend (porta 3000).

**Em produção** o CRM front_laco provavelmente não é acessível, ou é acessado diretamente via `/index.html` na URL.

### 7.3 Decisão: Opção A Gradual (substituição segura)

**Fase 1 — Desenvolvimento (sem tocar backend)**
- Implementar CRM novo completo no front_laco
- Testar tudo via `npm run dev` (Vite devserver porta 5173)
- Admin antigo funciona normalmente em produção — zero risco
- Nenhuma alteração no `backend/src/index.js`

**Fase 2 — Deploy do CRM novo (alteração cirúrgica no backend)**
- Quando o CRM novo estiver completo e testado, adicionar rotas no `backend/src/index.js`
- Admin antigo continua acessível em paralelo pelas rotas já existentes
- Portal de agendamento, cadastro, checkout, etc. — tudo intacto

**Fase 3 — Aposentadoria gradual do admin antigo**
- Quando confirmado que o CRM novo cobre tudo, redirecionar `/:slug` para o CRM novo
- Manter `painel.html`, `hoje.html`, etc. como fallback por segurança

### 7.4 Mudanças no Backend (só na Fase 2, após CRM pronto)

Adicionar no `backend/src/index.js`, **ANTES** do wildcard `/:slug`:

**Backend** — adicionar rotas no `backend/src/index.js`:
```javascript
// CRM SPA — rotas do admin novo (index.html gerado pelo front_laco)
const crmFile = path.join(pub, 'index.html')
;['/crm', '/crm/leads', '/crm/agenda', '/crm/ia', '/crm/settings'].forEach(r => {
  app.get(r, (req, res) => res.sendFile(crmFile))
})
app.get('/:slug/crm',   (req, res) => res.sendFile(crmFile))
app.get('/:slug/crm/*', (req, res) => res.sendFile(crmFile))
```

**Frontend** — adicionar `basename` no `main.tsx`:
```tsx
// CRITICO: sem basename, o react-router nao resolve as rotas corretamente sob /crm
<BrowserRouter basename="/crm">
  <AuthProvider>
    <App />
  </AuthProvider>
</BrowserRouter>
```

**NOTA:** O `basename` so deve ser adicionado na Fase 2. Durante Fase 1 (dev), manter sem basename para que o Vite dev server funcione nas rotas `/`, `/leads`, etc. Usar variavel de ambiente para controlar:
```tsx
<BrowserRouter basename={import.meta.env.VITE_BASE_PATH || '/'}>
```

Isso cria rotas NOVAS (`/crm`, `/:slug/crm`) sem mexer nas existentes. O admin antigo continua em `/:slug`, `/:slug/config`, etc.

Depois na Fase 3, quando tudo estiver estável:
```javascript
// Trocar /:slug para servir o CRM novo
app.get('/:slug', (req, res) => res.sendFile(crmFile))
```

**Prioridade absoluta:** nada que funciona hoje para de funcionar em nenhum momento.

### 7.5 Arquivos que o Build NÃO Pode Tocar

O `vite build` gera `index.html` + `assets/index-XXXX.js` + `assets/index-XXXX.css` em `backend/public/`.

Com `emptyOutDir: false`, apenas esses 3 arquivos são escritos. Mas o `assets/` acumula builds antigos. Os seguintes arquivos/pastas devem ser **preservados a todo custo**:

| Path | Usado por |
|------|-----------|
| `portal.html` | Booking portal (WhatsApp links) |
| `painel.html` | Admin antigo (até ser aposentado) |
| `login.html` | Login Astrai |
| `config/index.html` | Config Astrai |
| `cadastro/index.html` | Cadastro Astrai |
| `checkout/index.html` | Checkout billing |
| `onboarding/index.html` | Onboarding Astrai |
| `superadmin/index.html` | Super admin |
| `hoje.html` | Agenda-do-dia |
| `relatorio.html` | Relatório |
| `cliente.html` | Ficha do cliente |
| `logo-*.png`, `logomarca-*.png`, `mana-clinic.png` | Imagens usadas pelos HTML antigos |

---

## 8. Riscos e Mitigações

| # | Risco | Impacto | Mitigação |
|---|-------|---------|-----------|
| 1 | **Routing SPA em produção não funciona** | CRÍTICO — CRM novo inacessível | Decidir Opção A/B/C (seção 7.3) ANTES de implementar. Se Opção A: alterar `backend/src/index.js` para servir `index.html` nas rotas do CRM. |
| 2 | **Build sobrescreve portal.html** | CRÍTICO — booking WhatsApp quebra | `emptyOutDir: false` (já configurado). Verificar após cada build. |
| 3 | **Rota `/leads` capturada por `/:slug`** | ALTO — serve `painel.html` em vez do CRM | Registrar rotas CRM ANTES do wildcard `/:slug` no Express. Ordem de rotas é crítica. |
| 4 | **Auth quebra na migração** | ALTO — ninguém consegue logar | `AuthContext` + `api.ts` + localStorage `laco_api_key` devem ser preservados. Auth usa `x-api-key` header → `process.env.API_SECRET`. |
| 5 | **Assets acumulam em `backend/public/assets/`** | MÉDIO — pasta cresce | `emptyOutDir: false` não limpa builds antigos. Limpar `assets/index-*.{js,css}` manualmente antes do build. |
| 6 | **Preços exibidos errados** | MÉDIO — confusão | Backend usa centavos. `procedures.ts` faz `÷ 100` no GET e `× 100` no POST/PATCH. NÃO mudar. |
| 7 | **DELETE profissional inexistente no backend** | MEDIO — erro 500 | Backend nao tem `DELETE /api/professionals/:id`. Criar endpoint se o CRM novo tiver botao excluir. |
| 8 | **DELETE procedimento inexistente no backend** | ALTO — front_laco chama mas falha | `procedures.js` NAO tem rota DELETE. O front_laco tem `deleteProcedure()` que chama `api.delete('/api/procedures/${id}')` mas o endpoint nao existe. **Criar `DELETE /api/procedures/:id` no backend ANTES de implementar.** |
| 9 | **BrowserRouter sem basename na Fase 2** | ALTO — rotas nao resolvem | Quando as rotas backend usarem prefixo `/crm`, o `BrowserRouter` precisa de `basename="/crm"`. Sem isso, o SPA nao vai resolver `/crm/leads` como rota `/leads`. Usar `import.meta.env.VITE_BASE_PATH` para controlar por ambiente. |
| 10 | **Logo Astrai nao existe** | BAIXO | `logo_icon.png` e `logo_text.png` precisam ser adicionados a `backend/public/`. |

---

## 9. Fora de Escopo (v1)

- Tema "terminal" e tema "dark" puro (apenas `mixed` e `light`)
- Drag-and-drop de procedimentos (endpoint `PATCH /api/procedures/order` já existe, UI fica para v2)
- Notificações em tempo real (WebSocket)
- IA insights dinâmicos (card placeholder OK)
- Multi-idioma
- Gráfico de receita semanal (requer novo endpoint backend)
- Search global funcional no header (visual-only em v1)
- Notificação bell funcional (visual-only em v1)
- Tolerância de atraso na tab Clínica (campo no design novo, backend não tem coluna)
- `DELETE /api/professionals/:id` (nao existe — adicionar se necessario)
- `DELETE /api/procedures/:id` (**nao existe no backend** — precisa ser criado, e um pre-requisito, nao fora de escopo — ver Risco #8)

---

## 10. Critérios de Aceite

1. **Decisão de routing (seção 7.3) tomada** e implementada no backend
2. Login com API Key funciona e exibe tela de login com visual Astrai
3. Todas as funcionalidades do admin atual **continuam funcionando** com dados reais
4. Visual é **fiel ao design front_astrai** (cores, tipografia, espaçamento, animações)
5. Portal de agendamento (`/:slug/agendar`) **não é afetado** (portal.html intacto)
6. Build gera output em `backend/public/` sem destruir arquivos existentes
7. Sidebar é collapsible, usa `NavLink`, e deep links funcionam em produção
8. Toggle light/dark funciona (mixed ↔ light)
9. Todas as chamadas API retornam dados corretos e são exibidos na UI
10. CRUD de procedimentos funciona (criar, editar com 3 abas, excluir, toggle ativo)
11. CRUD de profissionais funciona (criar, editar, vincular procedimentos)
12. Settings (portal + clínica + horários) salvam corretamente
13. Leads: busca, filtro, status change, WhatsApp, excluir, drawer de detalhes
14. Admin Astrai antigo (painel.html, config/, etc.) continua acessível até migração completa
