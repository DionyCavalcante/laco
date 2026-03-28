# Laço — CRM para negócios locais

MVP de relacionamento com clientes para clínicas de estética.
Portal de autoatendimento + dashboard de gestão + webhook para Evolution (WhatsApp).

---

## Estrutura do projeto

```
laco/
├── backend/
│   ├── src/
│   │   ├── index.js                ← servidor Express (entrada)
│   │   ├── db/
│   │   │   ├── index.js            ← pool de conexão PostgreSQL
│   │   │   └── migrate.js          ← cria tabelas + seed inicial
│   │   ├── middleware/
│   │   │   └── auth.js             ← proteção por API key
│   │   └── routes/
│   │       ├── leads.js            ← clientes / leads
│   │       ├── appointments.js     ← agendamentos + slots
│   │       ├── procedures.js       ← procedimentos da clínica
│   │       ├── hours.js            ← horários de atendimento
│   │       ├── upload.js           ← fotos antes/depois
│   │       ├── settings.js         ← configurações do portal
│   │       ├── portal.js           ← API pública (cliente)
│   │       └── webhook.js          ← eventos da Evolution
│   ├── uploads/                    ← fotos salvas (gerado automaticamente)
│   ├── .env.example
│   └── package.json
├── frontend/
│   └── public/
│       ├── index.html              ← dashboard principal
│       ├── login.html              ← tela de login
│       ├── cliente.html            ← detalhe do cliente
│       ├── relatorio.html          ← relatório de conversão
│       ├── agendar.html            ← portal de agendamento (cliente)
│       └── config/
│           └── index.html          ← configurações da clínica
├── railway.toml
└── nixpacks.toml
```

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

Todas as rotas `/api/*` (exceto `/api/portal`) exigem header `x-api-key: <API_SECRET>`.

### Leads
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/leads` | Lista leads (`?status=rejected&search=nome`) |
| GET | `/api/leads/stats` | Contadores do topo |
| GET | `/api/leads/:id` | Detalhe de um lead |
| POST | `/api/leads` | Cria lead manualmente |
| PATCH | `/api/leads/:id/status` | Atualiza status e motivo |

Status possíveis: `new` · `link_sent` · `scheduled` · `rejected`

### Agendamentos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/appointments` | Lista (`?status=confirmed&lead_id=UUID`) |
| GET | `/api/appointments/stats` | Contadores |
| GET | `/api/appointments/slots` | Horários disponíveis (`?date=YYYY-MM-DD&procedure_id=UUID`) |
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
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/upload/procedure/:id/photos` | Upload (campos `before` e/ou `after`) |
| GET | `/api/upload/procedure/:id/photos` | Lista fotos do procedimento |
| DELETE | `/api/upload/photo/:photoId` | Remove foto |

Imagens são redimensionadas para 900px e convertidas para WebP automaticamente.

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
| POST | `/api/portal/:slug/book` | Finaliza agendamento ou registra recusa |

### Webhook
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/webhook/evolution` | Recebe eventos da Evolution API |

### Utilitários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check (usado pelo Railway) |
| GET | `/uploads/:filename` | Serve fotos estáticas |

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

### 1. Criar conta em railway.app

### 2. Push no GitHub e conectar
```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/seu-usuario/laco.git
git push -u origin main
```
No Railway: New Project → Deploy from GitHub → selecione o repo

### 3. Adicionar banco PostgreSQL
No painel do projeto: New → Database → Add PostgreSQL
O Railway injeta DATABASE_URL automaticamente.

### 4. Configurar variáveis de ambiente no Railway
```
NODE_ENV=production
API_SECRET=gere-com-openssl-rand-hex-32
CLINIC_SLUG=bella-estetica
CLINIC_NAME=Clínica Bella Estética
FRONTEND_URL=https://seu-app.railway.app
```

Gere uma chave segura:
```bash
openssl rand -hex 32
```

### 5. Deploy automático
O Railway detecta o nixpacks.toml, instala, roda migrations e sobe.

---

## Integração Evolution (WhatsApp)

Configure o webhook na Evolution:
```
POST https://seu-app.railway.app/webhook/evolution
```

Fluxo:
1. Cliente manda mensagem → webhook → Laço cria lead automaticamente
2. Evolution envia o link via automação
3. Atualize o status: `PATCH /api/leads/:id/status { "status": "link_sent" }`
4. Cliente abre o link → agenda → Laço registra tudo

Para notificar a clínica quando chega novo agendamento, adicione em portal.js após criar o agendamento:
```js
await fetch(`${process.env.EVOLUTION_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`, {
  method: 'POST',
  headers: { 'apikey': process.env.EVOLUTION_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    number: process.env.CLINIC_PHONE,
    text: `Novo agendamento!\nCliente: ${name}\nProcedimento: ${proc.name}\nData: ${date} às ${time}`
  })
})
```

Variáveis: `EVOLUTION_URL`, `EVOLUTION_INSTANCE`, `EVOLUTION_KEY`, `CLINIC_PHONE`

---

## Banco de dados — tabelas

| Tabela | Descrição |
|--------|-----------|
| `clinics` | Clínicas (suporte multi-tenant futuro) |
| `procedures` | Procedimentos com preço, duração, vídeo |
| `procedure_photos` | Fotos antes/depois por procedimento |
| `leads` | Clientes captados com status e motivo de recusa |
| `appointments` | Agendamentos com data, status e origem |
| `business_hours` | Horários de atendimento por dia da semana |
| `portal_settings` | Configurações do portal (delay, saudação) |
| `webhook_log` | Log de todos os payloads recebidos da Evolution |

---

## Segurança

- `API_SECRET` protege todas as rotas do dashboard — nunca versione esse valor
- Portal do cliente e webhook são públicos por design
- HTTPS fornecido automaticamente pelo Railway
- Sessão do dashboard armazenada em sessionStorage (expira ao fechar o navegador)
