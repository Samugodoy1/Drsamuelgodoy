import React, { useEffect, useRef, useState } from 'react';
import { Plus, ChevronLeft } from '../icons';
import {
  PATIENT_SCOPE_PROCEDURES,
  QUADRANT_SCOPE_PROCEDURES,
} from '../constants/clinicalProcedures';
import type { QuadrantId } from '../utils/treatmentPlanScope';

type MenuView = 'closed' | 'list' | 'quadrant';

export interface ScopeProcedureMenuProps {
  onSelect: (payload: {
    procedureKey: string;
    procedure: string;
    scope: 'patient' | 'quadrant';
    quadrant?: QuadrantId;
  }) => void;
  hint?: string | null;
}

export const ScopeProcedureMenu: React.FC<ScopeProcedureMenuProps> = ({ onSelect, hint }) => {
  const [view, setView] = useState<MenuView>('closed');
  const [pendingQuadrantProc, setPendingQuadrantProc] = useState<{
    procedureKey: string;
    procedure: string;
  } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const close = () => {
    setView('closed');
    setPendingQuadrantProc(null);
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

  const openList = () => setView('list');

  const pickPatientProcedure = (procedureKey: string, procedure: string) => {
    onSelect({ procedureKey, procedure, scope: 'patient' });
    close();
  };

  const pickQuadrantProcedure = (procedureKey: string, procedure: string) => {
    setPendingQuadrantProc({ procedureKey, procedure });
    setView('quadrant');
  };

  const pickQuadrant = (quadrant: QuadrantId) => {
    if (!pendingQuadrantProc) return;
    onSelect({
      procedureKey: pendingQuadrantProc.procedureKey,
      procedure: pendingQuadrantProc.procedure,
      scope: 'quadrant',
      quadrant,
    });
    close();
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => (view === 'closed' ? openList() : close())}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-all duration-200 hover:text-slate-900 hover:bg-slate-100/80 active:scale-[0.98]"
      >
        <Plus size={13} />
        Adicionar procedimento
      </button>

      {view !== 'closed' && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[min(100vw-2rem,15rem)] rounded-2xl border border-slate-200/80 bg-white/95 p-1 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm">
          {view === 'list' && (
            <>
              {PATIENT_SCOPE_PROCEDURES.map((proc) => (
                <button
                  key={proc.key}
                  type="button"
                  onClick={() => pickPatientProcedure(proc.key, proc.label)}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  {proc.label}
                </button>
              ))}
              {QUADRANT_SCOPE_PROCEDURES.map((proc) => (
                <button
                  key={proc.key}
                  type="button"
                  onClick={() => pickQuadrantProcedure(proc.key, proc.label)}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100"
                >
                  {proc.label}
                </button>
              ))}
            </>
          )}

          {view === 'quadrant' && pendingQuadrantProc && (
            <div className="p-1">
              <button
                type="button"
                onClick={() => setView('list')}
                className="mb-1 flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700"
              >
                <ChevronLeft size={12} />
                Voltar
              </button>
              <p className="px-2 pb-1.5 text-[10px] font-medium text-slate-400">
                Quadrante — {pendingQuadrantProc.procedure}
              </p>
              {([1, 2, 3, 4] as QuadrantId[]).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => pickQuadrant(q)}
                  className="w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50"
                >
                  Quadrante {q}
                  <span className="ml-1 text-[11px] font-normal text-slate-400">
                    {q === 1 ? '18–11' : q === 2 ? '21–28' : q === 3 ? '31–38' : '48–41'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {hint && view === 'list' && (
            <p className="mx-2 mb-1.5 text-[10px] leading-snug text-amber-700">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
};
