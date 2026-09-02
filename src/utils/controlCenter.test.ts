import { describe, expect, it } from 'vitest';
import {
  buildControlVoice,
  deriveClinicFacts,
  deriveControlCenter,
  firstGivenName,
  formatBRL,
  formatUntil,
  getControlPhase,
  greetingForHour,
} from './controlCenter';
import type { ControlAppointment, ControlCenterInput } from './controlCenter';

const at = (iso: string) => new Date(iso);

function appt(partial: Partial<ControlAppointment> & Pick<ControlAppointment, 'start_time' | 'end_time'>): ControlAppointment {
  return {
    id: partial.id ?? Math.round(Math.random() * 10_000),
    patient_id: partial.patient_id ?? 1,
    patient_name: partial.patient_name ?? 'Ana Clara',
    status: partial.status ?? 'CONFIRMED',
    notes: partial.notes,
    start_time: partial.start_time,
    end_time: partial.end_time,
  };
}

function input(now: Date, extra: Partial<ControlCenterInput> = {}): ControlCenterInput {
  return {
    now,
    appointments: extra.appointments ?? [],
    todayRevenue: extra.todayRevenue ?? 0,
    weekRevenue: extra.weekRevenue ?? 0,
    pendingReceivables: extra.pendingReceivables ?? 0,
    portalPendingCount: extra.portalPendingCount ?? 0,
    noShowRescheduleCount: extra.noShowRescheduleCount ?? 0,
    patientCount: extra.patientCount ?? 12,
    freeSlotCount: extra.freeSlotCount ?? 0,
  };
}

describe('control center helpers', () => {
  it('reads the first given name without the title', () => {
    expect(firstGivenName('Dra. Mariana Souza')).toBe('Mariana');
    expect(firstGivenName('Dr Samuel')).toBe('Samuel');
    expect(firstGivenName('')).toBe('');
  });

  it('greets and phases the dentist day', () => {
    expect(greetingForHour(8)).toBe('Bom dia');
    expect(greetingForHour(13)).toBe('Boa tarde');
    expect(greetingForHour(20)).toBe('Boa noite');
    expect(getControlPhase(at('2026-09-02T08:00:00'))).toBe('opening');
    expect(getControlPhase(at('2026-09-02T12:30:00'))).toBe('clinic');
    expect(getControlPhase(at('2026-09-02T18:10:00'))).toBe('closing');
    expect(getControlPhase(at('2026-09-02T22:00:00'))).toBe('night');
  });

  it('formats money and countdowns in clinic language', () => {
    expect(formatBRL(1240).replace(/\s/g, ' ')).toBe('R$ 1.240');
    expect(formatBRL(15200).replace(/\s/g, ' ')).toMatch(/R\$ 15[,.]2 mil/);
    expect(formatUntil(at('2026-09-02T14:12:00'), at('2026-09-02T14:00:00'))).toBe('em 12 min');
    expect(formatUntil(at('2026-09-02T16:00:00'), at('2026-09-02T14:00:00'))).toBe('às 16:00');
    expect(formatUntil(at('2026-09-02T14:00:00'), at('2026-09-02T14:05:00'))).toBe('agora');
  });
});

describe('control center voice', () => {
  it('talks about the next patient during the morning opening', () => {
    const facts = deriveClinicFacts(input(at('2026-09-02T08:10:00'), {
      appointments: [
        appt({ id: 1, patient_name: 'Ana Clara', start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00', notes: 'Restauração' }),
        appt({ id: 2, patient_name: 'João Lima', start_time: '2026-09-02T10:00:00', end_time: '2026-09-02T10:40:00' }),
        appt({ id: 3, patient_name: 'Pedro', start_time: '2026-09-03T09:00:00', end_time: '2026-09-03T09:40:00', status: 'SCHEDULED' }),
      ],
    }));
    const voice = buildControlVoice(facts);
    expect(voice.phase).toBe('opening');
    expect(voice.headline).toMatch(/Primeira/);
    expect(voice.detail).toMatch(/2 pela frente/);
  });

  it('names the patient being attended and the one after', () => {
    const facts = deriveClinicFacts(input(at('2026-09-02T14:10:00'), {
      appointments: [
        appt({ id: 1, patient_name: 'Ana Clara', start_time: '2026-09-02T14:00:00', end_time: '2026-09-02T14:40:00', status: 'IN_PROGRESS' }),
        appt({ id: 2, patient_name: 'João Lima', start_time: '2026-09-02T15:00:00', end_time: '2026-09-02T15:40:00' }),
      ],
    }));
    const voice = buildControlVoice(facts);
    expect(voice.headline).toBe('Atendendo Ana');
    expect(voice.detail).toMatch(/João/);
  });

  it('closes the day with cash and tomorrow', () => {
    const facts = deriveClinicFacts(input(at('2026-09-02T18:20:00'), {
      todayRevenue: 2400,
      appointments: [
        appt({ id: 1, patient_name: 'Ana', start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00', status: 'FINISHED' }),
        appt({ id: 2, patient_name: 'Lia', start_time: '2026-09-03T08:30:00', end_time: '2026-09-03T09:10:00', status: 'CONFIRMED' }),
        appt({ id: 3, patient_name: 'Rui', start_time: '2026-09-03T10:00:00', end_time: '2026-09-03T10:40:00', status: 'SCHEDULED' }),
      ],
    }));
    const voice = buildControlVoice(facts);
    expect(voice.headline).toBe('Dia encerrado');
    expect(voice.detail).toMatch(/Amanhã: 2/);
  });

  it('points to recoveries when the day is empty', () => {
    const facts = deriveClinicFacts(input(at('2026-09-02T10:00:00'), {
      noShowRescheduleCount: 2,
      appointments: [],
    }));
    const voice = buildControlVoice(facts);
    expect(voice.headline).toBe('Agenda livre hoje');
    expect(voice.detail).toMatch(/2 faltas/);
  });
});

describe('control center widgets', () => {
  it('surfaces confirmation and rhythm widgets in the morning', () => {
    const view = deriveControlCenter(input(at('2026-09-02T08:15:00'), {
      appointments: [
        appt({ id: 1, patient_name: 'Ana Clara', start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00' }),
        appt({ id: 2, patient_name: 'João', start_time: '2026-09-02T14:00:00', end_time: '2026-09-02T14:40:00' }),
        appt({ id: 3, patient_name: 'Lia', start_time: '2026-09-03T09:00:00', end_time: '2026-09-03T09:40:00', status: 'SCHEDULED' }),
        appt({ id: 4, patient_name: 'Rui', start_time: '2026-09-03T11:00:00', end_time: '2026-09-03T11:40:00', status: 'SCHEDULED' }),
      ],
    }));

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('confirmar');
    expect(ids).toContain('ritmo');
    expect(view.widgets.find(widget => widget.id === 'confirmar')?.value).toBe('2');
    expect(view.widgets.find(widget => widget.id === 'ritmo')?.value).toBe('1 · 1');
    expect(view.featured.hint).toMatch(/Ana/);
  });

  it('shows cash and tomorrow while closing, without a duplicate caixa tile', () => {
    const view = deriveControlCenter(input(at('2026-09-02T18:40:00'), {
      todayRevenue: 1880,
      appointments: [
        appt({ id: 1, start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00', status: 'FINISHED' }),
        appt({ id: 2, patient_name: 'Lia Costa', start_time: '2026-09-03T08:30:00', end_time: '2026-09-03T09:00:00', status: 'CONFIRMED' }),
      ],
    }));

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('caixa');
    expect(ids).toContain('amanha');
    expect(ids).not.toContain('financeiro');
    expect(view.widgets.find(widget => widget.id === 'caixa')?.hint).toBe('fechar o caixa');
    expect(view.featured.hint).toMatch(/R\$/);
  });

  it('keeps portal and recovery visible even if those tabs are not pinned', () => {
    const view = deriveControlCenter(input(at('2026-09-02T13:00:00'), {
      portalPendingCount: 3,
      noShowRescheduleCount: 1,
      appointments: [
        appt({ id: 1, patient_name: 'Ana', start_time: '2026-09-02T14:00:00', end_time: '2026-09-02T14:40:00' }),
      ],
    }), { pins: ['dashboard'] });

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('portal');
    expect(ids).toContain('recuperar');
    expect(view.widgets.find(widget => widget.id === 'portal')?.value).toBe('3');
  });

  it('hides dismissed live widgets and still keeps pinned navigation', () => {
    const view = deriveControlCenter(input(at('2026-09-02T08:20:00'), {
      appointments: [
        appt({ id: 1, start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00' }),
        appt({ id: 2, start_time: '2026-09-03T09:00:00', end_time: '2026-09-03T09:40:00', status: 'SCHEDULED' }),
      ],
    }), {
      hiddenLive: ['confirmar', 'ritmo'],
      pins: ['dashboard', 'agenda', 'pacientes', 'documentos'],
    });

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).not.toContain('confirmar');
    expect(ids).not.toContain('ritmo');
    expect(ids).toContain('pacientes');
    expect(ids).toContain('documentos');
  });

  it('never shows amanhã and confirmar at the same time', () => {
    const view = deriveControlCenter(input(at('2026-09-02T18:40:00'), {
      appointments: [
        appt({ id: 1, start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00', status: 'FINISHED' }),
        appt({ id: 2, patient_name: 'Lia', start_time: '2026-09-03T08:30:00', end_time: '2026-09-03T09:00:00', status: 'SCHEDULED' }),
        appt({ id: 3, patient_name: 'Rui', start_time: '2026-09-03T10:00:00', end_time: '2026-09-03T10:40:00', status: 'SCHEDULED' }),
      ],
    }));

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('confirmar');
    expect(ids).not.toContain('amanha');
    expect(ids.filter(id => id === 'confirmar' || id === 'amanha')).toHaveLength(1);
    expect(view.widgets.find(widget => widget.id === 'confirmar')?.tab).toBe('agenda');
  });

  it('keeps amanhã when tomorrow is already confirmed', () => {
    const view = deriveControlCenter(input(at('2026-09-02T18:40:00'), {
      appointments: [
        appt({ id: 1, start_time: '2026-09-02T09:00:00', end_time: '2026-09-02T09:40:00', status: 'FINISHED' }),
        appt({ id: 2, patient_name: 'Lia', start_time: '2026-09-03T08:30:00', end_time: '2026-09-03T09:00:00', status: 'CONFIRMED' }),
      ],
    }));

    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('amanha');
    expect(ids).not.toContain('confirmar');
  });

  it('opens the next patient from Agora and confirmations from the agenda', () => {
    const view = deriveControlCenter(input(at('2026-09-02T13:10:00'), {
      appointments: [
        appt({ id: 9, patient_id: 44, patient_name: 'Ana Clara', start_time: '2026-09-02T14:00:00', end_time: '2026-09-02T14:40:00' }),
        appt({ id: 10, patient_id: 8, patient_name: 'Lia', start_time: '2026-09-03T09:00:00', end_time: '2026-09-03T09:40:00', status: 'SCHEDULED' }),
      ],
    }));
    expect(view.widgets.find(widget => widget.id === 'proximo')?.patientId).toBe(44);
    expect(view.widgets.find(widget => widget.id === 'proximo')?.tab).toBe('agenda');
    expect(view.widgets.find(widget => widget.id === 'confirmar')?.tab).toBe('agenda');
  });

  it('invents pause, queue and week widgets from the routine', () => {
    const view = deriveControlCenter(input(at('2026-09-02T10:00:00'), {
      appointments: [
        appt({ id: 1, patient_name: 'Ana', start_time: '2026-09-02T11:00:00', end_time: '2026-09-02T11:40:00' }),
        appt({ id: 2, patient_name: 'João', start_time: '2026-09-02T14:00:00', end_time: '2026-09-02T14:40:00' }),
        appt({ id: 3, patient_name: 'Lia', start_time: '2026-09-02T16:00:00', end_time: '2026-09-02T16:40:00' }),
      ],
    }));
    const ids = view.widgets.map(widget => widget.id);
    expect(ids).toContain('pausa');
    expect(ids).toContain('fila');
    expect(ids).toContain('semana');
    expect(view.widgets.find(widget => widget.id === 'fila')?.hint).toMatch(/Ana/);
  });

  it('does not invent a caixa widget without money', () => {
    const view = deriveControlCenter(input(at('2026-09-02T12:00:00'), {
      appointments: [
        appt({ id: 1, start_time: '2026-09-02T15:00:00', end_time: '2026-09-02T15:40:00' }),
      ],
    }));
    expect(view.widgets.some(widget => widget.id === 'caixa')).toBe(false);
  });
});
