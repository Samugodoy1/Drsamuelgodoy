import { describe, expect, it } from 'vitest';
import {
  buildAnamnesisAlert,
  buildAnamnesisRiskFlags,
  formatAllergieLabel,
  hasRecordedAllergie,
  isNegativeAnamnesisValue,
} from './anamnesisUtils';

describe('anamnesisUtils', () => {
  it('treats negative allergy answers as no allergy', () => {
    ['nada', 'Nenhuma', 'não', 'nao', 'negativa', 'sem alergia', 'nega alergias', 'N/A'].forEach((value) => {
      expect(isNegativeAnamnesisValue(value)).toBe(true);
      expect(hasRecordedAllergie(value)).toBe(false);
      expect(formatAllergieLabel(value)).toBe('Nenhuma alergia referida');
    });
  });

  it('keeps real allergies as alerts', () => {
    expect(hasRecordedAllergie('Látex')).toBe(true);
    expect(formatAllergieLabel('Látex')).toBe('Látex');
    expect(buildAnamnesisAlert({ allergies: 'Látex' })).toContain('Látex');
  });

  it('does not flag patient as allergic when allergies is "nada"', () => {
    const flags = buildAnamnesisRiskFlags({ allergies: 'nada', medications: 'Losartana 50mg' });
    expect(flags.some((flag) => /alerg/i.test(flag))).toBe(false);
    expect(flags.some((flag) => /Losartana/i.test(flag))).toBe(true);
  });
});
