export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'FINISHED'
  | 'NO_SHOW';

export type AppointmentTimePhase = 'future' | 'current' | 'past';

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Atendendo',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

export const APPOINTMENT_STATUS_PREFIX: Partial<Record<AppointmentStatus, string>> = {
  SCHEDULED: '⏳',
  CONFIRMED: '✓',
  IN_PROGRESS: '●',
  FINISHED: '✓',
  CANCELLED: '✕',
  NO_SHOW: '⊘',
};

const ALLOWED_BY_PHASE: Record<AppointmentTimePhase, AppointmentStatus[]> = {
  future: ['SCHEDULED', 'CONFIRMED', 'CANCELLED'],
  current: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED', 'NO_SHOW', 'CANCELLED'],
  past: ['FINISHED', 'NO_SHOW', 'CANCELLED'],
};

export function getAppointmentTimePhase(
  startTime: string | Date,
  endTime: string | Date,
  now: Date = new Date()
): AppointmentTimePhase {
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now.getTime() < start.getTime()) return 'future';
  if (now.getTime() >= end.getTime()) return 'past';
  return 'current';
}

export function getAllowedAppointmentStatuses(
  appointment: { start_time: string; end_time: string; status?: string },
  now: Date = new Date()
): AppointmentStatus[] {
  const phase = getAppointmentTimePhase(appointment.start_time, appointment.end_time, now);
  return ALLOWED_BY_PHASE[phase];
}

export function isAppointmentStatusAllowed(
  appointment: { start_time: string; end_time: string },
  status: AppointmentStatus,
  now: Date = new Date()
): boolean {
  return getAllowedAppointmentStatuses(appointment, now).includes(status);
}

export function normalizeStatusForReschedule(
  currentStatus: AppointmentStatus,
  newStartTime: Date,
  now: Date = new Date()
): AppointmentStatus {
  if (newStartTime.getTime() > now.getTime() && ['NO_SHOW', 'IN_PROGRESS', 'FINISHED'].includes(currentStatus)) {
    return 'SCHEDULED';
  }
  return currentStatus;
}

export function getEffectiveSelectableStatus(
  appointment: { start_time: string; end_time: string; status: string },
  now: Date = new Date()
): AppointmentStatus {
  const allowed = getAllowedAppointmentStatuses(appointment, now);
  const current = String(appointment.status || 'SCHEDULED').toUpperCase() as AppointmentStatus;
  if (allowed.includes(current)) return current;

  const phase = getAppointmentTimePhase(appointment.start_time, appointment.end_time, now);
  if (phase === 'future') return 'SCHEDULED';
  if (phase === 'past') return 'FINISHED';
  return 'IN_PROGRESS';
}

export function formatStatusOptionLabel(status: AppointmentStatus, withPrefix = false): string {
  const label = APPOINTMENT_STATUS_LABELS[status];
  const prefix = APPOINTMENT_STATUS_PREFIX[status];
  if (withPrefix && prefix) return `${prefix} ${label}`;
  return label;
}
