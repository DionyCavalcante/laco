# EPIC 2 — Auth Real (JWT + Roles)

**Status:** Draft  
**Prioridade:** P0 — Bloqueante para EPIC 3, 5, 6  
**Owner:** @dev  
**Estimativa:** 1 semana

## Objetivo

Substituir o `x-api-key` estático por autenticação real com email + senha + JWT. Criar a tabela de usuários com roles (`superadmin`, `admin`).

## Contexto

Auth atual: `x-api-key` salvo em `localStorage` — mesma chave para todos. Sem distinção de usuários, sem roles, sem como ter superadmin separado do admin da clínica.

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
POST /api/auth/login   { email, password } → { token, user }
POST /api/auth/refresh { refreshToken }    → { token }
POST /api/auth/logout                      → 200 OK
GET  /api/auth/me                          → { user }
```

JWT payload:
```json
{ "userId": "uuid", "clinicId": "uuid|null", "role": "admin|superadmin", "exp": ... }
```

## Acceptance Criteria

- [ ] AC1: `POST /api/auth/login` valida email/senha, retorna JWT (1h) + refresh token (30d)
- [ ] AC2: Middleware `requireAuth` aceita `Authorization: Bearer <token>` (mantém `x-api-key` como fallback por 1 sprint)
- [ ] AC3: Superadmin: `clinic_id = null`, `role = superadmin` — acesso irrestrito
- [ ] AC4: Admin: `clinic_id = <id>`, `role = admin` — acesso somente à própria clínica
- [ ] AC5: Senha armazenada com bcrypt (rounds: 12)
- [ ] AC6: Refresh token rotacionado a cada uso (invalidar o anterior)
- [ ] AC7: `POST /api/auth/logout` invalida refresh token no servidor
- [ ] AC8: Seed cria usuário superadmin via `SUPERADMIN_EMAIL` + `SUPERADMIN_PASSWORD` env vars
- [ ] AC9: Rate limiting em `/api/auth/login` (máx 10 tentativas/min por IP)
- [ ] AC10: Páginas do CRM redirecionam para `/login` se token inválido/expirado

## Arquivos impactados

- `backend/src/middleware/auth.js` — estender para JWT
- `backend/src/routes/auth.js` — novo arquivo
- `backend/src/db/migrate.js` — adicionar tabela users + seed superadmin
- `backend/src/index.js` — registrar rota `/api/auth`
- `backend/public/login.html` — trocar API key por email/senha
- `backend/public/config/index.html` — remover `promptApiKey()`

## Dependências

- **Bloqueado por:** EPIC 1 (clinicId no JWT)
- **Bloqueia:** EPIC 3 (superadmin precisa de auth), EPIC 5 (billing por usuário), EPIC 6 (signup)

## Notas técnicas

- Biblioteca JWT: `jsonwebtoken` (já comum no ecossistema Node)
- Biblioteca bcrypt: `bcryptjs` (sem dependência nativa — melhor para Railway)
- Refresh tokens armazenados na tabela `refresh_tokens` (não em cookie — mobile friendly)
- `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD` como env vars no Railway
