# Planejamento — Rebrand Astraí (completo)

## Status atual
- [x] painel.html — sidebar navy + compass rose
- [x] hoje.html — sidebar navy + compass rose
- [x] relatorio.html — sidebar navy + compass rose
- [x] config/index.html — sidebar navy + compass rose
- [ ] Logo com mais destaque na sidebar
- [ ] Tokens de cor exatos do brand kit
- [ ] Organização visual do painel principal
- [ ] Páginas de suporte (login, cadastro, onboarding, checkout)

---

## 1. Tokens de cor (brand kit oficial)

```css
:root {
  /* Backgrounds */
  --brand-navy:    #0C1A2E;   /* fundo sidebar — navy profundo */
  --brand-gold-1:  #B5944A;   /* ouro primário */
  --brand-gold-2:  #D4B570;   /* ouro claro / hover */
  --brand-gold-3:  #E8D5A0;   /* ouro pálido / watermark */
  --brand-cream:   #F5F2EC;   /* fundo principal */
  --brand-ink:     #1C1C1C;   /* texto principal */

  /* Atualizar em todos os arquivos */
  --sb-bg:    #0C1A2E;        /* era #0D1529 — ajuste fino */
  --sb-gold:  #B5944A;        /* era #C9A96E */
  --bg:       #F5F2EC;        /* era #F5F3F0 */
}
```

**Ação:** substituir `#0D1529` → `#0C1A2E` e `#C9A96E` → `#B5944A` nos 4 arquivos admin.

---

## 2. Logo com mais destaque na sidebar

**Problema atual:** compass rose pequena (~17px) ao lado do wordmark — não tem impacto.

**Solução:** layout em coluna, compass rose maior, wordmark em caixa alta com tracking.

```html
<!-- Substituir .sb-logo-area / .sb-mark nos 4 arquivos -->
<div class="sb-brand">
  <div class="sb-compass">
    <!-- compass rose SVG ~36px, fill: #B5944A -->
  </div>
  <div class="sb-wordmark">ASTRAÍ</div>
  <div class="sb-tagline">Inteligência que guia.</div>
</div>
```

```css
.sb-brand {
  padding: 28px 18px 22px;
  display: flex;
  flex-direction: column;    /* coluna, não linha */
  align-items: flex-start;
  gap: 6px;
  border-bottom: 1px solid rgba(255,255,255,.07);
}
.sb-compass {
  width: 36px; height: 36px;   /* era ~17px */
  color: #B5944A;
}
.sb-wordmark {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px;              /* era 18-21px */
  font-weight: 600;
  color: white;
  letter-spacing: .18em;        /* tracking largo — look do brand kit */
  text-transform: uppercase;
  line-height: 1;
}
.sb-tagline {
  font-size: 9px;
  color: rgba(255,255,255,.35);
  letter-spacing: .2em;
  text-transform: uppercase;
}
```

---

## 3. Organização visual do painel principal

**O que melhorar (baseado no screenshot):**

### 3a. KPIs — separação mais clara
- Funil de Leads e Valores estão em cards separados mas visualmente fracos
- Melhorar: título de seção com linha divisória dourada, valores maiores em Cormorant Garamond italic

### 3b. Tabela de leads — mais leitura
- Adicionar linha zebra suave (`#F9F7F5` em linhas alternadas)
- Avatar initials: usar cor derivada do nome (já existe parcialmente)
- Status pills: bordas 4px (editorial), não 20px
- Colunas: reduzir espaço em MOTIVO quando vazio (mostrar "—" mais leve)

### 3c. Barra de período
- Está boa, só ajustar: o dot dourado precisa de mais contraste
- "Exibindo dados de" → fonte menor, `rgba(0,0,0,.4)`

### 3d. Header da página
- "Painel" em Cormorant Garamond (já deve estar) — conferir tamanho
- Subtítulo "Gestão de leads..." → mais leve, `rgba(0,0,0,.45)`

---

## 4. Páginas de suporte a rebrandar

| Página | Arquivo | Prioridade | O que fazer |
|--------|---------|-----------|-------------|
| Login | `backend/public/login.html` | Alta | Aplicar brand completo: navy bg, compass rose, wordmark |
| Onboarding | `backend/public/onboarding/index.html` | Alta | Mesmo tratamento do login |
| Cadastro | `backend/public/cadastro/index.html` | Média | Brand header, cores Astraí |
| Checkout | `backend/public/checkout/index.html` | Média | Brand header, cores Astraí |
| Cliente (portal admin) | `backend/public/cliente.html` | Baixa | Verificar se é usado |
| Superadmin | `backend/public/superadmin/index.html` | Baixa | Cores + wordmark |

---

## 5. Tipografia (brand kit)

| Uso | Fonte | Peso | Observação |
|-----|-------|------|-----------|
| Display / título destaque | Cormorant Garamond | 600 italic | "Título em Destaque" |
| Wordmark sidebar | Cormorant Garamond | 600 | uppercase + letter-spacing .18em |
| Subtítulo / corpo elegante | Cormorant Garamond | 500 | normal ou italic |
| Interface / labels / botões | DM Sans | 400/500 | já em uso |

> "Satiels" visto no brand kit é uma display font paga. Cormorant Garamond cobre os usos práticos.

---

## Ordem de execução sugerida

```
Sprint 1 (agora):
  1. Atualizar tokens de cor (#0C1A2E, #B5944A) nos 4 arquivos
  2. Sidebar logo: layout coluna + compass maior + wordmark com tracking
  
Sprint 2:
  3. Login + Onboarding — são as primeiras impressões do produto
  
Sprint 3:
  4. Organização visual do painel principal (tabela, KPIs)
  
Sprint 4:
  5. Cadastro + Checkout + demais páginas
```
