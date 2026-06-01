import { TREATMENT_SCOPES, type TreatmentScope, getProcedureDefinition } from '../constants/clinicalProcedures';

export { TREATMENT_SCOPES, type TreatmentScope } from '../constants/clinicalProcedures';

export type QuadrantId = 1 | 2 | 3 | 4;

/** Âncora regional extensível (sextante, arcada, etc.) sem alterar o shape base do plano. */
export interface TreatmentRegion {
  quadrant?: QuadrantId;
  sextant?: 1 | 2 | 3 | 4 | 5 | 6;
  arch?: 'upper' | 'lower';
  mouth?: boolean;
}

export interface TreatmentPlanItemLike {
  id?: string;
  procedure?: string;
  procedure_key?: string;
  scope?: TreatmentScope | string;
  tooth_number?: number;
  quadrant?: QuadrantId;
  region?: TreatmentRegion;
  status?: string;
  value?: number;
  [key: string]: unknown;
}

export interface NormalizedTreatment extends TreatmentPlanItemLike {
  scope: TreatmentScope;
  procedure_key?: string;
}

export const QUADRANT_TEETH: Record<QuadrantId, number[]> = {
  1: [18, 17, 16, 15, 14, 13, 12, 11],
  2: [21, 22, 23, 24, 25, 26, 27, 28],
  3: [31, 32, 33, 34, 35, 36, 37, 38],
  4: [48, 47, 46, 45, 44, 43, 42, 41],
};

export const ACTIVE_TREATMENT_STATUSES = new Set(['APROVADO', 'PENDENTE', 'PLANEJADO']);

export function isActiveTreatmentStatus(status?: string): boolean {
  return ACTIVE_TREATMENT_STATUSES.has(String(status || '').toUpperCase());
}

export function inferScope(item: TreatmentPlanItemLike): TreatmentScope {
  const explicit = String(item.scope || '').toLowerCase();
  if (Object.values(TREATMENT_SCOPES).includes(explicit as TreatmentScope)) {
    return explicit as TreatmentScope;
  }

  const def = getProcedureDefinition(item.procedure, item.procedure_key);
  if (def?.scope) return def.scope;

  const tooth = Number(item.tooth_number);
  if (Number.isFinite(tooth) && tooth > 0) return TREATMENT_SCOPES.TOOTH;

  const quadrant = resolveQuadrant(item);
  if (quadrant) return TREATMENT_SCOPES.QUADRANT;

  if (item.region?.sextant) return TREATMENT_SCOPES.SEXTANT;
  if (item.region?.arch) return TREATMENT_SCOPES.ARCH;
  if (item.region?.mouth) return TREATMENT_SCOPES.MOUTH;

  return TREATMENT_SCOPES.PATIENT;
}

export function resolveQuadrant(item: TreatmentPlanItemLike): QuadrantId | null {
  const fromTop = Number(item.quadrant);
  if (fromTop >= 1 && fromTop <= 4) return fromTop as QuadrantId;
  const fromRegion = Number(item.region?.quadrant);
  if (fromRegion >= 1 && fromRegion <= 4) return fromRegion as QuadrantId;
  return null;
}

export function normalizeTreatmentItem(item: TreatmentPlanItemLike): NormalizedTreatment {
  const scope = inferScope(item);
  const procedure_key =
    item.procedure_key || getProcedureDefinition(item.procedure, item.procedure_key)?.key;

  const quadrant = scope === TREATMENT_SCOPES.QUADRANT ? resolveQuadrant(item) : null;
  const tooth_number =
    scope === TREATMENT_SCOPES.TOOTH && Number(item.tooth_number) > 0
      ? Number(item.tooth_number)
      : undefined;

  const region: TreatmentRegion | undefined =
    scope === TREATMENT_SCOPES.QUADRANT && quadrant
      ? { ...(item.region || {}), quadrant }
      : item.region;

  return {
    ...item,
    scope,
    procedure_key,
    tooth_number,
    quadrant: quadrant ?? undefined,
    region,
  };
}

export function normalizeTreatmentPlan(plan: TreatmentPlanItemLike[] = []): NormalizedTreatment[] {
  return plan.map(normalizeTreatmentItem);
}

export function formatTreatmentAnchor(item: TreatmentPlanItemLike): string {
  const normalized = normalizeTreatmentItem(item);
  switch (normalized.scope) {
    case TREATMENT_SCOPES.TOOTH:
      return normalized.tooth_number ? `Dente ${normalized.tooth_number}` : 'Dente';
    case TREATMENT_SCOPES.QUADRANT: {
      const q = resolveQuadrant(normalized);
      return q ? `Quadrante ${q}` : 'Quadrante';
    }
    case TREATMENT_SCOPES.SEXTANT:
      return normalized.region?.sextant ? `Sextante ${normalized.region.sextant}` : 'Sextante';
    case TREATMENT_SCOPES.ARCH:
      return normalized.region?.arch === 'upper'
        ? 'Arcada superior'
        : normalized.region?.arch === 'lower'
          ? 'Arcada inferior'
          : 'Arcada';
    case TREATMENT_SCOPES.MOUTH:
      return 'Boca inteira';
    case TREATMENT_SCOPES.PATIENT:
    default:
      return 'Paciente';
  }
}

export function formatTreatmentSummaryLine(item: TreatmentPlanItemLike, statusLabel: string): string {
  const procedure = item.procedure || 'Procedimento';
  return `${formatTreatmentAnchor(item)} — ${procedure} — ${statusLabel}`;
}

export function treatmentsMatchAnchor(a: TreatmentPlanItemLike, b: TreatmentPlanItemLike): boolean {
  const na = normalizeTreatmentItem(a);
  const nb = normalizeTreatmentItem(b);
  if (na.scope !== nb.scope) return false;

  if (na.scope === TREATMENT_SCOPES.TOOTH) {
    return Number(na.tooth_number) === Number(nb.tooth_number);
  }
  if (na.scope === TREATMENT_SCOPES.QUADRANT) {
    return resolveQuadrant(na) === resolveQuadrant(nb);
  }
  if (na.procedure_key && nb.procedure_key) {
    return na.procedure_key === nb.procedure_key;
  }
  return String(na.procedure || '').toLowerCase() === String(nb.procedure || '').toLowerCase();
}

export function countActiveTreatmentsByScope(items: TreatmentPlanItemLike[]) {
  const active = items.filter((item) => isActiveTreatmentStatus(item.status));
  let teeth = 0;
  let quadrants = 0;
  let patientGlobal = 0;
  const toothSet = new Set<number>();
  const quadrantSet = new Set<QuadrantId>();

  active.forEach((raw) => {
    const item = normalizeTreatmentItem(raw);
    switch (item.scope) {
      case TREATMENT_SCOPES.TOOTH: {
        const tooth = Number(item.tooth_number);
        if (Number.isFinite(tooth) && tooth > 0 && !toothSet.has(tooth)) {
          toothSet.add(tooth);
          teeth += 1;
        }
        break;
      }
      case TREATMENT_SCOPES.QUADRANT: {
        const q = resolveQuadrant(item);
        if (q && !quadrantSet.has(q)) {
          quadrantSet.add(q);
          quadrants += 1;
        }
        break;
      }
      case TREATMENT_SCOPES.PATIENT:
        patientGlobal += 1;
        break;
      default:
        patientGlobal += 1;
        break;
    }
  });

  return { teeth, quadrants, patientGlobal, toothSet, quadrantSet };
}

export function formatActiveTreatmentCounter(counts: ReturnType<typeof countActiveTreatmentsByScope>): string | null {
  const parts: string[] = [];
  if (counts.teeth > 0) {
    parts.push(`${counts.teeth} dente${counts.teeth !== 1 ? 's' : ''} em tratamento`);
  }
  if (counts.quadrants > 0) {
    parts.push(`${counts.quadrants} quadrante${counts.quadrants !== 1 ? 's' : ''}`);
  }
  if (counts.patientGlobal > 0) {
    parts.push(
      `${counts.patientGlobal} procedimento${counts.patientGlobal !== 1 ? 's' : ''} global${counts.patientGlobal !== 1 ? 'is' : ''}`
    );
  }
  if (parts.length === 0) return null;
  return parts.join(' • ');
}

export function getTeethForScope(item: TreatmentPlanItemLike): number[] {
  const normalized = normalizeTreatmentItem(item);
  if (normalized.scope === TREATMENT_SCOPES.TOOTH && normalized.tooth_number) {
    return [normalized.tooth_number];
  }
  if (normalized.scope === TREATMENT_SCOPES.QUADRANT) {
    const q = resolveQuadrant(normalized);
    return q ? QUADRANT_TEETH[q] : [];
  }
  return [];
}
