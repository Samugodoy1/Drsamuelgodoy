import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, ChevronLeft } from '../icons';
import {
  PATIENT_SCOPE_PROCEDURES,
  QUADRANT_SCOPE_PROCEDURES,
  ARCH_SCOPE_PROCEDURES,
  RANGE_SCOPE_PROCEDURES,
} from '../constants/clinicalProcedures';
import {
  type DentitionMode,
  getAllTeethInMode,
  getToothRange,
} from '../constants/dentition';
import type { QuadrantId } from '../utils/treatmentPlanScope';

type MenuView = 'closed' | 'list' | 'quadrant' | 'arch' | 'range';

export type ScopeProcedureSelection =
  | { scope: 'patient'; procedureKey: string; procedure: string }
  | { scope: 'quadrant'; procedureKey: string; procedure: string; quadrant: QuadrantId }
  | { scope: 'arch'; procedureKey: string; procedure: string; arch: 'upper' | 'lower' }
  | { scope: 'range'; procedureKey: string; procedure: string; teeth: number[] };

export interface ScopeProcedureMenuProps {
  onSelect: (payload: ScopeProcedureSelection) => void;
  hint?: string | null;
  dentitionMode?: DentitionMode;
}

export const ScopeProcedureMenu: React.FC<ScopeProcedureMenuProps> = ({
  onSelect,
  hint,
  dentitionMode = 'permanent',
}) => {
  const [view, setView] = useState<MenuView>('closed');
  const [pendingProc, setPendingProc] = useState<{ procedureKey: string; procedure: string } | null>(null);
  const [rangeFrom, setRangeFrom] = useState<number | ''>('');
  const [rangeTo, setRangeTo] = useState<number | ''>('');
  const rootRef = useRef<HTMLDivElement | null>(null);

  const teeth = useMemo(() => getAllTeethInMode(dentitionMode as DentitionMode), [dentitionMode]);

  const rangeTeeth = useMemo(() => {
    if (rangeFrom === '' || rangeTo === '') return [];
    return getToothRange(Number(rangeFrom), Number(rangeTo));
  }, [rangeFrom, rangeTo]);

  const close = () => {
    setView('closed');
    setPendingProc(null);
    setRangeFrom('');
    setRangeTo('');
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

  const confirmRange = () => {
    if (!pendingProc || rangeTeeth.length === 0) return;
    onSelect({ scope: 'range', ...pendingProc, teeth: rangeTeeth });
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
                  <span className="ml-1 text-[11px] font-normal text-slate-400">(de um dente a outro)</span>
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

          {view === 'range' && pendingProc && (
            <div className="p-2">
              <button type="button" onClick={() => setView('list')} className="mb-1 flex items-center gap-1 px-1 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700">
                <ChevronLeft size={12} /> Voltar
              </button>
              <p className="px-1 pb-2 text-[10px] font-medium text-slate-400">Intervalo — {pendingProc.procedure}</p>
              <div className="flex items-center gap-2 px-1">
                <label className="flex-1">
                  <span className="mb-1 block text-[10px] font-semibold text-slate-400">De</span>
                  <select
                    value={rangeFrom}
                    onChange={(e) => setRangeFrom(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="">—</option>
                    {teeth.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="flex-1">
                  <span className="mb-1 block text-[10px] font-semibold text-slate-400">Até</span>
                  <select
                    value={rangeTo}
                    onChange={(e) => setRangeTo(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[13px] text-slate-800 outline-none focus:border-slate-400"
                  >
                    <option value="">—</option>
                    {teeth.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>
              </div>

              {rangeFrom !== '' && rangeTo !== '' && rangeTeeth.length === 0 && (
                <p className="mt-2 px-1 text-[10px] leading-snug text-rose-600">
                  Os dois dentes precisam estar na mesma arcada.
                </p>
              )}
              {rangeTeeth.length > 0 && (
                <p className="mt-2 px-1 text-[11px] text-slate-500">
                  {rangeTeeth.length} dente{rangeTeeth.length !== 1 ? 's' : ''}: {rangeTeeth.join(', ')}
                </p>
              )}

              <button
                type="button"
                onClick={confirmRange}
                disabled={rangeTeeth.length === 0}
                className="mt-2 w-full rounded-lg bg-slate-950 px-3 py-2 text-[13px] font-semibold text-white transition-all hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
