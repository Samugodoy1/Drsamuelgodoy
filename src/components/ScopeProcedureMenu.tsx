import React, { useEffect, useRef, useState } from 'react';
import { Plus, ChevronLeft } from '../icons';
import {
  PATIENT_SCOPE_PROCEDURES,
  QUADRANT_SCOPE_PROCEDURES,
  ARCH_SCOPE_PROCEDURES,
  RANGE_SCOPE_PROCEDURES,
} from '../constants/clinicalProcedures';
import type { DentitionMode } from '../constants/dentition';
import type { QuadrantId } from '../utils/treatmentPlanScope';

type MenuView = 'closed' | 'list' | 'quadrant' | 'arch';

export type ScopeProcedureSelection =
  | { scope: 'patient'; procedureKey: string; procedure: string }
  | { scope: 'quadrant'; procedureKey: string; procedure: string; quadrant: QuadrantId }
  | { scope: 'arch'; procedureKey: string; procedure: string; arch: 'upper' | 'lower' }
  | { scope: 'range'; procedureKey: string; procedure: string; teeth: number[] };

export interface ScopeProcedureMenuProps {
  onSelect: (payload: ScopeProcedureSelection) => void;
  /** Abre seleção de dentes no odontograma (próteses por intervalo). */
  onRequestRangePick?: (payload: { procedureKey: string; procedure: string }) => void;
  hint?: string | null;
  dentitionMode?: DentitionMode;
}

export const ScopeProcedureMenu: React.FC<ScopeProcedureMenuProps> = ({
  onSelect,
  onRequestRangePick,
  hint,
}) => {
  const [view, setView] = useState<MenuView>('closed');
  const [pendingProc, setPendingProc] = useState<{ procedureKey: string; procedure: string } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const close = () => {
    setView('closed');
    setPendingProc(null);
  };

  useEffect(() => {
    if (view === 'closed') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [view]);

  const pickPatientProcedure = (procedureKey: string, procedure: string) => {
    onSelect({ scope: 'patient', procedureKey, procedure });
    close();
  };

  const pickRegionalProcedure = (
    procedureKey: string,
    procedure: string,
    target: 'quadrant' | 'arch' | 'range'
  ) => {
    if (target === 'range') {
      if (onRequestRangePick) {
        onRequestRangePick({ procedureKey, procedure });
        close();
        return;
      }
    }
    setPendingProc({ procedureKey, procedure });
    setView(target);
  };

  const pickQuadrant = (quadrant: QuadrantId) => {
    if (!pendingProc) return;
    onSelect({ scope: 'quadrant', ...pendingProc, quadrant });
    close();
  };

  const pickArch = (arch: 'upper' | 'lower') => {
    if (!pendingProc) return;
    onSelect({ scope: 'arch', ...pendingProc, arch });
    close();
  };

  const itemClass =
    'w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100';

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (view === 'closed' ? setView('list') : close())}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all duration-200 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]"
      >
        <Plus size={13} />
        Adicionar procedimento
      </button>

      {view !== 'closed' && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(100vw-2rem,16rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          {view === 'list' && (
            <>
              {PATIENT_SCOPE_PROCEDURES.map((proc) => (
                <button key={proc.key} type="button" onClick={() => pickPatientProcedure(proc.key, proc.label)} className={itemClass}>
                  {proc.label}
                </button>
              ))}
              {QUADRANT_SCOPE_PROCEDURES.map((proc) => (
                <button key={proc.key} type="button" onClick={() => pickRegionalProcedure(proc.key, proc.label, 'quadrant')} className={itemClass}>
                  {proc.label}
                </button>
              ))}

              {(ARCH_SCOPE_PROCEDURES.length > 0 || RANGE_SCOPE_PROCEDURES.length > 0) && (
                <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-300">Próteses</p>
              )}
              {RANGE_SCOPE_PROCEDURES.map((proc) => (
                <button key={proc.key} type="button" onClick={() => pickRegionalProcedure(proc.key, proc.label, 'range')} className={itemClass}>
                  {proc.label}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">(selecionar dentes)</span>
                </button>
              ))}
              {ARCH_SCOPE_PROCEDURES.map((proc) => (
                <button key={proc.key} type="button" onClick={() => pickRegionalProcedure(proc.key, proc.label, 'arch')} className={itemClass}>
                  {proc.label}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">(arcada)</span>
                </button>
              ))}

              {hint && <p className="mx-2 my-1.5 text-[10px] leading-snug text-amber-700">{hint}</p>}
            </>
          )}

          {view === 'quadrant' && pendingProc && (
            <div className="p-1">
              <button type="button" onClick={() => setView('list')} className="mb-1 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700">
                <ChevronLeft size={12} /> Voltar
              </button>
              <p className="px-2 pb-1.5 text-[10px] font-medium text-slate-400">Quadrante — {pendingProc.procedure}</p>
              {([1, 2, 3, 4] as QuadrantId[]).map((q) => (
                <button key={q} type="button" onClick={() => pickQuadrant(q)} className={itemClass}>
                  Quadrante {q}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                    {q === 1 ? '18–11' : q === 2 ? '21–28' : q === 3 ? '31–38' : '48–41'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {view === 'arch' && pendingProc && (
            <div className="p-1">
              <button type="button" onClick={() => setView('list')} className="mb-1 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700">
                <ChevronLeft size={12} /> Voltar
              </button>
              <p className="px-2 pb-1.5 text-[10px] font-medium text-slate-400">Arcada — {pendingProc.procedure}</p>
              <button type="button" onClick={() => pickArch('upper')} className={itemClass}>Arcada superior</button>
              <button type="button" onClick={() => pickArch('lower')} className={itemClass}>Arcada inferior</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
