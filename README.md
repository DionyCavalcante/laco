# Laço — CRM para negócios locais

MVP de relacionamento com clientes para clínicas de estética.
Portal de autoatendimento + dashboard de gestão + webhook para Evolution (WhatsApp).

---

## Estrutura do projeto

```
laco/
├── backend/
│   ├── src/
│   │   ├── index.js                ← servidor Express (entrada) + aplica constraints no startup
│   │   ├── db/
│   │   │   ├── index.js            ← pool de conexão PostgreSQL
│   │   │   └── migrate.js          ← cria tabelas + seed inicial (rodar manualmente)
│   │   ├── middleware/
│   │   │   └── auth.js             ← proteção por API key (rotas públicas: portal, upload GET)
│   │   └── routes/
│   │       ├── leads.js            ← clientes / leads (suporta filtro date_from/date_to)
│   │       ├── appointments.js     ← agendamentos + slots
│   │       ├── procedures.js       ← procedimentos da clínica
│   │       ├── hours.js            ← horários de atendimento
│   │       ├── upload.js           ← fotos antes/depois salvas como base64 no banco
│   │       ├── settings.js         ← configurações do portal
│   │       ├── portal.js           ← API pública (cliente): identify, track, book, slots
│   │       └── webhook.js          ← eventos da Evolution
│   ├── public/                     ← gerado pelo build dos frontends (não editar manualmente)
│   │   ├── admin/                  ← build do frontend/admin
│   │   └── ...                     ← outros assets estáticos
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── agendador/                  ← Portal do cliente (/:slug/agendar) — React + Vite
│   └── admin/                      ← Admin CRM da clínica (/admin) — React + Vite
│       └── LAYOUT_ARCHITECTURE.md  ← GUIA COMPLETO de layout e componentes do admin
├── railway.toml
└── nixpacks.toml                   ← builda agendador + admin + backend no deploy
```

> **Deploy:** Sempre via `git push origin main`. O Railway builda os frontends automaticamente via `nixpacks.toml`. Nunca use `railway up` manualmente — perde o resumo do commit no histórico de deploys.

### Frontends

| Frontend | URL | Pasta | Status |
|----------|-----|-------|--------|
| Admin CRM | `/admin` | `frontend/admin/` | **Em validação — o correto, substitui o legado** |
| Portal cliente | `/:slug/agendar` | `frontend/agendador/` | Produção |
| Superadmin | `/superadmin` | (futuro) | — |
| ~~Legado~~ | `/` | `frontend/public/` | **Descontinuando** — HTML puro, não editar |

> **Frontend correto do admin:** `frontend/admin/` (React + Vite). O `frontend/public/` é legado e será removido após validação do novo admin.
>
> Para mexer no layout do Admin CRM, leia: [`frontend/admin/LAYOUT_ARCHITECTURE.md`](frontend/admin/LAYOUT_ARCHITECTURE.md)

---

## Páginas da plataforma

| URL | Descrição | Autenticação |
|-----|-----------|--------------|
| `/` | Dashboard — lista de clientes e agenda | Sim |
| `/login.html` | Login com chave de acesso | — |
| `/cliente.html?id=UUID` | Detalhe do cliente — histórico, agendamentos, timeline | Sim |
| `/relatorio.html` | Relatório de conversão — funil, donut, tabela por procedimento | Sim |
| `/config` | Configurações — procedimentos, fotos, portal, horários | Sim |
| `/:slug/agendar` | Portal de autoatendimento do cliente | Público |

---

## API — endpoints

Todas as rotas `/api/*` exigem header `x-api-key: <API_SECRET>`, **exceto** as rotas do portal e `GET /api/upload/procedure/:id/photos`.

### Leads

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/leads` | Lista leads (`?status=&search=&date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`) |
| GET | `/api/leads/stats` | Contadores do topo |
| GET | `/api/leads/:id` | Detalhe de um lead |
| POST | `/api/leads` | Cria/atualiza lead por telefone (upsert) |
| PATCH | `/api/leads/:id/status` | Atualiza status e motivo |
| DELETE | `/api/leads/:id` | Remove lead |

**Status possíveis do lead:**

| Status | Significado | Quem define |
|--------|-------------|-------------|
| `captado` | Preencheu nome/WhatsApp no portal por conta própria | Portal (identify) |
| `link_sent` | Clínica enviou o link de agendamento via WhatsApp | Clínica via API |
| `scheduled` | Confirmou agendamento | Portal (book) |
| `rejected` | Recusou a oferta | Portal (book com reject_reason) |

**Criar lead via API ao enviar WhatsApp** (n8n, automação, etc.):
```
POST /api/leads
x-api-key: <API_SECRET>
Content-Type: application/json

{ "name": "Joana Silva", "phone": "5511999999999", "source": "whatsapp", "status": "link_sent" }
```
Se o telefone já existir, atualiza nome e status (upsert por telefone).

### Agendamentos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/appointments` | Lista (`?status=confirmed&lead_id=UUID`) |
| GET | `/api/appointments/stats` | Contadores |
| GET | `/api/appointments/slots` | Slots disponíveis (`?date=YYYY-MM-DD&procedure_id=UUID`) |
| PATCH | `/api/appointments/:id/status` | Confirmar / cancelar |

### Procedimentos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/procedures` | Lista procedimentos |
| POST | `/api/procedures` | Cria procedimento |
| PATCH | `/api/procedures/:id` | Atualiza (nome, preço, duração, ativo, etc.) |

### Horários

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/hours` | Horários de atendimento |
| POST | `/api/hours` | Salva horários (array dos 7 dias) |

### Upload de fotos

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/api/upload/procedure/:id/photos` | Upload (campos `before` e/ou `after`) | Sim |
| GET | `/api/upload/procedure/:id/photos` | Lista fotos do procedimento | **Não** (público) |
| DELETE | `/api/upload/photo/:photoId` | Remove foto | Sim |

Imagens são redimensionadas para 900px, convertidas para WebP e **salvas como base64 diretamente no banco** (campo `url` da tabela `procedure_photos`). Não depende de filesystem — funciona no Railway sem volume.

### Configurações do portal

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/settings` | Lê configurações (delay, saudação, exibir preço) |
| POST | `/api/settings` | Salva configurações |

### Portal (público — sem autenticação)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/portal/:slug` | Info da clínica + procedimentos ativos |
| GET | `/api/portal/:slug/slots` | Slots disponíveis por data |
| POST | `/api/portal/:slug/identify` | Registra lead ao preencher nome/WhatsApp |
| POST | `/api/portal/:slug/track` | Atualiza `procedure_viewed` ao clicar num procedimento |
| POST | `/api/portal/:slug/book` | Finaliza agendamento ou registra recusa |

**Fluxo do portal (agendar.html):**
1. Pessoa preenche nome + WhatsApp → `POST /identify` → lead criado com `captado` (ou mantém status existente se já tinha `link_sent`)
2. Clica num procedimento → `POST /track` → `procedure_viewed` atualizado (status não muda)
3. Confirma agendamento → `POST /book` → status vai para `scheduled`
4. Recusa → `POST /book` com `reject_reason` → status vai para `rejected`

### Webhook

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/evolution` | Recebe eventos da Evolution API |

---

## Banco de dados — tabelas

| Tabela | Descrição |
|--------|-----------|
| `clinics` | Clínicas (suporte multi-tenant futuro) |
| `procedures` | Procedimentos com preço, duração, vídeo |
| `procedure_photos` | Fotos antes/depois — campo `url` armazena data URI base64 |
| `leads` | Clientes captados — `UNIQUE (clinic_id, phone)` aplicado no startup |
| `appointments` | Agendamentos com data, status e origem |
| `business_hours` | Horários de atendimento por dia da semana — `UNIQUE (clinic_id, day_of_week)` |
| `portal_settings` | Configurações do portal (delay, saudação) |
| `webhook_log` | Log de todos os payloads recebidos da Evolution |

---

## Rodar localmente

### 1. Pré-requisitos
- Node.js 18+
- PostgreSQL rodando localmente

### 2. Configurar variáveis de ambiente
```bash
cd backend
cp .env.example .env
# Edite o .env com seus dados
```

### 3. Instalar dependências
```bash
cd backend
npm install
```

### 4. Rodar migrations (cria tabelas + seed)
```bash
npm run migrate
```

### 5. Iniciar servidor
```bash
npm run dev    # desenvolvimento (nodemon)
npm start      # produção
```

Servidor em `http://localhost:3000`.

> Dica: sirva o frontend com `npx serve frontend/public -p 8080` e ajuste `FRONTEND_URL=http://localhost:8080` no `.env`.

---

## Deploy no Railway

### Variáveis de ambiente necessárias
```
NODE_ENV=production
API_SECRET=gere-com-openssl-rand-hex-32
CLINIC_SLUG=bella-estetica
CLINIC_NAME=Clínica Bella Estética
FRONTEND_URL=https://astrai.com.br
```

> Volumes **não são necessários** — fotos ficam salvas no banco de dados.

> Migrations críticas (constraints) são aplicadas automaticamente no startup do servidor. Para criar as tabelas pela primeira vez, execute `npm run migrate` uma vez (via Railway shell ou localmente apontando para o banco de produção).

---

## Integração Evolution (WhatsApp)

Configure o webhook na Evolution:
```
POST https://astrai.com.br/webhook/evolution
```

**Fluxo recomendado com automação (n8n):**
1. Cliente manda mensagem → webhook → Laço cria lead automaticamente
2. Automação envia o link de agendamento via WhatsApp
3. Após enviar, chama `POST /api/leads` para registrar com `status: link_sent`
4. Cliente abre o link → preenche dados → agenda → Laço atualiza tudo automaticamente

---

## Segurança

- `API_SECRET` protege todas as rotas do dashboard — nunca versione esse valor
- Portal do cliente e `GET /api/upload/procedure/:id/photos` são públicos por design
- HTTPS fornecido automaticamente pelo Railway
- Sessão do dashboard armazenada em sessionStorage (expira ao fechar o navegador)
