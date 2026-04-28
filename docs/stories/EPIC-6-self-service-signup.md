# EPIC 6 â€” Self-Service Signup

**Status:** Ready for Review  
**Prioridade:** P2 â€” Escala sem operaÃ§Ã£o manual  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Qualquer clÃ­nica se cadastra sozinha em `astrai.com.br/cadastro`, sem precisar que o superadmin crie a conta manualmente. Fluxo completo: cadastro â†’ checkout â†’ wizard â†’ portal no ar.

## Contexto

EPIC 3 permite ao superadmin criar clÃ­nicas manualmente. Este epic torna isso desnecessÃ¡rio â€” o cliente faz tudo sozinho. Mesmo wizard (EPIC 4), mesmo checkout (EPIC 5).

## Fluxo completo

```
1. Cliente acessa astrai.com.br/cadastro
2. Preenche: nome da clÃ­nica, email, senha, confirmar senha
3. Sistema cria: clinic + user admin + slug automÃ¡tico
4. Redireciona para /checkout (R$ 1,00 â€” EPIC 5)
5. Pagamento confirmado â†’ /onboarding (wizard â€” EPIC 4)
6. Wizard completo â†’ /painel (CRM funcionando)

Email automÃ¡tico apÃ³s cadastro:
  - Boas-vindas com nome da clÃ­nica
  - Link para o portal de agendamento
  - Link para o CRM
  - Dica: "Compartilhe seu link com clientes agora"
```

## Acceptance Criteria

- [x] AC1: PÃ¡gina `/cadastro` pÃºblica (sem auth) com form: nome da clÃ­nica, email, senha, confirmar senha
- [x] AC2: Slug auto-gerado do nome da clÃ­nica com verificaÃ§Ã£o de unicidade em tempo real (debounce 500ms)
- [x] AC3: Se slug jÃ¡ existe â†’ sugerir alternativa (`mana-beauty-2`, `mana-beauty-sp`)
- [x] AC4: `POST /api/auth/register` cria clinic + user atomicamente (transaÃ§Ã£o)
- [x] AC5: Senha mÃ­nimo 8 caracteres, com indicador de forÃ§a visual
- [x] AC6: Email de boas-vindas enviado automaticamente (template HTML)
- [x] AC7: ProteÃ§Ã£o contra spam: rate limit 3 cadastros/hora por IP
- [x] AC8: ApÃ³s cadastro â†’ redireciona para checkout (nÃ£o para o CRM direto â€” billing obrigatÃ³rio)
- [x] AC9: PÃ¡gina de cadastro responsiva e mobile-first
- [x] AC10: Link "JÃ¡ tenho conta â†’ Entrar" na pÃ¡gina de cadastro

## Emails automÃ¡ticos

```
Trigger: cadastro confirmado + pagamento R$1 OK
Para: email do admin
Assunto: "Bem-vinda ao LaÃ§o! Seu portal estÃ¡ quase pronto ðŸŽ‰"
ConteÃºdo:
  - Nome da clÃ­nica
  - Link do portal: astrai.com.br/{slug}/agendar
  - Link do CRM: astrai.com.br/painel
  - CTA: "Completar configuraÃ§Ã£o"

ServiÃ§o de email: Resend (simples, preÃ§o acessÃ­vel, boa DX)
VariÃ¡vel: RESEND_API_KEY
```

## Arquivos impactados

- `backend/public/cadastro/index.html` â€” novo
- `backend/src/routes/auth.js` â€” adicionar `POST /register`
- `backend/src/routes/email.js` â€” novo (templates + envio via Resend)
- `backend/src/index.js` â€” rota `/cadastro`

## DependÃªncias

- **Bloqueado por:** EPIC 2 (auth), EPIC 4 (wizard), EPIC 5 (checkout)
- **Bloqueia:** Nenhum â€” este Ã© o epic final da fundaÃ§Ã£o SaaS

## Notas tÃ©cnicas

- Slug collision: gerar sufixo numÃ©rico automaticamente se necessÃ¡rio
- TransaÃ§Ã£o atÃ´mica: se criar clinic falhar apÃ³s criar user â†’ rollback ambos
- Resend free tier: 3.000 emails/mÃªs â€” suficiente para early stage

## Dev Agent Record

### File List

- `backend/public/cadastro/index.html`
- `backend/src/routes/auth.js`
- `backend/src/routes/email.js`
- `backend/src/index.js`
- `backend/src/lib/tenant.js`
- `docs/stories/EPIC-6-self-service-signup.md`
