# 🎬 Patient Portal — User Flow & Journey Map

## 1️⃣ COMPLETE USER JOURNEY MAP

```
ENTRY POINT: Magic Link Email
│
└─► "Abra seu portal do paciente"
    (link: /portal/:token)
    │
    ├─► Token Auth
    │   ├─► ✓ Valid → Session Token
    │   └─► ✗ Invalid/Expired → Error State "Link expirado"
    │
    └─► Load Portal Data
        ├─► ✓ Success → Dashboard
        └─► ✗ Network Error → Retry + Offline State
```

---

## 2️⃣ HOME TAB — "INÍCIO" FLOW

```
┌────────────────────────────────────────────────────────────┐
│                      HOME (INÍCIO)                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  👋 "Olá, João!"                                           │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📊 TREATMENT PROGRESS                               │ │
│  │                                                      │ │
│  │  Your Treatment Plan: Implante Unitário + Coroa    │ │
│  │  Progress: ⓐⓑⓒ③④⑤ (3 of 5 completed = 60%)        │ │
│  │                                                      │ │
│  │  Next Step: Fabricação da coroa (Procedimento #4)   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📅 NEXT APPOINTMENT (Hero Card)                     │ │
│  │                                                      │ │
│  │  Próxima consulta                                   │ │
│  │  20 de abril                                        │ │
│  │  14:30 • Dra. Marina                                │ │
│  │                                                      │ │
│  │  ⏳ Em 3 dias                          [✓ Confirmado]│ │
│  │  Você vem? [Confirmar] [Reagendar]                 │ │
│  │                                                      │ │
│  │  💡 Prepare: Levar RG + trazer carteirinha          │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🛠️ POST-CARE GUIDE (Condicionado)                   │ │
│  │                                                      │ │
│  │  IF recent_procedure THEN show:                     │ │
│  │                                                      │ │
│  │  Cuidados pós-extração (Hoje)                       │ │
│  │  ✓ Gelo 20/20 min                                   │ │
│  │  ✓ Alimentos frios                                  │ │
│  │  ✓ Sem bochechos                                    │ │
│  │  [Ver todas as orientações]                         │ │
│  │                                                      │ │
│  │  ELSE: (don't show)                                 │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🔗 QUICK ACTIONS (4 cards)                          │ │
│  │                                                      │ │
│  │  [📅 Agendar]  [📈 Evolução]  [📄 Arquivos]  [💳]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🏥 CLINIC INFO (Footer)                             │ │
│  │                                                      │ │
│  │  Clínica Dental Smile                               │ │
│  │  📍 Av. Paulista, 1000 — São Paulo, SP              │ │
│  │  📞 (11) 3456-7890                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘

NAVIGATION (Bottom Sheet Mobile / Sidebar Desktop):
┌─────────────────────────────────────────────────┐
│ [HOME] Início                    [ACTIVE]       │
│ [CAL]  Consultas                                │
│ [ACT]  Evolução                                 │
│ [DOC]  Documentos                               │
│ [$$]   Financeiro                               │
└─────────────────────────────────────────────────┘

STATES:
❌ No future appointments → Show CTA "Agendar"
❌ No treatment plan → Show "Sem informações"
✅ Recent procedure → Show post-care guide
✅ Appointment due in < 24h → Show reminder badge
✅ Pending confirmation → Show action buttons
```

---

## 3️⃣ APPOINTMENTS TAB — "CONSULTAS" FLOW

```
┌────────────────────────────────────────────────────────────┐
│                    APPOINTMENTS (CONSULTAS)                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🔼 FUTURE APPOINTMENTS (sorted by date)                  │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📅 20 de abril · 14:30 · Dra. Marina               │ │
│  │ Status: [✓ CONFIRMADO]                             │ │
│  │ Notes: "Discussão sobre implante. Trazer RG"       │ │
│  │                                                      │ │
│  │ ⏳ Em 3 dias                                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📅 25 de abril · 10:00 · Dr. Carlos                 │ │
│  │ Status: [◯ AGENDADO] ← Needs Action!               │ │
│  │                                                      │ │
│  │ Você vem dia 25 às 10:00?                          │ │
│  │ [Confirmar] [Reagendar]                             │ │
│  │                                                      │ │
│  │ ⏳ Em 8 dias                                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  🔼 PAST APPOINTMENTS (opacified, sorted by date desc)    │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │ │
│  │ 📅 15 de abril · 14:30 · Dra. Marina               │ │
│  │ Status: [✓ FINALIZADO]                             │ │
│  │ Procedure: "Extração dente 48 + sutura"            │ │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [CTA: Schedule new] button at bottom                      │
│                                                            │
└────────────────────────────────────────────────────────────┘

STATE LOGIC:
┌─────────────────────────────────────────┐
│ SCHEDULED                               │
│ ─────────────────────────────────────── │
│ Icon: ◯ (open circle)                   │
│ Color: [#007AFF]/10 (blue)              │
│ Action: [Confirmar] [Reagendar]        │
│ Copy: "Você vem dia XX às HH:MM?"       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ CONFIRMED                               │
│ ─────────────────────────────────────── │
│ Icon: ✓ (checkmark)                     │
│ Color: [#34C759]/10 (green)             │
│ Action: None (readonly)                 │
│ Copy: "Presença confirmada"             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ IN_PROGRESS                             │
│ ─────────────────────────────────────── │
│ Icon: ◬ (loading spinner)               │
│ Color: [#FF9500]/10 (orange)            │
│ Action: None                            │
│ Copy: "Está acontecendo agora"          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ FINISHED / CANCELLED / NO_SHOW          │
│ ─────────────────────────────────────── │
│ Opacity: 40%                            │
│ Color: [#E5E5EA] (gray)                 │
│ Action: None                            │
│ Copy: "Finalizado" / "Cancelado" / etc  │
└─────────────────────────────────────────┘
```

---

## 4️⃣ EVOLUTION TAB — "EVOLUÇÃO" FLOW

```
┌────────────────────────────────────────────────────────────┐
│                 EVOLUTION (EVOLUÇÃO CLÍNICA)               │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎯 TIMELINE (chronological, latest first)                 │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📍 • • • • 15 de abril · 14:30 — Dra. Marina       │ │
│  │   └─────────────────────────────────────────────    │ │
│  │       PROCEDURE: Extração dente 48                  │ │
│  │       NOTES: "Sutura 5.0, sem complicações"        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📍 • • • • 10 de abril · 09:00 — Dr. Carlos        │ │
│  │   └─────────────────────────────────────────────    │ │
│  │       PROCEDURE: Tratamento de canal #36            │ │
│  │       NOTES: "Necrose pulpar. Sucessivo e acessível"│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📍 • • • • 31 de março · 14:00 — Dra. Marina       │ │
│  │   └─────────────────────────────────────────────    │ │
│  │       PROCEDURE: Consulta inicial + radiografia     │ │
│  │       NOTES: "Planejamento de tratamento discutido" │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  📭 Empty state (if no records):                           │
│     "Sua evolução clínica aparecerá aqui"                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 5️⃣ DOCUMENTS TAB — "DOCUMENTOS" FLOW

```
┌────────────────────────────────────────────────────────────┐
│                  DOCUMENTS (DOCUMENTOS)                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  📋 GROUPED BY TYPE (TODO: implement grouping)             │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 🖼️ Radiografia Panorâmica                            │ │
│  │ Criado: 15 de abril                                 │ │
│  │ [⬇️ Download]                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📄 Relatório de Avaliação                            │ │
│  │ Criado: 10 de abril                                 │ │
│  │ [⬇️ Download]                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ 📸 Foto Oclusal                                      │ │
│  │ Criado: 31 de março                                 │ │
│  │ [⬇️ Download]                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  📭 Empty state (if no docs):                              │
│     "Seus documentos e radiografias aparecerão aqui"     │ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 6️⃣ FINANCIAL TAB — "FINANCEIRO" FLOW

```
┌────────────────────────────────────────────────────────────┐
│                  FINANCIAL (FINANCEIRO)                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  💰 SUMMARY CARDS (grid)                                   │
│  ┌─────────────────┬─────────────────┐                    │
│  │ Orçamento       │ Concluído       │                    │
│  │ Total           │                 │                    │
│  │ R$ 2.500,00     │ R$ 1.000,00     │                    │
│  └─────────────────┴─────────────────┘                    │
│                                                            │
│  📊 PROGRESS BAR                                           │
│  Recebido: R$ 1.500,00 (60%)                              │
│  ▓▓▓▓▓▓░░ 60%                                              │
│  Falta: R$ 1.000,00                                        │
│                                                            │
│  🔴 PENDING INSTALLMENTS (urgent section)                 │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⚠️  Parcela #3 — VENCIDA                             │ │
│  │ Venceu em: 10 de abril                              │ │
│  │ Valor: R$ 500,00                                    │ │
│  │ [💳 Pagar]                                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ⏰  Parcela #4 — VENCE EM 3 DIAS                     │ │
│  │ Vence em: 20 de abril                               │ │
│  │ Valor: R$ 400,00                                    │ │
│  │ [💳 Pagar]                                           │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  📈 TRANSACTION HISTORY (collapsed by default)             │
│  ─────────────────────────────────────────────────────────│
│                                                            │
│  [▼ Ver transações anteriores]                             │
│                                                            │
│  (When expanded:)                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✓ Parcela #2 paga — 5 de abril                      │ │
│  │ R$ 400,00 via PIX                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✓ Parcela #1 paga — 25 de março                     │ │
│  │ R$ 700,00 via Transferência                         │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 7️⃣ PAYMENT FLOW (Modal Sequence)

```
USER CLICKS: [💳 Pagar] on installment

        STEP 1: CONFIRM AMOUNT
        ┌──────────────────────┐
        │  Parcela #3          │
        │  Venc: 20 de abril   │
        │                      │
        │  R$ 500,00           │
        │                      │
        │  [Avantar]  [Voltar] │
        └──────────────────────┘
                  ↓
        STEP 2: PIX ENTRY
        ┌──────────────────────┐
        │  Chave PIX           │
        │                      │
        │  [12345.67890.12345] │
        │  Copiar              │
        │                      │
        │  "Cole no seu app"   │
        │                      │
        │  [Enviar]  [Voltar]  │
        └──────────────────────┘
                  ↓
        STEP 3: CONFIRMATION
        ┌──────────────────────┐
        │  ✓ Pagamento enviado │
        │                      │
        │  "Avisaremos a       │
        │   clínica"           │
        │                      │
        │  [Fechar]            │
        └──────────────────────┘

STATES:
- Success: green checkmark + message
- Error: red warning + retry button
- Loading: spinner in button
```

---

## 8️⃣ SCHEDULE MODAL FLOW

```
USER CLICKS: [📅 Agendar] or [Reagendar]

        ┌─────────────────────────┐
        │  Solicitar Consulta     │
        │                         │
        │  Data Preferencial:     │
        │  [____/____/____ ]      │
        │  (date input)           │
        │                         │
        │  Horário:               │
        │  [dropdown:             │
        │   - Qualquer horário    │
        │   - Manhã (08h–12h)     │
        │   - Tarde (13h–18h)     │
        │   - Noite (18h–21h)     │
        │  ]                      │
        │                         │
        │  Observações:           │
        │  [multiline text...]    │
        │  Motivo da consult...   │
        │                         │
        │  [Enviar]  [Cancelar]   │
        └─────────────────────────┘
                  ↓
        ✓ SUCCESS
        ┌─────────────────────────┐
        │  ✓ Solicitação Enviada  │
        │                         │
        │  "Clínica entrará em    │
        │   contato"              │
        │                         │
        │  (auto-close after 2s)  │
        └─────────────────────────┘
```

---

## 9️⃣ CONFIRMATION FLOW (For SCHEDULED Appointments)

```
APPOINTMENT STATUS = "SCHEDULED"

SHOW:
┌─────────────────────────────────────────┐
│  "Você vem no dia 20 de abril às 14:30?"│
│                                         │
│  [✓ Confirmar] [Reagendar]              │
│                                         │
│  (Loading state: spinner in button)     │
│                                         │
│  ✓ Success: "Horário confirmado ✓"     │
│             (stays visible)             │
│                                         │
│  ✗ Error: Red toast alert               │
│           + retry option                │
└─────────────────────────────────────────┘

POST-ACTION:
- Appointment status becomes "CONFIRMED"
- UI updates to show "✓ Confirmado"
- Action buttons disappear (read-only state)
```

---

## 🔟 ERROR HANDLING FLOWS

```
NETWORK ERROR
┌──────────────────────────────────────────┐
│  ⚠️  Algo deu errado                     │
│                                          │
│  Verifique sua conexão                   │
│                                          │
│  [Tentar Novamente]  [Voltar]            │
└──────────────────────────────────────────┘

API 401 (Session Expired)
┌──────────────────────────────────────────┐
│  ⚠️  Sua sessão expirou                  │
│                                          │
│  Solicite um novo link por email         │
│                                          │
│  [Enviar novo link]                      │
└──────────────────────────────────────────┘

API 500 (Server Error)
┌──────────────────────────────────────────┐
│  ⚠️  Erro no servidor                    │
│                                          │
│  Estamos resolvendo. Tente em alguns     │
│  minutos.                                │
│                                          │
│  [Tentar novamente]  [Contatar suporte]  │
└──────────────────────────────────────────┘

TIMEOUT (> 30s)
┌──────────────────────────────────────────┐
│  ⏱️  Solicitação demorando...            │
│                                          │
│  [Tentar novamente]                      │
└──────────────────────────────────────────┘
```

---

## 1️⃣1️⃣ MOBILE VS DESKTOP DIFFERENCES

```
MOBILE (< 640px)
═══════════════════════════════════════════
• Bottom nav sheet (tab buttons sticky)
• Modals = bottom sheet (pull-down)
• Full-width cards
• Touch targets: 44x44 minimum
• Single column layout
• Simplified forms

DESKTOP (≥ 640px)
═══════════════════════════════════════════
• Sidebar nav (persistent)
• Modals = centered dialog (512px wide)
• Multi-column grid layouts
• Touch targets: 44x44 (still respected)
• Whitespace + breathing room
• Grouped forms with help text
```

---

## 1️⃣2️⃣ EDGE CASES

```
EDGE CASE 1: Patient with NO appointments
┌─────────────────────────────────────────┐
│  Sem consultas próximas                 │
│                                         │
│  Agende sua próxima consulta para        │
│  continuar seu tratamento.              │
│                                         │
│  [Agendar Consulta]                     │
└─────────────────────────────────────────┘

EDGE CASE 2: Patient with OVERDUE payment
┌─────────────────────────────────────────┐
│  🔴 PARCELA VENCIDA                     │
│                                         │
│  Você tem um pagamento pendente.        │
│  Entre em contato para organizar.       │
│                                         │
│  [Pagar Agora]  [Contato]               │
└─────────────────────────────────────────┘

EDGE CASE 3: Clinic without PIX configured
┌─────────────────────────────────────────┐
│  ⚠️  PIX ainda não configurado          │
│                                         │
│  A clínica ainda não habilitou pagamento│
│  por PIX. Entre em contato para combinar│
│  outra forma de pagamento.              │
│                                         │
│  [Contato da Clínica]                   │
└─────────────────────────────────────────┘

EDGE CASE 4: Recent procedure (post-care visible)
Homepage shows highlighted post-care guide
with top 3 most critical items, "expandir"

EDGE CASE 5: Treatment plan completed
┌─────────────────────────────────────────┐
│  ✓ Tratamento Finalizado!               │
│                                         │
│  Parabéns! Seu tratamento está completo.│
│  Continuaremos no acompanhamento.       │
│                                         │
│  [Agendar Manutenção]                   │
└─────────────────────────────────────────┘
```

---

## Summary: Key Principles

✅ **Task-Oriented**: Each screen has ONE primary goal
✅ **Progressive Disclosure**: Show only what's needed now
✅ **Clear States**: Actions have clear before/after states
✅ **Error Recovery**: Every error has a recovery path
✅ **Mobile First**: Works well on tiny + large screens
✅ **Apple UX**: Clean, simple, focused design
✅ **Accessibility**: Keyboard + screen reader support

---

*User Flow prepared for: Patient Portal Design Sprint*
*Design Reference: iOS Human Interface Guidelines*
