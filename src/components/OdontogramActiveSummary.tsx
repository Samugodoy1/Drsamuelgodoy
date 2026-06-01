import React, { useMemo, useState } from 'react';
import { ChevronDown, Trash2 } from '../icons';
import type { ToothStatus } from './Odontogram';
import {
  TREATMENT_SCOPES,
  countActiveTreatmentsByScope,
  formatActiveTreatmentCounter,
  formatTreatmentAnchor,
  normalizeTreatmentItem,
  type QuadrantId,
  type TreatmentPlanItemLike,
} from '../utils/treatmentPlanScope';
import {
  displayStatusTone,
  getTreatmentDisplayStatus,
  type TreatmentDisplayStatus,
} from '../utils/treatmentDisplayStatus';

export interface OdontogramActiveSummaryProps {
  items: TreatmentPlanItemLike[];
  toothStatuses?: Record<number, { status: ToothStatus }>;
  highlightedTreatmentId?: string | null;
  onSelectTooth?: (toothNumber: number) => void;
  onSelectQuadrant?: (quadrant: QuadrantId) => void;
  onSelectPatientItem?: (itemId: string) => void;
  onRemoveTreatment?: (item: TreatmentPlanItemLike) => void;
}

export const OdontogramActiveSummary: React.FC<OdontogramActiveSummaryProps> = ({
  items,
  toothStatuses = {},
  highlightedTreatmentId,
  onSelectTooth,
  onSelectQuadrant,
  onSelectPatientItem,
  onRemoveTreatment,
}) => {
  const [expanded, setExpanded] = useState(false);
  const compactLabel = useMemo(
    () => formatActiveTreatmentCounter(countActiveTreatmentsByScope(items)),
    [items]
  );

  if (!compactLabel || items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="group flex w-full items-center gap-2 py-1 text-left transition-colors"
        aria-expanded={expanded}
      >
        <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-600 group-hover:text-slate-800">
          {compactLabel}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <ul className="mt-1 space-y-0.5 border-l border-slate-200/80 pl-3 ml-0.5">
          {items.map((raw) => {
            const item = normalizeTreatmentItem(raw);
            const toothStatus = item.tooth_number
              ? toothStatuses[item.tooth_number]?.status
              : undefined;
            const statusLabel = getTreatmentDisplayStatus(item, toothStatus);
            const isHighlighted = highlightedTreatmentId === item.id;
            const quadrant = item.quadrant ?? item.region?.quadrant;
            const isRemovableScope =
              item.scope === TREATMENT_SCOPES.PATIENT || item.scope === TREATMENT_SCOPES.QUADRANT;

            const handleRowClick = () => {
              if (item.scope === TREATMENT_SCOPES.TOOTH && item.tooth_number) {
                onSelectTooth?.(item.tooth_number);
                return;
              }
              if (item.scope === TREATMENT_SCOPES.QUADRANT && quadrant) {
                onSelectQuadrant?.(quadrant as QuadrantId);
                return;
              }
              if (item.id) onSelectPatientItem?.(String(item.id));
            };

            return (
              <li
                key={item.id || `${item.procedure}-${formatTreatmentAnchor(item)}`}
                className={`flex items-center gap-1 rounded-lg pr-1 ${isHighlighted ? 'bg-indigo-50/60' : ''}`}
              >
                <button
                  type="button"
                  onClick={handleRowClick}
                  className="min-w-0 flex-1 py-1 text-left text-[12px] leading-snug text-slate-600 hover:text-slate-900"
                >
                  <span className="font-medium text-slate-800">{formatTreatmentAnchor(item)}</span>
                  <span className="text-slate-400"> · </span>
                  {item.procedure}
                  <span className="text-slate-400"> · </span>
                  <span className={`font-semibold ${displayStatusTone[statusLabel as TreatmentDisplayStatus]}`}>
                    {statusLabel}
                  </span>
                </button>
                {isRemovableScope && onRemoveTreatment && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveTreatment(raw);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    aria-label={`Remover ${item.procedure}`}
                    title="Remover"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
