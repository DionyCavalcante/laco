# Laço — Documentação da API

Base URL: `https://astrai.com.br`

## Autenticação

Todas as rotas `/api/*` exigem o header abaixo, **exceto** as rotas marcadas como Público:

```
x-api-key: SUA_API_SECRET
```

---

## Leads (Clientes)

### Listar leads
```
GET /api/leads
```

**Query params opcionais:**

| Parâmetro | Tipo | Exemplo | Descrição |
|-----------|------|---------|-----------|
| `status` | string | `link_sent` | Filtra por status |
| `search` | string | `joana` | Busca por nome ou telefone |
| `date_from` | string | `2025-01-01` | Data de cadastro a partir de |
| `date_to` | string | `2025-01-31` | Data de cadastro até |

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "Joana Silva",
    "phone": "11999999999",
    "source": "whatsapp",
    "status": "link_sent",
    "procedure_viewed": "uuid-do-procedimento",
    "procedure_name": "Botox - Testa",
    "reject_reason": null,
    "created_at": "2025-01-15T14:30:00Z",
    "updated_at": "2025-01-15T14:30:00Z",
    "appointment_id": "uuid",
    "scheduled_at": "2025-01-20T10:00:00Z",
    "appointment_status": "confirmed"
  }
]
```

---

### Buscar um lead
```
GET /api/leads/:id
```

**Resposta:** mesmo objeto acima (sem campos de agendamento).

---

### Criar ou atualizar lead (upsert por telefone)
```
POST /api/leads
Content-Type: application/json
```

> Se o telefone já existir, atualiza nome e status. Ideal para usar no n8n após enviar o link no WhatsApp.

**Body:**
```json
{
  "name": "Joana Silva",
  "phone": "11999999999",
  "source": "whatsapp",
  "status": "link_sent"
}
```

| Campo | Obrigatório | Padrão | Descrição |
|-------|-------------|--------|-----------|
| `name` | ✅ | — | Nome do cliente |
| `phone` | ✅ | — | Telefone (só dígitos, com DDD) |
| `source` | ❌ | `manual` | Origem: `whatsapp`, `manual`, `link` |
| `status` | ❌ | `link_sent` | Status inicial |

**Resposta `201`:**
```json
{
  "id": "uuid",
  "name": "Joana Silva",
  "phone": "11999999999",
  "source": "whatsapp",
  "status": "link_sent",
  "created_at": "2025-01-15T14:30:00Z"
}
```

---

### Atualizar status do lead
```
PATCH /api/leads/:id/status
Content-Type: application/json
```

**Body:**
```json
{
  "status": "link_sent",
  "procedure_viewed": "uuid-do-procedimento",
  "reject_reason": null
}
```

| Campo | Obrigatório | Valores aceitos |
|-------|-------------|----------------|
| `status` | ✅ | `captado` · `link_sent` · `scheduled` · `rejected` |
| `procedure_viewed` | ❌ | UUID do procedimento |
| `reject_reason` | ❌ | Texto livre |

**Tabela de status:**

| Status | Significado |
|--------|-------------|
| `captado` | Preencheu nome/WhatsApp no portal |
| `link_sent` | Clínica enviou o link via WhatsApp |
| `scheduled` | Confirmou agendamento |
| `rejected` | Recusou a oferta |

**Resposta:** objeto do lead atualizado.

---

### Estatísticas dos leads
```
GET /api/leads/stats
```

**Resposta:**
```json
{
  "total": "42",
  "scheduled": "10",
  "rejected": "5",
  "link_sent": "20",
  "new_leads": "7",
  "valor_em_aberto": "150000",
  "valor_agendado": "80000",
  "valor_realizado": "320000"
}
```

> Valores financeiros em **centavos** (dividir por 100 para reais).

---

### Excluir lead
```
DELETE /api/leads/:id
```

> Remove também todos os agendamentos vinculados.

**Resposta:**
```json
{ "ok": true }
```

---

## Agendamentos

### Listar agendamentos
```
GET /api/appointments
```

**Query params opcionais:**

| Parâmetro | Exemplo | Descrição |
|-----------|---------|-----------|
| `status` | `confirmed` | Filtra por status |
| `lead_id` | `uuid` | Filtra por cliente |
| `date` | `2025-01-20` | Filtra por data (fuso: America/Sao_Paulo) |

**Resposta:**
```json
[
  {
    "id": "uuid",
    "lead_id": "uuid",
    "lead_name": "Joana Silva",
    "lead_phone": "11999999999",
    "procedure_id": "uuid",
    "procedure_name": "Botox - Testa",
    "duration": 35,
    "price": 45000,
    "scheduled_at": "2025-01-20T13:00:00Z",
    "status": "confirmed",
    "source": "system",
    "notes": null,
    "created_at": "2025-01-15T14:30:00Z"
  }
]
```

---

### Atualizar status do agendamento
```
PATCH /api/appointments/:id/status
Content-Type: application/json
```

**Body:**
```json
{ "status": "confirmed" }
```

| Status | Significado |
|--------|-------------|
| `pending` | Aguardando confirmação |
| `confirmed` | Confirmado |
| `done` | Realizado |
| `cancelled` | Cancelado |

**Resposta:** objeto do agendamento atualizado.

---

### Ver horários disponíveis
```
GET /api/appointments/slots?date=2025-01-20&procedure_id=uuid
```

| Parâmetro | Obrigatório | Descrição |
|-----------|-------------|-----------|
| `date` | ✅ | Data no formato `YYYY-MM-DD` |
| `procedure_id` | ❌ | UUID do procedimento (para calcular duração certa) |

**Resposta:**
```json
{
  "slots": [
    { "time": "09:00", "taken": false },
    { "time": "09:30", "taken": true },
    { "time": "10:00", "taken": false }
  ]
}
```

> Se o dia estiver fechado: `{ "slots": [], "reason": "closed" }`

---

### Estatísticas de agendamentos
```
GET /api/appointments/stats
```

**Resposta:**
```json
{
  "total": "30",
  "confirmed": "8",
  "pending": "5",
  "done": "15",
  "from_system": "28",
  "valor_agendado": "120000",
  "valor_realizado": "480000",
  "valor_perdido": "30000"
}
```

---

## Procedimentos

### Listar procedimentos
```
GET /api/procedures
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "name": "Botox - Testa",
    "duration": 35,
    "price": 45000,
    "price_old": 60000,
    "payment_note": "Parcelamos em até 3x",
    "video_url": "https://youtube.com/...",
    "active": true,
    "sort_order": 1,
    "reveal_delay": 5
  }
]
```

> `price` e `price_old` em **centavos**.

---

### Criar procedimento
```
POST /api/procedures
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Botox - Testa",
  "duration": 35,
  "price": 45000,
  "price_old": 60000,
  "payment_note": "Parcelamos em até 3x",
  "video_url": "https://youtube.com/..."
}
```

| Campo | Obrigatório | Tipo | Descrição |
|-------|-------------|------|-----------|
| `name` | ✅ | string | Nome do procedimento |
| `duration` | ✅ | integer | Duração em minutos |
| `price` | ✅ | integer | Preço em centavos |
| `price_old` | ❌ | integer | Preço antigo em centavos |
| `payment_note` | ❌ | string | Nota de pagamento |
| `video_url` | ❌ | string | Link do YouTube |

---

### Atualizar procedimento
```
PATCH /api/procedures/:id
Content-Type: application/json
```

> Envie apenas os campos que deseja alterar (PATCH parcial).

**Body (exemplo):**
```json
{
  "price": 50000,
  "active": false
}
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | string | Nome |
| `duration` | integer | Duração em minutos |
| `price` | integer | Preço em centavos |
| `price_old` | integer | Preço antigo em centavos |
| `payment_note` | string | Nota de pagamento |
| `video_url` | string | Link YouTube |
| `active` | boolean | Visível no portal |
| `sort_order` | integer | Ordem de exibição |
| `reveal_delay` | integer | Segundos antes de revelar preço |

---

## Profissionais

> Profissionais são as pessoas que executam os procedimentos. Um slot só aparece disponível se pelo menos 1 profissional vinculado ao procedimento estiver livre naquele horário. Se nenhum profissional estiver vinculado, o sistema usa o comportamento legado (bloqueia por clínica).

### Listar profissionais
```
GET /api/professionals
```

**Resposta:**
```json
[
  {
    "id": "uuid",
    "clinic_id": "uuid",
    "name": "Ana Paula",
    "active": true,
    "procedure_count": 3,
    "created_at": "2025-01-15T14:30:00Z"
  }
]
```

---

### Criar profissional
```
POST /api/professionals
Content-Type: application/json
```

**Body:**
```json
{ "name": "Ana Paula" }
```

---

### Atualizar profissional
```
PATCH /api/professionals/:id
Content-Type: application/json
```

**Body (campos opcionais):**
```json
{ "name": "Ana Paula Costa", "active": false }
```

---

### Horários do profissional
```
GET /api/professionals/:id/hours
```

> Se o profissional não tiver horários próprios configurados, retorna os horários da clínica como default.

**Resposta:** array de 7 dias (mesmo formato de `GET /api/hours`).

---

### Salvar horários do profissional
```
PUT /api/professionals/:id/hours
Content-Type: application/json
```

> Substitui todos os horários. Envie sempre os 7 dias. Dias com `open: false` bloqueiam o profissional naquele dia — ele não aparece disponível para nenhum procedimento.

**Body:** mesmo array de `GET /api/hours`.

---

### Procedimentos vinculados ao profissional
```
GET /api/professionals/:id/procedures
```

**Resposta:**
```json
[
  { "id": "uuid", "name": "Cílios", "duration": 90, "active": true }
]
```

---

### Definir procedimentos do profissional
```
PUT /api/professionals/:id/procedures
Content-Type: application/json
```

> Substitui todos os vínculos de uma vez.

**Body:**
```json
{ "procedure_ids": ["uuid1", "uuid2"] }
```

---

### Profissionais de um procedimento
```
GET /api/professionals/by-procedure/:procedureId
```

---

### Definir profissionais de um procedimento
```
PUT /api/professionals/by-procedure/:procedureId
Content-Type: application/json
```

**Body:**
```json
{ "professional_ids": ["uuid1", "uuid2"] }
```

---

## Regra de disponibilidade de slots

A lógica de slots (`GET /api/appointments/slots` e `GET /api/portal/:slug/slots`) segue esta hierarquia:

| Situação | Comportamento |
|---|---|
| Procedimento **sem** profissionais vinculados | Fallback: bloqueia por qualquer agendamento da clínica (legado) |
| Profissional **sem** horários próprios | Usa `business_hours` da clínica como referência |
| Profissional com `open: false` no dia | Não conta como disponível naquele dia |
| Slot fora do horário do profissional | Não conta como disponível |
| Profissional com conflito de agenda | Não conta como disponível |

Um slot é exibido como `taken: false` somente se **ao menos 1** profissional vinculado passar em todos os critérios acima.

Ao criar um agendamento (`POST /api/portal/:slug/book`), o sistema atribui automaticamente o primeiro profissional disponível e salva o `professional_id` no registro do agendamento.

---

## Horários de Atendimento

### Consultar horários
```
GET /api/hours
```

**Resposta:**
```json
[
  { "day_of_week": 0, "open": false, "start_time": "09:00", "end_time": "18:00" },
  { "day_of_week": 1, "open": true,  "start_time": "09:00", "end_time": "18:00" },
  { "day_of_week": 2, "open": true,  "start_time": "09:00", "end_time": "18:00" },
  { "day_of_week": 3, "open": true,  "start_time": "09:00", "end_time": "18:00" },
  { "day_of_week": 4, "open": true,  "start_time": "09:00", "end_time": "18:00" },
  { "day_of_week": 5, "open": true,  "start_time": "09:00", "end_time": "17:00" },
  { "day_of_week": 6, "open": false, "start_time": "09:00", "end_time": "13:00" }
]
```

> `day_of_week`: 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

---

### Salvar horários
```
POST /api/hours
Content-Type: application/json
```

> Substitui todos os horários. Envie sempre os 7 dias.

**Body:** mesmo array da resposta acima.

---

## Configurações do Portal

### Consultar configurações
```
GET /api/settings
```

**Resposta:**
```json
{
  "reveal_delay": 5,
  "show_price": true,
  "greeting_msg": "Olá! Escolha o procedimento que te interessa:"
}
```

---

### Salvar configurações
```
POST /api/settings
Content-Type: application/json
```

**Body:**
```json
{
  "reveal_delay": 8,
  "show_price": true,
  "greeting_msg": "Escolha o procedimento que te interessa:"
}
```

---

### Consultar dados da clínica
```
GET /api/settings/clinic
```

**Resposta:**
```json
{ "name": "Clínica Bella Estética", "slug": "bella-estetica" }
```

---

### Atualizar nome da clínica
```
PATCH /api/settings/clinic
Content-Type: application/json
```

**Body:**
```json
{ "name": "Bella Estética" }
```

---

## Portal (Público — sem autenticação)

### Dados da clínica + procedimentos ativos
```
GET /api/portal/:slug
```

---

### Horários disponíveis (para o cliente agendar)
```
GET /api/portal/:slug/slots?date=2025-01-20&procedure_id=uuid
```

---

### Registrar lead (cliente preencheu nome/WhatsApp)
```
POST /api/portal/:slug/identify
Content-Type: application/json
```

**Body:**
```json
{ "name": "Joana Silva", "phone": "11999999999" }
```

**Resposta:**
```json
{ "ok": true, "lead_id": "uuid" }
```

---

### Rastrear procedimento visualizado
```
POST /api/portal/:slug/track
Content-Type: application/json
```

**Body:**
```json
{ "lead_id": "uuid", "procedure_id": "uuid" }
```

---

### Finalizar agendamento
```
POST /api/portal/:slug/book
Content-Type: application/json
```

**Body — agendamento:**
```json
{
  "lead_id": "uuid",
  "name": "Joana Silva",
  "phone": "11999999999",
  "procedure_id": "uuid",
  "date": "2025-01-20",
  "time": "10:00"
}
```

**Body — recusa:**
```json
{
  "lead_id": "uuid",
  "name": "Joana Silva",
  "phone": "11999999999",
  "procedure_id": "uuid",
  "reject_reason": "Preço acima do esperado"
}
```

---

## Webhook (Evolution / WhatsApp)

```
POST /webhook/evolution
```

Recebe eventos da Evolution API automaticamente. Não requer autenticação.

---

## Fluxo recomendado no n8n

### Ao enviar link de agendamento no WhatsApp:
```
POST /api/leads
{ "name": "Joana", "phone": "11999999999", "source": "whatsapp", "status": "link_sent" }
```

### Ao receber confirmação de agendamento (webhook ou polling):
```
GET /api/leads?status=scheduled
```

### Ao confirmar presença:
```
PATCH /api/appointments/:id/status
{ "status": "confirmed" }
```

### Ao marcar como realizado:
```
PATCH /api/appointments/:id/status
{ "status": "done" }
```

### Para ver agenda do dia:
```
GET /api/appointments?date=2025-01-20
```

---

## Erros

Todas as rotas retornam erros no formato:

```json
{ "error": "Descrição do erro" }
```

| Código | Significado |
|--------|-------------|
| `400` | Dados inválidos ou faltando |
| `401` | API key ausente ou incorreta |
| `404` | Recurso não encontrado |
| `500` | Erro interno do servidor |
