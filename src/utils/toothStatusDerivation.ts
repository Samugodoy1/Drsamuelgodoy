export type ToothStatus =
  | 'healthy'
  | 'decay'
  | 'filling'
  | 'crown'
  | 'root_canal_done'
  | 'root_canal_needed'
  | 'implant'
  | 'extraction_done'
  | 'extraction_needed'
  | 'fracture'
  | 'wear'
  | 'facet'
  | 'prosthesis'
  | 'missing';

export interface ToothFlags {
  isUrgent: boolean;
  isPending: boolean;
  isInTreatment: boolean;
  isCompleted: boolean;
}

const URGENT_STATUSES: Set<ToothStatus> = new Set([
  'root_canal_needed', 'extraction_needed', 'fracture',
]);

const PENDING_STATUSES: Set<ToothStatus> = new Set([
  'decay', 'root_canal_needed', 'extraction_needed', 'fracture',
]);

const PLAN_COMPLETION = new Set(['REALIZADO', 'CONCLUIDO', 'CONCLUÍDO']);

/**
 * Derive the visual flags for a tooth based on its clinical status
 * and ALL associated treatment plan items.
 *
 * Priority hierarchy:
 *  1. Urgent  — clinical condition (fracture, extraction/canal needed)
 *  2. In progress — any treatment APROVADO
 *  3. Pending — any treatment PLANEJADO/PENDENTE, or pending clinical condition
 *  4. Completed — ALL treatments REALIZADO (at least one must exist)
 *  5. Normal  — fallback
 */
export function deriveToothFlagsPure(
  toothStatus: ToothStatus,
  treatmentStatuses: string[],
): ToothFlags {
  const normalized = treatmentStatuses.map((s) => s.toUpperCase());

  // 1. Urgent
  if (URGENT_STATUSES.has(toothStatus)) {
    return { isUrgent: true, isPending: false, isInTreatment: false, isCompleted: false };
  }

  // 2. In progress
  if (normalized.some((s) => s === 'APROVADO')) {
    return { isUrgent: false, isPending: false, isInTreatment: true, isCompleted: false };
  }

  // 3. Pending
  if (
    normalized.some((s) => s === 'PLANEJADO' || s === 'PENDENTE') ||
    PENDING_STATUSES.has(toothStatus)
  ) {
    return { isUrgent: false, isPending: true, isInTreatment: false, isCompleted: false };
  }

  // 4. Completed — only when ALL are done
  if (normalized.length > 0 && normalized.every((s) => PLAN_COMPLETION.has(s))) {
    return { isUrgent: false, isPending: false, isInTreatment: false, isCompleted: true };
  }

  // 5. Normal
  return { isUrgent: false, isPending: false, isInTreatment: false, isCompleted: false };
}
