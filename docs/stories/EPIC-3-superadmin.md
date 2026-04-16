# EPIC 3 — Superadmin + Onboarding Assistido

**Status:** Draft  
**Prioridade:** P1 — Você opera o negócio a partir daqui  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Painel exclusivo do dono da plataforma para criar clínicas, monitorar o negócio e fazer suporte sem precisar de acesso direto ao banco.

## Contexto

Com multi-tenant ativo (EPIC 1) e auth real (EPIC 2), o superadmin precisa de um painel separado do CRM das clínicas. Acesso via `laco.app/superadmin`.

## Funcionalidades

### Dashboard
```
- Total de clínicas ativas
- Clínicas em trial (e quantos dias restam)
- Total de leads captados (agregado)
- Total de agendamentos (agregado)
- MRR atual (clínicas pagas × R$110)
- Novos cadastros nos últimos 7 dias
```

### Gestão de Clínicas
```
- Listar todas as clínicas com: nome, slug, status, dias de trial, data de criação
- Criar nova clínica (dispara wizard de onboarding — EPIC 4)
- Suspender / reativar clínica
- Trocar plano / estender trial manualmente
- Impersonar clínica (entrar como admin dela para suporte)
```

### Gestão de Usuários
```
- Listar admins por clínica
- Redefinir senha de admin
- Criar admin adicional para uma clínica
```

## Acceptance Criteria

- [ ] AC1: Rota `/superadmin` acessível somente com `role = superadmin`
- [ ] AC2: Dashboard exibe métricas agregadas em tempo real
- [ ] AC3: Listar clínicas com filtro por status (ativa, trial, suspensa)
- [ ] AC4: Criar clínica via form → gera `slug` automático do nome → redireciona para wizard (EPIC 4)
- [ ] AC5: Suspender clínica bloqueia login dos admins e exibe página de suspensão no CRM
- [ ] AC6: Impersonar clínica — superadmin acessa o CRM dela com banner "Você está como admin de {nome}" + botão "Sair"
- [ ] AC7: Log de ações do superadmin (criar, suspender, impersonar) persistido em `audit_logs`
- [ ] AC8: Extender trial — input de dias adicionais, atualiza `trial_ends_at` no banco

## Schema adicional

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
  -- 'trial' | 'active' | 'suspended' | 'cancelled'
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'standard';

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  target_type TEXT,  -- 'clinic' | 'user'
  target_id   UUID,
  meta        JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Arquivos impactados

- `backend/src/routes/superadmin.js` — novo arquivo
- `backend/src/index.js` — registrar `/superadmin` (API) e `/superadmin` (HTML)
- `backend/public/superadmin/index.html` — novo painel
- `backend/src/db/migrate.js` — colunas status, trial_ends_at, audit_logs

## Dependências

- **Bloqueado por:** EPIC 1, EPIC 2
- **Bloqueia:** EPIC 4 (wizard chamado pelo superadmin), EPIC 5 (status da clínica)
