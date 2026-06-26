import React from 'react';
import { AlertTriangle, CheckCircle } from '../../icons';
import type { AttentionItem } from '../types';

interface Props {
  items: AttentionItem[];
}

const SEVERITY_TONE: Record<AttentionItem['severity'], string> = {
  high: 'bg-rose-50 text-rose-700 ring-rose-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  low: 'bg-slate-50 text-slate-600 ring-slate-200',
};

const SEVERITY_DOT: Record<AttentionItem['severity'], string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-400',
};

/**
 * O que merece atenção — principal componente da tela.
 * Apenas FATOS objetivos. Nunca sugere conduta nem procedimento.
 */
export const AttentionList: React.FC<Props> = ({ items }) => {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">O que merece atenção</p>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-2.5 py-2">
          <CheckCircle size={16} className="text-emerald-500" />
          <p className="text-[13px] text-slate-500 font-medium">Nada pendente no momento.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 ring-1 ${SEVERITY_TONE[item.severity]}`}
            >
              <span className={`shrink-0 h-2 w-2 rounded-full ${SEVERITY_DOT[item.severity]}`} />
              <span className="text-[13px] font-semibold">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
