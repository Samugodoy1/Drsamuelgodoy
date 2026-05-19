import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deriveAcademyPatientState } from './deriveAcademyPatientState';

const finishedAppointment = {
  id: 10,
  patient_id: 1,
  start_time: '2026-05-11 13:30:00',
  end_time: '2026-05-11 14:30:00',
  status: 'FINISHED',
  notes: 'Restauracao',
};

describe('deriveAcademyPatientState', () => {
  beforeEach(() => {
    vi.spyOn(console, 'group').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupCollapsed').mockImplementation(() => undefined);
    vi.spyOn(console, 'groupEnd').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not keep evolution or anamnesis pending after a closed appointment reload', () => {
    const state = deriveAcademyPatientState(
      {
        id: 1,
        name: 'Paciente Academy',
        anamnesis: {
          medical_history: 'Sem alteracoes sistemicas relevantes.',
          allergies: '',
          medications: '',
        },
        evolution: [{
          id: 99,
          appointment_id: 10,
          date: '2026-05-11',
          created_at: '2026-05-11T17:00:00.000Z',
          notes: 'Atendimento fechado.',
          procedure_performed: 'Restauracao',
        }],
      },
      [finishedAppointment],
      new Date('2026-05-12T12:00:00.000Z'),
    );

    expect(state.finishedWithoutEvolution).toHaveLength(0);
    expect(state.pendings.some(p => p.kind === 'evolution')).toBe(false);
    expect(state.pendings.some(p => p.kind === 'anamnesis')).toBe(false);
  });

  it('matches appointment_id even when the API serializes ids as strings', () => {
    const state = deriveAcademyPatientState(
      {
        id: '1',
        name: 'Paciente Academy',
        anamnesis: { medical_history: 'Preenchida.' },
        evolution: [{
          id: '99',
          appointment_id: '10',
          date: '2026-05-11',
          notes: 'Atendimento fechado.',
        }],
      },
      [{ ...finishedAppointment, id: '10', patient_id: '1' }],
      new Date('2026-05-12T12:00:00.000Z'),
    );

    expect(state.finishedWithoutEvolution).toHaveLength(0);
    expect(state.showInParaFechar).toBe(false);
  });

  it('reads clinicalEvolution when evolution is empty', () => {
    const state = deriveAcademyPatientState(
      {
        id: 1,
        name: 'Paciente Academy',
        anamnesis: { medical_history: 'Preenchida.' },
        evolution: [],
        clinicalEvolution: [{
          id: 99,
          appointment_id: 10,
          date: '2026-05-11',
          notes: 'Atendimento fechado.',
        }],
      },
      [finishedAppointment],
      new Date('2026-05-12T12:00:00.000Z'),
    );

    expect(state.finishedWithoutEvolution).toHaveLength(0);
    expect(state.pendings.some(p => p.kind === 'evolution')).toBe(false);
  });
});
