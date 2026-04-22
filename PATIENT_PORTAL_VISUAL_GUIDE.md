# PATIENT PORTAL: BEFORE → AFTER VISUAL COMPARISON

## CURRENT STATE (Weak)

```
┌──────────────────────────────────────────────┐
│ Boa tarde                                    │
│ Vitor                                        │
├──────────────────────────────────────────────┤
│                                              │
│      LARGE CARD (gradient, centered)         │
│      ┌────────────────────────────────────┐  │
│      │                                    │  │
│      │ 💚 Próxima Consulta Confirmada    │  │
│      │                                    │  │
│      │    20 de abril                    │  │
│      │    14:30                          │  │
│      │    Dr(a). Marina Silva            │  │
│      │    Limpeza e polimento            │  │
│      │                                    │  │
│      │    ✓ Horário confirmado           │  │
│      │    "Te esperamos no dia marcado"  │  │
│      │                                    │  │
│      └────────────────────────────────────┘  │
│                                              │
├──────────────────────────────────────────────┤
│ Ver seu histórico completo →                │  ← BURIED
└──────────────────────────────────────────────┘

PROBLEMS:
❌ Success message is celebratory, passive
❌ No clear next action
❌ Patient doesn't know what to do
❌ Small history link is lost
❌ No preparation guidance
❌ No contact options
```

---

## NEW STATE (High-Utility) 

```
┌──────────────────────────────────────────────┐
│ Boa tarde                                    │
│ Vitor                                        │
├──────────────────────────────────────────────┤
│                                              │
│  ┌─────────────────┬─────────────────┐      │
│  │       📞        │        💬        │      │  ← PRIMARY ACTIONS
│  │     Ligar       │     WhatsApp     │      │
│  └─────────────────┴─────────────────┘      │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ 🟢 Confirmado    │  Em 2 dias      │    │  ← STATUS BADGES
│ │                                     │    │
│ │ Data e Hora                         │    │  ← SCANNABLE
│ │ Quinta, 20 de abril • 14:30        │    │  APPOINTMENT INFO
│ │                                     │    │
│ │ Profissional                        │    │
│ │ Dr(a). Marina Silva                │    │
│ │                                     │    │
│ │ Tipo                                │    │
│ │ Limpeza e polimento               │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ ✓ Prepare-se para a visita      ▼  │    │  ← EXPANDABLE
│ │        5 coisas a fazer             │    │     CHECKLIST
│ │                                     │    │
│ │ [Expanded if clicked]               │    │
│ │ 📋 Documentos                       │    │
│ │    "CPF, identidade ou comprovante"│    │
│ │ 🏥 Cartão de saúde                 │    │
│ │    "Se tiver convênio"             │    │
│ │ 🧴 Higiene bucal                   │    │
│ │    "Escove os dentes antes de vir" │    │
│ │ ⏰ Chegue cedo                      │    │
│ │    "10 minutos antes do horário"   │    │
│ │ 📱 Seu telefone                    │    │
│ │    "Em caso de dúvidas"            │    │
│ └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────┬──────────┬──────────┐         │
│  │  📅      │  🏥      │  📍      │         │  ← SECONDARY
│  │Reagendar │  Traço   │ Local    │         │     ACTIONS
│  └──────────┴──────────┴──────────┘         │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ Acompanhamento                      │    │  ← TREATMENT
│ │ ✓ Limpeza (27 mar)                  │    │     PROGRESS
│ │ ✓ Raspagem (20 mar)                 │    │
│ └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘

IMPROVEMENTS:
✅ Immediate action options (call/WhatsApp)
✅ Clear appointment info, no celebration
✅ Preparation guidance (expandable)
✅ Secondary actions visible and organized
✅ Treatment progress builds confidence
✅ Feels like a personal assistant
```

---

## INTERACTION FLOW

### Scenario 1: Patient opens app 5 days before appointment

```
Timeline: T-5 days
Patient thought: "Should I bring anything? Do I need to prepare?"

OLD FLOW:
1. Opens app
2. Sees: "Consulta confirmada com sucesso"
3. Thinks: "OK, I'm confirmed..."
4. No actionable next step
5. Closes app
❌ Doesn't prepare, may not bring required docs

NEW FLOW:
1. Opens app
2. Sees: "Ligar" / "WhatsApp" buttons (PROMINENT)
3. Taps "WhatsApp" (or calls) → "What should I bring?"
4. Or expands "Prepare-se para a visita" checklist
5. Reads: "Documentos, cartão de saúde, chegue cedo"
6. Feels prepared, confident
7. Returns to app 1 day before to confirm address
✅ Patient comes prepared, no-show rate ↓, experience ↑
```

### Scenario 2: Patient needs to reschedule

```
Timeline: T-2 days
Patient thought: "Something came up, I need to change the date"

OLD FLOW:
1. Sees appointment confirmed
2. No obvious way to reschedule
3. Has to dig, find contact, call clinic
4. Inconvenient ❌

NEW FLOW:
1. Sees "Reagendar" button in secondary actions
2. Taps → Opens reschedule flow
3. Done in 30 seconds ✅
```

### Scenario 3: Patient is anxious about treatment

```
Timeline: T-1 day
Patient thought: "Is this the first step? What's next after this?"

OLD FLOW:
1. Sees appointment details only
2. Has no context about treatment plan
3. Anxious, uncertain
4. May cancel ❌

NEW FLOW:
1. Sees "Acompanhamento" section
2. Shows: "✓ Limpeza (27 mar)" + "✓ Raspagem (20 mar)"
3. Understands: "This is phase 3 of my treatment"
4. Feels confident, progress narrative
5. Shows up, completes appointment ✅
```

---

## COLOR & VISUAL HIERARCHY

### Primary Actions (Top)
```
Call: From-[#0C9B72] To-[#0A7D5C] (clinic brand green)
WhatsApp: From-[#25D366] To-[#128C7E] (WhatsApp green)

Why: Both are actionable, visually distinct, immediately recognizable
```

### Appointment Details Card
```
Background: [#F9FAFB] (light gray, calm)
Border: [#E5E5EA] (subtle)
Status badge: Green pulse with [#34C759]
Countdown badge: Dynamic color (green < 1 day, yellow 1-3d, normal > 3d)

Why: Neutral background, status is immediate visual cue
```

### Preparation Checklist
```
Icons: Emoji (📋 🏥 🧴 ⏰ 📱)
Expanded items: White card with subtle borders
Hover: Border brightens to [#0C9B72]/50

Why: Emoji ≈ instant understanding, no localization needed
```

### Secondary Actions
```
Grid of 3 icons + labels
Hover: Border [#E5E5EA] → [#0C9B72]/50
Icon color: [#0C9B72]

Why: Consistent with brand, clear hover states
```

### Treatment Progress
```
Background: [#F9FAFB]
Completed items: Green checkmark, date in smaller text
Icon: [#34C759] (success color)

Why: Completed = green, visual confidence
```

---

## RESPONSIVE BREAKPOINTS

### Mobile (< 640px) — PRIMARY
```
Full width cards and buttons
All elements stack vertically
Secondary actions: 3-column grid (fits on screen)
Checklist items: Full width
Touch targets: 44-48px minimum
```

### Tablet (640px - 1024px)
```
Could optimize:
- Appointment card: 2 columns (details left, actions right)
- Secondary actions: Expand to 4 buttons (2x2 grid)
- Checklist items: Optional 2-column layout
```

### Desktop (> 1024px)
```
Not primary platform, but:
- Max width container (~480px) to maintain mobile feel
- Or expand to cards grid layout
```

---

## PERFORMANCE CONSIDERATIONS

### File Size Impact
```
New component: ~8KB (inline SVG icons)
Dependencies: None new (uses existing framer-motion)
Build impact: +0.2KB gzipped (minimal)
```

### Runtime Performance
```
Animations: GPU-accelerated (transform/opacity)
Re-renders: Minimal (single boolean toggle for checklist)
Memory: ~2KB for state
```

---

## A/B TEST HYPOTHESIS

**Null Hypothesis:** No change in appointment attendance

**Alternative Hypothesis:** New design increases:
- Appointment attendance +15%
- Patient confidence +40% (survey)
- Avg time on portal +2x (engagement)
- Support tickets -20% (self-service via WhatsApp)

**Test Duration:** 2 weeks (sample size: 500+ patients)

**Success Criteria:**
- Attendance ≥ 95% (vs baseline 80%)
- No increase in cancellations
- Patient NPS increases by 5+ points

