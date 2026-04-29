# Arquitetura de Layout - Admin CRM

**Último atualizado:** 2026-04-29
**Versão:** 2.0
**Status:** Em validação → substituirá o frontend legado

---

## Este é o frontend correto

`frontend/admin/` é o **único frontend de admin sendo desenvolvido e lapidado para produção**.

Existe um frontend legado em `frontend/public/` (HTML puro — index.html, login.html, relatorio.html, etc.) que ainda está servido pelo backend durante a transição. **Não edite esse legado.** Todo desenvolvimento novo acontece aqui.

Quando este admin for validado e lançado, o `frontend/public/` será descontinuado.

---

## Localização no Monorepo

```
D:\Trab\laco\
├── backend/
│   └── public/
│       ├── admin/            ← gerado pelo build deste frontend (não editar)
│       └── ...               ← legado (frontend/public antigo, temporário)
├── frontend/
│   ├── public/               ← LEGADO — HTML puro, não mexa aqui
│   ├── agendador/            ← Portal do cliente (/:slug/agendar)
│   ├── admin/                ← ESTE FRONTEND — o único correto (/admin)
│   └── superadmin/           ← (futuro)
└── nixpacks.toml             ← build dos 3 frontends juntos
```

**URL em produção:** `/admin` (servido pelo backend Node.js via `backend/public/admin/`)

---

## Índice
1. [Estrutura de Arquivos](#estrutura-de-arquivos)
2. [Sistema de Temas](#sistema-de-temas)
3. [Menu de Navegação](#menu-de-navegação)
4. [Componentes Principais](#componentes-principais)
5. [Fluxos de Dados](#fluxos-de-dados)
6. [Design System](#design-system)
7. [Padrões Comuns](#padrões-comuns)
8. [Como Fazer Mudanças](#como-fazer-mudanças)
9. [Deploy](#deploy)

---

## Estrutura de Arquivos

```
frontend/admin/
├── index.html
├── vite.config.ts                   # build → ../../backend/public/admin
├── package.json
├── tsconfig.json
└── src/
    ├── App.tsx                      # App principal com tema padrão
    ├── main.tsx                     # Entry point
    │
    ├── pages/
    │   ├── Dashboard.tsx            # Dashboard (home)
    │   ├── Leads.tsx                # Clientes/Leads
    │   ├── Agenda.tsx               # Agenda
    │   ├── IA.tsx                   # Atendimento
    │   └── Settings.tsx             # Configurações
    │
    ├── components/
    │   ├── Sidebar.tsx              # Menu de navegação lateral
    │   ├── ScreenContainer.tsx      # Container de tela
    │   ├── Layout.tsx               # Layout base
    │   ├── LeadProfileDrawer.tsx    # Digital Profile (drawer direito)
    │   ├── BookingModal.tsx         # Modal de agendamento
    │   └── LeadDrawer.tsx
    │
    ├── services/
    │   ├── api.ts                   # Config de API (x-api-key automático)
    │   ├── leads.ts
    │   ├── appointments.ts
    │   ├── procedures.ts
    │   ├── professionals.ts
    │   └── settings.ts
    │
    ├── lib/
    │   ├── utils.ts                 # cn() e utilitários
    │   └── phone.ts                 # Formatação de telefones
    │
    ├── types.ts                     # Tipos e temas
    └── context/
        └── AuthContext.tsx          # Autenticação
```

---

## Sistema de Temas

### Tema Padrão
```typescript
// src/App.tsx linha 16
const [themeName, setThemeName] = useState<AstraiThemeName>('light');
```

### Temas Disponíveis
```typescript
type AstraiThemeName = 'light' | 'mixed' | 'dark' | 'terminal';
```

### Cores do Design System
```css
--color-astrai-blue: #0B1F2A    /* Azul escuro Astrai */
--color-astrai-gold: #C9A96E    /* Dourado Astrai */
--color-astrai-gold-bright: #E8D5B7
```

| Elemento | Light | Mixed (Dark/Gold) |
|----------|-------|------------------|
| Background | #f5f4f0 (bege) | #0B1F2A (azul) |
| Primary Accent | #2563eb (azul) | #C9A96E (ouro) |
| Text Primary | #1f2937 | #fff |

### Como Alternar Tema
- Botão na sidebar (ícone lua/sol)
- Alterna entre `light` e `mixed`

---

## Menu de Navegação

### Ordem Atual
```typescript
// src/components/Sidebar.tsx linhas 19-25
const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'leads',     icon: Users,           label: 'Clientes' },
  { id: 'agenda',    icon: Calendar,        label: 'Agenda' },
  { id: 'ia',        icon: Contact,         label: 'Atendimento' },
  { id: 'settings',  icon: Settings,        label: 'Configurações' },
];
```

**Regra:** Só mude a ordem ou o `label`. Nunca mude o `id` — ele é usado internamente para routing.

---

## Componentes Principais

### Sidebar (`src/components/Sidebar.tsx`)
```typescript
interface SidebarProps {
  active: string;
  setActive: (id: string) => void;
  theme: AstraiTheme;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onThemeChange: (theme: AstraiThemeName) => void;
}
```

### LeadProfileDrawer (`src/components/LeadProfileDrawer.tsx`)
Drawer que abre à direita ao clicar em um cliente.

```typescript
interface LeadProfileDrawerProps {
  lead: Lead;
  apts: Appointment[];
  theme: AstraiTheme;
  onClose(): void;
  onStatusChange(s: string): void;
  onAptStatusChange?(aptId: string, status: string): void;
  onBook(): void;
  onUpdate?(data: { name?: string; phone?: string }): void;
}
```

**Funcionalidades:**
- Avatar com iniciais + cor por nome
- Nome e telefone editáveis
- Stats: Visitas e LTV Total
- Status Lead dropdown
- Status Appointment dropdown (mais recente)
- Timeline e histórico de eventos
- Botões: "Agendar Novo Horário" e "Abrir WhatsApp"

### BookingModal (`src/components/BookingModal.tsx`)
```typescript
interface Props {
  theme: AstraiTheme;
  onClose(): void;
  onSuccess(): void;
  prefillLead?: { id: string; name: string };
  reschedule?: RescheduleTarget;
}
```

**Fluxo NOVO CLIENTE** (`prefillLead.id === 'new'`):
1. Telefone → 2. Nome → 3. Procedimento → 4. Data → 5. Horário

**Fluxo CLIENTE EXISTENTE** (`prefillLead.id !== 'new'`):
- Pula telefone/nome, vai direto para Procedimento

**Fluxo REAGENDAR** (`reschedule` definido):
- Pula tudo, vai direto para Data/Horário

### Leads Page (`src/pages/Leads.tsx`)
```
Header: Título + "+ Novo Cliente" (dourado) + Link copiável
KPIs: Total Leads / Link Enviado / Agendados / Conversão %
Tabela: Avatar+Nome+Tel / Procedimento / Status Lead / Status Apt / Data / Actions
```

### Agenda Page (`src/pages/Agenda.tsx`)
```
Header: Título + Data range + Nav semana + Semana/Dia + "+ Novo Agendamento"
KPIs: Agendamentos / Confirmados / Valor Total
Vista Semana: Grid 7 dias × 11 horas (8am–6pm)
Vista Dia: Day picker + lista de appointments
```

---

## Fluxos de Dados

### Novo Cliente via Leads
```
"+ Novo Cliente" → setBookingLead({ id: 'new', name: '' })
  → BookingModal (detecta id === 'new')
  → telefone → nome → procedimento → data → horário
  → createLead() + createAppointment()
  → onSuccess() → reload
```

### Abrir Digital Profile
```
Clique na linha da tabela → openDetail(lead)
  → fetch lead + appointments
  → <LeadProfileDrawer /> com AnimatePresence
```

### Reagendar (Agenda)
```
"Remarcar" → setRescheduleTarget(apt)
  → BookingModal com reschedule=target
  → pula telefone/nome, vai para data/horário
  → rescheduleAppointment()
```

---

## Padrões Comuns

### Classes dinâmicas
```typescript
import { cn } from '../lib/utils';
className={cn('base', isLight && 'light-class', condition && 'extra')}
```

### Formatação de Telefone
```typescript
import { formatPhoneDisplay, normalizePhone } from '../lib/phone';

formatPhoneDisplay(lead.phone)  // → (88) 9 8104-8831
normalizePhone(phoneInput)      // → 5588981048831 (BD/API)
getPhoneForWhatsApp(lead.phone) // → 5588981048831
```

### Fetch com API
```typescript
import { api } from '../services/api';

api.get<Lead[]>('/api/leads')
api.post<Lead>('/api/leads', { name, phone })
api.patch(`/api/leads/${id}/status`, { status })
api.delete(`/api/leads/${id}`)
// Header x-api-key incluído automaticamente
```

### Animações
```typescript
import { motion, AnimatePresence } from 'motion/react';

<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
    />
  )}
</AnimatePresence>
```

---

## Como Fazer Mudanças

### Mudar Ordem do Menu
**Arquivo:** `src/components/Sidebar.tsx` (linhas 19-25)
- Reordenar o array `navItems`
- Não mude os `id`!

### Mudar Tema Padrão
**Arquivo:** `src/App.tsx` linha 16
```typescript
useState<AstraiThemeName>('light') // trocar 'light' por 'mixed', 'dark', ou 'terminal'
```

### Adicionar Campo no Digital Profile
**Arquivo:** `src/components/LeadProfileDrawer.tsx`
- Localizar `<div className="px-5 space-y-6">`
- Adicionar novo bloco com `sectionTitle()` + conteúdo

### Adicionar Coluna na Tabela de Leads
**Arquivo:** `src/pages/Leads.tsx`
1. Atualizar `gridTemplateColumns`
2. Adicionar `<div>` no header e no body (map de leads)

### Adicionar Nova Página
1. Criar `src/pages/NovaPage.tsx`
2. Importar em `src/App.tsx`
3. Adicionar case em `renderScreen()`
4. Adicionar item em `navItems` no `Sidebar.tsx`
5. Adicionar título em `getTitle()`

### Modificar Cores de Status
**Arquivo:** `src/pages/Leads.tsx` (procure `STATUS_BADGE`, `APT_BADGE`)
```typescript
const STATUS_BADGE: Record<string, string> = {
  new:       'text-sky-400 bg-sky-400/10 border-sky-400/30',
  scheduled: 'text-emerald-500 ...',
  // ...
};
```

---

## Deploy

**SEMPRE via GitHub — nunca `railway up` direto.**

```bash
# 1. Fazer o build local (opcional — Railway builda no deploy)
cd D:\Trab\laco\frontend\admin
npm run build

# 2. Commitar e fazer push do código-fonte
cd D:\Trab\laco
git add frontend/admin
git commit -m "feat: descrição da mudança"
git push origin main
# Railway detecta o push e faz o build automaticamente
```

**Por que não `railway up`?**
- `railway up` aparece como "via CLI" sem contexto
- `git push` aparece como "via GitHub" com o resumo do commit
- O `nixpacks.toml` já cuida de buildar `agendador` + `admin` + backend

**Processo do Railway no deploy:**
```toml
# nixpacks.toml
[phases.build]
cmds = [
  "cd frontend/agendador && npm install && npm run build",
  "cd frontend/admin && npm install && npm run build",
  "cd backend && npm install"
]
```

---

## Troubleshooting

| Problema | Solução |
|---------|---------|
| Tema não muda | Verificar `src/App.tsx` linha 16 |
| Link de agendamento não aparece | Verificar `getClinic()` em services/settings.ts |
| "Novo Cliente" não funciona | Verificar `hasPrefill` no BookingModal (id === 'new') |
| Telefone não formatado | Usar `formatPhoneDisplay(phone)` |
| Build falha no Railway | Verificar `nixpacks.toml` e rodar `npm run build` local |
