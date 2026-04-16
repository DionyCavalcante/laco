# EPIC 2 â€” Auth Real (JWT + Roles)

**Status:** Ready for Review  
**Prioridade:** P0 â€” Bloqueante para EPIC 3, 5, 6  
**Owner:** @dev  
**Estimativa:** 1 semana

## Objetivo

Substituir o `x-api-key` estÃ¡tico por autenticaÃ§Ã£o real com email + senha + JWT. Criar a tabela de usuÃ¡rios com roles (`superadmin`, `admin`).

## Contexto

Auth atual: `x-api-key` salvo em `localStorage` â€” mesma chave para todos. Sem distinÃ§Ã£o de usuÃ¡rios, sem roles, sem como ter superadmin separado do admin da clÃ­nica.

## Schema

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID REFERENCES clinics(id) ON DELETE CASCADE,  -- NULL = superadmin
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,  -- bcrypt hash
  role        TEXT DEFAULT 'admin',  -- 'superadmin' | 'admin'
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_login  TIMESTAMPTZ
);
```

## Fluxo de auth

```
POST /api/auth/login   { email, password } â†’ { token, user }
POST /api/auth/refresh { refreshToken }    â†’ { token }
POST /api/auth/logout                      â†’ 200 OK
GET  /api/auth/me                          â†’ { user }
```

JWT payload:
```json
{ "userId": "uuid", "clinicId": "uuid|null", "role": "admin|superadmin", "exp": ... }
```

## Acceptance Criteria

- [x] AC1: `POST /api/auth/login` valida email/senha, retorna JWT (1h) + refresh token (30d)
- [x] AC2: Middleware `requireAuth` aceita `Authorization: Bearer <token>` (mantÃ©m `x-api-key` como fallback por 1 sprint)
- [x] AC3: Superadmin: `clinic_id = null`, `role = superadmin` â€” acesso irrestrito
- [x] AC4: Admin: `clinic_id = <id>`, `role = admin` â€” acesso somente Ã  prÃ³pria clÃ­nica
- [x] AC5: Senha armazenada com bcrypt (rounds: 12)
- [x] AC6: Refresh token rotacionado a cada uso (invalidar o anterior)
- [x] AC7: `POST /api/auth/logout` invalida refresh token no servidor
- [x] AC8: Seed cria usuÃ¡rio superadmin via `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars
- [x] AC9: Rate limiting em `/api/auth/login` (mÃ¡x 10 tentativas/min por IP)
- [x] AC10: PÃ¡ginas do CRM redirecionam para `/login` se token invÃ¡lido/expirado

## Arquivos impactados

- `backend/src/middleware/auth.js` â€” estender para JWT
- `backend/src/routes/auth.js` â€” novo arquivo
- `backend/src/db/migrate.js` â€” adicionar tabela users + seed superadmin
- `backend/src/index.js` â€” registrar rota `/api/auth`
- `backend/public/login.html` â€” trocar API key por email/senha
- `backend/public/config/index.html` â€” remover `promptApiKey()`

## DependÃªncias

- **Bloqueado por:** EPIC 1 (clinicId no JWT)
- **Bloqueia:** EPIC 3 (superadmin precisa de auth), EPIC 5 (billing por usuÃ¡rio), EPIC 6 (signup)

## Notas tÃ©cnicas

- Biblioteca JWT: `jsonwebtoken` (jÃ¡ comum no ecossistema Node)
- Biblioteca bcrypt: `bcryptjs` (sem dependÃªncia nativa â€” melhor para Railway)
- Refresh tokens armazenados na tabela `refresh_tokens` (nÃ£o em cookie â€” mobile friendly)
- `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD` como env vars no Railway

## Dev Agent Record

### File List

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/middleware/auth.js`
- `backend/src/routes/auth.js`
- `backend/src/db/migrate.js`
- `backend/src/index.js`
- `backend/public/login.html`
- `backend/public/config/index.html`
