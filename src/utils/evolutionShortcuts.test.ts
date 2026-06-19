import { describe, expect, it } from 'vitest';
import { buildShortcuts, type EvolutionRecord } from './evolutionShortcuts';

const rec = (over: Partial<EvolutionRecord>): EvolutionRecord => ({
  notes: '',
  procedure_performed: '',
  created_at: '2026-06-01T10:00:00Z',
  ...over,
});

describe('buildShortcuts', () => {
  it('returns [] for empty history', () => {
    expect(buildShortcuts([])).toEqual([]);
  });

  it('returns [] when nothing reaches the repetition threshold', () => {
    const records = [
      rec({ notes: 'Profilaxia de rotina', procedure_performed: 'Profilaxia' }),
      rec({ notes: 'Profilaxia de rotina', procedure_performed: 'Profilaxia' }),
    ];
    expect(buildShortcuts(records, { minCount: 3 })).toEqual([]);
  });

  it('learns a recurring phrasing into a shortcut card', () => {
    const records = Array.from({ length: 4 }, () =>
      rec({
        notes: 'Profilaxia de rotina, orientação de higiene',
        procedure_performed: 'Profilaxia',
      })
    );
    const out = buildShortcuts(records, { minCount: 3 });
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(4);
    expect(out[0].title).toBe('Profilaxia');
    expect(out[0].procedureKey).toBe('prophylaxis');
    expect(out[0].text).toContain('orientação de higiene');
  });

  it('clusters the same phrasing across different teeth (tooth-agnostic)', () => {
    const records = [
      rec({ notes: 'Restauração no dente 12 com resina composta', procedure_performed: 'Restauracao' }),
      rec({ notes: 'Restauração no dente 24 com resina composta', procedure_performed: 'Restauracao' }),
      rec({ notes: 'Restauração no dente 36 com resina composta', procedure_performed: 'Restauracao' }),
    ];
    const out = buildShortcuts(records, { minCount: 3 });
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(3);
    // texto não carrega o dente de nenhum paciente específico
    expect(out[0].text).not.toMatch(/\d{2}/);
    expect(out[0].text.toLowerCase()).toContain('resina');
  });

  it('learns the return interval from the dentist habit (not generic)', () => {
    const records = Array.from({ length: 3 }, () =>
      rec({
        notes: 'Profilaxia de rotina',
        procedure_performed: 'Profilaxia',
        created_at: '2026-01-01T10:00:00Z',
        return_date: '2026-07-01', // ~181 dias (6 meses), não o default de 30
      })
    );
    const out = buildShortcuts(records, { minCount: 3 });
    expect(out[0].returnDays).toBeGreaterThan(150);
  });

  it('uses null return when the habit is to not schedule one', () => {
    const records = Array.from({ length: 3 }, () =>
      rec({ notes: 'Avaliação clínica de rotina', procedure_performed: 'Avaliação', return_date: null })
    );
    const out = buildShortcuts(records, { minCount: 3 });
    expect(out[0].returnDays).toBeNull();
  });

  it('caps the number of cards and orders by frequency', () => {
    const make = (notes: string, n: number) =>
      Array.from({ length: n }, () => rec({ notes, procedure_performed: notes }));
    const records = [
      ...make('Profilaxia de rotina', 5),
      ...make('Raspagem supragengival', 4),
      ...make('Clareamento de consultório', 3),
      ...make('Aplicação de flúor', 3),
    ];
    const out = buildShortcuts(records, { minCount: 3, maxCards: 2 });
    expect(out).toHaveLength(2);
    expect(out[0].count).toBe(5);
    expect(out[1].count).toBe(4);
  });

  it('ignores the trailing "retorno X" suffix when clustering', () => {
    const records = [
      rec({ notes: 'Profilaxia de rotina — retorno sugerido 30 dias', procedure_performed: 'Profilaxia' }),
      rec({ notes: 'Profilaxia de rotina — retorno 30 dias', procedure_performed: 'Profilaxia' }),
      rec({ notes: 'Profilaxia de rotina', procedure_performed: 'Profilaxia' }),
    ];
    const out = buildShortcuts(records, { minCount: 3 });
    expect(out).toHaveLength(1);
    expect(out[0].count).toBe(3);
    expect(out[0].text).not.toMatch(/retorno/i);
  });
});
