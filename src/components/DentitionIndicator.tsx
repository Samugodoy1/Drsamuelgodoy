import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from '../icons';
import {
  DENTITION_MODE_SHORT,
  type DentitionMode,
  type DentitionSource,
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
  { value: 'auto', label: 'Automático' },
  { value: 'deciduous', label: DENTITION_MODE_SHORT.deciduous },
  { value: 'mixed', label: DENTITION_MODE_SHORT.mixed },
  { value: 'permanent', label: DENTITION_MODE_SHORT.permanent },
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

  const chipLabel = [
    DENTITION_MODE_SHORT[effectiveMode],
    ageYears != null ? `${ageYears}a` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const selectValue = source === 'manual' ? effectiveMode : 'auto';
  const birthDateTitle =
    'Exibindo dentição permanente. Cadastre a data de nascimento para sugestão automática por idade.';

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center justify-end gap-x-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-colors"
        aria-expanded={open}
        title={!hasBirthDate ? birthDateTitle : undefined}
      >
        <span>{chipLabel}</span>
        <ChevronDown size={11} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-[13.5rem] rounded-xl border border-slate-200/90 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.1)]">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.value === 'auto' && !hasBirthDate}
              title={option.value === 'auto' && !hasBirthDate ? birthDateTitle : undefined}
              onClick={() => {
                if (option.value === 'auto') {
                  if (suggestedMode) onSelectMode(suggestedMode, 'auto');
                } else {
                  onSelectMode(option.value, 'manual');
                }
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[12px] font-medium transition-colors ${
                selectValue === option.value
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50'
              } ${option.value === 'auto' && !hasBirthDate ? 'cursor-not-allowed opacity-40' : ''}`}
            >
              {option.label}
              {selectValue === option.value && (
                <span className="text-[10px] text-slate-400">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {!hasBirthDate && (
        <span
          className="ml-1.5 inline text-[10px] text-slate-400"
          title={birthDateTitle}
        >
          · sem data
        </span>
      )}

      {showUpdatePrompt && suggestedMode && (
        <span className="ml-1.5 inline text-[10px] text-slate-500">
          · {DENTITION_MODE_SHORT[suggestedMode]}?{' '}
          <button
            type="button"
            onClick={onAcceptSuggestion}
            className="font-semibold text-slate-700 hover:text-slate-900"
          >
            Sim
          </button>
          <span className="text-slate-300"> / </span>
          <button
            type="button"
            onClick={onDismissSuggestion}
            className="text-slate-500 hover:text-slate-700"
          >
            Não
          </button>
        </span>
      )}
    </div>
  );
};

/** Linha auxiliar: dente fora do layout atual (sem banner). */
export const DentitionRevealHint: React.FC<{
  tooth: number;
  currentMode: DentitionMode;
  targetMode: DentitionMode;
  onReveal: () => void;
  onDismiss: () => void;
}> = ({ tooth, currentMode, targetMode, onReveal, onDismiss }) => (
  <p className="mb-1.5 text-[10px] text-slate-500">
    Dente {tooth} fora de {DENTITION_MODE_SHORT[currentMode].toLowerCase()}.{' '}
    <button type="button" onClick={onReveal} className="font-medium text-slate-700 hover:text-slate-900">
      Ver {DENTITION_MODE_SHORT[targetMode].toLowerCase()}
    </button>
    <span className="text-slate-300"> · </span>
    <button type="button" onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
      Fechar
    </button>
  </p>
);
