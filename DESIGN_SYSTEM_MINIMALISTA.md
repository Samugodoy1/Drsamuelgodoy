# Design System - Portal Minimalista

## 📱 Screenshots Conceituais

### Tela 1: Greeting + Consulta Próxima
```
┌─────────────────────────────────┐
│                                 │
│  Olá, Vitor 👋                  │
│  Estamos aqui para cuidar       │
│  de você.                       │
│                                 │
├─────────────────────────────────┤
│                                 │
│  ⏰  ┌──────────────────┐       │
│     │ faltam 2 dias    │       │
│                                 │
│  Você consegue vir              │
│  quinta-feira às 08:00?         │
│                                 │
│  💙 Dr. Samuel está te          │
│     esperando                   │
│  ⏱ Última atualização...        │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Sim, conta comigo! 👍     │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Como chegar?             │  │
│  └──────────────────────────┘  │
│  ┌──────────────────────────┐  │
│  │ Tenho dúvida             │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Tela 2: Pós-Operatório
```
┌─────────────────────────────────┐
│                                 │
│  Olá, Vitor 👋                  │
│  Estamos aqui para cuidar       │
│  de você.                       │
│                                 │
├─────────────────────────────────┤
│                                 │
│  🏥  ┌──────────────────┐       │
│     │ hoje mesmo       │       │
│                                 │
│  Como se sente agora?           │
│                                 │
│  💙 Você realizou Limpeza       │
│     com Destartarização.        │
│     Dr. Samuel está             │
│     acompanhando...             │
│  ⏱ Procedimento realizado       │
│     hoje                        │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Fazer check-in 💙        │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Falar com Dr. Samuel     │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Tela 3: Sem Consulta Agendada
```
┌─────────────────────────────────┐
│                                 │
│  Olá, Vitor 👋                  │
│  Estamos aqui para cuidar       │
│  de você.                       │
│                                 │
├─────────────────────────────────┤
│                                 │
│  😕  ┌──────────────────┐       │
│     │ Já é hora de     │       │
│     │ cuidar...        │       │
│                                 │
│  Quando foi sua última visita?  │
│                                 │
│  💙 Dr. Samuel quer saber       │
│     como você está              │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Agendar agora 📅        │  │
│  └──────────────────────────┘  │
│                                 │
│  ┌──────────────────────────┐  │
│  │ Preciso falar com a      │  │
│  │ clínica                  │  │
│  └──────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

## 🎨 Componentes Reutilizáveis

### ConversationalMoment
**Props principais:**
- `emoji`: string (emoji grande - 6xl)
- `question`: string (pergunta principal)
- `context`: string (pequeno badge no topo)
- `urgencyLevel`: 'critical' | 'high' | 'medium' | 'low'
- `primaryCTA`: { label, onClick, loading?, emotion? }
- `secondaryCTAs`: array de botões secundários
- `doctorMessage`: string (mensagem personalizada)
- `lastUpdate`: string (contexto temporal)

**Cores por urgência:**
```
critical (🚨) → Fundo branco + Borda vermelha (#FF3B30)
high (⚠️)     → Fundo branco + Borda laranja (#FF9500)
medium (⏰)   → Fundo branco + Borda amarela (#FFD60A)
low (✓)      → Fundo branco + Borda verde (#0C9B72)
```

### ActionCard
**Props principais:**
- `icon`: React.ReactNode
- `label`: string (pequeno badge em cima)
- `title`: string (grande e principal)
- `subtitle`: string (complemento)
- `variant`: 'info' | 'success' | 'warning' | 'danger' | 'neutral'
- `primaryAction`: botão colorido
- `secondaryActions`: botões cinzentos

## 📐 Espacejamento

```
Greeting:
├─ Margin top: 16px (pt-4)
├─ H1: 32px/40px
└─ P: 16px com mt-2

Card:
├─ Border radius: 32px (rounded-[32px])
├─ Padding: 32px (p-8) mobile, 40px (p-10) desktop
├─ Gap entre elementos: 24px (space-y-6)

Button:
├─ Height: 48px (h-12) primary
├─ Height: 44px (h-11) secondary
├─ Border radius: 24px (rounded-full)
├─ Font size: 15px primary, 14px secondary
└─ Font weight: semibold

Divider:
└─ Height: 1px (#E5E5EA)
```

## 🎯 Hierarquia Visual

1. **Greeting** → Maior tamanho, mais contraste
2. **Pergunta Principal** → Grande, 28-32px
3. **Contexto** → Badge colorido pequeno
4. **Emoji** → Muito grande (6xl), emotivo
5. **Botão Primário** → Cor sólida, grande altura
6. **Botões Secundários** → Cinzentos, mais sutis
7. **Mensagens Suplementares** → Pequenas, cinzentas

## 🔄 Animações

- **Entrada**: opacity 0→1, y: -10→0, duration: 400ms
- **Card Hover**: scale 1→1.02 (sutil)
- **Button Tap**: scale 1→0.98 (feedback tátil)
- **Loading**: rotate 360°, duration: 1s, infinite

## 📱 Responsive

- **Mobile**: Tudo em coluna, padding 32px lados
- **Desktop**: Mesma estrutura, melhor espaçamento

## ✨ Micro-interações

- Botão hover: slight scale up
- Botão tap: scale down (0.98)
- Card fade-in com delay by index
- Context badge pulsa levemente (spring animation)

## 🚫 Removidos

- Gradientes complexos
- Glows e blurs extensos
- Animações rotativas contínuas
- Múltiplas camadas de overlay
- Bordas com múltiplas cores
- Elementos decorativos desnecessários

## ✅ Mantidos

- Funcionalidade completa
- Responsividade
- Acessibilidade (contrast ratios OK)
- Transições suaves
- Estrutura de dados original
