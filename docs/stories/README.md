# LaÃ§o SaaS â€” Roadmap de Epics

**Produto:** LaÃ§o â€” Plataforma SaaS para clÃ­nicas de estÃ©tica  
**Modelo:** R$ 1,00 trial 30 dias â†’ R$ 110,00/mÃªs  
**Meta:** 20+ clientes ativos em 60 dias

## Epics

| # | Epic | Prioridade | Status | Semana |
|---|------|-----------|--------|--------|
| 1 | [Multi-tenant FundaÃ§Ã£o](EPIC-1-multitenant-fundacao.md) | P0 ðŸ”´ | Ready for Review | 1â€“2 |
| 2 | [Auth Real JWT + Roles](EPIC-2-auth-jwt.md) | P0 ðŸ”´ | Ready for Review | 1â€“2 |
| 3 | [Superadmin + Onboarding Assistido](EPIC-3-superadmin.md) | P1 ðŸŸ  | Ready for Review | 3 |
| 4 | [Wizard de AtivaÃ§Ã£o](EPIC-4-wizard-ativacao.md) | P1 ðŸŸ  | Ready for Review | 4 |
| 5 | [Billing Stripe](EPIC-5-billing-stripe.md) | P1 ðŸŸ  | Ready for Review | 5â€“6 |
| 6 | [Self-Service Signup](EPIC-6-self-service-signup.md) | P2 ðŸŸ¡ | Ready for Review | 7â€“8 |

## DependÃªncias

```
EPIC 1 â”€â”€â”
          â”œâ”€â”€â–¶ EPIC 2 â”€â”€â”
                         â”œâ”€â”€â–¶ EPIC 3 â”€â”€â–¶ (vocÃª opera)
                         â”œâ”€â”€â–¶ EPIC 4 â”€â”€â–¶ EPIC 6
                         â””â”€â”€â–¶ EPIC 5 â”€â”€â–¶ EPIC 6
```

## Marcos

| Semana | O que estÃ¡ disponÃ­vel |
|--------|----------------------|
| 2 | Multi-tenant + auth funcionando internamente |
| 3 | VocÃª cria clÃ­nicas pelo superadmin |
| 4 | Onboarding wizard mastigado |
| 6 | CobranÃ§a automÃ¡tica ativa |
| 8 | ClÃ­nicas se cadastram sozinhas |
