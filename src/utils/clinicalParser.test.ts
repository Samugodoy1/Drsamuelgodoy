import { describe, expect, it } from 'vitest';
import { parseClinicalText } from './clinicalParser';

describe('parseClinicalText', () => {
  it('returns empty result for blank input', () => {
    const r = parseClinicalText('   ');
    expect(r.teeth).toEqual([]);
    expect(r.materials).toEqual([]);
    expect(r.procedure).toBeUndefined();
  });

  it('extracts FDI teeth (permanent and deciduous), sorted and unique', () => {
    const r = parseClinicalText('Restauração no dente 12 e 12, também no 85');
    expect(r.teeth).toEqual([12, 85]);
  });

  it('detects restauração + resina + cor as procedure/material', () => {
    const r = parseClinicalText('Restauração no dente 12 com resina composta A2');
    expect(r.procedureKey).toBe('filling');
    expect(r.procedure).toBe('Restauracao');
    expect(r.materials).toContain('Resina composta');
    expect(r.materials).toContain('Cor A2');
  });

  it('detects endodontia from canal/obturação keywords', () => {
    const r = parseClinicalText('Tratamento de canal, obturação com guta-percha no dente 36');
    expect(r.procedureKey).toBe('root_canal');
    expect(r.teeth).toContain(36);
    expect(r.materials).toContain('Guta-percha');
  });

  it('detects exodontia and anesthetic material', () => {
    const r = parseClinicalText('Exodontia do dente 38 sob anestesia com articaína');
    expect(r.procedureKey).toBe('extraction');
    expect(r.materials).toContain('Anestésico local');
  });

  it('is accent-insensitive', () => {
    const r = parseClinicalText('profilaxia e raspagem de tartaro');
    // profilaxia wins by keyword presence; both detected
    expect(['prophylaxis', 'scaling']).toContain(r.procedureKey);
  });
});
