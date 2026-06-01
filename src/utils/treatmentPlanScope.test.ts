import { describe, it, expect } from 'vitest';
import {
  countActiveTreatmentsByScope,
  formatActiveTreatmentCounter,
  formatTreatmentAnchor,
  inferScope,
  normalizeTreatmentItem,
} from './treatmentPlanScope';

describe('treatmentPlanScope', () => {
  it('infere scope tooth a partir de tooth_number legado', () => {
    expect(inferScope({ procedure: 'Canal', tooth_number: 14 })).toBe('tooth');
  });

  it('infere scope patient para clareamento sem dente', () => {
    expect(inferScope({ procedure: 'Clareamento', status: 'PLANEJADO' })).toBe('patient');
  });

  it('infere scope quadrant para raspagem com quadrant', () => {
    expect(inferScope({ procedure: 'Raspagem', quadrant: 2, status: 'APROVADO' })).toBe('quadrant');
  });

  it('formata contador abrangente', () => {
    const counts = countActiveTreatmentsByScope([
      { procedure: 'Canal', tooth_number: 14, status: 'APROVADO' },
      { procedure: 'Restauração', tooth_number: 32, status: 'PLANEJADO' },
      { procedure: 'Raspagem', quadrant: 1, status: 'APROVADO' },
      { procedure: 'Clareamento', status: 'PLANEJADO' },
    ]);
    expect(formatActiveTreatmentCounter(counts)).toBe(
      '2 dentes em tratamento · +1 quadrante · +1 procedimento global'
    );
  });

  it('formata âncora por escopo', () => {
    expect(formatTreatmentAnchor(normalizeTreatmentItem({ procedure: 'Raspagem', quadrant: 3 }))).toBe(
      'Quadrante 3'
    );
    expect(formatTreatmentAnchor({ procedure: 'Profilaxia' })).toBe('Paciente');
  });
});
