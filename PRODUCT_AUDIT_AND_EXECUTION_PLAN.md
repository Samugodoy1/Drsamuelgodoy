# Auditoria Técnica — OdontoHub (foco em fluxo funcional e confiabilidade)

## 1) O que já existe hoje

- Backend já possui endpoint para solicitação de consulta no portal do paciente: `POST /api/portal/request-appointment` (`requestAppointment`).
- Tabela `appointment_requests` já existia com vínculo `patient_id`, `dentist_id`, `created_at` e `status`.
- Dashboard da clínica já possuía inbox de solicitações (`PortalInbox`) e contador de pendências (`portalPendingCount`) na aplicação principal.
- Fluxos de confirmação/cancelamento/reagendamento já estavam modelados no backend.

## 2) O que estava quebrado / inconsistente

### 2.1 Bug crítico (reportado)
- O fluxo “O que está incomodando?” enviava payload com `preferred_date: ''`.
- O backend exigia `preferred_date` obrigatório e retornava 400.
- Resultado prático: paciente “envia”, mas solicitação não é persistida de forma confiável, e o dentista não recebe no inbox.

### 2.2 Inconsistência de modelo
- Produto pedia motivo/período/observação, porém o backend e parte da UI estavam centrados em `preferred_date` + `preferred_time`.
- Não havia campos explícitos para `reason_category` e `desired_period`.

### 2.3 Operação clínica incompleta
- Inbox tinha ações básicas (aprovar/recusar), mas não cobria totalmente operação pedida (confirmar, WhatsApp, arquivar).

## 3) O que era “fake/front sem backend”

- Parte do fluxo conversacional do portal parecia funcional visualmente, mas quebrava no contrato backend (payload inválido para persistência).
- Isso caracterizava um “happy path visual” sem fechamento transacional consistente no servidor.

## 4) O que precisa refatorar (em progresso)

### 4.1 Contrato de dados único para solicitação
Padronizar solicitação com:
- `reason_category`
- `desired_period`
- `notes`
- `status = PENDING`
- `patient_id`, `dentist_id`, `created_at`

### 4.2 Estados de workflow
Padronizar status do lead:
- `PENDING`
- `CONFIRMED`
- `REJECTED`
- `ARCHIVED`

### 4.3 Observabilidade
- Criar trilha de métricas por etapa: solicitação criada, lida, confirmada, rejeitada, arquivada.

## 5) Gargalos de banco / auth / rotas

### Banco
- `appointment_requests` precisava de colunas específicas para o novo fluxo (`reason_category`, `desired_period`).
- Necessário validar índices por `dentist_id`, `status`, `created_at` para escala de inbox.

### Auth
- Fluxo portal depende de JWT de portal (`verifyPortalAuth`) e está corretamente separado das rotas autenticadas do dentista.
- Melhorar rastreabilidade de falhas de autenticação no portal com logging estruturado.

### Rotas
- Rotas principais já existem, mas faltava alinhamento estrito entre payload front e backend.

---

## Plano técnico por fases

## Fase 1 — Consertar motor (prioridade máxima)
1. Unificar payload e persistência de solicitação.
2. Garantir criação de registro `PENDING` com vínculo paciente/clínica e timestamp.
3. Corrigir fluxo “O que está incomodando?” para enviar dados válidos.
4. Cobrir fallback para compatibilidade com clientes legados.

## Fase 2 — Alerta para dentista
1. Atualização frequente do contador de pendências no dashboard (polling curto).
2. Inbox com foco em pendentes e ações operacionais rápidas.
3. Próximo passo: webhook/evento + e-mail transacional imediato.
4. Próximo passo 2: integração WhatsApp API (oficial), evitando apenas `wa.me` manual.

## Fase 3 — Dashboard clínica
1. Consolidar tabela “Solicitações de Consulta” com colunas operacionais.
2. Ações: confirmar, WhatsApp, rejeitar, arquivar.
3. Vincular ação “confirmar” a fluxo de criação/abertura de agendamento no calendário.

## Fase 4 — Portal paciente (depois de funcionar)
1. Home utilitária com prioridade para:
   - próxima consulta
   - solicitar consulta
   - falar com clínica
   - tratamento
   - financeiro
   - histórico
2. Reduzir blocos promocionais e priorizar tarefas.

---

## Critérios de pronto (DoD)
- Paciente envia solicitação e registro aparece no banco com `PENDING`.
- Dentista visualiza pendência em até 30s no dashboard.
- Dentista consegue confirmar/rejeitar/arquivar e acionar WhatsApp.
- Fluxo não depende de data obrigatória quando objetivo é “pedido de contato por período”.
