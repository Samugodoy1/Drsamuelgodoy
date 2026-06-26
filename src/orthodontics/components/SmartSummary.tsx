import React from 'react';
import { Sparkles } from '../../icons';

interface Props {
  lines: string[];
}

/**
 * Resumo Inteligente — textos gerados dinamicamente no backend a partir dos
 * dados registrados. Nunca fixos, nunca recomendações clínicas.
 */
export const SmartSummary: React.FC<Props> = ({ lines }) => {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-gradient-to-br from-slate-50/80 to-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Resumo</p>
      </div>
      <div className="space-y-1.5">
        {lines.map((line, i) => (
          <p
            key={i}
            className={`leading-snug ${i === 0 ? 'text-[15px] font-semibold text-slate-900' : 'text-[13px] text-slate-500'}`}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};
