import { describe, it, expect } from 'vitest';
import {
  getAllTeethInMode,
  getDentitionLayout,
  getQuadrantTeethForMode,
  inferDentitionFromAge,
  isDeciduousToothNumber,
  isPermanentToothNumber,
  isToothActionAllowed,
  isToothVisibleInMode,
  shouldPromptDentitionUpdate,
} from './dentition';

describe('dentition', () => {
  it('infere faixa etária', () => {
    expect(inferDentitionFromAge(3)).toBe('deciduous');
    expect(inferDentitionFromAge(5)).toBe('deciduous');
    expect(inferDentitionFromAge(6)).toBe('mixed');
    expect(inferDentitionFromAge(12)).toBe('mixed');
    expect(inferDentitionFromAge(13)).toBe('permanent');
    expect(inferDentitionFromAge(null)).toBe('permanent');
  });

  it('classifica numeração FDI', () => {
    expect(isDeciduousToothNumber(51)).toBe(true);
    expect(isDeciduousToothNumber(85)).toBe(true);
    expect(isPermanentToothNumber(11)).toBe(true);
    expect(isPermanentToothNumber(48)).toBe(true);
    expect(isDeciduousToothNumber(11)).toBe(false);
  });

  it('layout decídua tem 20 dentes', () => {
    expect(getAllTeethInMode('deciduous')).toHaveLength(20);
    expect(getAllTeethInMode('permanent')).toHaveLength(32);
    expect(getAllTeethInMode('mixed')).toHaveLength(52);
  });

  it('quadrante misto inclui decíduos e permanentes', () => {
    const q1 = getQuadrantTeethForMode(1, 'mixed');
    expect(q1).toContain(11);
    expect(q1).toContain(55);
    expect(q1).toHaveLength(13);
  });

  it('visibilidade por modo', () => {
    expect(isToothVisibleInMode(55, 'deciduous')).toBe(true);
    expect(isToothVisibleInMode(11, 'deciduous')).toBe(false);
    expect(isToothVisibleInMode(11, 'mixed')).toBe(true);
  });

  it('oculta implante em decídua', () => {
    expect(isToothActionAllowed('implant', 51, 'deciduous')).toBe(false);
    expect(isToothActionAllowed('implant', 51, 'mixed')).toBe(false);
    expect(isToothActionAllowed('implant', 16, 'mixed')).toBe(true);
    expect(isToothActionAllowed('filling', 52, 'deciduous')).toBe(true);
  });

  it('só sugere atualização quando modo efetivo difere e não é manual', () => {
    expect(shouldPromptDentitionUpdate('deciduous', 'mixed', 'auto')).toBe(true);
    expect(shouldPromptDentitionUpdate('mixed', 'mixed', 'auto')).toBe(false);
    expect(shouldPromptDentitionUpdate('deciduous', 'mixed', 'manual')).toBe(false);
  });

  it('layout decídua segue sequência clínica', () => {
    const layout = getDentitionLayout('deciduous');
    expect(layout.upper.right.deciduous).toEqual([55, 54, 53, 52, 51]);
    expect(layout.lower.right.deciduous).toEqual([85, 84, 83, 82, 81]);
  });
});
