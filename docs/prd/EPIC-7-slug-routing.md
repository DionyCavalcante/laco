# PRD — EPIC-7: Roteamento Multi-Tenant por Slug (Dashboard Admin)

**Status:** Draft  
**Data:** 2026-04-20  
**Prioridade:** Alta

---

## Contexto e Problema

O sistema Laço tem **dois frontends** com comportamentos opostos em relação à URL:

| Frontend | URL atual | Comportamento |
|----------|-----------|---------------|
| **Agendador público** | `/:slug/agendar` | Slug na URL — correto |
| **Dashboard admin** | `/painel`, `/config` | Sem slug — confuso |

O dashboard admin usa o slug guardado no `localStorage` (`laco_slug`) para fazer chamadas à API. Isso funciona tecnicamente, mas produz uma experiência ruim: a URL nunca identifica de qual clínica se trata, não dá pra favoritar ou compartilhar uma tela, e o histórico do browser não faz sentido.

A proposta é simples: o dashboard admin deve seguir o mesmo padrão do agendador e usar URLs prefixadas por slug.

---

## Arquitetura do Sistema (Mapa de Dependências)

Antes de definir o escopo, é crítico entender como os sistemas se comunicam:

```
┌─────────────────────┐     JWT (clinicId)      ┌─────────────────────┐
│   Dashboard Admin   │ ──────────────────────► │   Laço API (BE)     │
│   /painel → /:slug/ │     x-api-key           └──────────┬──────────┘
└─────────────────────┘                                     │
                                                            │ PostgreSQL
┌─────────────────────┐  POST /api/leads                    │
│  Atendente-WPP (Py) │ ──── x-api-key ──────────────────► │
│  - Identifica por   │                                     │
│    phone_number_id  │                                     │
│  - booking_link =   │                                     │
│    /:slug/agendar   │                                     │
└─────────────────────┘                                     │
                                                            │
┌─────────────────────┐  GET /api/portal/:slug              │
│  Agendador Público  │ ──── sem auth ───────────────────► │
│  /:slug/agendar     │                                     │
└─────────────────────┘                                     │

┌─────────────────────┐  POST /webhook/evolution            │
│  Evolution/Meta API │ ──── payload ────────────────────► │
│  (webhook)          │   contém clinic_slug               │
└─────────────────────┘                                     │
```

### Como o slug flui hoje

1. **Login** → API retorna `{ clinic: { slug: "mana-beauty", onboarding_step: 4 } }`
2. Frontend salva `slug` em `localStorage.laco_slug`
3. **Painel** usa `localStorage.laco_slug` para montar `bookingLink()` e chamar `/api/portal/:slug`
4. **Todas as APIs autenticadas** (leads, appointments, settings) usam o JWT que carrega `clinicId` (número inteiro), **não o slug**
5. **Atendente-WPP** identifica a clínica pelo `phone_number_id` (Meta), busca na sua própria tabela `clinics`, e usa `booking_link` = `https://laco-production.up.railway.app/mana-beauty/agendar`
6. **Webhooks** da Evolution API identificam a clínica por `clinic_slug` no payload — não pela URL do dashboard

### Identificadores usados por sistema

| Sistema | Identifica a clínica por | Não usa |
|---------|--------------------------|---------|
| Dashboard admin | JWT `clinicId` (int) + `laco_slug` (localStorage) | URL |
| APIs autenticadas | JWT `clinicId` | slug |
| Portal público | `/:slug` na URL | JWT |
| Atendente-WPP | `phone_number_id` → `booking_link` | URL do dashboard |
| Webhook Evolution | `clinic_slug` no payload | URL do dashboard |

---

## O que MUDA

### Apenas o dashboard admin muda de URL

| Antes | Depois |
|-------|--------|
| `/painel` | `/:slug/` |
| `/config` | `/:slug/config` |

### O que NÃO muda (importante documentar)

| Sistema | Motivo |
|---------|--------|
| `/:slug/agendar` (agendador público) | Já está correto, não muda |
| Atendente-WPP | Identifica por `phone_number_id`, não pela URL do dashboard |
| `booking_link` no banco do atendente | Aponta para `/:slug/agendar` — continua igual |
| `/api/leads`, `/api/appointments`, etc. | Autenticam por JWT — não dependem de URL |
| `/webhook/evolution` | Usa `clinic_slug` no payload — não depende da URL do dashboard |
| `/superadmin` | Página global, sem slug |
| `/onboarding` | Fluxo pré-slug, sem mudança |
| `/cadastro`, `/checkout` | Fluxo pré-slug, sem mudança |

---

## Requisitos Funcionais

### FR-1 — Redirecionamento pós-login
Após autenticação bem-sucedida, o sistema deve redirecionar para `/:slug/` usando o slug já retornado pela API (campo `data.clinic.slug` — já existe na resposta).

**Arquivo:** `backend/public/login.html`, linha ~47  
**Mudança:**
```js
// Antes
location.href = '/painel'

// Depois
location.href = '/' + data.clinic.slug + '/'
```

Superadmin (`/superadmin`) e onboarding (`/onboarding`) não mudam.

---

### FR-2 — Rota backend `/:slug/config`
O backend deve servir `config/index.html` na rota `/:slug/config`.

**Arquivo:** `backend/src/index.js`  
**Mudança:** Adicionar rota antes da rota `/:slug` existente:
```js
// Adicionar ANTES de app.get('/:slug', ...)
app.get('/:slug/config', (req, res) => res.sendFile(path.join(pub, 'config/index.html')))
```

A rota `/config` (sem slug) deve continuar funcionando temporariamente para não quebrar sessões ativas.

---

### FR-3 — Painel usa slug do pathname nos links de navegação
O slug deve ser extraído do `location.pathname` (fonte primária) em vez de depender exclusivamente do `localStorage`. Com o slug na URL, o pathname é a fonte confiável.

**Arquivo:** `backend/public/painel.html`  
**Mudança no SLUG:**
```js
// Antes
const SLUG = localStorage.getItem('laco_slug') || location.pathname.split('/').filter(Boolean)[0] || ''

// Depois (inverte prioridade: URL é fonte primária)
const SLUG = location.pathname.split('/').filter(Boolean)[0] || localStorage.getItem('laco_slug') || ''
```

**Mudança nos links:**
```js
// Antes (strings fixas)
<a href="/config">Configurações</a>
<a href="/hoje">Hoje</a>
<a href="/relatorio.html">Relatório</a>

// Depois (usam SLUG — já disponível na variável)
// Obs: links precisam ser montados após SLUG ser definido, no momento de renderizar o nav
`/${SLUG}/config`
`/${SLUG}/hoje`
`/${SLUG}/relatorio`
```

---

### FR-4 — Config lê slug do pathname e ajusta link "Voltar"
A página de configurações, quando acessada via `/:slug/config`, deve extrair o slug da URL e usá-lo para navegar de volta ao dashboard correto.

**Arquivo:** `backend/public/config/index.html`  
**Mudanças:**
```js
// Antes
const SLUG = localStorage.getItem('laco_slug') || 'bella-estetica'

// Depois
const SLUG = location.pathname.split('/').filter(Boolean)[0] || localStorage.getItem('laco_slug') || ''
```

```html
<!-- Antes -->
<a href="/" class="back-link">← Voltar para plataforma</a>

<!-- Depois -->
<a href="/{SLUG}/" class="back-link">← Voltar para plataforma</a>
```
O link deve ser gerado via JS após `SLUG` ser definido.

---

### FR-5 — Slug guard no painel
Ao carregar `/:slug/`, o painel deve verificar se o slug da URL bate com o slug da sessão ativa. Se divergirem, redireciona para o slug correto.

**Motivo:** Sem esse guard, qualquer usuário logado pode acessar `/:outro-slug/` e ver o painel renderizar com os dados da sua própria sessão mas na URL de outra clínica — confuso e potencialmente problemático.

**Arquivo:** `backend/public/painel.html`  
**Lógica:**
```js
// No início do init():
const slugFromUrl = location.pathname.split('/').filter(Boolean)[0]
const slugFromStorage = localStorage.getItem('laco_slug')
if (slugFromStorage && slugFromUrl && slugFromUrl !== slugFromStorage) {
  // URL tem slug errado — redireciona para o slug correto da sessão
  location.replace('/' + slugFromStorage + '/')
  return
}
```

**Obs:** A proteção real dos dados já é garantida pelo JWT (as APIs retornam dados da clínica do token, não da URL). O guard é para UX/consistência, não segurança.

---

### FR-6 — Rota `/painel` redireciona para `/:slug/`
A rota legada `/painel` deve redirecionar para `/:slug/` usando o slug do token JWT, evitando que bookmarks antigos quebrem.

**Arquivo:** `backend/src/index.js`  
**Opção:** Manter `/painel` servindo `painel.html` (sem mudança no backend). O slug guard do FR-5 no próprio painel.html vai redirecionar para `/:slug/` assim que o SLUG do localStorage for lido. Isso evita uma dependência de decodificação de JWT no servidor para redirect.

---

## Requisitos Não-Funcionais

### NFR-1 — Zero impacto no agendador público
`/:slug/agendar` não pode ser afetado. A nova rota `/:slug/config` deve ser adicionada com cuidado para não conflitar.

Verificação: Express avalia rotas na ordem. `/:slug/config` e `/:slug/agendar` são rotas de dois segmentos. `/:slug` captura apenas um segmento. Não há conflito de roteamento.

### NFR-2 — Zero impacto no atendente-wpp
O `booking_link` configurado no banco do atendente aponta para `/:slug/agendar`. Esse caminho não muda. Nenhuma alteração necessária no atendente-wpp.

### NFR-3 — Sessões ativas não são invalidadas
JWT e localStorage não mudam. Usuários com sessão ativa são redirecionados via JavaScript (FR-5/FR-6) sem necessidade de novo login.

### NFR-4 — Sem SPA framework
O projeto usa HTML + JS vanilla servido pelo Express. A solução mantém esse padrão.

---

## Mapa de Mudanças por Arquivo

| Arquivo | Mudança | Risco |
|---------|---------|-------|
| `backend/src/index.js` | +1 rota `/:slug/config` | Baixo |
| `backend/public/login.html` | Redirect para `/${slug}/` | Baixo (slug já vem na resposta) |
| `backend/public/painel.html` | Inverte prioridade do SLUG; slug guard; links de nav | Médio |
| `backend/public/config/index.html` | SLUG do pathname; link voltar dinâmico | Baixo |

---

## Critérios de Aceite

- [ ] Login de clínica ativa com `onboarding_step >= 4` redireciona para `/:slug/` (ex: `/mana-beauty/`)
- [ ] `/:slug/` carrega o dashboard com dados corretos da clínica
- [ ] `/:slug/config` carrega a página de configurações corretamente
- [ ] Link de navegação "Configurações" no painel aponta para `/:slug/config`
- [ ] Links "Hoje" e "Relatório" no painel apontam para `/:slug/hoje` e `/:slug/relatorio`
- [ ] Link "Voltar para plataforma" na config aponta para `/:slug/`
- [ ] Acessar `/:outro-slug/` com sessão ativa redireciona para o slug correto
- [ ] Acessar `/painel` com sessão ativa redireciona para `/:slug/` (via slug guard)
- [ ] `/:slug/agendar` (agendador público) continua funcionando sem regressão
- [ ] Fluxo do atendente-wpp continua funcionando: link enviado por WhatsApp → agendador → agendamento
- [ ] Webhook `/webhook/evolution` continua funcionando sem mudanças

---

## Stories

| Story | Título | Escopo |
|-------|--------|--------|
| 7.1 | Backend: rota `/:slug/config` | `index.js` — 1 linha |
| 7.2 | Login: redirect para `/:slug/` | `login.html` — 1 linha |
| 7.3 | Painel: SLUG do pathname + slug guard + links de nav | `painel.html` |
| 7.4 | Config: SLUG do pathname + link "Voltar" dinâmico | `config/index.html` |
