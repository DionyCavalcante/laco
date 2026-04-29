# AGENTS.md - Synkra AIOX (Codex CLI)

Este arquivo define as instrucoes do projeto para o Codex CLI.

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

## Estrutura do Projeto Laço

Este é um monorepo com 3 módulos principais:

```
laco/
├── backend/          ← API Node.js + Express (PostgreSQL via Railway)
├── frontend/
│   ├── agendador/    ← Portal do cliente (/:slug/agendar) — React + Vite
│   └── admin/        ← Admin CRM da clínica (/admin) — React + Vite
└── nixpacks.toml     ← builda os 3 no deploy Railway
```

### Admin CRM (`frontend/admin/`)

Painel React com tema Astrai (light/dark/gold). Telas: Dashboard, Clientes, Agenda, Atendimento, Configurações.

**LEIA ANTES DE MEXER NO LAYOUT:** [`frontend/admin/LAYOUT_ARCHITECTURE.md`](frontend/admin/LAYOUT_ARCHITECTURE.md)

O doc cobre:
- Estrutura de arquivos e componentes
- Sistema de temas (light/mixed/dark/terminal)
- Menu de navegação e como reordenar
- Componentes principais: Sidebar, LeadProfileDrawer, BookingModal, Leads, Agenda
- Fluxos de dados (novo cliente, reagendar, digital profile)
- Padrões de código: `cn()`, formatação de telefone, fetch com `api`
- Como fazer mudanças comuns (nova página, nova coluna, novo campo)
- Deploy correto (sempre `git push`, nunca `railway up`)

### Deploy

```bash
# SEMPRE assim — aparece o commit no Railway
git add .
git commit -m "feat: descrição"
git push origin main
# Railway detecta e builda automaticamente
```

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
