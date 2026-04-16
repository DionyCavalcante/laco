# EPIC 1 — Multi-tenant Fundação

**Status:** Draft  
**Prioridade:** P0 — Bloqueante para todos os outros epics  
**Owner:** @dev  
**Estimativa:** 2 semanas

## Objetivo

Transformar o Laço de single-tenant (1 deploy por cliente) para multi-tenant real: um único deploy serve N clínicas, cada uma com seus dados completamente isolados.

## Contexto

Hoje o sistema usa `process.env.CLINIC_SLUG` hardcoded para identificar a clínica em todas as queries. Isso impede escalar sem criar um deploy Railway por cliente — inviável para SaaS.

## Problema atual

```
process.env.CLINIC_SLUG = 'bella-estetica'  // hardcoded no env
WHERE clinic_id = (SELECT id FROM clinics WHERE slug = $ENV)  // em todo lugar
```

## Solução

O `clinic_id` passa a vir do JWT do usuário autenticado (`req.user.clinicId`), não do env.

```
JWT payload: { userId, clinicId, role }
Middleware:  req.user = decoded JWT
Queries:     WHERE clinic_id = req.user.clinicId
```

## Acceptance Criteria

- [ ] AC1: Remover `process.env.CLINIC_SLUG` de todas as rotas (`leads`, `procedures`, `appointments`, `hours`, `settings`, `upload`, `portal`)
- [ ] AC2: Middleware `requireAuth` decodifica JWT e popula `req.user.clinicId`
- [ ] AC3: Superadmin (`role = superadmin`, `clinicId = null`) pode passar `?clinic_id=` como override nas queries
- [ ] AC4: Portal de agendamento (`/api/portal/:slug`) continua roteando por slug publicamente — sem auth
- [ ] AC5: Uploads isolados por `clinic_id` no path (`/uploads/{clinicId}/...`)
- [ ] AC6: Nenhuma query retorna dados de clínica diferente da autenticada
- [ ] AC7: `CLINIC_SLUG` env var mantida temporariamente apenas como fallback no seed do migrate (não nas rotas)

## Arquivos impactados

- `backend/src/routes/leads.js`
- `backend/src/routes/procedures.js`
- `backend/src/routes/appointments.js`
- `backend/src/routes/hours.js`
- `backend/src/routes/settings.js`
- `backend/src/routes/upload.js`
- `backend/src/routes/portal.js`
- `backend/src/middleware/auth.js`
- `backend/src/db/migrate.js`

## Dependências

- **Bloqueado por:** Nenhum
- **Bloqueia:** EPIC 2, EPIC 3, EPIC 4, EPIC 5, EPIC 6

## Notas técnicas

- Manter compatibilidade com `x-api-key` durante a transição (EPIC 2 troca por JWT)
- Middleware de auth já existe em `backend/src/middleware/auth.js` — estender, não reescrever
- Portal público (`/api/portal/:slug`) nunca exige auth — rota excluída do middleware
