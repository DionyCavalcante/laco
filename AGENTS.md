# AGENTS.md - Synkra AIOX / Astrai Laco (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI. Ele consolida as regras do AIOX e as instrucoes operacionais mais recentes que antes ficavam em `.claude/CLAUDE.md`.

<!-- AIOX-MANAGED-START: core -->
## Core Rules

1. Siga a Constitution em `.aiox-core/constitution.md`
2. Priorize `CLI First -> Observability Second -> UI Third`
3. Trabalhe por stories em `docs/stories/`
4. Nao invente requisitos fora dos artefatos existentes
<!-- AIOX-MANAGED-END: core -->

<!-- AIOX-MANAGED-START: quality -->
## Quality Gates

- Rode `npm run lint`
- Rode `npm run typecheck`
- Rode `npm test`
- Atualize checklist e file list da story antes de concluir
<!-- AIOX-MANAGED-END: quality -->

<!-- AIOX-MANAGED-START: codebase -->
## Project Map

- Core framework: `.aiox-core/`
- CLI entrypoints: `bin/`
- Shared packages: `packages/`
- Tests: `tests/`
- Docs: `docs/`
<!-- AIOX-MANAGED-END: codebase -->

## Projeto Astrai Laco

Monorepo com 3 modulos principais:

```text
laco/
|-- backend/          # API Node.js + Express (PostgreSQL/Supabase, Railway)
|-- frontend/
|   |-- agendador/    # Portal do cliente (/:slug/agendar) - React + Vite
|   `-- admin/        # Admin CRM da clinica (/admin) - React + Vite
`-- nixpacks.toml     # Builda agendador + admin + backend no deploy Railway
```

### Stack

- Backend: Node.js + Express, CommonJS (`require`), PostgreSQL via Supabase/Railway.
- Frontend Admin: React + Vite + TypeScript + TailwindCSS em `frontend/admin/`.
- Portal de Agendamento: React + Vite em `frontend/agendador/`.
- Frontend legado: HTML puro em `backend/public/`; esta em descontinuacao, nao editar manualmente.
- Uploads: Supabase Storage para fotos antes/depois; imagens tambem podem existir como base64 em `procedure_photos.url`.
- WhatsApp: Evolution API via webhook.
- Libs frontend: `lucide-react`, `motion/react`, `recharts`, `react-router-dom v7`.
- Helper Tailwind: use `cn()` em `frontend/admin/src/lib/utils.ts`.

### Backend (`backend/`)

Estrutura principal:

```text
backend/
|-- src/
|   |-- index.js       # Express app + rotas
|   |-- routes/        # Endpoints REST
|   |-- middleware/    # Auth por API key + JWT
|   `-- db.js          # Pool PostgreSQL
|-- public/            # Frontend legado + assets publicados
`-- uploads/           # Temp local; prod usa Supabase
```

Padroes:

- Use CommonJS, `async/await` e `res.json()` para respostas.
- Variaveis sensiveis (`OPENAI_API_KEY`, `SUPABASE_URL`, etc.) ficam no Railway, nunca no codigo.
- A API key da OpenAI deve ficar somente no backend.

### Admin CRM (`frontend/admin/`)

Painel React com tema Astrai (light/dark/gold e variantes atuais). Telas principais: Dashboard, Clientes/Leads, Agenda, Atendimento/IA e Configuracoes.

**LEIA ANTES DE MEXER NO LAYOUT:** [`frontend/admin/LAYOUT_ARCHITECTURE.md`](frontend/admin/LAYOUT_ARCHITECTURE.md)

O doc cobre:

- Estrutura de arquivos e componentes
- Sistema de temas (light/mixed/dark/terminal)
- Menu de navegacao e como reordenar
- Componentes principais: Sidebar, LeadProfileDrawer, BookingModal, Leads, Agenda
- Fluxos de dados (novo cliente, reagendar, digital profile)
- Padroes de codigo: `cn()`, formatacao de telefone, fetch com `api`
- Como fazer mudancas comuns (nova pagina, nova coluna, novo campo)
- Deploy correto (sempre `git push`, nunca `railway up`)

Padroes do admin:

- Componentes funcionais React + TypeScript.
- Use Tailwind utility classes e o helper `cn()`.
- Use `frontend/admin/src/lib/phone.ts` para formatacao de telefone.
- O Vite usa `base: '/admin'`; assets e rotas SPA ficam sob `/admin`.
- Imagens do Supabase Storage precisam de blob URL quando usadas em canvas para evitar CORS/tainted canvas.

### Portal de Agendamento (`frontend/agendador/`)

- Portal publico por slug da clinica: `/:slug/agendar`.
- Nao mover regras de negocio sensiveis para o frontend; use endpoints publicos do portal quando necessario.

### Auth

Rotas `/api/*` usam `requireAuth`, aceitando dois metodos:

- Bearer JWT: usado pelo frontend admin (`Authorization: Bearer <token>`).
- Header `x-api-key`: usado por integracoes externas, n8n e scripts.

Excecoes publicas incluem portal (`/api/portal/*`), billing webhook e GET de fotos. `JWT_SECRET` usa `process.env.JWT_SECRET || process.env.API_SECRET`.

### Banco de Dados

Tabelas principais:

`clinics`, `leads`, `appointments`, `procedures`, `procedure_photos`, `professionals`, `professional_hours`, `business_hours`, `portal_settings`, `webhook_log`.

Notas:

- `leads` tem unicidade por `clinic_id + phone`.
- Constraints e colunas novas sao aplicadas automaticamente no startup do servidor quando implementadas com `IF NOT EXISTS`.
- Fotos podem ser salvas como base64 no campo `url` de `procedure_photos`, sem depender do filesystem.

### Comandos do Projeto

```bash
# Instalar todos os modulos
npm run install-all

# Dev local
cd backend && npm run dev
cd frontend/admin && npm run dev

# Build de producao dos frontends
npm run build-all

# Build apenas do admin
cd frontend/admin && npm run build

# Type check do admin (script chamado "lint")
cd frontend/admin && npm run lint

# Migrations
cd backend && npm run migrate
```

### Deploy Railway

```bash
# SEMPRE assim: aparece o commit no Railway
git add .
git commit -m "feat: descricao"
git push origin main
# Railway detecta e builda automaticamente
```

Nunca usar `railway up` para deploy de producao, pois perde o historico de commits no fluxo esperado.

<!-- AIOX-MANAGED-START: commands -->
## Common Commands

- `npm run sync:ide`
- `npm run sync:ide:check`
- `npm run sync:skills:codex`
- `npm run sync:skills:codex:global` (opcional; neste repo o padrao e local-first)
- `npm run validate:structure`
- `npm run validate:agents`
<!-- AIOX-MANAGED-END: commands -->

<!-- AIOX-MANAGED-START: shortcuts -->
## Agent Shortcuts

Preferencia de ativacao no Codex CLI:
1. Use `/skills` e selecione `aiox-<agent-id>` vindo de `.codex/skills` (ex.: `aiox-architect`)
2. Se preferir, use os atalhos abaixo (`@architect`, `/architect`, etc.)

Interprete os atalhos abaixo carregando o arquivo correspondente em `.aiox-core/development/agents/` (fallback: `.codex/agents/`), renderize o greeting via `generate-greeting.js` e assuma a persona ate `*exit`:

- `@architect`, `/architect`, `/architect.md` -> `.aiox-core/development/agents/architect.md`
- `@dev`, `/dev`, `/dev.md` -> `.aiox-core/development/agents/dev.md`
- `@qa`, `/qa`, `/qa.md` -> `.aiox-core/development/agents/qa.md`
- `@pm`, `/pm`, `/pm.md` -> `.aiox-core/development/agents/pm.md`
- `@po`, `/po`, `/po.md` -> `.aiox-core/development/agents/po.md`
- `@sm`, `/sm`, `/sm.md` -> `.aiox-core/development/agents/sm.md`
- `@analyst`, `/analyst`, `/analyst.md` -> `.aiox-core/development/agents/analyst.md`
- `@devops`, `/devops`, `/devops.md` -> `.aiox-core/development/agents/devops.md`
- `@data-engineer`, `/data-engineer`, `/data-engineer.md` -> `.aiox-core/development/agents/data-engineer.md`
- `@ux-design-expert`, `/ux-design-expert`, `/ux-design-expert.md` -> `.aiox-core/development/agents/ux-design-expert.md`
- `@squad-creator`, `/squad-creator`, `/squad-creator.md` -> `.aiox-core/development/agents/squad-creator.md`
- `@aiox-master`, `/aiox-master`, `/aiox-master.md` -> `.aiox-core/development/agents/aiox-master.md`
<!-- AIOX-MANAGED-END: shortcuts -->
