import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from '../icons';
import {
  DENTITION_MODE_LABELS,
  type DentitionMode,
  type DentitionSource,
  shouldShowPediatricContext,
} from '../constants/dentition';

export interface DentitionIndicatorProps {
  effectiveMode: DentitionMode;
  suggestedMode: DentitionMode | null;
  source: DentitionSource | null;
  ageYears: number | null;
  hasBirthDate: boolean;
  showUpdatePrompt: boolean;
  onSelectMode: (mode: DentitionMode, source: DentitionSource) => void;
  onAcceptSuggestion: () => void;
  onDismissSuggestion: () => void;
}

const MODE_OPTIONS: Array<{ value: DentitionMode | 'auto'; label: string }> = [
  { value: 'auto', label: 'Automático (pela idade)' },
  { value: 'deciduous', label: DENTITION_MODE_LABELS.deciduous },
  { value: 'mixed', label: DENTITION_MODE_LABELS.mixed },
  { value: 'permanent', label: DENTITION_MODE_LABELS.permanent },
];

export const DentitionIndicator: React.FC<DentitionIndicatorProps> = ({
  effectiveMode,
  suggestedMode,
  source,
  ageYears,
  hasBirthDate,
  showUpdatePrompt,
  onSelectMode,
  onAcceptSuggestion,
  onDismissSuggestion,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const contextParts: string[] = [];
  if (shouldShowPediatricContext(effectiveMode, ageYears)) {
    contextParts.push('Odontopediatria');
  }
  contextParts.push(DENTITION_MODE_LABELS[effectiveMode]);
  if (ageYears != null) {
    contextParts.push(`${ageYears} ${ageYears === 1 ? 'ano' : 'anos'}`);
  }

  const selectValue = source === 'manual' ? effectiveMode : 'auto';

  return (
    <div ref={rootRef} className="space-y-2 mb-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <p className="text-[11px] font-medium text-slate-500 tracking-tight">
          {contextParts.join(' • ')}
        </p>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700 transition-colors"
          aria-expanded={open}
        >
          Alterar
          <ChevronDown size={12} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
        {source === 'auto' && hasBirthDate && (
          <span className="text-[10px] text-slate-400">Automático</span>
        )}
        {source === 'manual' && (
          <span className="text-[10px] text-slate-400">Manual</span>
        )}
      </div>

      {!hasBirthDate && (
        <p className="text-[11px] text-amber-800/90 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-2">
          Data de nascimento não cadastrada — exibindo {DENTITION_MODE_LABELS.permanent.toLowerCase()} como
          padrão seguro. A sugestão automática por idade não está disponível até cadastrar a data.
        </p>
      )}

      {showUpdatePrompt && suggestedMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200/80 bg-sky-50/70 px-3 py-2">
          <p className="text-[11px] text-sky-900 flex-1 min-w-[200px]">
            A idade do paciente indica {DENTITION_MODE_LABELS[suggestedMode].toLowerCase()}. Atualizar o
            odontograma?
          </p>
          <button
            type="button"
            onClick={onAcceptSuggestion}
            className="rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-700"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={onDismissSuggestion}
            className="rounded-lg border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-800 hover:bg-sky-50"
          >
            Manter atual
          </button>
        </div>
      )}

      {open && (
        <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_12px_32px_rgba(15,23,42,0.08)] max-w-xs">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Tipo de dentição
          </p>
          <div className="space-y-0.5">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={option.value === 'auto' && !hasBirthDate}
                onClick={() => {
                  if (option.value === 'auto') {
                    if (suggestedMode) onSelectMode(suggestedMode, 'auto');
                  } else {
                    onSelectMode(option.value, 'manual');
                  }
                  setOpen(false);
                }}
                className={`w-full text-left rounded-xl px-3 py-2 text-[12px] font-medium transition-colors ${
                  selectValue === option.value
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50'
                } ${option.value === 'auto' && !hasBirthDate ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="px-2 pt-2 text-[10px] text-slate-400 leading-snug">
            Para erupção precoce, atraso ou casos específicos, escolha manualmente.
          </p>
        </div>
      )}
    </div>
  );
};
