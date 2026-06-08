import type { ToothStatus } from '../components/Odontogram';

/** Escopos suportados hoje; novos valores podem ser adicionados sem mudar o schema do plano. */
export const TREATMENT_SCOPES = {
  TOOTH: 'tooth',
  QUADRANT: 'quadrant',
  PATIENT: 'patient',
  /** Reservados para evolução futura (sextante, arcada, boca inteira). */
  SEXTANT: 'sextant',
  ARCH: 'arch',
  MOUTH: 'mouth',
} as const;

export type TreatmentScope = (typeof TREATMENT_SCOPES)[keyof typeof TREATMENT_SCOPES];

export type ProcedureScope = TreatmentScope;

export interface ProcedureDefinition {
  key: string;
  label: string;
  scope: ProcedureScope;
  defaultValue?: number;
  odontogram?: {
    actionKey: string;
    toothStatus: ToothStatus;
    category: 'diagnosis' | 'procedure';
  };
}

export const CLINICAL_PROCEDURES: Record<string, ProcedureDefinition> = {
  filling: {
    key: 'filling',
    label: 'Restauracao',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 150,
    odontogram: { actionKey: 'filling', toothStatus: 'filling', category: 'procedure' },
  },
  root_canal: {
    key: 'root_canal',
    label: 'Canal',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 450,
    odontogram: { actionKey: 'root-canal', toothStatus: 'root_canal_needed', category: 'procedure' },
  },
  extraction: {
    key: 'extraction',
    label: 'Extracao',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 200,
    odontogram: { actionKey: 'extraction', toothStatus: 'extraction_needed', category: 'procedure' },
  },
  crown: {
    key: 'crown',
    label: 'Coroa',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 1200,
    odontogram: { actionKey: 'crown', toothStatus: 'crown', category: 'procedure' },
  },
  implant: {
    key: 'implant',
    label: 'Implante',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 2500,
    odontogram: { actionKey: 'implant', toothStatus: 'implant', category: 'procedure' },
  },
  decay: {
    key: 'decay',
    label: 'Carie',
    scope: TREATMENT_SCOPES.TOOTH,
    defaultValue: 120,
    odontogram: { actionKey: 'decay', toothStatus: 'decay', category: 'diagnosis' },
  },
  whitening: {
    key: 'whitening',
    label: 'Clareamento',
    scope: TREATMENT_SCOPES.PATIENT,
    defaultValue: 800,
  },
  prophylaxis: {
    key: 'prophylaxis',
    label: 'Profilaxia',
    scope: TREATMENT_SCOPES.PATIENT,
    defaultValue: 200,
  },
  scaling: {
    key: 'scaling',
    label: 'Raspagem',
    scope: TREATMENT_SCOPES.QUADRANT,
    defaultValue: 350,
  },
};

export const PATIENT_SCOPE_PROCEDURES = Object.values(CLINICAL_PROCEDURES).filter(
  (p) => p.scope === TREATMENT_SCOPES.PATIENT
);

export const QUADRANT_SCOPE_PROCEDURES = Object.values(CLINICAL_PROCEDURES).filter(
  (p) => p.scope === TREATMENT_SCOPES.QUADRANT
);

export function getProcedureDefinition(
  procedure?: string,
  procedureKey?: string
): ProcedureDefinition | undefined {
  if (procedureKey && CLINICAL_PROCEDURES[procedureKey]) {
    return CLINICAL_PROCEDURES[procedureKey];
  }
  if (!procedure) return undefined;
  const normalized = procedure.trim().toLowerCase();
  const stripAccents = (value: string) =>
    value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return Object.values(CLINICAL_PROCEDURES).find(
    (entry) =>
      entry.key === normalized ||
      entry.label.toLowerCase() === normalized ||
      stripAccents(entry.label) === stripAccents(procedure)
  );
}

export function resolveProcedureValue(procedure?: string, procedureKey?: string): number {
  const def = getProcedureDefinition(procedure, procedureKey);
  return def?.defaultValue ?? 0;
}
