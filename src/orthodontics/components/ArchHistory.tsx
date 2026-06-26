import React from 'react';
import type { OrthoArch } from '../types';
import { formatDate, pluralDays } from '../utils/format';

interface Props {
  arches: OrthoArch[];
}

/** Controle dos arcos — "dias instalado" calculado automaticamente no backend. */
export const ArchHistory: React.FC<Props> = ({ arches }) => {
  if (!arches || arches.length === 0) return null;
  const superior = arches.filter((a) => a.arch === 'superior');
  const inferior = arches.filter((a) => a.arch === 'inferior');

  const Column: React.FC<{ title: string; items: OrthoArch[]; tone: string }> = ({ title, items, tone }) => (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-wide mb-2 ${tone}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-[12px] text-slate-400">Sem registro</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a, i) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate">
                  {[a.material, a.gauge].filter(Boolean).join(' ') || 'Arco'}
                </p>
                <p className="text-[11px] text-slate-400">{formatDate(a.installed_date)}</p>
              </div>
              {i === 0 && a.days_installed !== null && (
                <span className="shrink-0 text-[11px] font-semibold text-slate-500 tabular-nums">
                  há {pluralDays(a.days_installed)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">Controle dos arcos</p>
      <div className="grid grid-cols-2 gap-4">
        <Column title="Superior" items={superior} tone="text-sky-600" />
        <Column title="Inferior" items={inferior} tone="text-violet-600" />
      </div>
    </div>
  );
};
