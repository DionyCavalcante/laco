# PRD — Redesign config/index.html

## Contexto

Os arquivos `painel.html`, `hoje.html` e `relatorio.html` já foram redesenhados com o novo sistema de design premium do Laço. O único arquivo pendente é `backend/public/config/index.html`.

## Regra absoluta

**JS preservado 100%.** O bloco `<script>` (linhas 644–1817 do arquivo original) deve ser copiado literalmente, sem alteração. Apenas os acréscimos explicitados abaixo no final do bloco são permitidos.

---

## Sistema de design (igual aos outros arquivos)

### Tokens CSS

```css
:root {
  --sb-bg: #1B3A2C;
  --sb-text: rgba(255,255,255,0.65);
  --sb-gold: #C9A96E;
  --sb-border: rgba(255,255,255,0.08);
  --accent: #1B3A2C;
  --accent-mid: #2C6E49;
  --gold: #C9A96E;
  --bg: #F5F3F0;
  --ink: #1A1614;
  --border: rgba(0,0,0,0.08);
}
```

### Fontes

```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
```

- `DM Sans` → corpo, labels, botões
- `Cormorant Garamond` → `.sb-name`, `.config-page-title`

---

## Mudanças de layout

### Remover

- `.topbar` (div + CSS)

### Adicionar

**Layout wrapper:**
```html
<body>
  <div class="admin-layout">
    <aside class="sidebar">…</aside>
    <div class="main">
      <div class="config-header">…</div>
      <!-- panels aqui -->
    </div>
  </div>
  <!-- overlays/modais fora do .admin-layout, position:fixed não precisa -->
  …
```

**CSS layout:**
```css
html,body { height:100%; overflow:hidden }
.admin-layout { display:flex; height:100vh; overflow:hidden }
.main { flex:1; overflow-y:auto; height:100vh; display:flex; flex-direction:column; min-width:0 }
```

---

## Sidebar (idêntica aos outros arquivos)

```html
<aside class="sidebar">
  <!-- brand -->
  <div class="sb-brand">
    <div class="sb-star">
      <svg viewBox="0 0 24 24">
        <path d="M12 2L14.09 9.26L22 9.27L15.95 14.14L18.18 21.02L12 17.02L5.82 21.02L8.05 14.14L2 9.27L9.91 9.26Z" fill="#C9A96E"/>
      </svg>
    </div>
    <div>
      <div class="sb-name">Laço</div>
      <div class="sb-clinic" id="sb-clinic-name">—</div>
    </div>
  </div>

  <!-- nav -->
  <nav class="sb-nav">
    <a id="back-link" href="/" class="sb-item">
      <!-- ícone grid 2x2 --> Painel
    </a>
    <a id="nav-hoje-cfg" href="#" class="sb-item">
      <!-- ícone calendário --> Hoje
    </a>
    <a id="nav-relatorio-cfg" href="#" class="sb-item">
      <!-- ícone barras --> Relatórios
    </a>
    <a class="sb-item active">
      <!-- ícone engrenagem --> Configurações
    </a>
  </nav>

  <div class="sb-footer">
    <button class="sb-logout" onclick="logout()">← Sair</button>
  </div>
</aside>
```

**CSS sidebar:**
```css
.sidebar {
  width:220px; flex-shrink:0; background:#1B3A2C;
  display:flex; flex-direction:column; height:100vh;
  overflow:hidden; position:relative;
}
/* star watermark */
.sidebar::after {
  content:''; position:absolute; bottom:32px; right:-24px;
  width:160px; height:160px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2L14.09 9.26L22 9.27L15.95 14.14L18.18 21.02L12 17.02L5.82 21.02L8.05 14.14L2 9.27L9.91 9.26Z' fill='white'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-size:contain;
  opacity:0.038; pointer-events:none;
}
.sb-brand { padding:24px 18px 18px; display:flex; align-items:center; gap:10px; border-bottom:1px solid rgba(255,255,255,.07); margin-bottom:6px }
.sb-star { width:28px; height:28px; flex-shrink:0; display:flex; align-items:center; justify-content:center }
.sb-name { font-family:'Cormorant Garamond',serif; font-size:18px; font-weight:600; color:white; letter-spacing:.02em; line-height:1.15 }
.sb-clinic { font-size:11px; color:rgba(255,255,255,.45); margin-top:2px }
.sb-nav { display:flex; flex-direction:column; gap:2px; padding:0 10px; flex:1 }
.sb-item { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:500; color:rgba(255,255,255,.62); transition:color .15s,background .15s; cursor:pointer }
.sb-item:hover { color:rgba(255,255,255,.92); background:rgba(255,255,255,.06) }
.sb-item.active { color:white; background:rgba(255,255,255,.10); box-shadow:inset 3px 0 0 #C9A96E }
.sb-item svg { width:15px; height:15px; flex-shrink:0; stroke:currentColor; fill:none; opacity:.8 }
.sb-item.active svg { opacity:1 }
.sb-footer { padding:14px 18px; border-top:1px solid rgba(255,255,255,.07) }
.sb-logout { font-size:12px; color:rgba(255,255,255,.38); background:none; border:none; cursor:pointer; padding:0; font-family:inherit; transition:color .15s }
.sb-logout:hover { color:rgba(255,255,255,.7) }
```

---

## Config header (sticky, substitui topbar)

```html
<div class="config-header">
  <div class="config-header-top">
    <div class="config-page-title">Configurações</div>
  </div>
  <div class="nav">
    <div class="nav-tab on" onclick="switchTab('procedimentos',this)">Procedimentos</div>
    <div class="nav-tab" onclick="switchTab('profissionais',this)">Profissionais</div>
    <div class="nav-tab" onclick="switchTab('portal',this)">Portal</div>
    <div class="nav-tab" onclick="switchTab('horarios',this)">Horários</div>
    <div class="nav-tab" onclick="switchTab('clinica',this)">Clínica</div>
  </div>
</div>
```

```css
.config-header { position:sticky; top:0; z-index:20; background:#fff; border-bottom:0.5px solid rgba(0,0,0,.07) }
.config-header-top { padding:18px 28px 0; display:flex; align-items:center }
.config-page-title { font-family:'Cormorant Garamond',serif; font-size:20px; font-weight:600; color:#1A1614; letter-spacing:.01em }
/* .nav remove o position:sticky e top:52px do original */
.nav { padding:0 22px; display:flex; gap:2px; background:#fff }
.nav-tab { padding:0 14px; height:40px; display:flex; align-items:center; font-size:13px; color:#888; cursor:pointer; border-bottom:2px solid transparent; white-space:nowrap; transition:color .15s }
.nav-tab.on { color:#1B3A2C; border-bottom-color:#C9A96E; font-weight:500 }
.nav-tab:hover:not(.on) { color:#1A1614 }
```

---

## Atualizações de cor (CSS existente)

Substituir `#B8657A` nos seguintes seletores:

| Seletor | Propriedade | Novo valor |
|---------|------------|-----------|
| `.btn-purple` | background | `#1B3A2C` |
| `.btn-purple:hover` | background | `#254d3b` |
| `.toggle` (on state) | background | `#2C6E49` |
| `.step-tab.active` | color + border-bottom-color | `#1B3A2C` + `#C9A96E` |
| `.step-tab.active .step-num` | background | `#1B3A2C` |
| `.proc-row.drop-before/after` | box-shadow color | `#C9A96E` |
| `.field *:focus` | border-color + box-shadow | `#C9A96E` + `rgba(201,169,110,.18)` |
| `.photo-thumb.drag-over` | outline | `#C9A96E` |
| `.photos-grid.drag-target` | background | `rgba(201,169,110,.05)` |
| `.mode-active` | background + border-color | `#1B3A2C` |
| `.spinner-sm` | border-top-color | `#C9A96E` |
| `.split-line` | background | `#C9A96E` |
| `.split-line::before` | background | `#C9A96E` |
| `.btn-editor-save` | background | `#1B3A2C` |
| `.copy-block-icon` | color | `#C9A96E` |
| `.copy-syntax-item code` | background + color | `#EEF3EE` + `#1B3A2C` |
| `.pos-reticle` | background | `rgba(201,169,110,.85)` |

---

## Acréscimos no final do `<script>` (após `loadProcs()`, `loadHours()`, `initClinic()`)

```js
// Sidebar: links dinâmicos com SLUG
;(function(){
  if(!SLUG)return
  const hoje=document.getElementById('nav-hoje-cfg')
  const rel=document.getElementById('nav-relatorio-cfg')
  if(hoje)hoje.href='/'+SLUG+'/hoje'
  if(rel)rel.href='/'+SLUG+'/relatorio'
})()

// Sidebar: nome da clínica
;(function(){
  fetch(API+'/api/settings/clinic',{headers:h()})
    .then(r=>r.ok?r.json():null)
    .then(d=>{if(d&&d.name){const el=document.getElementById('sb-clinic-name');if(el)el.textContent=d.name}})
    .catch(()=>{})
})()

// Logout
function logout(){localStorage.removeItem('token');location.href='/login'}
```

---

## IDs críticos que DEVEM ser preservados

| ID | Usado por |
|----|-----------|
| `back-link` | JS: `document.getElementById('back-link').href = '/' + SLUG + '/'` |
| `proc-modal` | JS: `closeModal()`, click-outside listener |
| `prof-modal` | JS: `closeProfModal()`, click-outside listener |
| `photo-editor` | JS: `editorOpen()`, `editorClose()` |
| `proc-list` | JS: `renderProcs()` |
| `prof-list` | JS: `renderProfList()` |
| `hours-grid` | JS: `renderHours()` |
| `prof-hours-grid` | JS: `renderProfHours()` |
| `panel-procedimentos` | JS: `switchTab()` |
| `panel-profissionais` | JS: `switchTab()` |
| `panel-portal` | JS: `switchTab()` |
| `panel-horarios` | JS: `switchTab()` |
| `panel-clinica` | JS: `switchTab()` |
| `toast` | JS: `toast()` |
| `edit-id` | JS: stepper, saveProc |
| `step-panel-1/2/3` | JS: `goToStep()` |
| `step-tab-1/2/3` | JS: `goToStep()` |
| `prof-panel-1/2/3` | JS: `goProfStep()` |
| `prof-tab-1/2/3` | JS: `goProfStep()` |
| `editor-canvas`, `split-line`, `editor-wrap` | JS: editor canvas |
| todos os `f-*`, `s-*` inputs | JS: openModal, saveProc, loadSettings |

## Classes CSS usadas em HTML gerado por JS (não remover)

`.proc-row`, `.drag-handle`, `.proc-info`, `.proc-name`, `.proc-meta`, `.proc-actions`, `.toggle`, `.toggle.off`, `.hours-row`, `.day-name`, `.time-inputs`, `.time-sep`, `.closed-label`, `.photo-thumb`, `.photos-grid`, `.photo-del`, `.photo-rot`, `.photo-edit`, `.photo-move`, `.photo-pos`, `.photo-pos-overlay`, `.pos-reticle`, `.photo-empty-slot`, `.photo-uploading`, `.spinner-sm`, `.mode-active`, `.photo-move-menu`, `.drag-over`, `.dragging`, `.drop-before`, `.drop-after`, `.drag-target`, `.prof-proc-check`, `.prof-check`

---

## O que NÃO mudar

- HTML interno dos panels (procedimentos, horários, clínica, portal, profissionais)
- HTML interno dos modais (proc-modal, prof-modal)  
- HTML do editor (photo-editor)
- Todo o bloco `<script>` (exceto acréscimos acima)
- IDs e classes listados acima
