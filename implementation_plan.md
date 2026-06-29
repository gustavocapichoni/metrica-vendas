# Correção de Layout Mobile — MétricaVendas

## Problemas Identificados nas Screenshots

### 🔴 Problema 1 — Header transborda no mobile (PRINCIPAL)
O header tenta encaixar em uma linha: **logo + 3 abas + botão "Finalizar & Gerar Relatório" + wifi + avatar + logout**.  
Em 361px de largura, isso é impossível — itens ficam cortados ou empilhados errado.

### 🔴 Problema 2 — Tela de Estoque fica preta/vazia
A `AnimatePresence` pode causar conflito com o tamanho da tela. O conteúdo existe mas fica oculto por overflow.

### 🟡 Problema 3 — Botão "Finalizar & Gerar Relatório" sem versão mobile
O botão tem texto longo e aparece junto com tudo no header.

### 🟡 Problema 4 — Tabelas cortam colunas no mobile
As tabelas têm muitas colunas (DATA, QTD, VALOR VENDIDO, etc.) sem scroll horizontal ou adaptação.

---

## Solução Proposta

### Estratégia: Header Separado em 2 Linhas no Mobile

**Mobile (< 640px):**
```
┌─────────────────────────────────────┐
│ 📈 MétricaVendas    [wifi] [avatar] │  ← linha 1 (logo + ações)
│ [Painel] [Vendas] [Estoque]         │  ← linha 2 (tabs centralizado)
└─────────────────────────────────────┘
```

**Desktop (≥ 640px):** Layout atual mantido.

O botão **"Finalizar & Gerar Relatório"** no mobile vira apenas ícone + texto curto, ou se move para dentro do conteúdo da aba.

---

## Proposed Changes

### App.tsx — Header + Layout

#### [MODIFY] [App.tsx](file:///c:/Users/kali/Documents/app_gerenciamento_devendas/src/App.tsx)

**Header:** Separar em duas linhas no mobile:
- Linha 1 (h-12): Logo à esquerda + wifi + avatar + logout à direita
- Linha 2 (h-10): Tabs centralizados + botão relatório compacto

**`main`:** Reduzir `pt-8` para `pt-4` no mobile, adicionar `overflow-x-hidden`.

### DailyLogTable.tsx — Tabela responsiva

#### [MODIFY] [DailyLogTable.tsx](file:///c:/Users/kali/Documents/app_gerenciamento_devendas/src/components/DailyLogTable.tsx)

- Adicionar `overflow-x-auto` no container da tabela
- Ocultar colunas menos importantes no mobile (`hidden sm:table-cell`)
- Colunas visíveis mobile: DATA, VALOR VENDIDO, LUCRO + ações

### ItemTable.tsx — Tabela responsiva

#### [MODIFY] [ItemTable.tsx](file:///c:/Users/kali/Documents/app_gerenciamento_devendas/src/components/ItemTable.tsx)

- Adicionar `overflow-x-auto` no container
- Ocultar colunas secundárias no mobile

### Dashboard.tsx — Cards responsivos

#### [MODIFY] [Dashboard.tsx](file:///c:/Users/kali/Documents/app_gerenciamento_devendas/src/components/Dashboard.tsx)

- Verificar padding/margin que causa overflow lateral

---

## Verification Plan

### Manual
1. Abrir DevTools → Responsive 361×681
2. Verificar header sem overflow em todas as abas
3. Verificar Painel, Vendas e Estoque renderizando corretamente
4. Testar em 390px (iPhone 14) e 412px (Android comum)
