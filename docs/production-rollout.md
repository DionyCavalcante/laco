# Rollout em producao sem quebrar o atual

Este plano assume que o banco atual esta no Railway e que o sistema single-tenant ainda precisa continuar funcionando durante a transicao.

## Flags de compatibilidade

Mantenha estas variaveis no primeiro deploy:

```env
ENFORCE_ONBOARDING_GATE=false
WEBHOOK_DEFAULT_CLINIC_SLUG=bella-estetica
```

E mantenha as antigas:

```env
API_SECRET=...
CLINIC_SLUG=bella-estetica
CLINIC_NAME=...
```

Motivo:

- `x-api-key` continua funcionando como fallback.
- Portal existente continua abrindo mesmo se `onboarding_completed_at` estiver vazio.
- Webhook antigo continua caindo na clinica padrao se o payload ainda nao enviar `clinic_slug`.

## Antes do deploy

1. Faca backup do banco Railway.
2. Confirme que as env vars novas existem:

```env
JWT_SECRET=...
SUPERADMIN_EMAIL=...
SUPERADMIN_PASSWORD=...
ENFORCE_ONBOARDING_GATE=false
WEBHOOK_DEFAULT_CLINIC_SLUG=bella-estetica
```

Stripe e Resend podem ficar vazios no primeiro deploy se o objetivo for nao afetar o atual.

3. Rode uma checagem local das envs carregadas pelo `backend/.env`:

```powershell
cd D:\Trab\laco\backend
npm run predeploy:check
```

Se for rodar no Railway, confira as mesmas variaveis no painel do servico.

## Deploy 1: schema + compatibilidade

1. Suba o codigo.
2. Rode migration:

```powershell
npm run migrate
```

As migrations sao majoritariamente aditivas: novas tabelas, novas colunas e constraints idempotentes.

## Validacao pos-deploy

Teste imediatamente:

```text
/health
/login
/superadmin
/api/leads com x-api-key antigo
/{CLINIC_SLUG}/agendar
/webhook/evolution com payload atual
```

Ou rode o smoke test automatizado:

```powershell
cd D:\Trab\laco\backend
$env:SMOKE_BASE_URL="https://SEU-DOMINIO"
$env:SMOKE_API_SECRET="valor-do-API_SECRET"
$env:SMOKE_SUPERADMIN_EMAIL="email-superadmin"
$env:SMOKE_SUPERADMIN_PASSWORD="senha-superadmin"
$env:SMOKE_CLINIC_SLUG="bella-estetica"
npm run smoke:prod
```

Para testar local, com o servidor ja rodando em `npm run start:local`:

```powershell
cd D:\Trab\laco\backend
npm run smoke:local
```

O esperado no primeiro deploy:

- CRM antigo segue usando `x-api-key`.
- Portal publico segue funcionando.
- Superadmin ja permite login com `SUPERADMIN_EMAIL`.
- Novas rotas existem, mas billing pode responder "Stripe nao configurado" se as chaves nao estiverem setadas.

## Ativar SaaS gradualmente

Depois que o atual estiver validado:

1. Criar uma clinica teste pelo `/superadmin`.
2. Testar login JWT dessa clinica.
3. Testar onboarding.
4. Testar portal da clinica teste.
5. Configurar Stripe test mode.
6. Configurar Resend.

So quando todas as clinicas existentes tiverem onboarding/status ajustados, mude:

```env
ENFORCE_ONBOARDING_GATE=true
```

## Rollback rapido

Se algo quebrar:

1. Volte o deploy anterior no Railway.
2. Nao precisa reverter schema imediatamente, porque as alteracoes sao aditivas.
3. Mantenha `API_SECRET` e `CLINIC_SLUG` como estavam.

## Riscos conhecidos

- Se `SUPERADMIN_PASSWORD` mudar e `npm run migrate` rodar de novo, a senha do superadmin e atualizada para o valor da env.
- Se `ENFORCE_ONBOARDING_GATE=true` antes de preencher `onboarding_completed_at`, o portal publico pode bloquear clinicas antigas.
- Se remover `WEBHOOK_DEFAULT_CLINIC_SLUG` antes da Evolution enviar `clinic_slug`, leads do webhook podem deixar de ser vinculados.
