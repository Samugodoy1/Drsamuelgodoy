# Portal Refactor - Estilo Minimalista Apple

## 📱 Overview da Refatoração

O portal do paciente foi refatorado para seguir princípios de design minimalista inspirados na Apple:
- Muito espaço em branco
- Tipografia clara e hierarquizada
- Cards simples e diretos
- Botões grandes e destacados
- Animações suaves e propositais
- Foco no conteúdo principal
- Paleta de cores limpa

## 🎨 Mudanças Visuais

### ConversationalMoment.tsx
**Antes:**
- Gradientes complexos com glows e blur
- Animações rotativas contínuas
- Muitos elementos decorativos
- Bordas com múltiplas cores e opacidades

**Depois:**
- Fundo branco simples
- Borda sólida colorida (cor por urgência)
- Emoji grande e propositalmente posicionado
- Card badge para contexto minimalista
- Botões com cores sólidas

### ActionCard.tsx
**Antes:**
- Fundo gradiente complexo
- Blobs de cor em degradê
- Múltiplas camadas de overlay

**Depois:**
- Fundo branco com borda simples
- Ícone em círculo minimalista
- Estrutura limpa com espaço

### PatientPortalHome.tsx
**Antes:**
- Múltiplos "atos" com estrutura narrativa
- Saudação com horário
- Muitos divisores com gradientes

**Depois:**
- Saudação simples: "Olá, [Nome] 👋"
- Subtítulo: "Estamos aqui para cuidar de você."
- Um momento principal por vez
- Divisores simples em linha sólida

## 🎯 Padrões de Design Mantidos

1. **Momento Conversacional**: Pergunta clara + Contexto + Ação principal
2. **Urgência por Cores**:
   - `critical` (vermelho): Dor/emergência agora
   - `high` (laranja): Consulta em até 1 dia
   - `medium` (amarelo): Consulta em 2-3 dias
   - `low` (verde): Tudo normal

3. **Estrutura de Conteúdo**:
   ```
   Emoji Grande → Contexto Badge
   Pergunta Principal
   └─ Mensagem do Dr. + Última atualização
   └─ Botão Primário Colorido
   └─ Botões Secundários Cinzentos
   ```

## 🔧 Componentes Refatorados

### ConversationalMoment
```typescript
<ConversationalMoment
  emoji="⏰"
  question="Você consegue vir quinta às 08:00?"
  context="faltam 2 dias"
  urgencyLevel="medium"
  doctorMessage="Dr. Samuel está te esperando"
  primaryCTA={{
    label: "Sim, conta comigo!",
    emotion: "👍",
    onClick: () => {}
  }}
  secondaryCTAs={[...]}
/>
```

### ActionCard
```typescript
<ActionCard
  icon={<Calendar />}
  label="Sua Próxima Consulta"
  title="Quinta-feira, 30 de abril"
  subtitle="10:30 com Dr. Samuel"
  variant="info"
  primaryAction={{
    label: "Ver detalhes",
    onClick: () => {}
  }}
/>
```

## 📐 Tipografia

- **Greeting**: 32px-40px, Bold, #1C1C1E
- **Descrição**: 16px, regular, #8E8E93
- **Pergunta**: 28px-32px, Bold, #1C1C1E
- **Subtítulo**: 15px, Medium, #8E8E93
- **Label**: 12px, Semibold uppercase, cor por urgência
- **Botão**: 15px, Semibold, white
- **Secundário**: 14px, Medium, #8E8E93

## 🎨 Paleta de Cores

- **Branco**: #FFFFFF (background dos cards)
- **Cinza claro**: #F2F2F7 (page background)
- **Cinza médio**: #E5E5EA (divisores)
- **Cinza escuro**: #8E8E93 (texto secundário)
- **Preto**: #1C1C1E (texto principal)

**Por Urgência:**
- Critical: #FF3B30 (vermelho)
- High: #FF9500 (laranja)
- Medium: #FFD60A (amarelo)
- Low: #0C9B72 (verde)

## 🧪 Como Testar

1. Acesse o portal do paciente
2. Verifique se a saudação é simples: "Olá, [Nome] 👋"
3. O card principal deve ter:
   - Emoji grande
   - Badge com contexto
   - Pergunta clara
   - Botão primário com cor sólida
4. Botões secundários devem ser cinzentos e sutis

## 📝 Notas Importantes

- O design mantém a funcionalidade completa
- Transições ainda são suaves mas menos agressivas
- Todos os momentos (emergency, appointment, post-op) foram adaptados
- Responsive design mantido (mobile first)
- Acessibilidade preservada

## 🚀 Próximas Fases

1. Refatorar PatientPortal.tsx (container principal)
2. Atualizar PatientPortalDepth.tsx (histórico completo)
3. Simplificar modais (GuidedConversation, PostOperativeCheckIn)
4. Revisão de paleta de cores em contextos adicionais
