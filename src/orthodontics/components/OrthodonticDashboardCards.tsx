import React, { useEffect, useState } from 'react';
import { Calendar, AlertTriangle, Clock, Activity, Camera } from '../../icons';

interface PatientRef {
  treatment_id: number;
  patient_id: number;
  patient_name: string;
  days?: number;
  days_overdue?: number;
}

interface DashboardData {
  returnToday: PatientRef[];
  overdue: PatientRef[];
  noMaintenance: PatientRef[];
  inRetention: PatientRef[];
  pendingDocs: PatientRef[];
}

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  onOpenPatient?: (patientId: number) => void;
}

const CARD_META = {
  returnToday: { label: 'Retorno hoje', icon: <Calendar size={14} />, tone: 'text-sky-600 bg-sky-50' },
  overdue: { label: 'Atrasados', icon: <AlertTriangle size={14} />, tone: 'text-rose-600 bg-rose-50' },
  noMaintenance: { label: 'Sem manutenção', icon: <Clock size={14} />, tone: 'text-amber-600 bg-amber-50' },
  inRetention: { label: 'Em contenção', icon: <Activity size={14} />, tone: 'text-violet-600 bg-violet-50' },
  pendingDocs: { label: 'Documentação pendente', icon: <Camera size={14} />, tone: 'text-slate-600 bg-slate-100' },
} as const;

/**
 * Cartões inteligentes de ortodontia para o dashboard.
 * Mostra apenas o que exige ação — nunca estatísticas para preencher espaço.
 */
export const OrthodonticDashboardCards: React.FC<Props> = ({ apiFetch, onOpenPatient }) => {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/orthodontics/dashboard');
        if (!res.ok) return;
        const json = (await res.json()) as DashboardData;
        if (!cancelled) setData(json);
      } catch {
        /* silencioso — ortodontia é opcional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  if (!data) return null;

  const groups = (Object.keys(CARD_META) as (keyof DashboardData)[])
    .map((key) => ({ key, items: data[key] || [] }))
    .filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={14} className="text-slate-400" />
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Ortodontia</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {groups.map(({ key, items }) => {
          const meta = CARD_META[key];
          return (
            <div key={key} className="rounded-2xl border border-slate-200/70 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-bold ${meta.tone}`}>
                  {meta.icon} {meta.label}
                </span>
                <span className="text-[18px] font-bold text-slate-900 tabular-nums">{items.length}</span>
              </div>
              <ul className="space-y-1">
                {items.slice(0, 4).map((p) => (
                  <li key={p.treatment_id}>
                    <button
                      onClick={() => onOpenPatient?.(p.patient_id)}
                      className="w-full text-left text-[13px] font-medium text-slate-600 hover:text-slate-900 truncate"
                    >
                      {p.patient_name}
                      {p.days_overdue != null && <span className="text-rose-500"> · {p.days_overdue}d</span>}
                      {p.days != null && <span className="text-amber-500"> · {p.days}d</span>}
                    </button>
                  </li>
                ))}
                {items.length > 4 && (
                  <li className="text-[12px] text-slate-400">+{items.length - 4} mais</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
};
