# Validacao local mastigada

Objetivo: validar auth, multi-tenant, superadmin, cadastro, onboarding e portal sem tocar no banco Railway configurado em `backend/.env`.

## 1. Instale um Postgres local

Nesta maquina nao ha `docker` nem `psql` no PATH. Escolha uma opcao:

- Docker Desktop: instale, reinicie o terminal e rode um container Postgres.
- PostgreSQL para Windows: instale pelo instalador oficial e crie o banco `laco_local`.

Com Docker Desktop instalado, o comando e:

```powershell
docker run --name laco-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=laco_local -p 5432:5432 -d postgres:16
```

Se o container ja existir:

```powershell
docker start laco-postgres
```

## 2. Crie o env local

```powershell
cd D:\Trab\laco\backend
Copy-Item .env.local.example .env.local
```

Credenciais locais ja ficam prontas:

```text
SUPERADMIN_EMAIL=admin@local.test
SUPERADMIN_PASSWORD=admin12345
```

## 3. Rode migration no banco local

```powershell
cd D:\Trab\laco\backend
npm run migrate:local
```

Resultado esperado:

```text
Migrations concluidas com sucesso
```

## 4. Suba o backend local

```powershell
cd D:\Trab\laco\backend
npm run start:local
```

Resultado esperado:

```text
Laco API rodando na porta 3000
Banco conectado
```

## 5. Teste no navegador

Abra:

```text
http://localhost:3000/login
```

Entre com:

```text
Email: admin@local.test
Senha: admin12345
```

Depois abra:

```text
http://localhost:3000/superadmin
```

## 6. Fluxo feliz para validar

1. Em `/superadmin`, crie uma clinica.
2. Clique em `Impersonar`.
3. Va para `/onboarding`.
4. Preencha dados da clinica.
5. Crie o primeiro procedimento.
6. Salve horarios.
7. Copie o slug da clinica.
8. Acesse `http://localhost:3000/{slug}/agendar`.

O portal deve carregar somente depois do passo 4 do onboarding.

## 7. Cadastro self-service

Abra:

```text
http://localhost:3000/cadastro
```

Crie uma clinica nova. O sistema deve:

1. sugerir slug automaticamente;
2. criar `clinic + user`;
3. redirecionar para `/checkout`.

Sem Stripe configurado, o checkout vai mostrar aviso de Stripe ausente. Isso e esperado na validacao local sem chaves.

## 8. Validacao via API

Login:

```powershell
$body = @{ email = "admin@local.test"; password = "admin12345" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/auth/login -ContentType "application/json" -Body $body
$token = $login.token
```

Ver usuario:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/auth/me -Headers @{ Authorization = "Bearer $token" }
```

Dashboard:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/superadmin/dashboard -Headers @{ Authorization = "Bearer $token" }
```

Smoke test automatico:

Com o servidor rodando em outro terminal:

```powershell
cd D:\Trab\laco\backend
npm run smoke:local
```

Esse comando valida `/health`, paginas publicas, fallback `x-api-key`, login JWT, `/api/auth/me`, dashboard superadmin e portal por slug.

## 9. Problemas comuns

Se `npm run migrate:local` falhar com conexao recusada:

- Postgres local nao esta rodando.
- Porta 5432 esta ocupada.
- `DATABASE_URL` no `.env.local` nao bate com usuario/senha/banco.

Se login falhar:

- Rode `npm run migrate:local` de novo.
- Confira `SUPERADMIN_EMAIL` e `SUPERADMIN_PASSWORD` em `.env.local`.

Se `/painel` der 404:

- Os HTMLs antigos do CRM aparecem deletados no workspace antes desta alteracao. Para validar estes epics, use `/superadmin`, `/cadastro`, `/checkout`, `/onboarding` e `/{slug}/agendar`.
