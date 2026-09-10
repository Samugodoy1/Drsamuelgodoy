import { describe, expect, it } from 'vitest';
import {
  clinicListFingerprint,
  emptyList,
  indexByPatientId,
  replaceIfChanged,
} from './perf';

describe('indexByPatientId', () => {
  it('groups appointments by patient without scanning the full list later', () => {
    const map = indexByPatientId([
      { id: 1, patient_id: 10, status: 'FINISHED' },
      { id: 2, patient_id: 11, status: 'SCHEDULED' },
      { id: 3, patient_id: 10, status: 'CONFIRMED' },
    ]);

    expect(map.get(10)?.map((item) => item.id)).toEqual([1, 3]);
    expect(map.get(11)?.map((item) => item.id)).toEqual([2]);
    expect(map.get(99)).toBeUndefined();
  });
});

describe('replaceIfChanged', () => {
  it('keeps the previous array reference when the payload is equivalent', () => {
    const prev = [
      { id: 1, name: 'Ana', status: 'SCHEDULED', start_time: '2026-01-01T10:00:00' },
    ];
    const next = [
      { id: 1, name: 'Ana', status: 'SCHEDULED', start_time: '2026-01-01T10:00:00' },
    ];

    expect(replaceIfChanged(prev, next)).toBe(prev);
  });

  it('returns the new array when a field that matters changes', () => {
    const prev = [{ id: 1, name: 'Ana', status: 'SCHEDULED' }];
    const next = [{ id: 1, name: 'Ana', status: 'FINISHED' }];

    expect(replaceIfChanged(prev, next)).toBe(next);
  });

  it('keeps the previous object when JSON content matches', () => {
    const prev = { todayRevenue: 120, count: 3 };
    const next = { todayRevenue: 120, count: 3 };
    expect(replaceIfChanged(prev, next)).toBe(prev);
  });
});

describe('clinicListFingerprint', () => {
  it('changes when evolution length changes', () => {
    const a = clinicListFingerprint([{ id: 1, evolution: [{ id: 1 }] }]);
    const b = clinicListFingerprint([{ id: 1, evolution: [{ id: 1 }, { id: 2 }] }]);
    expect(a).not.toBe(b);
  });
});

describe('emptyList', () => {
  it('reuses a stable empty array', () => {
    expect(emptyList()).toBe(emptyList());
    expect(emptyList()).toEqual([]);
  });
});
