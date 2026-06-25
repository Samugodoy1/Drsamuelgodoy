import { describe, expect, it } from 'vitest';
import {
  getAllowedAppointmentStatuses,
  getAppointmentTimePhase,
  normalizeStatusForReschedule,
} from './appointmentStatus';

describe('appointmentStatus', () => {
  const futureStart = '2099-06-01 10:00:00';
  const futureEnd = '2099-06-01 10:30:00';
  const pastStart = '2020-06-01 10:00:00';
  const pastEnd = '2020-06-01 10:30:00';

  it('classifies appointment phases', () => {
    const now = new Date('2025-06-01T12:00:00');
    expect(getAppointmentTimePhase(futureStart, futureEnd, now)).toBe('future');
    expect(getAppointmentTimePhase(pastStart, pastEnd, now)).toBe('past');
  });

  it('blocks impossible statuses in the future', () => {
    const now = new Date('2025-06-01T12:00:00');
    const allowed = getAllowedAppointmentStatuses(
      { start_time: futureStart, end_time: futureEnd },
      now
    );
    expect(allowed).toEqual(['SCHEDULED', 'CONFIRMED', 'CANCELLED']);
    expect(allowed).not.toContain('NO_SHOW');
    expect(allowed).not.toContain('IN_PROGRESS');
  });

  it('blocks impossible statuses in the past', () => {
    const now = new Date('2025-06-01T12:00:00');
    const allowed = getAllowedAppointmentStatuses(
      { start_time: pastStart, end_time: pastEnd },
      now
    );
    expect(allowed).toEqual(['FINISHED', 'NO_SHOW', 'CANCELLED']);
    expect(allowed).not.toContain('SCHEDULED');
    expect(allowed).not.toContain('IN_PROGRESS');
  });

  it('resets no-show when rescheduling to the future', () => {
    const now = new Date('2025-06-01T12:00:00');
    const future = new Date('2099-06-01T10:00:00');
    expect(normalizeStatusForReschedule('NO_SHOW', future, now)).toBe('SCHEDULED');
    expect(normalizeStatusForReschedule('CONFIRMED', future, now)).toBe('CONFIRMED');
  });
});
