import React from 'react';
import { Plus, Stethoscope } from '../../icons';
import type { OrthoVisit } from '../types';
import { PROCEDURE_LABEL, COLLABORATION_LABEL } from '../utils/labels';
import { formatDate } from '../utils/format';

interface Props {
  visits: OrthoVisit[];
  onRegister: () => void;
}

const Chip: React.FC<{ children: React.ReactNode; tone?: string }> = ({ children, tone }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${
      tone || 'bg-slate-100 text-slate-600'
    }`}
  >
    {children}
  </span>
);

const VisitCard: React.FC<{ visit: OrthoVisit; isLatest: boolean }> = ({ visit, isLatest }) => {
  const procs = visit.procedures || [];
  const added = visit.accessories_added || [];
  const removed = visit.accessories_removed || [];
  return (
    <div className="relative pl-6">
      <span
        className={`absolute left-0 top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${
          isLatest ? 'bg-slate-900' : 'bg-slate-300'
        }`}
      />
      <div className="rounded-2xl border border-slate-200/70 bg-white p-3.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[13px] font-bold text-slate-900">{formatDate(visit.date)}</p>
          {isLatest && (
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mais recente</span>
          )}
        </div>

        {(visit.upper_arch || visit.lower_arch) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {visit.upper_arch && <Chip tone="bg-sky-50 text-sky-700">Sup: {visit.upper_arch}</Chip>}
            {visit.lower_arch && <Chip tone="bg-violet-50 text-violet-700">Inf: {visit.lower_arch}</Chip>}
          </div>
        )}

        {procs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {procs.map((p, i) => (
              <Chip key={i}>{PROCEDURE_LABEL[p] || p}</Chip>
            ))}
          </div>
        )}

        {(added.length > 0 || removed.length > 0) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {added.map((a, i) => (
              <Chip key={`a${i}`} tone="bg-emerald-50 text-emerald-700">
                +{a.type}
                {a.tooth ? ` (${a.tooth})` : ''}
              </Chip>
            ))}
            {removed.map((a, i) => (
              <Chip key={`r${i}`} tone="bg-rose-50 text-rose-700">
                −{a.type}
                {a.tooth ? ` (${a.tooth})` : ''}
              </Chip>
            ))}
          </div>
        )}

        {visit.collaboration && (
          <p className="text-[11px] text-slate-400 font-medium mb-1">
            Colaboração: {COLLABORATION_LABEL[visit.collaboration]}
          </p>
        )}

        {visit.summary_text && (
          <p className="text-[12px] text-slate-500 leading-snug">{visit.summary_text}</p>
        )}
      </div>
    </div>
  );
};

/** Evolução do tratamento — timeline altamente visual, sem grandes blocos de texto. */
export const VisitTimeline: React.FC<Props> = ({ visits, onRegister }) => {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope size={14} className="text-slate-400" />
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Evolução do tratamento</p>
        </div>
        <button
          onClick={onRegister}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-slate-800 active:scale-[0.96] transition"
        >
          <Plus size={13} /> Registrar manutenção
        </button>
      </div>

      {visits.length === 0 ? (
        <p className="text-[13px] text-slate-400 py-2">Nenhuma manutenção registrada ainda.</p>
      ) : (
        <div className="relative space-y-3 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
          {visits.map((v, i) => (
            <VisitCard key={v.id} visit={v} isLatest={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
};
