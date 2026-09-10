import { describe, expect, it } from 'vitest';
import { computeTodayFreeSlotTimes } from './freeSlots';

describe('computeTodayFreeSlotTimes', () => {
  it('returns empty when the workday is already over', () => {
    const now = new Date('2026-03-10T19:00:00');
    expect(computeTodayFreeSlotTimes([], now)).toEqual([]);
  });

  it('skips a slot that overlaps a blocking appointment', () => {
    const now = new Date('2026-03-10T08:00:00');
    const slots = computeTodayFreeSlotTimes(
      [{ start_time: '2026-03-10T08:00:00', end_time: '2026-03-10T09:00:00', status: 'CONFIRMED' }],
      now,
    );
    expect(slots[0]?.getHours()).toBe(9);
    expect(slots[0]?.getMinutes()).toBe(0);
  });
});
