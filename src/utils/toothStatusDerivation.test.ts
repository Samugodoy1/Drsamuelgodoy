import { describe, it, expect } from 'vitest';
import { deriveToothFlagsPure } from './toothStatusDerivation';

describe('deriveToothFlagsPure', () => {
  // ------- Cenário solicitado: 1 concluído + 1 pendente → "pendente" -------
  it('dente com 1 REALIZADO + 1 PENDENTE → deve ser pendente', () => {
    const flags = deriveToothFlagsPure('healthy', ['REALIZADO', 'PENDENTE']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: true,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- Cenário: 1 em andamento + 1 concluído → "em curso" -------
  it('dente com 1 APROVADO + 1 REALIZADO → deve ser em curso', () => {
    const flags = deriveToothFlagsPure('healthy', ['APROVADO', 'REALIZADO']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: false,
      isInTreatment: true,
      isCompleted: false,
    });
  });

  // ------- Cenário: todos concluídos → "concluído" -------
  it('dente com todos REALIZADO → deve ser concluído', () => {
    const flags = deriveToothFlagsPure('healthy', ['REALIZADO', 'REALIZADO']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: false,
      isInTreatment: false,
      isCompleted: true,
    });
  });

  // ------- Urgente pela condição clínica -------
  it('dente com fracture (clínico) → urgente, mesmo com tratamentos concluídos', () => {
    const flags = deriveToothFlagsPure('fracture', ['REALIZADO']);
    expect(flags).toEqual({
      isUrgent: true,
      isPending: false,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  it('dente com extraction_needed (clínico) → urgente', () => {
    const flags = deriveToothFlagsPure('extraction_needed', []);
    expect(flags).toEqual({
      isUrgent: true,
      isPending: false,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- Pendente pela condição clínica (decay sem tratamento) -------
  it('dente com cárie (decay) sem tratamentos → pendente', () => {
    const flags = deriveToothFlagsPure('decay', []);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: true,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- Normal: sem tratamentos e sem condição clínica -------
  it('dente saudável sem tratamentos → normal', () => {
    const flags = deriveToothFlagsPure('healthy', []);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: false,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- PLANEJADO sozinho → pendente -------
  it('dente com tratamento PLANEJADO → pendente', () => {
    const flags = deriveToothFlagsPure('healthy', ['PLANEJADO']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: true,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- APROVADO tem prioridade sobre PLANEJADO -------
  it('dente com APROVADO + PLANEJADO → em curso (APROVADO vence)', () => {
    const flags = deriveToothFlagsPure('healthy', ['APROVADO', 'PLANEJADO']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: false,
      isInTreatment: true,
      isCompleted: false,
    });
  });

  // ------- Urgência clínica sobrepõe tudo -------
  it('dente com root_canal_needed + APROVADO → urgente (clínico sobrepõe)', () => {
    const flags = deriveToothFlagsPure('root_canal_needed', ['APROVADO']);
    expect(flags).toEqual({
      isUrgent: true,
      isPending: false,
      isInTreatment: false,
      isCompleted: false,
    });
  });

  // ------- Um REALIZADO sozinho é concluído -------
  it('dente com 1 REALIZADO apenas → concluído', () => {
    const flags = deriveToothFlagsPure('healthy', ['REALIZADO']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: false,
      isInTreatment: false,
      isCompleted: true,
    });
  });

  // ------- Case-insensitivity -------
  it('aceita status em caixa mista (Realizado, planejado)', () => {
    const flags = deriveToothFlagsPure('healthy', ['Realizado', 'planejado']);
    expect(flags).toEqual({
      isUrgent: false,
      isPending: true,
      isInTreatment: false,
      isCompleted: false,
    });
  });
});
