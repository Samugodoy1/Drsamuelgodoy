import { query } from '../utils/db.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PatientStatus = 'EM_TRATAMENTO' | 'ABANDONO' | 'ATENCAO' | 'FINALIZADO';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface PatientIntelligence {
  patient_id: number;
  patient_name: string;
  phone: string;
  photo_url: string | null;
  status: PatientStatus;
  priority: Priority;
  priority_reason: string;
  last_visit_date: string | null;
  next_appointment_date: string | null;
  next_appointment_notes: string | null;
  days_since_last_visit: number | null;
  has_active_treatment: boolean;
  has_future_appointment: boolean;
  pending_teeth: number[];
  urgent_teeth: number[];
  pending_procedure: string | null;
}

export interface DashboardIntelligence {
  needsActionToday: PatientIntelligence[];
  abandonmentRisk: PatientIntelligence[];
  attentionNeeded: PatientIntelligence[];
  stats: {
    totalPatients: number;
    inTreatment: number;
    attention: number;
    abandonment: number;
    completed: number;
  };
}

export interface SchedulingSuggestion {
  patient: PatientIntelligence;
  suggested_slot: { date: string; start: string; end: string };
  reason: string;
  procedure: string | null;
  duration_minutes: number;
  behavior?: {
    preferred_hour: number | null;
    attendance_rate: number | null;
    avg_interval_days: number | null;
    estimated_value: number | null;
    confidence_label: string | null;
    insight: string | null;
  };
}

// ─── Core Engine ─────────────────────────────────────────────────────────────

const ABANDONO_DAYS = 60;

// Average duration in minutes per procedure type (used for smart slot sizing)
const PROCEDURE_DURATION: Record<string, number> = {
  'restauração': 45,
  'restauracao': 45,
  'resina': 45,
  'endodontia': 90,
  'canal': 90,
  'extração': 45,
  'extracao': 45,
  'coroa': 60,
  'implante': 90,
  'limpeza': 30,
  'profilaxia': 30,
  'raspagem': 45,
  'clareamento': 60,
  'ortodontia': 30,
  'manutenção': 30,
  'manutencao': 30,
  'avaliação': 30,
  'avaliacao': 30,
  'consulta': 30,
  'cirurgia': 60,
  'prótese': 60,
  'protese': 60,
};
const DEFAULT_DURATION = 30;

function getProcedureDuration(procedure: string | null): number {
  if (!procedure) return DEFAULT_DURATION;
  const lower = procedure.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, minutes] of Object.entries(PROCEDURE_DURATION)) {
    const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (lower.includes(normalizedKey)) return minutes;
  }
  return DEFAULT_DURATION;
}

function getPendingProcedure(treatmentPlan: any, odontoData: string | null): string | null {
  // 1. Try treatment_plan first — it has explicit procedure + tooth
  try {
    const items = typeof treatmentPlan === 'string' ? JSON.parse(treatmentPlan) : treatmentPlan;
    if (Array.isArray(items)) {
      const pending = items.find((item: any) =>
        ['PLANEJADO', 'APROVADO'].includes(String(item.status || '').toUpperCase())
      );
      if (pending?.procedure) {
        const tooth = pending.tooth_number ? ` dente ${pending.tooth_number}` : '';
        return `${pending.procedure}${tooth}`;
      }
    }
  } catch { /* ignore parse errors */ }

  // 2. Fallback: infer from odontogram pending teeth
  if (odontoData) {
    try {
      const parsed = typeof odontoData === 'string' ? JSON.parse(odontoData) : odontoData;
      for (const [toothStr, toothData] of Object.entries(parsed)) {
        const toothNum = parseInt(toothStr);
        const status = (toothData as any)?.status;
        if (!status || !Number.isFinite(toothNum)) continue;
        if (status === 'decay') return `Restauração dente ${toothNum}`;
        if (status === 'root_canal_needed') return `Endodontia dente ${toothNum}`;
        if (status === 'extraction_needed') return `Extração dente ${toothNum}`;
        if (status === 'fracture') return `Restauração dente ${toothNum}`;
      }
    } catch { /* ignore parse errors */ }
  }

  return null;
}
const ATENCAO_HIGH_DAYS = 30;

// Odontogram statuses that represent pending treatment needs
const ODONTO_PENDING_STATUSES = new Set(['decay', 'root_canal_needed', 'extraction_needed', 'fracture']);
const ODONTO_URGENT_STATUSES = new Set(['root_canal_needed', 'extraction_needed', 'fracture']);

function parseOdontogramTeeth(odontoData: string | null): { pending: number[]; urgent: number[] } {
  if (!odontoData) return { pending: [], urgent: [] };
  try {
    const parsed = JSON.parse(odontoData);
    const pending: number[] = [];
    const urgent: number[] = [];
    for (const [toothStr, toothData] of Object.entries(parsed)) {
      const toothNum = parseInt(toothStr);
      const status = (toothData as any)?.status;
      if (!status || !Number.isFinite(toothNum)) continue;
      if (ODONTO_PENDING_STATUSES.has(status)) pending.push(toothNum);
      if (ODONTO_URGENT_STATUSES.has(status)) urgent.push(toothNum);
    }
    return { pending, urgent };
  } catch {
    return { pending: [], urgent: [] };
  }
}

function classify(row: any, odontoTeeth: { pending: number[]; urgent: number[] }): { status: PatientStatus; priority: Priority; reason: string } {
  const activeTreatmentCount = parseInt(row.active_treatment_count) || 0;
  const hasPendingTeeth = odontoTeeth.pending.length > 0;
  const hasActiveTreatment = activeTreatmentCount > 0 || hasPendingTeeth;
  const hasFutureAppointment = row.next_appointment_date !== null;
  const daysSince: number | null = row.days_since_last_visit !== null
    ? parseInt(row.days_since_last_visit)
    : null;
  const hasEverVisited = row.last_visit_date !== null;

  let status: PatientStatus;
  let priority: Priority;
  let reason: string;

  // ── Status classification ──────────────────────────────────────────────

  if (hasActiveTreatment && hasFutureAppointment) {
    // Active treatment + next appointment booked → all good
    status = 'EM_TRATAMENTO';
  } else if (hasActiveTreatment && !hasFutureAppointment && daysSince !== null && daysSince >= ABANDONO_DAYS) {
    // Active treatment, no future appointment, 60+ days since last visit
    status = 'ABANDONO';
  } else if (hasActiveTreatment && !hasFutureAppointment) {
    // Active treatment but no appointment scheduled (recent visit though)
    status = 'ATENCAO';
  } else if (!hasActiveTreatment && hasFutureAppointment) {
    // No open treatment items but has an appointment → still in treatment
    status = 'EM_TRATAMENTO';
  } else if (!hasActiveTreatment && hasEverVisited) {
    // No treatment, no appointment, but has history → completed
    status = 'FINALIZADO';
  } else if (!hasEverVisited && !hasFutureAppointment && daysSince === null) {
    // New patient, never visited, no appointment
    status = 'ATENCAO';
  } else if (daysSince !== null && daysSince >= ABANDONO_DAYS) {
    status = 'ABANDONO';
  } else {
    status = 'FINALIZADO';
  }

  // ── Priority classification ────────────────────────────────────────────

  if (status === 'ABANDONO') {
    priority = 'HIGH';
    const teethNote = odontoTeeth.urgent.length > 0
      ? ` (dentes urgentes: ${odontoTeeth.urgent.slice(0, 3).join(', ')})`
      : odontoTeeth.pending.length > 0
      ? ` (${odontoTeeth.pending.length} dente${odontoTeeth.pending.length > 1 ? 's' : ''} pendente${odontoTeeth.pending.length > 1 ? 's' : ''})`
      : '';
    reason = daysSince !== null
      ? `Sem visita há ${daysSince} dias com tratamento pendente${teethNote}`
      : `Tratamento pendente sem histórico de visitas${teethNote}`;
  } else if (odontoTeeth.urgent.length > 0 && !hasFutureAppointment) {
    // Urgent odontogram conditions with no appointment → HIGH
    priority = 'HIGH';
    reason = `Tratamento urgente pendente: dente${odontoTeeth.urgent.length > 1 ? 's' : ''} ${odontoTeeth.urgent.slice(0, 3).join(', ')} sem agendamento`;
    if (status === 'FINALIZADO' || status === 'EM_TRATAMENTO') status = 'ATENCAO';
  } else if (status === 'ATENCAO' && daysSince !== null && daysSince >= ATENCAO_HIGH_DAYS) {
    priority = 'HIGH';
    const teethNote = odontoTeeth.pending.length > 0
      ? ` (${odontoTeeth.pending.length} dente${odontoTeeth.pending.length > 1 ? 's' : ''} pendente${odontoTeeth.pending.length > 1 ? 's' : ''})`
      : '';
    reason = `Tratamento ativo sem agendamento há ${daysSince} dias${teethNote}`;
  } else if (status === 'ATENCAO') {
    priority = odontoTeeth.pending.length > 0 ? 'MEDIUM' : 'MEDIUM';
    const teethNote = odontoTeeth.pending.length > 0
      ? `: dente${odontoTeeth.pending.length > 1 ? 's' : ''} ${odontoTeeth.pending.slice(0, 3).join(', ')}`
      : '';
    reason = `Tratamento ativo sem próximo agendamento${teethNote}`;
  } else if (status === 'EM_TRATAMENTO') {
    priority = 'LOW';
    reason = 'Em tratamento com agendamento futuro';
  } else {
    priority = 'LOW';
    reason = 'Tratamento finalizado';
  }

  return { status, priority, reason };
}

// ─── Data fetching ───────────────────────────────────────────────────────────

async function getPatientIntelligenceData(dentistId: number): Promise<PatientIntelligence[]> {
  const sql = `
    SELECT 
      p.id,
      p.name,
      p.phone,
      p.photo_url,
      p.treatment_plan,
      o.data as odontogram_data,
      (
        SELECT MAX(a.start_time) 
        FROM appointments a 
        WHERE a.patient_id = p.id AND a.status = 'FINISHED'
      ) as last_visit_date,
      (
        SELECT MIN(a.start_time) 
        FROM appointments a 
        WHERE a.patient_id = p.id 
          AND a.start_time > NOW() 
          AND a.status NOT IN ('CANCELLED', 'FINISHED')
      ) as next_appointment_date,
      (
        SELECT a.notes 
        FROM appointments a 
        WHERE a.patient_id = p.id 
          AND a.start_time > NOW() 
          AND a.status NOT IN ('CANCELLED', 'FINISHED')
        ORDER BY a.start_time ASC
        LIMIT 1
      ) as next_appointment_notes,
      (
        SELECT COUNT(*) 
        FROM jsonb_array_elements(COALESCE(p.treatment_plan, '[]'::jsonb)) elem 
        WHERE elem->>'status' IN ('PLANEJADO', 'APROVADO')
      ) as active_treatment_count,
      EXTRACT(DAY FROM NOW() - (
        SELECT MAX(a2.start_time) FROM appointments a2 WHERE a2.patient_id = p.id AND a2.status = 'FINISHED'
      ))::int as days_since_last_visit
    FROM patients p
    LEFT JOIN odontograms o ON o.patient_id = p.id
    WHERE p.dentist_id = $1
    ORDER BY p.name ASC
  `;

  const result = await query(sql, [dentistId]);

  return result.rows.map((row: any) => {
    const odontoTeeth = parseOdontogramTeeth(row.odontogram_data || null);
    const { status, priority, reason } = classify(row, odontoTeeth);
    const pendingProcedure = getPendingProcedure(row.treatment_plan, row.odontogram_data);
    return {
      patient_id: row.id,
      patient_name: row.name,
      phone: row.phone || '',
      photo_url: row.photo_url || null,
      status,
      priority,
      priority_reason: reason,
      last_visit_date: row.last_visit_date ? new Date(row.last_visit_date).toISOString() : null,
      next_appointment_date: row.next_appointment_date ? new Date(row.next_appointment_date).toISOString() : null,
      next_appointment_notes: row.next_appointment_notes || null,
      days_since_last_visit: row.days_since_last_visit !== null ? parseInt(row.days_since_last_visit) : null,
      has_active_treatment: (parseInt(row.active_treatment_count) || 0) > 0 || odontoTeeth.pending.length > 0,
      has_future_appointment: row.next_appointment_date !== null,
      pending_teeth: odontoTeeth.pending,
      urgent_teeth: odontoTeeth.urgent,
      pending_procedure: pendingProcedure,
    };
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getAllPatientsIntelligence(dentistId: number): Promise<PatientIntelligence[]> {
  return getPatientIntelligenceData(dentistId);
}

export async function getDashboardIntelligence(dentistId: number): Promise<DashboardIntelligence> {
  const all = await getPatientIntelligenceData(dentistId);

  const stats = {
    totalPatients: all.length,
    inTreatment: all.filter(p => p.status === 'EM_TRATAMENTO').length,
    attention: all.filter(p => p.status === 'ATENCAO').length,
    abandonment: all.filter(p => p.status === 'ABANDONO').length,
    completed: all.filter(p => p.status === 'FINALIZADO').length,
  };

  // HIGH priority patients → needs action today
  const needsActionToday = all
    .filter(p => p.priority === 'HIGH')
    .sort((a, b) => (b.days_since_last_visit ?? 999) - (a.days_since_last_visit ?? 999));

  // ABANDONO patients
  const abandonmentRisk = all
    .filter(p => p.status === 'ABANDONO')
    .sort((a, b) => (b.days_since_last_visit ?? 999) - (a.days_since_last_visit ?? 999));

  // ATENCAO patients (not already in needsActionToday)
  const attentionNeeded = all
    .filter(p => p.status === 'ATENCAO' && p.priority !== 'HIGH')
    .sort((a, b) => (b.days_since_last_visit ?? 999) - (a.days_since_last_visit ?? 999));

  return {
    needsActionToday,
    abandonmentRisk,
    attentionNeeded,
    stats,
  };
}

// ─── Patient Behavior Analysis ───────────────────────────────────────────────

interface PatientBehavior {
  patient_id: number;
  preferred_hour: number | null;       // hour of day (0-23) the patient attends most
  cancel_hours: Set<number>;           // hours where patient has cancelled
  attendance_rate: number | null;      // 0-1 ratio of FINISHED / (FINISHED+CANCELLED)
  avg_interval_days: number | null;    // average days between consecutive visits
  estimated_value: number | null;      // sum of pending treatment plan values
}

async function getPatientBehaviors(dentistId: number, patientIds: number[]): Promise<Map<number, PatientBehavior>> {
  const map = new Map<number, PatientBehavior>();
  if (patientIds.length === 0) return map;

  // Fetch all relevant appointments for these patients
  const result = await query(`
    SELECT patient_id, start_time, status
    FROM appointments
    WHERE dentist_id = $1
      AND patient_id = ANY($2)
    ORDER BY patient_id, start_time ASC
  `, [dentistId, patientIds]);

  // Group by patient
  const grouped = new Map<number, Array<{ start: Date; status: string }>>();
  for (const row of result.rows) {
    const pid = row.patient_id;
    if (!grouped.has(pid)) grouped.set(pid, []);
    grouped.get(pid)!.push({ start: new Date(row.start_time), status: row.status });
  }

  // Fetch treatment plan values
  const valResult = await query(`
    SELECT id,
      (SELECT COALESCE(SUM((elem->>'value')::numeric), 0)
       FROM jsonb_array_elements(COALESCE(treatment_plan, '[]'::jsonb)) elem
       WHERE elem->>'status' IN ('PLANEJADO', 'APROVADO')
      ) as pending_value
    FROM patients
    WHERE dentist_id = $1 AND id = ANY($2)
  `, [dentistId, patientIds]);

  const valueMap = new Map<number, number>();
  for (const row of valResult.rows) {
    const val = parseFloat(row.pending_value) || 0;
    if (val > 0) valueMap.set(row.id, val);
  }

  for (const pid of patientIds) {
    const appointments = grouped.get(pid) || [];
    const finished = appointments.filter(a => a.status === 'FINISHED');
    const cancelled = appointments.filter(a => a.status === 'CANCELLED');

    // Preferred hour — mode of FINISHED appointments
    let preferred_hour: number | null = null;
    if (finished.length >= 2) {
      const hourCounts = new Map<number, number>();
      for (const a of finished) {
        const h = a.start.getHours();
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
      let maxCount = 0;
      for (const [h, c] of hourCounts) {
        if (c > maxCount) { maxCount = c; preferred_hour = h; }
      }
    }

    // Cancel hours
    const cancel_hours = new Set<number>();
    for (const a of cancelled) cancel_hours.add(a.start.getHours());

    // Attendance rate
    const totalRelevant = finished.length + cancelled.length;
    const attendance_rate = totalRelevant >= 2
      ? finished.length / totalRelevant
      : null;

    // Average interval between consecutive FINISHED visits
    let avg_interval_days: number | null = null;
    if (finished.length >= 2) {
      const sorted = finished.map(a => a.start.getTime()).sort((a, b) => a - b);
      let totalDays = 0;
      for (let i = 1; i < sorted.length; i++) {
        totalDays += (sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24);
      }
      avg_interval_days = Math.round(totalDays / (sorted.length - 1));
    }

    map.set(pid, {
      patient_id: pid,
      preferred_hour,
      cancel_hours,
      attendance_rate,
      avg_interval_days,
      estimated_value: valueMap.get(pid) || null,
    });
  }

  return map;
}

function buildBehaviorInsight(b: PatientBehavior, slotHour: number): { confidence_label: string | null; insight: string | null } {
  const parts: string[] = [];
  let confidence_label: string | null = null;

  // Match preferred hour
  if (b.preferred_hour !== null && slotHour === b.preferred_hour) {
    parts.push('horário preferido desse paciente');
    confidence_label = 'Melhor horário';
  }

  // High attendance rate
  if (b.attendance_rate !== null && b.attendance_rate >= 0.8) {
    if (!confidence_label) confidence_label = 'Alta chance de presença';
    parts.push(`${Math.round(b.attendance_rate * 100)}% de comparecimento`);
  } else if (b.attendance_rate !== null && b.attendance_rate >= 0.5) {
    parts.push('comparecimento moderado');
  }

  // Average interval insight
  if (b.avg_interval_days !== null) {
    if (b.avg_interval_days <= 30) {
      parts.push('costuma voltar todo mês');
    } else if (b.avg_interval_days <= 60) {
      parts.push('intervalo habitual de ~2 meses');
    }
  }

  // Estimated value
  if (b.estimated_value && b.estimated_value > 0) {
    const formatted = b.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    parts.push(`${formatted} em tratamentos pendentes`);
  }

  if (!confidence_label && b.cancel_hours.has(slotHour)) {
    confidence_label = 'Horário arriscado';
    parts.push('paciente já faltou nesse horário');
  }

  if (parts.length === 0) return { confidence_label: null, insight: null };
  if (!confidence_label) confidence_label = 'Baseado em histórico';

  // Build human-friendly insight
  const insight = parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    + (parts.length > 1 ? ' · ' + parts.slice(1).join(' · ') : '');

  return { confidence_label, insight };
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreSuggestion(
  candidate: PatientIntelligence,
  behavior: PatientBehavior | undefined,
  slotHour: number
): number {
  let score = 0;

  // Priority weight
  if (candidate.priority === 'HIGH') score += 50;
  else if (candidate.priority === 'MEDIUM') score += 30;

  if (!behavior) return score;

  // Preferred hour match → big boost
  if (behavior.preferred_hour !== null && slotHour === behavior.preferred_hour) {
    score += 40;
  }

  // Avoid cancel-prone hours
  if (behavior.cancel_hours.has(slotHour)) {
    score -= 25;
  }

  // High attendance → boost
  if (behavior.attendance_rate !== null) {
    score += Math.round(behavior.attendance_rate * 20);
  }

  // Revenue potential
  if (behavior.estimated_value) {
    if (behavior.estimated_value >= 1000) score += 15;
    else if (behavior.estimated_value >= 300) score += 8;
  }

  return score;
}

export async function getSchedulingSuggestions(dentistId: number): Promise<SchedulingSuggestion[]> {
  // 1. Get patients that need attention (HIGH + MEDIUM priority, no future appointment)
  const all = await getPatientIntelligenceData(dentistId);
  const candidates = all
    .filter(p => !p.has_future_appointment && (p.priority === 'HIGH' || p.priority === 'MEDIUM'))
    .sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  if (candidates.length === 0) return [];

  // 2. Fetch behavioral data for all candidates
  const candidateIds = candidates.map(c => c.patient_id);
  const behaviors = await getPatientBehaviors(dentistId, candidateIds);

  // 3. Get today's and next 5 business days appointments to find free slots
  // Use TO_CHAR to extract date and time as plain strings, avoiding timezone
  // conversion issues between PostgreSQL TIMESTAMP and JS Date objects.
  // The frontend stores appointments in the user's local time as ISO strings,
  // so we must compare using the raw stored values, not JS Date re-interpretation.
  const slotsResult = await query(`
    SELECT start_time, end_time
    FROM appointments
    WHERE dentist_id = $1
      AND start_time >= CURRENT_DATE
      AND start_time < CURRENT_DATE + INTERVAL '6 days'
      AND status NOT IN ('CANCELLED')
    ORDER BY start_time ASC
  `, [dentistId]);

  function slotTimeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  const bookedSlots = slotsResult.rows.map((r: any) => {
    const startStr = r.start_time.toISOString();
    const endStr = r.end_time.toISOString();

    const date = startStr.split('T')[0];

    const [startHour, startMinute] = startStr.split('T')[1].slice(0,5).split(':');
    const [endHour, endMinute] = endStr.split('T')[1].slice(0,5).split(':');

    return {
      date,
      startMin: Number(startHour) * 60 + Number(startMinute),
      endMin: Number(endHour) * 60 + Number(endMinute),
    };
  });
  

  // 4. Build all possible (candidate, slot) pairs and score them
  type ScoredPair = { candidate: PatientIntelligence; slot: { date: string; start: string; end: string }; score: number; slotHour: number; durationMinutes: number };
  const scoredPairs: ScoredPair[] = [];

  // Build list of next 6 calendar days (as YYYY-MM-DD strings) using the DB server's date
  const todayResult = [];

  const today = new Date();

  for (let i = 0; i < 6; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    todayResult.push({
      d: `${year}-${month}-${day}`,
      dow: d.getDay(),
    });
  }
  const nowResult = await query(`SELECT EXTRACT(HOUR FROM NOW())::int as h, EXTRACT(MINUTE FROM NOW())::int as m`);
  const nowHour = nowResult.rows[0].h;
  const nowMinute = nowResult.rows[0].m;
  const todayStr = todayResult[0].d;

  for (const dayRow of todayResult) {
    const dayStr = dayRow.d as string;
    const dow = dayRow.dow as number;
    if (dow === 0) continue; // skip Sunday

    const dayBooked = bookedSlots.filter(s => s.date === dayStr);
    console.log("========");
    console.log("DIA:", dayStr);
    console.log("BOOKED DO DIA:", dayBooked);

    for (const b of dayBooked) {
      console.log("HORARIO OCUPADO:", b.startMin, "-", b.endMin);
    }
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        // Skip past slots for today
        if (dayStr === todayStr && (hour < nowHour || (hour === nowHour && minute <= nowMinute))) continue;

        const slotStartMin = hour * 60 + minute;

        for (const candidate of candidates) {
          const durationMinutes = getProcedureDuration(candidate.pending_procedure);
          const slotEndMin = slotStartMin + durationMinutes;

          // Don't exceed business hours (18:00 = 1080 minutes)
          if (slotEndMin > 18 * 60) continue;

          // Check if slot overlaps any booked appointment (all in minutes, same date)
          const isOccupied = dayBooked.some(b =>
            slotStartMin < b.endMin && slotEndMin > b.startMin
          );
          if (isOccupied) continue;

          const endHour = Math.floor(slotEndMin / 60);
          const endMinute = slotEndMin % 60;
          const slot = {
            date: dayStr,
            start: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
            end: `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
          };

          const behavior = behaviors.get(candidate.patient_id);
          const score = scoreSuggestion(candidate, behavior, hour);
          scoredPairs.push({ candidate, slot, score, slotHour: hour, durationMinutes });
        }
      }
    }
  }

  // 5. Sort by score descending, then pick best unique slot per patient
  scoredPairs.sort((a, b) => b.score - a.score);

  const usedPatients = new Set<number>();
  const assignedSlots: Array<{ date: string; startMin: number; endMin: number }> = [];
  const suggestions: SchedulingSuggestion[] = [];

  function timeToMinutes(t: string): number {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  function overlapsAssigned(date: string, startStr: string, endStr: string): boolean {
    const startMin = timeToMinutes(startStr);
    const endMin = timeToMinutes(endStr);
    return assignedSlots.some(s =>
      s.date === date && startMin < s.endMin && endMin > s.startMin
    );
  }

  for (const pair of scoredPairs) {
    if (suggestions.length >= candidates.length) break;
    if (usedPatients.has(pair.candidate.patient_id)) continue;

    // Check overlap against all already-assigned suggestion slots
    if (overlapsAssigned(pair.slot.date, pair.slot.start, pair.slot.end)) continue;

    const behavior = behaviors.get(pair.candidate.patient_id);
    const { confidence_label, insight } = behavior
      ? buildBehaviorInsight(behavior, pair.slotHour)
      : { confidence_label: null, insight: null };

    suggestions.push({
      patient: pair.candidate,
      suggested_slot: pair.slot,
      reason: pair.candidate.priority_reason,
      procedure: pair.candidate.pending_procedure,
      duration_minutes: pair.durationMinutes,
      behavior: {
        preferred_hour: behavior?.preferred_hour ?? null,
        attendance_rate: behavior?.attendance_rate ?? null,
        avg_interval_days: behavior?.avg_interval_days ?? null,
        estimated_value: behavior?.estimated_value ?? null,
        confidence_label,
        insight,
      },
    });

    usedPatients.add(pair.candidate.patient_id);
    assignedSlots.push({
      date: pair.slot.date,
      startMin: timeToMinutes(pair.slot.start),
      endMin: timeToMinutes(pair.slot.end),
    });
  }

  return suggestions;
}
