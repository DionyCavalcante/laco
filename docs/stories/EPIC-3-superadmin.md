# EPIC 3 â€” Superadmin + Onboarding Assistido

**Status:** Ready for Review  
**Prioridade:** P1 â€” VocÃª opera o negÃ³cio a partir daqui  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Painel exclusivo do dono da plataforma para criar clÃ­nicas, monitorar o negÃ³cio e fazer suporte sem precisar de acesso direto ao banco.

## Contexto

Com multi-tenant ativo (EPIC 1) e auth real (EPIC 2), o superadmin precisa de um painel separado do CRM das clÃ­nicas. Acesso via `laco.app/superadmin`.

## Funcionalidades

### Dashboard
```
- Total de clÃ­nicas ativas
- ClÃ­nicas em trial (e quantos dias restam)
- Total de leads captados (agregado)
- Total de agendamentos (agregado)
- MRR atual (clÃ­nicas pagas Ã— R$110)
- Novos cadastros nos Ãºltimos 7 dias
```

### GestÃ£o de ClÃ­nicas
```
- Listar todas as clÃ­nicas com: nome, slug, status, dias de trial, data de criaÃ§Ã£o
- Criar nova clÃ­nica (dispara wizard de onboarding â€” EPIC 4)
- Suspender / reativar clÃ­nica
- Trocar plano / estender trial manualmente
- Impersonar clÃ­nica (entrar como admin dela para suporte)
```

### GestÃ£o de UsuÃ¡rios
```
- Listar admins por clÃ­nica
- Redefinir senha de admin
- Criar admin adicional para uma clÃ­nica
- Alterar email de admin
- Ativar/desativar admin
```

### Central de Contas
```
- Visualizar todas as contas em lista pesquisÃ¡vel
- Abrir detalhes da conta com usuÃ¡rios, status, leads e agendamentos
- Entrar no CRM da conta via impersonaÃ§Ã£o
- Abrir onboarding/configuraÃ§Ã£o da conta via impersonaÃ§Ã£o
- Abrir portal pÃºblico da conta em nova aba
```

## Acceptance Criteria

- [x] AC1: Rota `/superadmin` acessÃ­vel somente com `role = superadmin`
- [x] AC2: Dashboard exibe mÃ©tricas agregadas em tempo real
- [x] AC3: Listar clÃ­nicas com filtro por status (ativa, trial, suspensa)
- [x] AC4: Criar clÃ­nica via form â†’ gera `slug` automÃ¡tico do nome â†’ redireciona para wizard (EPIC 4)
- [x] AC5: Suspender clÃ­nica bloqueia login dos admins e exibe pÃ¡gina de suspensÃ£o no CRM
- [x] AC6: Impersonar clÃ­nica â€” superadmin acessa o CRM dela com banner "VocÃª estÃ¡ como admin de {nome}" + botÃ£o "Sair"
- [x] AC7: Log de aÃ§Ãµes do superadmin (criar, suspender, impersonar) persistido em `audit_logs`
- [x] AC8: Extender trial â€” input de dias adicionais, atualiza `trial_ends_at` no banco
- [x] AC9: Superadmin pode alterar email de usuÃ¡rio admin
- [x] AC10: Superadmin pode redefinir senha de usuÃ¡rio admin
- [x] AC11: Superadmin visualiza todas as contas em uma central pesquisÃ¡vel
- [x] AC12: Superadmin consegue abrir CRM, onboarding/configuraÃ§Ã£o e portal de cada conta com facilidade

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

- `backend/src/routes/superadmin.js` â€” novo arquivo
- `backend/src/index.js` â€” registrar `/superadmin` (API) e `/superadmin` (HTML)
- `backend/public/superadmin/index.html` â€” novo painel
- `backend/src/db/migrate.js` â€” colunas status, trial_ends_at, audit_logs

## DependÃªncias

- **Bloqueado por:** EPIC 1, EPIC 2
- **Bloqueia:** EPIC 4 (wizard chamado pelo superadmin), EPIC 5 (status da clÃ­nica)

## Dev Agent Record

### File List

- `backend/src/routes/superadmin.js`
- `backend/src/index.js`
- `backend/public/superadmin/index.html`
- `backend/src/db/migrate.js`
