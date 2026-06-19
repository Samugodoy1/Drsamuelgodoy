import { describe, expect, it } from 'vitest';
import { buildEvolutionDraft, getSuggestedReturn } from './evolutionDraft';

describe('getSuggestedReturn', () => {
  it('derives 7 days for endodontics/surgery/extraction/implant', () => {
    expect(getSuggestedReturn('root_canal').days).toBe(7);
    expect(getSuggestedReturn('extraction').days).toBe(7);
    expect(getSuggestedReturn('implant').days).toBe(7);
  });

  it('derives 30 days for restoration/prophylaxis', () => {
    expect(getSuggestedReturn('filling').days).toBe(30);
    expect(getSuggestedReturn('prophylaxis').days).toBe(30);
  });

  it('falls back to 30 days with a reason when unknown', () => {
    const r = getSuggestedReturn();
    expect(r.days).toBe(30);
    expect(r.reason).toBeTruthy();
  });

  it('resolves by label when key is absent', () => {
    expect(getSuggestedReturn(undefined, 'Canal').days).toBe(7);
  });
});

describe('buildEvolutionDraft', () => {
  it('prefers the structured plan and derives tooth + return', () => {
    const draft = buildEvolutionDraft({
      treatmentPlan: [
        { procedure_key: 'filling', tooth_number: 12, status: 'APROVADO' },
      ],
    });
    expect(draft.source).toBe('plan');
    expect(draft.text).toContain('dente 12');
    expect(draft.text).toContain('resina composta');
    expect(draft.return.days).toBe(30);
    expect(draft.sourceLabel).toMatch(/plano/i);
  });

  it('picks tooth-scoped active item over patient-scoped when both exist', () => {
    const draft = buildEvolutionDraft({
      treatmentPlan: [
        { procedure_key: 'prophylaxis', status: 'PENDENTE' },
        { procedure_key: 'root_canal', tooth_number: 36, status: 'APROVADO' },
      ],
    });
    expect(draft.text).toContain('dente 36');
    expect(draft.return.days).toBe(7);
  });

  it('ignores completed plan items', () => {
    const draft = buildEvolutionDraft({
      treatmentPlan: [
        { procedure_key: 'filling', tooth_number: 12, status: 'REALIZADO' },
      ],
      lastEvolution: { notes: 'Profilaxia de rotina', procedure_performed: 'Profilaxia' },
    });
    expect(draft.source).toBe('lastEvolution');
    expect(draft.text).toBe('Profilaxia de rotina');
  });

  it('falls back to last evolution when no active plan', () => {
    const draft = buildEvolutionDraft({
      treatmentPlan: [],
      lastEvolution: { notes: 'Raspagem supragengival', procedure_performed: 'Raspagem' },
    });
    expect(draft.source).toBe('lastEvolution');
    expect(draft.sourceLabel).toMatch(/última evolução/i);
  });

  it('returns an empty draft (no forced content) when there is no source', () => {
    const draft = buildEvolutionDraft({ treatmentPlan: [], lastEvolution: null });
    expect(draft.source).toBe('none');
    expect(draft.text).toBe('');
    expect(draft.sourceLabel).toBe('');
  });
});
