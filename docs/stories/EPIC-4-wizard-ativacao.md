# EPIC 4 — Wizard de Ativação (Onboarding)

**Status:** Draft  
**Prioridade:** P1 — Experiência do cliente, reduz trabalho de suporte  
**Owner:** @dev + @ux-design-expert  
**Estimativa:** 1 semana

## Objetivo

Guiar cada nova clínica pelos 4 passos mínimos para ter o portal de agendamento funcionando. Bloqueante: portal só vai ao ar após wizard completo.

## Contexto

"Deixar mastigado" — tanto para o superadmin criar a clínica em 5 min, quanto para o cliente fazer sozinho no self-service (EPIC 6). O mesmo wizard serve os dois fluxos.

## Fluxo do Wizard

```
Entrada: primeira vez que admin loga na clínica → redireciona para /onboarding

Passo 1 — Dados da clínica
  - Nome (preenchido pelo superadmin, confirmado pelo cliente)
  - Telefone WhatsApp da clínica
  - Foto de perfil (opcional)
  → Salva: PATCH /api/settings/clinic

Passo 2 — Primeiro procedimento
  - Nome do procedimento
  - Preço com desconto (R$)
  - Preço normal/riscado (R$) — opcional
  - Duração (minutos)
  → Salva: POST /api/procedures

Passo 3 — Horários de atendimento
  - Grade visual: Seg-Sex com horários padrão 09:00–18:00
  - Toggle por dia para fechar
  → Salva: POST /api/hours

Passo 4 — Portal pronto!
  - Animação de sucesso
  - Link do portal em destaque com botão "Copiar"
  - Botão "Compartilhar no WhatsApp" com mensagem pronta
  - Botão "Acessar meu painel" → vai para o CRM
```

## Acceptance Criteria

- [ ] AC1: Clínica nova sem wizard completo é redirecionada para `/onboarding` ao logar
- [ ] AC2: Progresso salvo a cada passo — se sair no meio, retoma do passo incompleto
- [ ] AC3: Barra de progresso visual mostra passo atual (1/4, 2/4, 3/4, 4/4)
- [ ] AC4: Passo 1 pré-preenchido com dados inseridos pelo superadmin (nome da clínica)
- [ ] AC5: Validação inline em cada campo antes de avançar
- [ ] AC6: Passo 4 exibe URL correta: `{origin}/{slug}/agendar`
- [ ] AC7: Botão WhatsApp abre `wa.me` com mensagem: "Olá! Já tenho meu portal de agendamento online: {link}"
- [ ] AC8: Campo `onboarding_completed_at` na tabela clinics atualizado ao concluir passo 4
- [ ] AC9: Superadmin pode visualizar em qual passo cada clínica parou (EPIC 3 dashboard)
- [ ] AC10: Design mobile-first — clientes vão completar pelo celular

## Schema adicional

```sql
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
  -- 0=não iniciado, 1=dados, 2=procedimento, 3=horários, 4=completo
ALTER TABLE clinics ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
```

## Arquivos impactados

- `backend/public/onboarding/index.html` — novo wizard
- `backend/src/routes/onboarding.js` — novo (salvar progresso por passo)
- `backend/src/index.js` — rota `/onboarding`
- `backend/src/db/migrate.js` — colunas onboarding_step, onboarding_completed_at

## Dependências

- **Bloqueado por:** EPIC 2 (auth para saber qual clínica está onboardando)
- **Bloqueia:** EPIC 6 (self-service usa o mesmo wizard)
- **Usado por:** EPIC 3 (superadmin dispara o wizard ao criar clínica)
