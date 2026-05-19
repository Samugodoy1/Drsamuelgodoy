import { describe, expect, it } from 'vitest';
import {
  addMinutesToLocalDateTime,
  createLocalDateTime,
  formatAppointmentDate,
  formatAppointmentDateInputValue,
  formatAppointmentTime,
  formatAppointmentTimeInputValue,
  parseAppointmentDateTime,
} from './dateUtils';

describe('Academy appointment time helpers', () => {
  it('keeps a Sao Paulo wall-clock time at 08:30', () => {
    const value = createLocalDateTime('2026-05-14', '08:30');
    const parsed = parseAppointmentDateTime(value);

    expect(parsed?.toISOString()).toBe('2026-05-14T11:30:00.000Z');
    expect(formatAppointmentDate(value)).toBe('14/05/2026');
    expect(formatAppointmentTime(value)).toBe('08:30');
  });

  it('does not roll a 21:40 appointment into the next Academy day', () => {
    const value = createLocalDateTime('2026-05-14', '21:40');
    const parsed = parseAppointmentDateTime(value);

    expect(parsed?.toISOString()).toBe('2026-05-15T00:40:00.000Z');
    expect(formatAppointmentDateInputValue(parsed!)).toBe('2026-05-14');
    expect(formatAppointmentTimeInputValue(parsed!)).toBe('21:40');
    expect(formatAppointmentTime(value)).toBe('21:40');
  });

  it('formats API UTC instants in the Academy time zone after reload', () => {
    expect(formatAppointmentDate('2026-05-14T11:30:00.000Z')).toBe('14/05/2026');
    expect(formatAppointmentTime('2026-05-14T11:30:00.000Z')).toBe('08:30');
  });

  it('keeps edited local times in Sao Paulo wall-clock form', () => {
    const edited = addMinutesToLocalDateTime('2026-05-14 08:30:00', 90);

    expect(edited).toBe('2026-05-14 10:00:00');
  });
});
