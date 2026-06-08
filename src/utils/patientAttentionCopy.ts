export type PatientListFilter =
  | 'all'
  | 'action-needed'
  | 'need-attention'
  | 'can-return'
  | 'in-follow-up';

export const PATIENT_FILTER_URGENCY: PatientListFilter[] = [
  'action-needed',
  'need-attention',
  'can-return',
  'in-follow-up',
];

export interface PatientCardMetaLike {
  isLead: boolean;
  lastVisitDate: Date | null;
  lastVisitLabel: string;
  nextVisitDate: Date | null;
  clinicalStatus: string;
  attentionStatus: { key: string };
  status?: string;
  daysSinceLastVisit?: number;
}

export interface PatientIntelLike {
  priority?: string;
  status?: string;
  priority_reason?: string;
  has_future_appointment?: boolean;
  has_active_treatment?: boolean;
  next_appointment_date?: string;
  days_since_last_visit?: number | null;
  pending_procedure?: string | null;
  pending_teeth?: number[];
  urgent_teeth?: number[];
}

export interface NextAppointmentLike {
  start_time: string;
  status: string;
  notes?: string | null;
}

interface PhraseContext {
  filter: PatientListFilter;
  meta: PatientCardMetaLike;
  intel: PatientIntelLike | null;
  now: Date;
  nextAppointment: NextAppointmentLike | null;
}

// ─── Filter matching ───────────────────────────────────────────────────────

export function matchesPatientListFilter(
  filter: PatientListFilter,
  meta: PatientCardMetaLike,
  intel: PatientIntelLike | null,
  now: Date
): boolean {
  if (filter === 'all') return true;
  if (filter === 'action-needed') return intel?.priority === 'HIGH';
  if (filter === 'can-return') return meta.attentionStatus.key === 'overdue';

  if (filter === 'in-follow-up') {
    if (!meta.nextVisitDate || meta.nextVisitDate < now) return false;
    if (intel?.priority === 'HIGH') return false;
    if (meta.attentionStatus.key === 'overdue') return false;
    if (meta.isLead) return false;
    if (intel?.status === 'ABANDONO' || intel?.status === 'ATENCAO') return false;
    return true;
  }

  if (filter === 'need-attention') {
    if (intel?.priority === 'HIGH') return false;
    if (meta.attentionStatus.key === 'overdue') return false;
    if (
      meta.nextVisitDate &&
      meta.nextVisitDate >= now &&
      intel?.status !== 'ABANDONO' &&
      intel?.status !== 'ATENCAO' &&
      !meta.isLead
    ) {
      return false;
    }
    if (meta.isLead) return true;
    if (intel?.status === 'ABANDONO' || intel?.status === 'ATENCAO') return true;
    if (meta.attentionStatus.key === 'review') return true;
    if (intel) {
      return !intel.has_future_appointment && intel.status !== 'FINALIZADO';
    }
    return !meta.nextVisitDate && meta.lastVisitDate !== null;
  }

  return true;
}

export function computePatientFilterCounts(
  patients: { id: number }[],
  getMeta: (patient: { id: number }) => PatientCardMetaLike,
  patientIntelligence: PatientIntelLike[],
  now: Date
): Record<'action-needed' | 'need-attention' | 'can-return' | 'in-follow-up', number> {
  const intelMap = new Map<number, PatientIntelLike>();
  patientIntelligence.forEach((pi: any) => intelMap.set(pi.patient_id, pi));

  const counts = {
    'action-needed': 0,
    'need-attention': 0,
    'can-return': 0,
    'in-follow-up': 0,
  };

  for (const patient of patients) {
    const meta = getMeta(patient);
    const intel = intelMap.get(patient.id) || null;
    for (const key of PATIENT_FILTER_URGENCY) {
      if (matchesPatientListFilter(key, meta, intel, now)) {
        counts[key]++;
      }
    }
  }

  return counts;
}

export function buildPatientFilterChips(
  counts: Record<'action-needed' | 'need-attention' | 'can-return' | 'in-follow-up', number>
) {
  return [
    { key: 'action-needed' as const, label: 'Agir agora', count: counts['action-needed'] },
    { key: 'need-attention' as const, label: 'Precisam de atenção', count: counts['need-attention'] },
    { key: 'can-return' as const, label: 'Podem voltar', count: counts['can-return'] },
    { key: 'in-follow-up' as const, label: 'Em acompanhamento', count: counts['in-follow-up'] },
    { key: 'all' as const, label: 'Todos', count: null },
  ].filter(chip => chip.count === null || chip.count > 0);
}

export function getPatientFilterHeader(filter: PatientListFilter): string | null {
  const headers: Partial<Record<PatientListFilter, string>> = {
    'action-needed': 'Separei alguns pacientes que podem precisar de você.',
    'need-attention': 'Pequenas ações agora podem evitar perda de acompanhamento.',
    'can-return': 'Existem oportunidades de retorno aqui.',
    'in-follow-up': 'Todos esses pacientes já possuem próximo passo definido.',
  };
  return headers[filter] ?? null;
}

// ─── Phrase helpers ──────────────────────────────────────────────────────────

function getDaysSinceLastVisit(meta: PatientCardMetaLike, intel: PatientIntelLike | null): number | null {
  if (intel?.days_since_last_visit != null) return intel.days_since_last_visit;
  if (meta.daysSinceLastVisit != null && Number.isFinite(meta.daysSinceLastVisit)) {
    return meta.daysSinceLastVisit;
  }
  if (meta.lastVisitDate) {
    return Math.max(0, Math.floor((Date.now() - meta.lastVisitDate.getTime()) / 86400000));
  }
  return null;
}

function formatElapsedDays(days: number): string {
  if (days <= 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
  }
  const years = Math.floor(days / 365);
  return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
}

function formatSemRetorno(days: number): string {
  if (days < 90) return `Sem retorno há ${days} dias.`;
  return `Sem retorno ${formatElapsedDays(days)}.`;
}

function formatUltimoAtendimento(days: number): string {
  return `Último atendimento ${formatElapsedDays(days)}.`;
}

function resolveNextDate(
  meta: PatientCardMetaLike,
  intel: PatientIntelLike | null,
  nextAppointment: NextAppointmentLike | null,
  now: Date
): Date | null {
  if (meta.nextVisitDate && meta.nextVisitDate >= now) return meta.nextVisitDate;
  if (nextAppointment) {
    const parsed = new Date(nextAppointment.start_time);
    if (!Number.isNaN(parsed.getTime()) && parsed >= now) return parsed;
  }
  if (intel?.next_appointment_date) {
    const parsed = new Date(intel.next_appointment_date);
    if (!Number.isNaN(parsed.getTime()) && parsed >= now) return parsed;
  }
  return null;
}

function formatScheduledReturn(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `Retorna em ${day}/${month} às ${hh}:${mm}.`;
}

function isTomorrow(date: Date, now: Date): boolean {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const startAfterTomorrow = new Date(startTomorrow);
  startAfterTomorrow.setDate(startAfterTomorrow.getDate() + 1);
  return date >= startTomorrow && date < startAfterTomorrow;
}

function hasTreatmentGap(intel: PatientIntelLike | null): boolean {
  if (!intel) return false;
  const hasPendingTeeth = (intel.pending_teeth?.length ?? 0) > 0 || (intel.urgent_teeth?.length ?? 0) > 0;
  return Boolean(intel.pending_procedure || hasPendingTeeth || (intel.has_active_treatment && !intel.has_future_appointment));
}

// ─── Filter-specific phrase strategies ───────────────────────────────────────

function phraseForActionNeeded(ctx: PhraseContext): string {
  const { meta, intel, now, nextAppointment } = ctx;

  if (nextAppointment) {
    const apptDate = new Date(nextAppointment.start_time);
    const status = String(nextAppointment.status || '').toUpperCase();
    if (!Number.isNaN(apptDate.getTime()) && isTomorrow(apptDate, now) && status === 'SCHEDULED') {
      return 'Não confirmou a consulta de amanhã.';
    }
  }

  if (hasTreatmentGap(intel)) {
    return 'Possui pendência que pode interromper o tratamento.';
  }

  const days = getDaysSinceLastVisit(meta, intel);
  if (intel?.status === 'ABANDONO' && days != null) {
    return formatSemRetorno(days);
  }

  if (intel?.has_active_treatment && !intel.has_future_appointment) {
    return 'Tratamento em andamento sem próximo passo marcado.';
  }

  return 'Existe uma ação recomendada para este paciente.';
}

function phraseForNeedAttention(ctx: PhraseContext): string {
  const { meta, intel } = ctx;

  if (meta.isLead) {
    return 'Primeira consulta ainda não foi marcada.';
  }

  const days = getDaysSinceLastVisit(meta, intel);

  if (intel?.status === 'ATENCAO' && !intel.has_future_appointment) {
    return 'Está sem acompanhamento definido.';
  }

  if (!meta.nextVisitDate && !intel?.has_future_appointment) {
    if (days != null && days >= 14) {
      return formatSemRetorno(days);
    }
    return 'Ainda não possui próxima consulta.';
  }

  if (meta.attentionStatus.key === 'review' && days != null) {
    return formatSemRetorno(days);
  }

  if (days != null && days >= 30) {
    return formatSemRetorno(days);
  }

  return 'Ainda não possui próxima consulta.';
}

function phraseForCanReturn(ctx: PhraseContext): string {
  const { meta, intel } = ctx;
  const days = getDaysSinceLastVisit(meta, intel);

  if (days != null && days >= 120) {
    return formatUltimoAtendimento(days);
  }

  if (days != null && days >= 60) {
    return 'Pode ser um bom momento para retorno.';
  }

  if (!meta.lastVisitDate && days == null) {
    return 'Sem consultas recentes registradas.';
  }

  return 'Existe oportunidade de reativação.';
}

function phraseForInFollowUp(ctx: PhraseContext): string {
  const { meta, intel, now, nextAppointment } = ctx;
  const nextDate = resolveNextDate(meta, intel, nextAppointment, now);

  if (nextDate) {
    return formatScheduledReturn(nextDate);
  }

  if (intel?.has_future_appointment || meta.nextVisitDate) {
    return 'Próxima etapa já agendada.';
  }

  return 'Tudo organizado para o próximo atendimento.';
}

function phraseForAll(ctx: PhraseContext): string {
  for (const filter of PATIENT_FILTER_URGENCY) {
    if (matchesPatientListFilter(filter, ctx.meta, ctx.intel, ctx.now)) {
      return getPatientContextPhrase(filter, ctx.meta, ctx.intel, ctx.now, ctx.nextAppointment);
    }
  }

  const days = getDaysSinceLastVisit(ctx.meta, ctx.intel);
  const nextDate = resolveNextDate(ctx.meta, ctx.intel, ctx.nextAppointment, ctx.now);

  if (nextDate) {
    return formatScheduledReturn(nextDate);
  }
  if (days != null) {
    return formatUltimoAtendimento(days);
  }
  if (ctx.meta.isLead) {
    return 'Primeira consulta ainda não foi marcada.';
  }

  return 'Sem histórico de atendimentos.';
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function getPatientContextPhrase(
  filter: PatientListFilter,
  meta: PatientCardMetaLike,
  intel: PatientIntelLike | null,
  now: Date,
  nextAppointment?: NextAppointmentLike | null
): string {
  const ctx: PhraseContext = {
    filter,
    meta,
    intel,
    now,
    nextAppointment: nextAppointment ?? null,
  };

  switch (filter) {
    case 'action-needed':
      return phraseForActionNeeded(ctx);
    case 'need-attention':
      return phraseForNeedAttention(ctx);
    case 'can-return':
      return phraseForCanReturn(ctx);
    case 'in-follow-up':
      return phraseForInFollowUp(ctx);
    case 'all':
    default:
      return phraseForAll(ctx);
  }
}
