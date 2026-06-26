import React from 'react';
import { Activity, Calendar, Clock, CheckCircle } from '../../icons';
import type { OrthoHeader } from '../types';
import { STATUS_LABEL, STATUS_TONE } from '../utils/labels';
import { formatDate, pluralDays } from '../utils/format';

interface Props {
  header: OrthoHeader;
}

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; tone?: string }> = ({
  icon,
  label,
  value,
  tone,
}) => (
  <div className="flex items-center gap-2.5 min-w-0">
    <div className="shrink-0 h-8 w-8 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-center text-slate-400">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400 leading-none mb-1">{label}</p>
      <p className={`text-[13px] font-semibold truncate ${tone || 'text-slate-900'}`}>{value}</p>
    </div>
  </div>
);

/**
 * Cabeçalho ortodôntico: tratamento ativo → última manutenção → próximo retorno
 * → dias desde a última consulta. Tudo calculado automaticamente no backend.
 */
export const OrthodonticHeader: React.FC<Props> = ({ header }) => {
  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 rounded-xl bg-slate-950 text-white flex items-center justify-center">
            <Activity size={16} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 leading-none mb-1">
              Tratamento ortodôntico
            </p>
            <p className="text-[15px] font-bold text-slate-900 leading-none">Acompanhamento</p>
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] ring-1 ${STATUS_TONE[header.status]}`}
        >
          {STATUS_LABEL[header.status]}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric
          icon={<Calendar size={15} />}
          label="Início"
          value={header.startDate ? formatDate(header.startDate) : '—'}
        />
        <Metric
          icon={<CheckCircle size={15} />}
          label="Última manutenção"
          value={header.lastVisitDate ? formatDate(header.lastVisitDate) : 'Nenhuma'}
        />
        <Metric
          icon={<Calendar size={15} />}
          label="Próximo retorno"
          value={header.nextReturnDate ? formatDate(header.nextReturnDate) : 'Não agendado'}
          tone={header.isOverdue ? 'text-rose-600' : undefined}
        />
        <Metric
          icon={<Clock size={15} />}
          label="Desde a última"
          value={pluralDays(header.daysSinceLastVisit)}
          tone={header.isOverdue ? 'text-rose-600' : undefined}
        />
      </div>
    </div>
  );
};
