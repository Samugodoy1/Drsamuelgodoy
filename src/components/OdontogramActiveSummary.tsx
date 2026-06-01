import React from 'react';
import type { ToothStatus } from './Odontogram';
import {
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
}

export const OdontogramActiveSummary: React.FC<OdontogramActiveSummaryProps> = ({
  items,
  toothStatuses = {},
  highlightedTreatmentId,
  onSelectTooth,
  onSelectQuadrant,
  onSelectPatientItem,
}) => {
  if (items.length === 0) return null;

  return (
    <div className="mb-3 rounded-2xl border border-slate-200/70 bg-white/90 px-3 py-2.5 sm:px-4 sm:py-3">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400 mb-2">
        Em tratamento
      </p>
      <ul className="space-y-1">
        {items.map((raw) => {
          const item = normalizeTreatmentItem(raw);
          const toothStatus = item.tooth_number
            ? toothStatuses[item.tooth_number]?.status
            : undefined;
          const statusLabel = getTreatmentDisplayStatus(item, toothStatus);
          const isHighlighted = highlightedTreatmentId === item.id;

          const handleClick = () => {
            if (item.scope === 'tooth' && item.tooth_number) {
              onSelectTooth?.(item.tooth_number);
              return;
            }
            const quadrant = item.quadrant ?? item.region?.quadrant;
            if (item.scope === 'quadrant' && quadrant) {
              onSelectQuadrant?.(quadrant as QuadrantId);
              return;
            }
            if (item.id) onSelectPatientItem?.(String(item.id));
          };

          const isClickable =
            (item.scope === 'tooth' && !!item.tooth_number) ||
            (item.scope === 'quadrant' && !!(item.quadrant ?? item.region?.quadrant)) ||
            item.scope === 'patient';

          return (
            <li key={item.id || `${item.procedure}-${formatTreatmentAnchor(item)}`}>
              <button
                type="button"
                onClick={handleClick}
                disabled={!isClickable}
                className={`w-full text-left rounded-xl px-2 py-1.5 transition-all duration-200 ${
                  isClickable ? 'hover:bg-slate-50 active:scale-[0.99]' : 'cursor-default'
                } ${isHighlighted ? 'bg-indigo-50/80 ring-1 ring-indigo-200/70' : ''}`}
              >
                <span className="text-[12px] sm:text-[13px] text-slate-700 leading-snug">
                  <span className="font-semibold text-slate-800">{formatTreatmentAnchor(item)}</span>
                  <span className="text-slate-400"> — </span>
                  <span className="font-medium">{item.procedure}</span>
                  <span className="text-slate-400"> — </span>
                  <span className={`font-bold ${displayStatusTone[statusLabel as TreatmentDisplayStatus]}`}>
                    {statusLabel}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
