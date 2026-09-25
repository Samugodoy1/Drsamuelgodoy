import { describe, expect, it } from 'vitest';
import { addMonthsIso, formatWhenLabel, parseReminder, suggestReminders } from './patientReminders';

const TODAY = '2026-09-25';

describe('lembretes do paciente', () => {
  it('entende um lembrete de prótese daqui a 6 meses', () => {
    const parsed = parseReminder(
      'daqui a 6 meses me lembrar de entrar em contato para ver como está a prótese',
      TODAY,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.dueDate).toBe('2027-03-25');
    expect(parsed.note).toBe('Entrar em contato para ver como está a prótese');
    expect(parsed.cadenceUnit).toBe('month');
    expect(parsed.cadenceCount).toBe(6);
  });

  it('entende dias, amanhã, dia da semana e data explícita', () => {
    const days = parseReminder('em 15 dias ligar para confirmar a adaptação', TODAY);
    expect(days.ok && days.dueDate).toBe('2026-10-10');
    expect(days.ok && days.note).toBe('Ligar para confirmar a adaptação');

    const tomorrow = parseReminder('amanhã revisar a sutura', TODAY);
    expect(tomorrow.ok && tomorrow.dueDate).toBe('2026-09-26');

    const monday = parseReminder('na próxima segunda ver o paciente', TODAY);
    expect(monday.ok && monday.dueDate).toBe('2026-09-28');

    const dated = parseReminder('dia 12/04 controle da prótese', TODAY);
    expect(dated.ok && dated.dueDate).toBe('2027-04-12');
  });

  it('rejeita frase sem prazo e data passada', () => {
    expect(parseReminder('lembrar disso', TODAY).ok).toBe(false);
    expect(parseReminder('dia 01/01/2020 ver o paciente', TODAY).ok).toBe(false);
  });

  it('não quebra quando a data não é um dia ISO', () => {
    expect(formatWhenLabel('Fri Sep 25', TODAY)).toBe('em breve');
  });

  it('sugere a prótese quando o prontuário fala dela', () => {
    const suggestions = suggestReminders('Prótese total instalada na arcada superior');
    expect(suggestions[0]?.id).toBe('protese');
  });

  it('soma meses sem estourar o dia', () => {
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-02-28');
  });
});
