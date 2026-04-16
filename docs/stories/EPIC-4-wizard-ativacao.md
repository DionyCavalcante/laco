# EPIC 4 â€” Wizard de AtivaÃ§Ã£o (Onboarding)

**Status:** Ready for Review  
**Prioridade:** P1 â€” ExperiÃªncia do cliente, reduz trabalho de suporte  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Guiar cada nova clÃ­nica pelos 4 passos mÃ­nimos para ter o portal de agendamento funcionando. Bloqueante: portal sÃ³ vai ao ar apÃ³s wizard completo.

## Contexto

"Deixar mastigado" â€” tanto para o superadmin criar a clÃ­nica em 5 min, quanto para o cliente fazer sozinho no self-service (EPIC 6). O mesmo wizard serve os dois fluxos.

## Fluxo do Wizard

```
Entrada: primeira vez que admin loga na clÃ­nica â†’ redireciona para /onboarding

Passo 1 â€” Dados da clÃ­nica
  - Nome (preenchido pelo superadmin, confirmado pelo cliente)
  - Telefone WhatsApp da clÃ­nica
  - Foto de perfil (opcional)
  â†’ Salva: PATCH /api/settings/clinic

Passo 2 â€” Primeiro procedimento
  - Nome do procedimento
  - PreÃ§o com desconto (R$)
  - PreÃ§o normal/riscado (R$) â€” opcional
  - DuraÃ§Ã£o (minutos)
  â†’ Salva: POST /api/procedures

Passo 3 â€” HorÃ¡rios de atendimento
  - Grade visual: Seg-Sex com horÃ¡rios padrÃ£o 09:00â€“18:00
  - Toggle por dia para fechar
  â†’ Salva: POST /api/hours

Passo 4 â€” Portal pronto!
  - AnimaÃ§Ã£o de sucesso
  - Link do portal em destaque com botÃ£o "Copiar"
  - BotÃ£o "Compartilhar no WhatsApp" com mensagem pronta
  - BotÃ£o "Acessar meu painel" â†’ vai para o CRM
```

## Acceptance Criteria

- [x] AC1: ClÃ­nica nova sem wizard completo Ã© redirecionada para `/onboarding` ao logar
- [x] AC2: Progresso salvo a cada passo â€” se sair no meio, retoma do passo incompleto
- [x] AC3: Barra de progresso visual mostra passo atual (1/4, 2/4, 3/4, 4/4)
- [x] AC4: Passo 1 prÃ©-preenchido com dados inseridos pelo superadmin (nome da clÃ­nica)
- [x] AC5: ValidaÃ§Ã£o inline em cada campo antes de avanÃ§ar
- [x] AC6: Passo 4 exibe URL correta: `{origin}/{slug}/agendar`
- [x] AC7: BotÃ£o WhatsApp abre `wa.me` com mensagem: "OlÃ¡! JÃ¡ tenho meu portal de agendamento online: {link}"
- [x] AC8: Campo `onboarding_completed_at` na tabela clinics atualizado ao concluir passo 4
- [x] AC9: Superadmin pode visualizar em qual passo cada clÃ­nica parou (EPIC 3 dashboard)
- [x] AC10: Design mobile-first â€” clientes vÃ£o completar pelo celular

## Schema adicional

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
  -- 0=nÃ£o iniciado, 1=dados, 2=procedimento, 3=horÃ¡rios, 4=completo
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

## Arquivos impactados

- `backend/public/onboarding/index.html` â€” novo wizard
- `backend/src/routes/onboarding.js` â€” novo (salvar progresso por passo)
- `backend/src/index.js` â€” rota `/onboarding`
- `backend/src/db/migrate.js` â€” colunas onboarding_step, onboarding_completed_at

## DependÃªncias

- **Bloqueado por:** EPIC 2 (auth para saber qual clÃ­nica estÃ¡ onboardando)
- **Bloqueia:** EPIC 6 (self-service usa o mesmo wizard)
- **Usado por:** EPIC 3 (superadmin dispara o wizard ao criar clÃ­nica)

## Dev Agent Record

### File List

- `backend/public/onboarding/index.html`
- `backend/src/routes/onboarding.js`
- `backend/src/index.js`
- `backend/src/db/migrate.js`
- `backend/src/routes/settings.js`
- `backend/src/routes/procedures.js`
- `backend/src/routes/hours.js`
