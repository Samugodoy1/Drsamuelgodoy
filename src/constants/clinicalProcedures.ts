import type { ToothStatus } from '../components/Odontogram';

/** Escopos suportados hoje; novos valores podem ser adicionados sem mudar o schema do plano. */
export const TREATMENT_SCOPES = {
  TOOTH: 'tooth',
  QUADRANT: 'quadrant',
  PATIENT: 'patient',
  /** Intervalo de dentes (de X a Y) — usado por ponte e prótese parcial removível. */
  RANGE: 'range',
  /** Reservados para evolução futura (sextante, boca inteira). */
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
  prosthesis_fixed: {
    key: 'prosthesis_fixed',
    label: 'Prótese Fixa',
    scope: TREATMENT_SCOPES.RANGE,
    defaultValue: 1800,
  },
  prosthesis_removable: {
    key: 'prosthesis_removable',
    label: 'Prótese Removível',
    scope: TREATMENT_SCOPES.RANGE,
    defaultValue: 1500,
  },
  prosthesis_total: {
    key: 'prosthesis_total',
    label: 'Prótese Total',
    scope: TREATMENT_SCOPES.ARCH,
    defaultValue: 2000,
  },
  prosthesis_protocol: {
    key: 'prosthesis_protocol',
    label: 'Protocolo s/ Implante',
    scope: TREATMENT_SCOPES.ARCH,
    defaultValue: 8000,
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

/** Próteses de arcada inteira (protocolo, prótese total). */
export const ARCH_SCOPE_PROCEDURES = Object.values(CLINICAL_PROCEDURES).filter(
  (p) => p.scope === TREATMENT_SCOPES.ARCH
);

/** Próteses por intervalo de dentes (ponte fixa, prótese parcial removível). */
export const RANGE_SCOPE_PROCEDURES = Object.values(CLINICAL_PROCEDURES).filter(
  (p) => p.scope === TREATMENT_SCOPES.RANGE
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
