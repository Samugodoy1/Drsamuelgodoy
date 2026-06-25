import React, { useMemo, useState } from 'react';
import { Activity, Check, Plus, Trash2 } from '../icons';
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

interface ProstheticNote {
  id: string;
  date: string;
  text: string;
}

interface ControleProteticoProps {
  /** Itens de prótese do plano de tratamento (escopo arcada ou intervalo). */
  prostheses: any[];
  dentitionMode: DentitionMode;
  /** Atualiza a etapa do controle de uma prótese. */
  onUpdateStage: (treatmentId: string, stageKey: string) => Promise<void> | void;
  /** Adiciona uma anotação (com data) à prótese. */
  onAddNote: (treatmentId: string, text: string) => Promise<void> | void;
  /** Remove uma anotação da prótese. */
  onDeleteNote: (treatmentId: string, noteId: string) => Promise<void> | void;
  /** Remove a prótese do plano. */
  onRemove?: (item: any) => void;
}

const formatNoteDate = (value?: string): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const ControleProtetico: React.FC<ControleProteticoProps> = ({
  prostheses,
  onUpdateStage,
  onAddNote,
  onDeleteNote,
  onRemove,
}) => {
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const items = useMemo(
    () =>
      prostheses.map((raw) => {
        const normalized = normalizeTreatmentItem(raw);
        const procedureKey = String(normalized.procedure_key || '');
        const notes: ProstheticNote[] = Array.isArray(raw.prosthetic_notes)
          ? [...raw.prosthetic_notes].sort(
              (a: ProstheticNote, b: ProstheticNote) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
          : [];
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
          notes,
        };
      }),
    [prostheses]
  );

  if (items.length === 0) return null;

  const setStage = async (id: string, stageKey: string, currentStageKey: string) => {
    if (stageKey === currentStageKey || savingId) return;
    setSavingId(id);
    try {
      await onUpdateStage(id, stageKey);
    } finally {
      setSavingId(null);
    }
  };

  const submitNote = async (id: string) => {
    const text = (noteDrafts[id] || '').trim();
    if (!text || savingNoteId) return;
    setSavingNoteId(id);
    try {
      await onAddNote(id, text);
      setNoteDrafts((prev) => ({ ...prev, [id]: '' }));
    } finally {
      setSavingNoteId(null);
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
            {items.length} prótese{items.length !== 1 ? 's' : ''} em acompanhamento
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const currentIndex = getProstheticStageIndex(item.stageKey);
          const currentStage = getProstheticStage(item.stageKey);
          const isSaving = savingId === item.id;
          const draft = noteDrafts[item.id] || '';
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

              {/* ── Anotações ── */}
              <div className="mt-3.5 border-t border-slate-100 pt-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Anotações</p>

                {item.notes.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {item.notes.map((note) => (
                      <div key={note.id} className="group flex items-start gap-2 rounded-lg bg-slate-50/80 px-2.5 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-slate-400 tabular-nums">{formatNoteDate(note.date)}</p>
                          <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{note.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onDeleteNote(item.id, note.id)}
                          className="shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition-all group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
                          title="Remover anotação"
                          aria-label="Remover anotação"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setNoteDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void submitNote(item.id);
                      }
                    }}
                    rows={1}
                    className="min-h-[40px] flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-base text-slate-800 outline-none transition-colors focus:border-slate-400 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => submitNote(item.id)}
                    disabled={!draft.trim() || savingNoteId === item.id}
                    className="flex h-[40px] shrink-0 items-center gap-1 rounded-xl bg-slate-950 px-3 text-[13px] font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus size={12} />
                    Anotar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
