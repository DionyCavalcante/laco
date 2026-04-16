# Laço SaaS — Roadmap de Epics

**Produto:** Laço — Plataforma SaaS para clínicas de estética  
**Modelo:** R$ 1,00 trial 30 dias → R$ 110,00/mês  
**Meta:** 20+ clientes ativos em 60 dias

## Epics

| # | Epic | Prioridade | Status | Semana |
|---|------|-----------|--------|--------|
| 1 | [Multi-tenant Fundação](EPIC-1-multitenant-fundacao.md) | P0 🔴 | Draft | 1–2 |
| 2 | [Auth Real JWT + Roles](EPIC-2-auth-jwt.md) | P0 🔴 | Draft | 1–2 |
| 3 | [Superadmin + Onboarding Assistido](EPIC-3-superadmin.md) | P1 🟠 | Draft | 3 |
| 4 | [Wizard de Ativação](EPIC-4-wizard-ativacao.md) | P1 🟠 | Draft | 4 |
| 5 | [Billing Stripe](EPIC-5-billing-stripe.md) | P1 🟠 | Draft | 5–6 |
| 6 | [Self-Service Signup](EPIC-6-self-service-signup.md) | P2 🟡 | Draft | 7–8 |

## Dependências

```
EPIC 1 ──┐
          ├──▶ EPIC 2 ──┐
                         ├──▶ EPIC 3 ──▶ (você opera)
                         ├──▶ EPIC 4 ──▶ EPIC 6
                         └──▶ EPIC 5 ──▶ EPIC 6
```

## Marcos

| Semana | O que está disponível |
|--------|----------------------|
| 2 | Multi-tenant + auth funcionando internamente |
| 3 | Você cria clínicas pelo superadmin |
| 4 | Onboarding wizard mastigado |
| 6 | Cobrança automática ativa |
| 8 | Clínicas se cadastram sozinhas |
