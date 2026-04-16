# EPIC 6 — Self-Service Signup

**Status:** Draft  
**Prioridade:** P2 — Escala sem operação manual  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Qualquer clínica se cadastra sozinha em `laco.app/cadastro`, sem precisar que o superadmin crie a conta manualmente. Fluxo completo: cadastro → checkout → wizard → portal no ar.

## Contexto

EPIC 3 permite ao superadmin criar clínicas manualmente. Este epic torna isso desnecessário — o cliente faz tudo sozinho. Mesmo wizard (EPIC 4), mesmo checkout (EPIC 5).

## Fluxo completo

```
1. Cliente acessa laco.app/cadastro
2. Preenche: nome da clínica, email, senha, confirmar senha
3. Sistema cria: clinic + user admin + slug automático
4. Redireciona para /checkout (R$ 1,00 — EPIC 5)
5. Pagamento confirmado → /onboarding (wizard — EPIC 4)
6. Wizard completo → /painel (CRM funcionando)

Email automático após cadastro:
  - Boas-vindas com nome da clínica
  - Link para o portal de agendamento
  - Link para o CRM
  - Dica: "Compartilhe seu link com clientes agora"
```

## Acceptance Criteria

- [ ] AC1: Página `/cadastro` pública (sem auth) com form: nome da clínica, email, senha, confirmar senha
- [ ] AC2: Slug auto-gerado do nome da clínica com verificação de unicidade em tempo real (debounce 500ms)
- [ ] AC3: Se slug já existe → sugerir alternativa (`mana-beauty-2`, `mana-beauty-sp`)
- [ ] AC4: `POST /api/auth/register` cria clinic + user atomicamente (transação)
- [ ] AC5: Senha mínimo 8 caracteres, com indicador de força visual
- [ ] AC6: Email de boas-vindas enviado automaticamente (template HTML)
- [ ] AC7: Proteção contra spam: rate limit 3 cadastros/hora por IP
- [ ] AC8: Após cadastro → redireciona para checkout (não para o CRM direto — billing obrigatório)
- [ ] AC9: Página de cadastro responsiva e mobile-first
- [ ] AC10: Link "Já tenho conta → Entrar" na página de cadastro

## Emails automáticos

```
Trigger: cadastro confirmado + pagamento R$1 OK
Para: email do admin
Assunto: "Bem-vinda ao Laço! Seu portal está quase pronto 🎉"
Conteúdo:
  - Nome da clínica
  - Link do portal: laco.app/{slug}/agendar
  - Link do CRM: laco.app/painel
  - CTA: "Completar configuração"

Serviço de email: Resend (simples, preço acessível, boa DX)
Variável: RESEND_API_KEY
```

## Arquivos impactados

- `backend/public/cadastro/index.html` — novo
- `backend/src/routes/auth.js` — adicionar `POST /register`
- `backend/src/routes/email.js` — novo (templates + envio via Resend)
- `backend/src/index.js` — rota `/cadastro`

## Dependências

- **Bloqueado por:** EPIC 2 (auth), EPIC 4 (wizard), EPIC 5 (checkout)
- **Bloqueia:** Nenhum — este é o epic final da fundação SaaS

## Notas técnicas

- Slug collision: gerar sufixo numérico automaticamente se necessário
- Transação atômica: se criar clinic falhar após criar user → rollback ambos
- Resend free tier: 3.000 emails/mês — suficiente para early stage
