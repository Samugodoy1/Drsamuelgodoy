# 🎨 Patient Portal — UI/UX Improvements (Visual Guide)

## Status Overview Component

### ⚠️ PROBLEMA ATUAL

```
Paciente não sabe diferenciar:
- "SCHEDULED" vs "CONFIRMED"
- "Preciso fazer algo?" vs "Só informação?"
```

### ✅ SOLUÇÃO PROPOSTA

```jsx
// SCHEDULED → Requer ação
<div className="p-4 bg-[#007AFF]/5 border border-[#007AFF]/20 rounded-xl">
  <div className="flex items-start gap-3">
    <div className="w-5 h-5 rounded-full border-2 border-[#007AFF] mt-0.5" />
    <div>
      <p className="font-semibold text-[#1C1C1E]">Confirme sua presença</p>
      <p className="text-[#8E8E93] text-sm">Você vem dia 20 de abril às 14:30?</p>
      <div className="flex gap-2 mt-3">
        <button className="px-4 py-2 bg-[#1C1C1E] text-white rounded-lg text-sm font-medium">
          Confirmar
        </button>
        <button className="px-4 py-2 border border-[#D1D1D6] text-[#1C1C1E] rounded-lg text-sm font-medium">
          Reagendar
        </button>
      </div>
    </div>
  </div>
</div>

// vs

// CONFIRMED → Apenas Informação
<div className="p-4 bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl">
  <div className="flex items-center gap-3">
    <div className="w-5 h-5 bg-[#34C759] rounded-full flex items-center justify-center">
      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
    <div>
      <p className="font-semibold text-[#1C1C1E]">Presença confirmada</p>
      <p className="text-[#8E8E93] text-sm">20 de abril • 14:30 • Dra. Marina</p>
    </div>
  </div>
</div>
```

---

## Payment Flow — Before & After

### 🔴 CURRENT (Confusing)

```
User Journey:
1. Home screen → "Financeiro" tab
2. See "Parcelas Pendentes" 
3. Click "Pagar" button
4. PIX Modal opens
5. "Chave PIX" button
6. "Copiar" → "Copiado!" 
7. Click "Já Paguei — Informar Clínica"
8. Success state

PROBLEMS:
- Multiple steps to payment
- Unclear what happens after "Copiar"
- "Informar Clínica" confusing name
- No summary of what was paid
```

### ✅ IMPROVED FLOW

```
User Journey (3 clear steps):
┌─────────────────────────────────────┐
│ STEP 1: CHOOSE PAYMENT METHOD       │
├─────────────────────────────────────┤
│ [✓ PIX] [Em breve: Débito] [À vista]│
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ STEP 2: CONFIRM AMOUNT              │
├─────────────────────────────────────┤
│ Parcela #3                          │
│ Vencimento: 30 de abril             │
│                                     │
│ Valor: R$ 450,00                    │
│ ┌─────────────────────────────────┐ │
│ │ [Copy PIX Key]                  │ │
│ │ ✓ Copiado!                      │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Cole a chave no seu app bancário    │
│ (vemos a mensagem tempo real)       │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ STEP 3: CONFIRM SENT                │
├─────────────────────────────────────┤
│ ✓ Pagamento enviado!                │
│                                     │
│ Já transferiu?                      │
│ [SIM, JÁ PAGUEI] [VOLTAR]          │
│                                     │
│ (Se clica sim)                      │
│ "Avisaremos a clínica."             │
│ "Eles confirmarão em breve."        │
└─────────────────────────────────────┘
```

---

## Color System — Before & After

### 🔴 CURRENT

```
Inconsistencies found:
- bg-[#FF9500]/[0.04] (Wait, why [0.04]?)
- bg-[#FF9500]/10
- bg-[#FF3B30]/10
- bg-white
- bg-[#F2F2F7]

Users perception: "Looks janky"
```

### ✅ RECOMMENDED

Create `constants/colors.ts`:

```typescript
// Foundation Colors (Apple iOS)
export const COLORS = {
  // Neutrals
  neutral: {
    bg: '#FFFFFF',
    bg_secondary: '#F2F2F7',
    bg_tertiary: '#E5E5EA',
    text_primary: '#1C1C1E',
    text_secondary: '#8E8E93',
    text_tertiary: '#AEAEB2',
    border: '#E5E5EA',
    divider: '#F2F2F7',
  },

  // Semantic
  semantic: {
    success: '#34C759',
    success_bg: '#34C759',
    success_bg_light: '#34C759' + '/10', // #34C75910

    warning: '#FF9500',
    warning_bg: '#FF9500',
    warning_bg_light: '#FF9500' + '/10',

    error: '#FF3B30',
    error_bg: '#FF3B30',
    error_bg_light: '#FF3B30' + '/10',

    info: '#007AFF',
    info_bg: '#007AFF',
    info_bg_light: '#007AFF' + '/10',
  },

  // Brand
  brand: {
    primary: '#0C9B72',
    primary_light: '#0C9B72' + '/10',
  },
};
```

Usage in components:

```jsx
<div className={`bg-[${COLORS.semantic.success_bg_light}]`}>
  // Consistent everywhere
</div>
```

---

## Modal Refinements

### ⚠️ ISSUE: Modal too narrow on desktop

```jsx
// CURRENT
sm:max-w-md  // 448px — too small for desktop

// IMPROVED
sm:max-w-lg  // 512px — more breathing room
```

### Visual Comparison

```
Mobile (< 640px):
┌────────────────────────────────────────┐
│  Bottom Sheet                          │
│  (full width, rounded top)             │
│                                        │
│  Title                                 │
│  ─────────────────────────────────────│
│  Content                               │
│  ────────────────────────────────────  │
│  [Primary Button]                      │
└────────────────────────────────────────┘

Desktop (≥ 640px):
        ┌────────────┐
        │   Modal    │
        │  Centered  │
        │  512px     │
        │ (512px ×  │
        │  ~600px)   │
        │            │
        └────────────┘
```

---

## Loading & Error States

### ✅ Proper State Machine

```
IDLE
  ↓
LOADING (show spinner)
  ↓
├─→ SUCCESS (show checkmark, then return to IDLE)
└─→ ERROR (show alert, retry button, then back to IDLE)
```

### Visual Examples

```jsx
// LOADING
<div className="flex items-center gap-3">
  <div className="w-5 h-5 border-2 border-[#E5E5EA] border-t-[#0C9B72] rounded-full animate-spin" />
  <span>Confirmando...</span>
</div>

// ERROR
<div className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl p-4">
  <div className="flex items-start gap-3">
    <AlertCircle size={20} className="text-[#FF3B30] mt-0.5" />
    <div>
      <p className="font-semibold text-[#1C1C1E]">Algo deu errado</p>
      <p className="text-[#8E8E93] text-sm mt-1">Verifique sua conexão e tente novamente.</p>
      <button className="mt-3 px-4 py-2 bg-[#FF3B30] text-white rounded-lg text-sm font-medium">
        Tentar Novamente
      </button>
    </div>
  </div>
</div>

// SUCCESS
<div className="bg-[#34C759]/10 border border-[#34C759]/20 rounded-xl p-4">
  <div className="flex items-center gap-3">
    <CheckCircle2 size={20} className="text-[#34C759]" />
    <p className="font-semibold text-[#1C1C1E]">Consulta confirmada!</p>
  </div>
</div>
```

---

## Procedure Guides — Simplification

### ⚠️ CURRENT PROBLEM

```
User just had surgery, sees 8 care items. Feels overwhelming.
Only 20% remember by reading time 3.
```

### ✅ SOLUTION: Progressive Disclosure

```jsx
// SIMPLIFIED (always visible)
<div className="bg-[#FF9500]/10 rounded-xl p-4">
  <div className="flex items-start gap-3">
    <Shield size={20} className="text-[#FF9500]" />
    <div>
      <p className="font-semibold">Cuidados pós-extração (Hoje)</p>
      <ul className="list-disc list-inside mt-2 text-sm text-[#8E8E93]">
        <li>Gelo 20/20 min</li>
        <li>Alimentos frios</li>
        <li>Sem bochechos</li>
      </ul>
      <button className="mt-3 text-[#FF9500] font-medium text-sm">
        Ver todas as orientações
      </button>
    </div>
  </div>
</div>

// EXPANDED (onClick "Ver todas")
<div className="bg-[#FF9500]/10 rounded-xl p-4 space-y-3">
  <p className="font-semibold">Cuidados pós-extração — Instruções Completas</p>
  
  {[
    { icon: '🧊', text: 'Aplique gelo (20 min sim / 20 min não) nas primeiras 24h' },
    { icon: '🍽️', text: 'Alimentos pastosos e frios nas primeiras 48h' },
    { icon: '🚫', text: 'Não faça bochechos nas primeiras 24h' },
    { icon: '💊', text: 'Medicação nos horários prescritos' },
  ].map((item) => (
    <div key={item.text} className="flex gap-3">
      <span className="text-xl">{item.icon}</span>
      <p className="text-sm text-[#3A3A3C]">{item.text}</p>
    </div>
  ))}
  
  <button className="w-full mt-4 py-2 border border-[#FF9500] text-[#FF9500] rounded-lg font-medium">
    Fechar
  </button>
</div>
```

---

## Empty States — Better Copy

### 🔴 CURRENT

```jsx
<PortalEmptyState icon={Activity} text="Nenhuma evolução clínica registrada" />
// Feels clinical, not helpful
```

### ✅ IMPROVED

```jsx
const EMPTY_STATES = {
  appointments: {
    title: 'Sem consultas próximas',
    description: 'Agende sua próxima consulta para continuar seu tratamento.',
    cta: 'Agendar Consulta',
    action: () => setActiveTab('agendar'),
  },
  evolution: {
    title: 'Histórico de evoluções',
    description: 'Suas evoluções clínicas aparecerão aqui após cada consulta.',
    cta: null,
  },
  documents: {
    title: 'Documentos',
    description: 'Seus documentos e radiografias aparecerão aqui.',
    cta: null,
  },
  financial: {
    title: 'Sem transações',
    description: 'Seus pagamentos aparecem aqui. Tudo certo?',
    cta: null,
  },
};

// Render:
<div className="py-12 text-center">
  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
    <Activity size={24} className="text-[#C7C7CC]" />
  </div>
  <p className="text-[#1C1C1E] font-semibold text-[17px]">
    {EMPTY_STATES[activeTab].title}
  </p>
  <p className="text-[#8E8E93] text-[15px] mt-2">
    {EMPTY_STATES[activeTab].description}
  </p>
  {EMPTY_STATES[activeTab].cta && (
    <button className="mt-4 px-6 py-2 bg-[#0C9B72] text-white rounded-full font-medium text-sm">
      {EMPTY_STATES[activeTab].cta}
    </button>
  )}
</div>
```

---

## Accessibility Improvements

### Currently:
- ✅ Modal focus trap (good)
- ✅ Semantic HTML (good)
- ⚠️ Color only differentiation (needs improvement)
- ⚠️ No loading announcement to screen readers

### Recommended:

```jsx
// Add aria-live regions for updates
<div 
  role="status" 
  aria-live="polite" 
  aria-atomic="true"
  className="sr-only"
>
  {loadingMessage}
</div>

// Use aria-busy for loading states
<button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? 'Carregando...' : 'Confirmar'}
</button>

// Icon + Text, not color only
<div className="flex items-center gap-2">
  <CheckCircle2 size={20} className="text-[#34C759]" />
  <span>Confirmado</span>
</div>
```

---

## Typography Hierarchy — Proposed

```css
/* Display (H1 equivalent) */
.text-display: font-size 28px, font-weight 700, letter-spacing -0.5px

/* Title (H2 equivalent) */
.text-title: font-size 22px, font-weight 600, letter-spacing -0.3px

/* Headline (H3 equivalent) */
.text-headline: font-size 17px, font-weight 600, letter-spacing -0.2px

/* Body Large */
.text-body-lg: font-size 16px, font-weight 400, letter-spacing 0px

/* Body */
.text-body: font-size 15px, font-weight 400, letter-spacing 0px

/* Body Small */
.text-body-sm: font-size 13px, font-weight 400, letter-spacing 0px

/* Caption */
.text-caption: font-size 12px, font-weight 500, letter-spacing 0px

/* Label */
.text-label: font-size 11px, font-weight 600, letter-spacing 1px (uppercase)

/* Monospace (for prices, codes) */
.text-mono: font-family 'SF Mono', monospace, font-size 15px
```

---

## Responsive Breakpoints — Verify

```jsx
// Mobile first (current good)
sm:  640px  // Tablets
md:  768px  // Small laptops
lg:  1024px // Desktops
xl:  1280px // Large desktops

// Ensure modals adapt:
```

```jsx
<motion.div className="
  sm:max-w-lg  // 512px
  md:max-w-lg  // Still 512px (good)
  lg:max-w-lg  // Max width for readability
">
```

---

## Summary: Impact of Improvements

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Fix SCHEDULED/CONFIRMED clarity | HIGH (prevents user confusion) | Medium (1-2 days) | 🔴 CRITICAL |
| Consolidate colors system | HIGH (professional appearance) | Low (2-4 hours) | 🔴 CRITICAL |
| Simplify payment flow | HIGH (core feature) | Medium (2 days) | 🟠 HIGH |
| Improve error states | MEDIUM (reliability perception) | Low (1 day) | 🟠 HIGH |
| Progressive disclosure for guides | MEDIUM (better UX) | Medium (1 day) | 🟡 MEDIUM |
| Empty state copy | LOW (polish) | Low (2-4 hours) | 🟡 MEDIUM |
| Typography audit | MEDIUM (professionalism) | Low (1-2 days) | 🟠 HIGH |
| A11y improvements | MEDIUM (compliance + fairness) | Medium (1-2 days) | 🟠 HIGH |

---

*Visual Guide prepared for: Patient Portal Pre-Launch Sprint*
*Design Team: Apple Design Systems*
