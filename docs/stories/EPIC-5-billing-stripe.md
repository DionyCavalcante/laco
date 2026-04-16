# EPIC 5 — Billing & Planos (Stripe)

**Status:** Draft  
**Prioridade:** P1 — Monetização  
**Owner:** @dev  
**Estimativa:** 1.5 semanas

## Objetivo

Cobrar R$ 1,00 na ativação (captura cartão + inicia trial 30 dias) e converter automaticamente para R$ 110,00/mês ao fim do trial. Suspender automaticamente em caso de inadimplência.

## Modelo de pricing

```
Trial:      R$ 1,00  × 1 pagamento   → 30 dias de acesso
Mensalidade: R$110,00 × recorrente   → começa no dia 31
Cancelamento: acesso até fim do período pago
Inadimplência: 3 tentativas → suspende conta
```

## Fluxo de cobrança

```
1. Clínica completa wizard (EPIC 4)
2. Redirecionada para checkout Stripe (R$ 1,00)
3. Stripe confirma pagamento → webhook → ativa clínica (status: trial)
4. Dia 31: Stripe cobra R$110 automaticamente
5. Cobrança OK → status: active
6. Cobrança falhou → 3 retries automáticos (Stripe) → status: suspended
```

## Funcionalidades

### Checkout de ativação
```
- Página dedicada: /checkout
- Stripe Elements embutido (não redireciona para Stripe hosted)
- Aceita: cartão de crédito/débito, Google Pay, Apple Pay
- PIX: apenas para mensalidade (não para R$1 — complexidade desnecessária)
- Após pagamento: redireciona para wizard ou CRM
```

### Banner de trial no CRM
```
- Barra fixa no topo: "Trial expira em X dias · Assinar plano"
- Aparece quando status = trial AND trial_ends_at < 7 dias
- Botão "Assinar" → abre portal Stripe Customer Portal
```

### Stripe Customer Portal
```
- Cliente gerencia: trocar cartão, ver faturas, cancelar
- Acessível via botão no CRM da clínica
- URL: POST /api/billing/portal → retorna URL do portal Stripe
```

### Webhooks Stripe
```
payment_intent.succeeded        → ativa trial (R$1)
invoice.payment_succeeded       → atualiza status para active
invoice.payment_failed          → incrementa contador de falhas
customer.subscription.deleted   → cancela conta
```

## Acceptance Criteria

- [ ] AC1: Checkout de R$ 1,00 com Stripe Elements embutido
- [ ] AC2: Webhook `payment_intent.succeeded` → `clinics.status = 'trial'`, `trial_ends_at = NOW() + 30 days`
- [ ] AC3: Subscription Stripe criada automaticamente para cobrar R$110/mês após 30 dias
- [ ] AC4: Webhook `invoice.payment_succeeded` → `clinics.status = 'active'`
- [ ] AC5: Webhook `invoice.payment_failed` após 3 tentativas → `clinics.status = 'suspended'`
- [ ] AC6: Conta suspensa: login bloqueado com página "Pagamento pendente · Atualizar cartão"
- [ ] AC7: Banner de trial visível nos últimos 7 dias com countdown
- [ ] AC8: `GET /api/billing/portal` retorna URL do Stripe Customer Portal (sessão única)
- [ ] AC9: Superadmin pode estender trial e ver status de cobrança de cada clínica
- [ ] AC10: Todos os eventos Stripe logados em `stripe_events` para auditoria
- [ ] AC11: Variáveis `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` via Railway env vars

## Schema adicional

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE TABLE stripe_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    TEXT UNIQUE NOT NULL,  -- Stripe event ID (idempotência)
  type        TEXT NOT NULL,
  clinic_id   UUID REFERENCES clinics(id),
  payload     JSONB,
  processed   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

## Arquivos impactados

- `backend/src/routes/billing.js` — novo
- `backend/src/routes/webhook.js` — adicionar handlers Stripe
- `backend/public/checkout/index.html` — novo
- `backend/src/index.js` — registrar `/api/billing` e `/checkout`
- `backend/src/db/migrate.js` — stripe_customer_id, stripe_subscription_id, stripe_events

## Dependências

- **Bloqueado por:** EPIC 2 (auth), EPIC 3 (status da clínica), EPIC 4 (wizard dispara checkout)
- **Bloqueia:** EPIC 6 (self-service precisa do checkout)

## Notas técnicas

- Stripe test mode durante desenvolvimento → production key só antes do go-live
- Idempotência nos webhooks obrigatória (verificar `stripe_events.event_id` antes de processar)
- Webhook signature verification obrigatória (`STRIPE_WEBHOOK_SECRET`)
