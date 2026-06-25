import React, { useMemo, useState } from 'react';
import { Activity, Check, Trash2 } from '../icons';
import type { DentitionMode } from '../constants/dentition';
import {
  formatTreatmentAnchor,
  normalizeTreatmentItem,
} from '../utils/treatmentPlanScope';
import {
  PROSTHETIC_STAGES,
  PROSTHETIC_STAGE_FIELD,
  PROSTHESIS_PROCEDURE_LABELS,
  getProsthesisColor,
  getProstheticStage,
  getProstheticStageIndex,
} from '../constants/prosthetics';

interface ControleProteticoProps {
  /** Itens de prótese do plano de tratamento (escopo arcada ou intervalo). */
  prostheses: any[];
  dentitionMode: DentitionMode;
  /** Atualiza a etapa do controle de uma prótese. */
  onUpdateStage: (treatmentId: string, stageKey: string) => Promise<void> | void;
  /** Remove a prótese do plano. */
  onRemove?: (item: any) => void;
}

export const ControleProtetico: React.FC<ControleProteticoProps> = ({
  prostheses,
  onUpdateStage,
  onRemove,
}) => {
  const [savingId, setSavingId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      prostheses.map((raw) => {
        const normalized = normalizeTreatmentItem(raw);
        const procedureKey = String(normalized.procedure_key || '');
        return {
          raw,
          id: String(raw.id),
          procedureKey,
          label:
            PROSTHESIS_PROCEDURE_LABELS[procedureKey as keyof typeof PROSTHESIS_PROCEDURE_LABELS] ||
            raw.procedure ||
            'Prótese',
          anchor: formatTreatmentAnchor(raw),
          stageKey: String(raw[PROSTHETIC_STAGE_FIELD] || PROSTHETIC_STAGES[0].key),
          color: getProsthesisColor(procedureKey),
        };
      }),
    [prostheses]
  );

  const setStage = async (id: string, stageKey: string, currentStageKey: string) => {
    if (stageKey === currentStageKey || savingId) return;
    setSavingId(id);
    try {
      await onUpdateStage(id, stageKey);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="rounded-[24px] border border-slate-200/60 bg-white/95 p-4 sm:p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      {/* ── Header ── */}
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
          <Activity size={15} />
        </div>
        <div>
          <h3 className="text-base font-bold tracking-[-0.015em] text-slate-900">Controle protético</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium tabular-nums">
            {items.length === 0
              ? 'Nenhuma prótese no plano'
              : `${items.length} prótese${items.length !== 1 ? 's' : ''} em acompanhamento`}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl py-9 text-center bg-slate-50/70 border border-slate-100">
          <div className="flex flex-col items-center gap-2.5 px-6">
            <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <Activity size={18} />
            </div>
            <p className="text-slate-800 text-sm font-bold">Nenhuma prótese registrada</p>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[290px]">
              Use “Adicionar procedimento” no odontograma para registrar Prótese Fixa, Removível, Total ou
              Protocolo. Cada prótese aparece aqui para acompanhar as etapas no laboratório.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const currentIndex = getProstheticStageIndex(item.stageKey);
            const currentStage = getProstheticStage(item.stageKey);
            const isSaving = savingId === item.id;
            return (
              <div
                key={item.id}
                className="rounded-[18px] border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)]"
              >
                {/* title row */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${item.color.dot}`} />
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-slate-900 leading-snug truncate">{item.label}</p>
                      <p className="text-[11px] text-slate-400 font-medium">{item.anchor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${currentStage.toneClass}`}>
                      <span className={`w-[6px] h-[6px] rounded-full ${currentStage.dotClass}`} />
                      {currentStage.short}
                    </span>
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(item.raw)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="Remover prótese"
                        aria-label={`Remover ${item.label}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* stage stepper */}
                <div className="flex items-center">
                  {PROSTHETIC_STAGES.map((stage, idx) => {
                    const reached = idx <= currentIndex;
                    const isCurrent = idx === currentIndex;
                    return (
                      <React.Fragment key={stage.key}>
                        {idx > 0 && (
                          <div className={`h-[2px] flex-1 ${idx <= currentIndex ? 'bg-violet-300' : 'bg-slate-100'}`} />
                        )}
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setStage(item.id, stage.key, item.stageKey)}
                          title={stage.label}
                          className={`group relative flex flex-col items-center ${isSaving ? 'cursor-wait' : 'cursor-pointer'}`}
                        >
                          <span
                            className={`flex items-center justify-center rounded-full border transition-all duration-200 ${
                              isCurrent
                                ? 'w-7 h-7 border-violet-500 bg-violet-500 text-white shadow-[0_2px_8px_rgba(139,92,246,0.35)]'
                                : reached
                                  ? 'w-6 h-6 border-violet-300 bg-violet-100 text-violet-600'
                                  : 'w-6 h-6 border-slate-200 bg-white text-slate-300 group-hover:border-slate-300'
                            }`}
                          >
                            {reached ? <Check size={isCurrent ? 14 : 12} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                          </span>
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* stage labels */}
                <div className="mt-1.5 flex items-center justify-between">
                  {PROSTHETIC_STAGES.map((stage, idx) => (
                    <span
                      key={stage.key}
                      className={`flex-1 text-[9px] font-semibold leading-tight ${
                        idx === currentIndex ? 'text-violet-600' : 'text-slate-400'
                      } ${idx === 0 ? 'text-left' : idx === PROSTHETIC_STAGES.length - 1 ? 'text-right' : 'text-center'}`}
                    >
                      {stage.short}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
