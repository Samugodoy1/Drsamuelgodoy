import { formatAppointmentDate, formatAppointmentTime, getAppointmentTime, parseAppointmentDateTime } from './dateUtils';

// ── Types ──────────────────────────────────────────────────────────────────

interface EvolutionRecord {
  id?: number | string;
  date?: string;
  created_at?: string;
  notes?: string;
  procedure?: string;
  procedure_performed?: string;
  materials?: string;
  observations?: string;
  appointment_id?: number | string | null;
}

interface AppointmentRecord {
  id: number | string;
  patient_id: number | string;
  patient_name?: string;
  start_time: string;
  end_time?: string;
  status: string;
  notes?: string;
  procedure?: string;
}

interface AnamnesisRecord {
  medical_history?: string;
  allergies?: string;
  medications?: string;
  systemic_diseases?: string;
  clinical_notes?: string;
  chief_complaint?: string;
  habits?: string;
  family_history?: string;
  vital_signs?: string;
}

interface PatientRecord {
  id: number | string;
  name?: string;
  evolution?: EvolutionRecord[];
  clinicalEvolution?: EvolutionRecord[];
  anamnesis?: AnamnesisRecord;
  treatmentPlan?: Array<{ status: string; procedure?: string }>;
  procedures?: Array<{ id: number; date: string }>;
  odontogram?: Record<string, unknown>;
  odontogram_data?: unknown;
  has_odontogram_record?: boolean;
  last_evolution_date?: string;
  evolution_count?: number;
  created_at?: string;
}

// ── Pending types returned by the state derivation ─────────────────────────

export type PendingKind =
  | 'evolution'
  | 'anamnesis'
  | 'odontogram'
  | 'schedule_first'
  | 'schedule_return';

export interface PatientPending {
  kind: PendingKind;
  label: string;
  appointmentId?: number;
}

export interface PatientStateResult {
  pendings: PatientPending[];
  /** Appointments that are FINISHED and still need an evolution record. */
  finishedWithoutEvolution: AppointmentRecord[];
  /** Short text for the Casos card. */
  pendingLabel: string;
  /** Whether this patient should appear in the "Para fechar" list. */
  showInParaFechar: boolean;
}

// ── Helpers (private) ──────────────────────────────────────────────────────

const ANAMNESIS_FIELDS: (keyof AnamnesisRecord)[] = [
  'medical_history',
  'allergies',
  'medications',
  'systemic_diseases',
  'clinical_notes',
  'chief_complaint',
  'habits',
  'family_history',
  'vital_signs',
];

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);

const norm = (s?: string) => String(s || '').toUpperCase();

const toNumberId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  return parseAppointmentDateTime(value);
};

function getFilledAnamnesisFields(anamnesis?: AnamnesisRecord): string[] {
  if (!anamnesis) return [];
  return ANAMNESIS_FIELDS.filter(field => {
    const v = anamnesis[field];
    return typeof v === 'string' ? v.trim().length > 0 : Boolean(v);
  });
}

function hasFilledAnamnesis(anamnesis?: AnamnesisRecord): boolean {
  return getFilledAnamnesisFields(anamnesis).length > 0;
}

function hasObjectData(value: unknown): boolean {
  if (!value) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '{}') return false;
    try { return hasObjectData(JSON.parse(trimmed)); } catch { return trimmed.length > 0; }
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as object).length > 0;
  return Boolean(value);
}

function hasOdontogramData(patient: PatientRecord): boolean {
  if (hasObjectData(patient.odontogram) || hasObjectData(patient.odontogram_data)) return true;
  const plans = patient.treatmentPlan || [];
  if (Array.isArray(plans) && plans.length > 0) return true;
  const procs = patient.procedures || [];
  if (Array.isArray(procs) && procs.length > 0) return true;
  return patient.has_odontogram_record === true;
}

function getEvolutions(patient: PatientRecord): EvolutionRecord[] {
  const sources = [patient.evolution, patient.clinicalEvolution].filter(Array.isArray) as EvolutionRecord[][];
  const seen = new Set<string>();
  const result: EvolutionRecord[] = [];

  for (const source of sources) {
    for (const evo of source) {
      const key = evo.id != null
        ? `id:${evo.id}`
        : [
            'legacy',
            evo.appointment_id ?? '',
            evo.date || evo.created_at || '',
            evo.procedure || evo.procedure_performed || '',
            evo.notes || '',
          ].join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(evo);
    }
  }

  return result;
}

function hasTreatmentActivity(patient: PatientRecord): boolean {
  const plans = patient.treatmentPlan || [];
  if (Array.isArray(plans) && plans.length > 0) return true;
  if (getEvolutions(patient).length > 0) return true;
  return Boolean(patient.last_evolution_date || Number(patient.evolution_count || 0) > 0);
}

/**
 * Check whether a FINISHED appointment has a matching evolution record.
 *
 * Primary rule: if any evolution has `appointment_id === appointment.id`,
 * the appointment is covered.
 *
 * Legacy fallback (for evolutions saved before the appointment_id column
 * was added): match by date — an evolution whose date/created_at is on
 * the same day or after the appointment's start_time.
 */
interface EvolutionMatchResult {
  matched: boolean;
  reason: string;
  matchedEvolution?: EvolutionRecord;
}

function getAppointmentEvolutionMatch(
  appointment: AppointmentRecord,
  patient: PatientRecord,
): EvolutionMatchResult {
  const evolutions = getEvolutions(patient);
  const appointmentId = toNumberId(appointment.id);

  // Primary: direct appointment_id match
  const directMatch = evolutions.find(evo => {
    const evoAppointmentId = toNumberId(evo.appointment_id);
    return appointmentId !== null && evoAppointmentId !== null && evoAppointmentId === appointmentId;
  });

  if (directMatch) {
    return {
      matched: true,
      reason: `clinical_evolution.appointment_id=${directMatch.appointment_id} matches appointment.id=${appointment.id}`,
      matchedEvolution: directMatch,
    };
  }

  // Legacy fallback: date-based matching (only for evolutions without appointment_id)
  const start = parseDate(appointment.start_time);
  if (!start) {
    return {
      matched: false,
      reason: `appointment.id=${appointment.id} has invalid start_time; no direct appointment_id match found`,
    };
  }

  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  if (patient.last_evolution_date) {
    const lastEvo = parseDate(patient.last_evolution_date);
    if (lastEvo && lastEvo >= startDay) {
      return {
        matched: true,
        reason: `patient.last_evolution_date=${patient.last_evolution_date} is on/after appointment day`,
      };
    }
  }

  const legacyMatch = evolutions
    .filter(evo => evo.appointment_id == null)
    .find(evo => {
      const d = parseDate(evo.date || evo.created_at);
      return d ? d >= startDay : false;
    });

  if (legacyMatch) {
    return {
      matched: true,
      reason: `legacy evolution without appointment_id is on/after appointment day`,
      matchedEvolution: legacyMatch,
    };
  }

  return {
    matched: false,
    reason: `no clinical_evolution row with appointment_id=${appointment.id}; no legacy evolution on/after appointment day`,
  };
}

function appointmentHasEvolution(
  appointment: AppointmentRecord,
  patient: PatientRecord,
): boolean {
  return getAppointmentEvolutionMatch(appointment, patient).matched;
}

// ── Main derivation ────────────────────────────────────────────────────────

/**
 * Centralized, single-source-of-truth function that derives the clinical
 * state of a patient in Academy.  All screens (Dashboard / Rotina, Casos,
 * main card) must use this function instead of inline logic.
 *
 * Business rules implemented:
 *
 * 1. FINISHED + no evolution  → pending "Fechar atendimento", show in "Para fechar"
 * 2. FINISHED + has evolution → no pending from this appointment
 * 3. Future appointment       → only prep pendings (anamnesis, odontogram)
 * 4. CANCELLED / NO_SHOW      → ignored, no evolution pending
 * 5. No appointment at all    → "Agendar primeira consulta" if new case
 */
export function deriveAcademyPatientState(
  patient: PatientRecord,
  appointments: AppointmentRecord[],
  now: Date = new Date(),
): PatientStateResult {
  const patientId = toNumberId(patient.id);
  const patientAppointments = appointments.filter(a => {
    const appointmentPatientId = toNumberId(a.patient_id);
    return patientId !== null && appointmentPatientId !== null && appointmentPatientId === patientId;
  });

  // ── Rule 4: filter out CANCELLED / NO_SHOW ──────────────────────────
  const relevantAppointments = patientAppointments.filter(
    a => !['CANCELLED', 'NO_SHOW'].includes(norm(a.status)),
  );

  // ── Rule 1: FINISHED without evolution ───────────────────────────────
  const finishedApps = relevantAppointments.filter(a => norm(a.status) === 'FINISHED');
  const finishedWithoutEvolution = finishedApps.filter(
    a => !appointmentHasEvolution(a, patient),
  );
  // ── Debug: detailed per-patient derivation audit ──────────────────────
  if (typeof console !== 'undefined') {
    const evolutions = getEvolutions(patient);
    console.group(`[deriveState] patient=${patient.id} "${patient.name || ''}"`);
    console.log('appointments (non-cancelled):', relevantAppointments.map(a => ({
      id: a.id,
      status: a.status,
      start_time: a.start_time,
      procedure: a.notes || a.procedure || '—',
    })));
    console.log('evolutions:', evolutions.map(e => ({
      id: e.id,
      appointment_id: e.appointment_id ?? null,
      created_at: e.created_at || e.date,
      procedure: e.procedure || e.procedure_performed || '—',
    })));
    for (const fa of finishedApps) {
      const matched = appointmentHasEvolution(fa, patient);
      console.log(
        `  FINISHED apt=${fa.id} start=${fa.start_time} procedure="${fa.notes || fa.procedure || '—'}" → ${matched ? 'CLOSED (evolution matched)' : 'PENDING (no evolution match)'}`,
      );
    }
    console.log(`summary: ${finishedApps.length} finished, ${finishedWithoutEvolution.length} pending`);
    if (finishedWithoutEvolution.length > 0) {
      console.log('reason for Para fechar:', finishedWithoutEvolution.map(a =>
        `apt=${a.id} "${a.notes || a.procedure || '—'}" at ${a.start_time} has NO matching evolution`
      ));
    }
    console.groupEnd();
  }

  // Deduplicate: keep only the most recent FINISHED appointment per patient
  // (there is only one patient here, but multiple appointments can be pending).
  // We still keep all pending appointments, but deduplicate by appointment id.
  const seenAppIds = new Set<number>();
  const dedupedFinished = finishedWithoutEvolution.filter(a => {
    const appointmentId = toNumberId(a.id);
    if (appointmentId === null) return false;
    if (seenAppIds.has(appointmentId)) return false;
    seenAppIds.add(appointmentId);
    return true;
  });

  // ── Rule 3: future / active appointments ─────────────────────────────
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const futureAppointments = relevantAppointments
    .filter(a => ACTIVE_STATUSES.has(norm(a.status)))
    .filter(a => {
      const s = parseDate(a.start_time);
      return s ? s >= todayStart : false;
    });

  // ── Build pending list ───────────────────────────────────────────────
  const pendings: PatientPending[] = [];

  // 1. Evolution pendings (one per un-evolved FINISHED appointment)
  for (const app of dedupedFinished) {
    const appointmentId = toNumberId(app.id);
    if (appointmentId === null) continue;
    pendings.push({
      kind: 'evolution',
      label: 'Fechar atendimento',
      appointmentId,
    });
  }

  // 2. Anamnesis pending — only if there are finished or upcoming appointments
  const hasRelevantAppointments = finishedApps.length > 0 || futureAppointments.length > 0;
  if (!hasFilledAnamnesis(patient.anamnesis)) {
    if (hasRelevantAppointments || hasTreatmentActivity(patient)) {
      pendings.push({ kind: 'anamnesis', label: 'Anamnese pendente' });
    }
  }

  // 3. Odontogram pending — same condition
  if (!hasOdontogramData(patient)) {
    if (hasRelevantAppointments || hasTreatmentActivity(patient)) {
      pendings.push({ kind: 'odontogram', label: 'Odontograma pendente' });
    }
  }

  // ── Rule 5: no appointment at all ────────────────────────────────────
  const hasAnyNonCancelledAppointment = relevantAppointments.length > 0;
  if (!hasAnyNonCancelledAppointment && !hasTreatmentActivity(patient)) {
    pendings.push({ kind: 'schedule_first', label: 'Agendar primeira consulta' });
  } else if (
    !hasAnyNonCancelledAppointment &&
    hasTreatmentActivity(patient) &&
    futureAppointments.length === 0
  ) {
    // Patient has history but no future appointment
    pendings.push({ kind: 'schedule_return', label: 'Retorno pendente' });
  }

  // ── Derive summary label ─────────────────────────────────────────────
  if (typeof console !== 'undefined') {
    const evolutions = getEvolutions(patient);
    const finishedChecks = finishedApps.map(app => ({
      appointment_id: app.id,
      patient_id: app.patient_id,
      status: app.status,
      start_time: app.start_time,
      ...getAppointmentEvolutionMatch(app, patient),
    }));
    const pendingEvolutionReasons = finishedChecks
      .filter(check => !check.matched)
      .map(check => ({
        appointment_id: check.appointment_id,
        reason: check.reason,
      }));
    const filledAnamnesisFields = getFilledAnamnesisFields(patient.anamnesis);
    const shouldRequireAnamnesis = hasRelevantAppointments || hasTreatmentActivity(patient);
    const anamnesisPending = pendings.some(p => p.kind === 'anamnesis');
    const anamnesisReason = filledAnamnesisFields.length > 0
      ? `anamnese preenchida nos campos: ${filledAnamnesisFields.join(', ')}`
      : shouldRequireAnamnesis
        ? 'nenhum campo de anamnesis usado pela Rotina tem valor preenchido'
        : 'anamnese vazia, mas sem atendimento relevante ou atividade clinica para exigir pendencia';

    console.groupCollapsed(`[deriveAcademyPatientState] patient_id=${patient.id} pending_appointments=${dedupedFinished.map(a => a.id).join(',') || 'none'}`);
    console.log('patient_id:', patient.id);
    console.log('appointment_id pendente:', dedupedFinished.map(a => a.id));
    console.log('appointments recebidos:', relevantAppointments.map(a => ({
      id: a.id,
      patient_id: a.patient_id,
      status: a.status,
      start_time: a.start_time,
      procedure: a.notes || a.procedure || null,
    })));
    console.log('evolutions recebidas:', evolutions.map(e => ({
      id: e.id,
      appointment_id: e.appointment_id ?? null,
      date: e.date || null,
      created_at: e.created_at || null,
      procedure: e.procedure || e.procedure_performed || null,
    })));
    console.log('anamnese recebida:', patient.anamnesis || null);
    console.log('motivo evolucao pendente:', pendingEvolutionReasons.length > 0 ? pendingEvolutionReasons : 'nenhuma evolucao pendente');
    console.log('motivo anamnese nao registrada:', anamnesisPending ? anamnesisReason : `sem pendencia de anamnese: ${anamnesisReason}`);
    console.log('resultado pendings:', pendings);
    console.groupEnd();
  }

  const showInParaFechar = dedupedFinished.length > 0;
  let pendingLabel: string;
  if (dedupedFinished.length > 0) {
    pendingLabel = 'Fechar atendimento';
  } else if (pendings.length > 0) {
    pendingLabel = pendings[0].label;
  } else {
    pendingLabel = 'Sem pendencias no momento';
  }

  return {
    pendings,
    finishedWithoutEvolution: dedupedFinished,
    pendingLabel,
    showInParaFechar,
  };
}

// ── Format helpers for enriched display ────────────────────────────────

function formatAppointmentLabel(startTime?: string): string {
  if (!startTime) return '';
  const day = formatAppointmentDate(startTime, { day: '2-digit', month: '2-digit' });
  const time = formatAppointmentTime(startTime);
  return day && time !== '--:--' ? `${day} às ${time}` : '';
}

// ── Convenience: derive "Para fechar" rows for the dashboard ───────────

export interface ParaFecharRow {
  id: string;
  patientId: number;
  appointmentId: number;
  title: string;
  meta: string;
  /** Procedure / conduct from the pending appointment. */
  procedure: string;
  /** Formatted date/time of the pending appointment (e.g. "11/05 às 13:30"). */
  appointmentLabel: string;
  tone: 'rose' | 'amber';
}

/**
 * Build a deduplicated list of "Para fechar" rows across all patients.
 * Each FINISHED appointment without evolution produces at most one row.
 * Rows are deduplicated by appointment id.
 */
export function buildParaFecharRows(
  patients: PatientRecord[],
  appointments: AppointmentRecord[],
  now: Date = new Date(),
): ParaFecharRow[] {
  const rows: ParaFecharRow[] = [];
  const seenAppointmentIds = new Set<number>();

  for (const patient of patients) {
    const state = deriveAcademyPatientState(patient, appointments, now);
    for (const app of state.finishedWithoutEvolution) {
      const appointmentId = toNumberId(app.id);
      const patientId = toNumberId(patient.id);
      if (appointmentId === null || patientId === null) continue;
      if (seenAppointmentIds.has(appointmentId)) continue;
      seenAppointmentIds.add(appointmentId);
      const procedure = app.notes || app.procedure || 'Atendimento';
      const label = formatAppointmentLabel(app.start_time);
      rows.push({
        id: `evolution-${appointmentId}`,
        patientId,
        appointmentId,
        title: patient.name || app.patient_name || 'Paciente',
        meta: label
          ? `${procedure} · ${label}\nFalta fechar este atendimento.`
          : `Falta fechar este atendimento.`,
        procedure,
        appointmentLabel: label,
        tone: 'rose',
      });
    }
  }

  // Sort by appointment start_time descending (most recent first)
  rows.sort((a, b) => {
    const appA = appointments.find(x => toNumberId(x.id) === a.appointmentId);
    const appB = appointments.find(x => toNumberId(x.id) === b.appointmentId);
    const tA = appA ? getAppointmentTime(appA.start_time) : 0;
    const tB = appB ? getAppointmentTime(appB.start_time) : 0;
    return tB - tA;
  });

  if (typeof console !== 'undefined' && rows.length > 0) {
    console.log('[buildParaFecharRows]', rows.map(r => {
      const app = appointments.find(x => toNumberId(x.id) === r.appointmentId);
      return {
        patient: r.title,
        appointmentId: r.appointmentId,
        start_time: app?.start_time,
        procedure: app?.notes || app?.procedure || '—',
      };
    }));
  }

  return rows;
}
