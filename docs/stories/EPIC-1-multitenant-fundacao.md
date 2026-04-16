# EPIC 1 â€” Multi-tenant FundaÃ§Ã£o

**Status:** Ready for Review  
**Prioridade:** P0 â€” Bloqueante para todos os outros epics  
**Owner:** @dev  
**Estimativa:** 2 semanas

## Objetivo

Transformar o LaÃ§o de single-tenant (1 deploy por cliente) para multi-tenant real: um Ãºnico deploy serve N clÃ­nicas, cada uma com seus dados completamente isolados.

## Contexto

Hoje o sistema usa `process.env.CLINIC_SLUG` hardcoded para identificar a clÃ­nica em todas as queries. Isso impede escalar sem criar um deploy Railway por cliente â€” inviÃ¡vel para SaaS.

## Problema atual

```
process.env.CLINIC_SLUG = 'bella-estetica'  // hardcoded no env
WHERE clinic_id = (SELECT id FROM clinics WHERE slug = $ENV)  // em todo lugar
```

## SoluÃ§Ã£o

O `clinic_id` passa a vir do JWT do usuÃ¡rio autenticado (`req.user.clinicId`), nÃ£o do env.

```
JWT payload: { userId, clinicId, role }
Middleware:  req.user = decoded JWT
Queries:     WHERE clinic_id = req.user.clinicId
```

## Acceptance Criteria

- [x] AC1: Remover `process.env.CLINIC_SLUG` de todas as rotas (`leads`, `procedures`, `appointments`, `hours`, `settings`, `upload`, `portal`)
- [x] AC2: Middleware `requireAuth` decodifica JWT e popula `req.user.clinicId`
- [x] AC3: Superadmin (`role = superadmin`, `clinicId = null`) pode passar `?clinic_id=` como override nas queries
- [x] AC4: Portal de agendamento (`/api/portal/:slug`) continua roteando por slug publicamente â€” sem auth
- [x] AC5: Uploads isolados por `clinic_id` no path (`/uploads/{clinicId}/...`)
- [x] AC6: Nenhuma query retorna dados de clÃ­nica diferente da autenticada
- [x] AC7: `CLINIC_SLUG` env var mantida temporariamente apenas como fallback no seed do migrate (nÃ£o nas rotas)

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

## DependÃªncias

- **Bloqueado por:** Nenhum
- **Bloqueia:** EPIC 2, EPIC 3, EPIC 4, EPIC 5, EPIC 6

## Notas tÃ©cnicas

- Manter compatibilidade com `x-api-key` durante a transiÃ§Ã£o (EPIC 2 troca por JWT)
- Middleware de auth jÃ¡ existe em `backend/src/middleware/auth.js` â€” estender, nÃ£o reescrever
- Portal pÃºblico (`/api/portal/:slug`) nunca exige auth â€” rota excluÃ­da do middleware

## Dev Agent Record

### File List

- `backend/src/lib/tenant.js`
- `backend/src/middleware/auth.js`
- `backend/src/routes/leads.js`
- `backend/src/routes/procedures.js`
- `backend/src/routes/appointments.js`
- `backend/src/routes/hours.js`
- `backend/src/routes/settings.js`
- `backend/src/routes/upload.js`
- `backend/src/routes/portal.js`
- `backend/src/routes/webhook.js`
- `backend/src/db/migrate.js`
