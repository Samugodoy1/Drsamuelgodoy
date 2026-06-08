import type { ToothStatus } from '../components/Odontogram';
import { TREATMENT_SCOPES, normalizeTreatmentItem, type TreatmentPlanItemLike } from './treatmentPlanScope';

export type TreatmentDisplayStatus =
  | 'Urgente'
  | 'Em andamento'
  | 'Pendente'
  | 'Concluído'
  | 'Planejado';

const URGENT_CLINICAL: Set<ToothStatus> = new Set([
  'root_canal_needed',
  'extraction_needed',
  'fracture',
]);

export function getTreatmentDisplayStatus(
  item: TreatmentPlanItemLike,
  toothClinicalStatus?: ToothStatus
): TreatmentDisplayStatus {
  const normalized = normalizeTreatmentItem(item);
  const planStatus = String(item.status || '').toUpperCase();

  if (
    normalized.scope === TREATMENT_SCOPES.TOOTH &&
    toothClinicalStatus &&
    URGENT_CLINICAL.has(toothClinicalStatus)
  ) {
    return 'Urgente';
  }

  if (planStatus === 'APROVADO') return 'Em andamento';
  if (planStatus === 'PENDENTE') return 'Pendente';
  if (planStatus === 'PLANEJADO') return 'Planejado';
  if (['REALIZADO', 'CONCLUIDO', 'CONCLUÍDO'].includes(planStatus)) return 'Concluído';

  return 'Pendente';
}

export const displayStatusTone: Record<TreatmentDisplayStatus, string> = {
  Urgente: 'text-rose-700',
  'Em andamento': 'text-emerald-700',
  Pendente: 'text-amber-700',
  Planejado: 'text-sky-700',
  Concluído: 'text-slate-500',
};
