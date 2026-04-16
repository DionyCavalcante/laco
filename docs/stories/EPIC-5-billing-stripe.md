# EPIC 5 â€” Billing & Planos (Stripe)

**Status:** Ready for Review  
**Prioridade:** P1 â€” MonetizaÃ§Ã£o  
**Owner:** @dev  
**Estimativa:** 1.5 semanas

## Objetivo

Cobrar R$ 1,00 na ativaÃ§Ã£o (captura cartÃ£o + inicia trial 30 dias) e converter automaticamente para R$ 110,00/mÃªs ao fim do trial. Suspender automaticamente em caso de inadimplÃªncia.

## Modelo de pricing

```
Trial:      R$ 1,00  Ã— 1 pagamento   â†’ 30 dias de acesso
Mensalidade: R$110,00 Ã— recorrente   â†’ comeÃ§a no dia 31
Cancelamento: acesso atÃ© fim do perÃ­odo pago
InadimplÃªncia: 3 tentativas â†’ suspende conta
```

## Fluxo de cobranÃ§a

```
1. ClÃ­nica completa wizard (EPIC 4)
2. Redirecionada para checkout Stripe (R$ 1,00)
3. Stripe confirma pagamento â†’ webhook â†’ ativa clÃ­nica (status: trial)
4. Dia 31: Stripe cobra R$110 automaticamente
5. CobranÃ§a OK â†’ status: active
6. CobranÃ§a falhou â†’ 3 retries automÃ¡ticos (Stripe) â†’ status: suspended
```

## Funcionalidades

### Checkout de ativaÃ§Ã£o
```
- PÃ¡gina dedicada: /checkout
- Stripe Elements embutido (nÃ£o redireciona para Stripe hosted)
- Aceita: cartÃ£o de crÃ©dito/dÃ©bito, Google Pay, Apple Pay
- PIX: apenas para mensalidade (nÃ£o para R$1 â€” complexidade desnecessÃ¡ria)
- ApÃ³s pagamento: redireciona para wizard ou CRM
```

### Banner de trial no CRM
```
- Barra fixa no topo: "Trial expira em X dias Â· Assinar plano"
- Aparece quando status = trial AND trial_ends_at < 7 dias
- BotÃ£o "Assinar" â†’ abre portal Stripe Customer Portal
```

### Stripe Customer Portal
```
- Cliente gerencia: trocar cartÃ£o, ver faturas, cancelar
- AcessÃ­vel via botÃ£o no CRM da clÃ­nica
- URL: POST /api/billing/portal â†’ retorna URL do portal Stripe
```

### Webhooks Stripe
```
payment_intent.succeeded        â†’ ativa trial (R$1)
invoice.payment_succeeded       â†’ atualiza status para active
invoice.payment_failed          â†’ incrementa contador de falhas
customer.subscription.deleted   â†’ cancela conta
```

## Acceptance Criteria

- [x] AC1: Checkout de R$ 1,00 com Stripe Elements embutido
- [x] AC2: Webhook `payment_intent.succeeded` â†’ `clinics.status = 'trial'`, `trial_ends_at = NOW() + 30 days`
- [x] AC3: Subscription Stripe criada automaticamente para cobrar R$110/mÃªs apÃ³s 30 dias
- [x] AC4: Webhook `invoice.payment_succeeded` â†’ `clinics.status = 'active'`
- [x] AC5: Webhook `invoice.payment_failed` apÃ³s 3 tentativas â†’ `clinics.status = 'suspended'`
- [x] AC6: Conta suspensa: login bloqueado com pÃ¡gina "Pagamento pendente Â· Atualizar cartÃ£o"
- [x] AC7: Banner de trial visÃ­vel nos Ãºltimos 7 dias com countdown
- [x] AC8: `GET /api/billing/portal` retorna URL do Stripe Customer Portal (sessÃ£o Ãºnica)
- [x] AC9: Superadmin pode estender trial e ver status de cobranÃ§a de cada clÃ­nica
- [x] AC10: Todos os eventos Stripe logados em `stripe_events` para auditoria
- [x] AC11: VariÃ¡veis `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` via Railway env vars

## Schema adicional

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE TABLE stripe_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT UNIQUE NOT NULL,  -- Stripe event ID (idempotÃªncia)
  type        TEXT NOT NULL,
  clinic_id   UUID REFERENCES clinics(id),
  payload     JSONB,
  processed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Arquivos impactados

- `backend/src/routes/billing.js` â€” novo
- `backend/src/routes/webhook.js` â€” adicionar handlers Stripe
- `backend/public/checkout/index.html` â€” novo
- `backend/src/index.js` â€” registrar `/api/billing` e `/checkout`
- `backend/src/db/migrate.js` â€” stripe_customer_id, stripe_subscription_id, stripe_events

## DependÃªncias

- **Bloqueado por:** EPIC 2 (auth), EPIC 3 (status da clÃ­nica), EPIC 4 (wizard dispara checkout)
- **Bloqueia:** EPIC 6 (self-service precisa do checkout)

## Notas tÃ©cnicas

- Stripe test mode durante desenvolvimento â†’ production key sÃ³ antes do go-live
- IdempotÃªncia nos webhooks obrigatÃ³ria (verificar `stripe_events.event_id` antes de processar)
- Webhook signature verification obrigatÃ³ria (`STRIPE_WEBHOOK_SECRET`)

## Dev Agent Record

### File List

- `backend/package.json`
- `backend/package-lock.json`
- `backend/src/routes/billing.js`
- `backend/src/routes/email.js`
- `backend/public/checkout/index.html`
- `backend/src/index.js`
- `backend/src/db/migrate.js`
